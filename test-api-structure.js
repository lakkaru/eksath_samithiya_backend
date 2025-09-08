const axios = require('axios');

async function testApiResponse() {
  try {
    console.log('Testing API response structure...');
    
    // Login to get a fresh token
    const loginResponse = await axios.post('http://localhost:3001/auth/login', {
      member_id: 0,
      password: 'admin'
    });
    
    const token = loginResponse.data.token;
    
    // Get all settings
    const settingsResponse = await axios.get('http://localhost:3001/system-settings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n=== Settings Response Structure ===');
    if (settingsResponse.data.settings.length > 0) {
      const firstSetting = settingsResponse.data.settings[0];
      console.log('Sample setting structure:');
      console.log('- settingName:', firstSetting.settingName);
      console.log('- settingValue:', firstSetting.settingValue);
      console.log('- description:', firstSetting.description);
      console.log('- lastUpdateDate:', firstSetting.lastUpdateDate);
      console.log('- updatedBy field present:', 'updatedBy' in firstSetting);
      console.log('- updateHistory present:', 'updateHistory' in firstSetting);
      console.log('- updateHistory length:', firstSetting.updateHistory?.length || 0);
      
      if (firstSetting.updateHistory && firstSetting.updateHistory.length > 0) {
        console.log('\nLatest update history:');
        const latestUpdate = firstSetting.updateHistory[firstSetting.updateHistory.length - 1];
        console.log('- previousValue:', latestUpdate.previousValue);
        console.log('- newValue:', latestUpdate.newValue);
        console.log('- updateDate:', latestUpdate.updateDate);
        console.log('- updateReason:', latestUpdate.updateReason);
        console.log('- updatedBy field in history:', 'updatedBy' in latestUpdate);
      }
    }
    
    console.log('\n✅ API response structure verified!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testApiResponse();
