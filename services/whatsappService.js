const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Member = require('../models/Member');
const MembershipPayment = require('../models/MembershipPayment');
const FinePayment = require('../models/FinePayment');
const Meeting = require('../models/Meeting');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.qrCode = null;
    this.status = 'disconnected';
  }

  initialize() {
    if (this.client) {
      console.log('WhatsApp client already initialized');
      return;
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.client.on('qr', (qr) => {
      console.log('QR Code received:');
      qrcode.generate(qr, { small: true });
      this.qrCode = qr;
      this.status = 'qr_ready';
    });

    this.client.on('authenticated', () => {
      console.log('WhatsApp authenticated');
      this.status = 'authenticated';
      this.qrCode = null;
    });

    this.client.on('ready', () => {
      console.log('WhatsApp bot ready!');
      this.isReady = true;
      this.status = 'ready';
    });

    this.client.on('auth_failure', (msg) => {
      console.error('Auth failed:', msg);
      this.status = 'auth_failed';
    });

    this.client.on('disconnected', (reason) => {
      console.log('Disconnected:', reason);
      this.isReady = false;
      this.status = 'disconnected';
      this.client = null;
    });

    this.client.on('message', async (message) => {
      await this.handleMessage(message);
    });

    this.client.initialize();
  }

  async handleMessage(message) {
    try {
      const text = message.body.trim().toUpperCase();
      const sender = message.from;
      
      // Ignore group messages
      if (sender.includes('@g.us')) return;

      // Only respond to specific commands
      const validCommands = ['BALANCE', 'ශේෂය', 'ABSENT', 'නොපැමිණීම', 'FAMILY', 'පවුල', 'HELP', 'උදව්'];
      if (!validCommands.includes(text)) {
        // Ignore all other messages - let user reply manually
        return;
      }

      // Extract phone number and normalize it
      let phoneNumber = sender.split('@')[0];
      
      // If number starts with 94 (Sri Lanka country code), try both formats
      let member = null;
      if (phoneNumber.startsWith('94')) {
        // Try with country code first (94767531659)
        member = await Member.findOne({ whatsApp: phoneNumber }).populate('dependents', 'name relationship dateOfDeath');
        
        // If not found, try with 0 prefix (0767531659)
        if (!member) {
          const localFormat = '0' + phoneNumber.substring(2);
          member = await Member.findOne({ whatsApp: localFormat }).populate('dependents', 'name relationship dateOfDeath');
        }
      } else {
        // Try as-is first
        member = await Member.findOne({ whatsApp: phoneNumber }).populate('dependents', 'name relationship dateOfDeath');
      }

      if (!member) {
        await this.client.sendMessage(sender, 'WhatsApp අංකය ලියාපදිංචි නොවේ.\nලේකම් හමුවී ලියාපදිංචි කරන්න.');
        return;
      }

      if (text === 'BALANCE' || text === 'ශේෂය') {
        await this.sendBalance(sender, member);
      } else if (text === 'ABSENT' || text === 'නොපැමිණීම') {
        await this.sendAbsences(sender, member);
      } else if (text === 'FAMILY' || text === 'පවුල') {
        await this.sendFamily(sender, member);
      } else if (text === 'HELP' || text === 'උදව්') {
        await this.sendHelp(sender);
      }
    } catch (error) {
      console.error('Error:', error);
      // Only send error message if it was a valid command
      const text = message.body.trim().toUpperCase();
      const validCommands = ['BALANCE', 'ශේෂය', 'ABSENT', 'නොපැමිණීම', 'FAMILY', 'පවුල', 'HELP', 'උදව්'];
      if (validCommands.includes(text)) {
        await this.client.sendMessage(message.from, 'දෝෂයක් සිදුවිය');
      }
    }
  }

  async sendBalance(sender, member) {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const startOfYear = new Date(currentYear, 0, 1);

      // Calculate membership charge for current year
      let membershipCharge = 300 * currentMonth;
      if (member.siblingsCount > 0) {
        membershipCharge = (300 * member.siblingsCount * 0.3 + 300) * currentMonth;
      }

      // Get membership payments for current year
      const membershipPayments = await MembershipPayment.find({
        memberId: member._id,
        date: { $gte: startOfYear }
      });
      const totalMembershipPaid = membershipPayments.reduce((sum, p) => sum + p.amount, 0);
      const membershipDue = membershipCharge - totalMembershipPaid;

      // Calculate fines due
      const fineTotal = member.fines?.reduce((sum, f) => sum + f.amount, 0) || 0;
      const finePayments = await FinePayment.find({ 
        memberId: member._id, 
        date: { $gte: startOfYear } 
      });
      const totalFinePaid = finePayments.reduce((sum, p) => sum + p.amount, 0);
      const fineDue = fineTotal - totalFinePaid;

      // Calculate total outstanding (same as member home page)
      const totalOutstanding = membershipDue + fineDue + (member.previousDue || 0);

      const response = `${member.name}\nසා.අංකය: ${member.member_id}\n\nසාමාජිකත්ව හිඟ: Rs. ${membershipDue.toFixed(2)}\nදඩ හිඟ: Rs. ${fineDue.toFixed(2)}\nපෙර හිඟ: Rs. ${(member.previousDue || 0).toFixed(2)}\n\nමුළු හිඟ: Rs. ${totalOutstanding.toFixed(2)}`;
      await this.client.sendMessage(sender, response);
    } catch (error) {
      console.error('Balance error:', error);
      throw error;
    }
  }

  async sendAbsences(sender, member) {
    try {
      const currentYear = new Date().getFullYear();
      const monthNames = ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'];
      const currentMonth = monthNames[new Date().getMonth()];
      const startOfYear = new Date(currentYear, 0, 1);
      const meetings = await Meeting.find({ date: { $gte: startOfYear } }).sort({ date: -1 });

      if (meetings.length === 0) {
        await this.client.sendMessage(sender, `${currentYear} වර්ෂයේ සභා තවම පැවැත්වී නැත.`);
        return;
      }

      // Use meetingAbsents from member document
      const absentCount = member.meetingAbsents || 0;
      const attendedCount = meetings.length - absentCount;
      const attendanceRate = ((attendedCount / meetings.length) * 100).toFixed(1);

      const response = `${member.name}\nසා. අංකය: ${member.member_id}\n\n${currentYear} වර්ෂය ${currentMonth} මාසය\nනොපැමිණි (එක පෙලට): ${member.meetingAbsents}`;
      await this.client.sendMessage(sender, response);
    } catch (error) {
      console.error('Absences error:', error);
      throw error;
    }
  }

  async sendFamily(sender, member) {
    try {
      const dependents = member.dependents || [];
      let response = `${member.name}\nසා.අංකය: ${member.member_id}\n\nසහෝදර/සහෝදරියන්: ${member.siblingsCount || 0}`;

      if (dependents.length === 0) {
        response += '\n\nයැපෙන්නන් නොමැත';
      } else {
        response += `\n\nයැපෙන්නන් (${dependents.length}):\n`;
        dependents.forEach((dep, idx) => {
          const status = dep.dateOfDeath ? '(මියගිය)' : '';
          response += `${idx + 1}. ${dep.name} - ${dep.relationship} ${status}`;
        });
      }

      await this.client.sendMessage(sender, response);
    } catch (error) {
      console.error('Family error:', error);
      throw error;
    }
  }

  async sendHelp(sender) {
    const helpText = `Eksath Samithiya Bot\n\nවිධාන:\n\nBalance - මුළු හිඟ මුදල\nAbsent - සභා නොපැමිණීම්\nFamily - යැපෙන්නන්\nHelp - උදව්`;
    await this.client.sendMessage(sender, helpText);
  }

  getStatus() {
    return {
      status: this.status,
      isReady: this.isReady,
      qrCode: this.qrCode
    };
  }

  async destroy() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      this.status = 'disconnected';
      this.qrCode = null;
    }
  }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
