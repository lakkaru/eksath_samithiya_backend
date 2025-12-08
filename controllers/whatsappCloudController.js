const whatsappCloudService = require('../services/whatsappCloudService');
const Member = require('../models/Member');
const MembershipPayment = require('../models/MembershipPayment');
const FinePayment = require('../models/FinePayment');
const Meeting = require('../models/Meeting');

// Helper to normalize and try to find member by incoming number
async function findMemberByIncomingNumber(incoming) {
  if (!incoming) return null;
  let phone = String(incoming).trim();
  // remove any non-digit chars (just in case)
  phone = phone.replace(/[^0-9+]/g, '');
  if (phone.startsWith('+')) phone = phone.substring(1);

  // Try direct match (cloud sends e.g. 94767531659)
  let member = await Member.findOne({ whatsApp: phone }).populate('dependents', 'name relationship dateOfDeath');
  if (member) return member;

  // If starts with 94, try local 0 prefix
  if (phone.startsWith('94')) {
    const local = '0' + phone.substring(2);
    member = await Member.findOne({ whatsApp: local }).populate('dependents', 'name relationship dateOfDeath');
    if (member) return member;
  }

  // If starts with 0, try replace with 94
  if (phone.startsWith('0')) {
    const intl = '94' + phone.substring(1);
    member = await Member.findOne({ whatsApp: intl }).populate('dependents', 'name relationship dateOfDeath');
    if (member) return member;
  }

  return null;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('si-LK', { style: 'currency', currency: 'LKR' }).format(Math.abs(amount) || 0);
}

async function buildBalanceText(member) {
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;
  // Calculate up to LAST month (e.g. if Feb, charge for 1 month: Jan)
  // getMonth() is 0-indexed (Jan=0, Feb=1), so it effectively gives the count of full past months
  const monthsToCharge = new Date().getMonth();
  const startOfYear = new Date(currentYear, 0, 1);

  let membershipCharge = 300 * monthsToCharge;
  if (member.siblingsCount > 0) {
    membershipCharge = (300 * member.siblingsCount * 0.3 + 300) * monthsToCharge;
  }

  const membershipPayments = await MembershipPayment.find({ memberId: member._id, date: { $gte: startOfYear } });
  const totalMembershipPaid = membershipPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const membershipDue = membershipCharge - totalMembershipPaid;

  const fineTotal = member.fines?.reduce((s, f) => s + (f.amount || 0), 0) || 0;
  const finePayments = await FinePayment.find({ memberId: member._id, date: { $gte: startOfYear } });
  const totalFinePaid = finePayments.reduce((s, p) => s + (p.amount || 0), 0);
  const fineDue = fineTotal - totalFinePaid;

  const previousDueVal = member.previousDue || 0;
  const totalOutstanding = membershipDue + fineDue + previousDueVal;

  // Dynamic label for previous due
  const prevDueLabel = previousDueVal < 0 ? `${prevYear} ඉතිරිය` : `${prevYear} හිඟ`;

  // Dynamic label for Total Outstanding
  const totalLabel = totalOutstanding < 0 ? 'මුළු ඉතිරිය' : 'මුළු හිඟ';

  return `${member.name}\nසා.අංකය: ${member.member_id}\n\nසාමාජිකත්ව හිඟ: ${formatCurrency(membershipDue)}\nදඩ හිඟ: ${formatCurrency(fineDue)}\n${prevDueLabel}: ${formatCurrency(previousDueVal)}\n\n${totalLabel}: ${formatCurrency(totalOutstanding)}`;
}

async function buildAbsencesText(member) {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const meetings = await Meeting.find({ date: { $gte: startOfYear } }).sort({ date: -1 });
  if (!meetings.length) return `${currentYear} වර්ෂයේ සභා තවම පැවැත්වී නැත.`;

  const absentCount = member.meetingAbsents || 0;
  const attended = meetings.length - absentCount;
  const attendanceRate = ((attended / meetings.length) * 100).toFixed(1);

  return `${member.name}\nසා.අංකය: ${member.member_id}\n\n${currentYear} වර්ෂය:\nසභා සංඛ්‍යාව: ${meetings.length}\nපැමිණි: ${attended}\nනොපැමිණි: ${absentCount}\nපැමිණීම: ${attendanceRate}%`;
}

