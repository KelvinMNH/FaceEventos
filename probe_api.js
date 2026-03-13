const axios = require('axios');
const API_URL = 'http://localhost:3000/api';

async function probe() {
  try {
    console.log("🔑 Tentando login...");
    const loginRes = await axios.post(`${API_URL}/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log("✅ Logado com sucesso.");
    
    const config = {
      headers: { 'Authorization': `Bearer ${token}` }
    };

    // 1. Get events
    console.log("📋 Listando eventos...");
    const res = await axios.get(`${API_URL}/eventos`, config);
    const events = res.data;
    console.log(`Found ${events.length} events.`);
    
    if (events.length > 0) {
      const uuid = events[0].uuid;
      console.log(`🔍 Probing event with UUID: "${uuid}"`);
      
      // 2. Get single event
      try {
        const resSingle = await axios.get(`${API_URL}/eventos/${uuid}`, config);
        console.log('✅ Success! Event name:', resSingle.data.nome);
        console.log('Event details:', JSON.stringify(resSingle.data, null, 2));
      } catch (errSingle) {
        if (errSingle.response) {
            console.log(`❌ Failed with status ${errSingle.response.status}:`, errSingle.response.data);
        } else {
            console.log('❌ Error (Single):', errSingle.message);
        }
      }
    } else {
        console.log("⚠️ Nenhum evento encontrado para testar.");
    }
  } catch (e) {
    if (e.response) {
      console.log(`❌ Failed (Login/List) with status ${e.response.status}:`, e.response.data);
    } else {
      console.log('❌ Error (Main):', e.message);
    }
  }
}

probe();
