const mongoose = require('mongoose');
const { Admin, AdminUser } = require('./models/Admin');
const Member = require('./models/Member');

async function checkAdmins() {
  try {
    await mongoose.connect('mongodb+srv://lakkarudb:3dVyN2cUlWbh16FG@cluster0.idzobxr.mongodb.net/eksath_samithiya?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');
    
    console.log('\n=== AdminUser Collection ===');
    const adminUsers = await AdminUser.find({});
    console.log('AdminUsers count:', adminUsers.length);
    adminUsers.forEach(admin => {
      console.log(`- ${admin.name} (ID: ${admin.member_id}, Role: ${admin.role})`);
    });
    
    console.log('\n=== Admin Collection ===');
    const admins = await Admin.find({});
    console.log('Admins count:', admins.length);
    if (admins.length > 0) {
      const admin = admins[0];
      console.log('Admin structure:');
      console.log('- Chairman:', admin.chairman);
      console.log('- Secretary:', admin.secretary);  
      console.log('- Vice Chairman:', admin.viceChairman);
      console.log('- Vice Secretary:', admin.viceSecretary);
      console.log('- Treasurer:', admin.treasurer);
      console.log('- Loan Treasurer:', admin.loanTreasurer);
      console.log('- Auditor:', admin.auditor);
      console.log('- Speaker Handler:', admin.speakerHandler);
      console.log('- Area Admins:', admin.areaAdmins);
    }
    
    console.log('\n=== Sample Members with Roles ===');
    const membersWithRoles = await Member.find({ 
      roles: { $exists: true, $ne: ["member"] } 
    }).limit(10);
    console.log('Members with non-default roles:', membersWithRoles.length);
    membersWithRoles.forEach(member => {
      console.log(`- ${member.name} (ID: ${member.member_id}, Roles: ${member.roles.join(', ')})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkAdmins();