async function buildFamilyText(member) {
  const dependents = member.dependents || [];
  let text = `${member.name}\nසා.අංකය: ${member.member_id}\nසහෝදර/සහෝදරියන්: ${member.siblingsCount || 0}`;
  if (!dependents.length) {
    text += '\n\nයැපෙන්නන් නොමැත';
  } else {
    text += `\n\nයැපෙන්නන් (${dependents.length}):\n`;
    dependents.forEach((d, i) => {
      const status = d.dateOfDeath ? '(මියගිය)' : '';
      text += `${i + 1}. ${d.name} - ${d.relationship} ${status}\n`;
    });
  }
  return text;
}

exports.verifyWebhook = (req, res) => {
  // Verification endpoint for WhatsApp Cloud (GET)
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    console.log('Webhook Verification:', {
      mode,
      receivedToken: token,
      expectedToken: process.env.WHATSAPP_VERIFY_TOKEN
    });

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    } else {
      console.log('WEBHOOK_VERIFICATION_FAILED: Token mismatch');
      return res.sendStatus(403);
    }
  }
  res.sendStatus(400);
};

exports.receiveWebhook = async (req, res) => {
  try {
    // Try to verify signature if rawBody available
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = req.rawBody || JSON.stringify(req.body);
    if (whatsappCloudService.appSecret) {
      const ok = whatsappCloudService.verifySignature(rawBody, signature);
      if (!ok) {
        console.warn('Invalid webhook signature');
        return res.sendStatus(403);
      }
    }

    const body = req.body;
    // Process each entry/change
    if (Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          const value = change.value || {};
          const messages = value.messages || [];
          if (!messages.length) continue;
          for (const message of messages) {
            // Only handle text messages
            const from = message.from || message['from'] || value.metadata?.phone_number_id;
            const text = (message.text && message.text.body) ? String(message.text.body).trim() : '';
            if (!text || !from) continue;

            const upper = text.toUpperCase();
            const valid = ['BALANCE', 'ශේෂය', 'ABSENT', 'නොපැමිණීම', 'FAMILY', 'පවුල', 'HELP', 'උදව්'];
            if (!valid.includes(upper)) {
              // ignore non-command
              continue;
            }

            const member = await findMemberByIncomingNumber(from);
            if (!member) {
              // reply asking to register
              await whatsappCloudService.sendTextMessage(from, 'WhatsApp අංකය අප සමඟ ලියාපදිංචි වී නැත. කරුණාකර ලේකම් හමුවී ලියාපදිංචි වන්න.');
              continue;
            }

            if (upper === 'BALANCE' || upper === 'ශේෂය') {
              const msg = await buildBalanceText(member);
              await whatsappCloudService.sendTextMessage(from, msg);
            } else if (upper === 'ABSENT' || upper === 'නොපැමිණීම') {
              const msg = await buildAbsencesText(member);
              await whatsappCloudService.sendTextMessage(from, msg);
            } else if (upper === 'FAMILY' || upper === 'පවුල') {
              const msg = await buildFamilyText(member);
              await whatsappCloudService.sendTextMessage(from, msg);
            } else if (upper === 'HELP' || upper === 'උදව්') {
              const help = `Eksath Samithiya Bot\n\nවිධාන:\nBALANCE - මුළු හිඟ මුදල\nABSENT - සභා නොපැමිණීම්\nFAMILY - යැපෙන්නන්\nHELP - උදව්`;
              await whatsappCloudService.sendTextMessage(from, help);
            }
          }
        }
      }
    }

    // Respond quickly
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.sendStatus(500);
  }
};
