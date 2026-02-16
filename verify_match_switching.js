const axios = require('axios');

async function verifyMatchSwitching() {
    const baseUrl = 'http://localhost:5000/api/kills';
    const tournamentId = '67afa2f58be6db3c8005b823'; // Using a real ID from the logs if possible, or just checking if param is accepted

    console.log('--- Verifying Match Switching API ---');

    try {
        // 1. Test getPlayers without matchNumber (Overall)
        console.log('\n[TEST 1] Testing Overall Players view...');
        const resOverall = await axios.get(`${baseUrl}/getPlayers?tournamentId=${tournamentId}`);
        console.log('Overall Response Status:', resOverall.status);
        if (resOverall.data.length > 0) {
            console.log('Sample Player Total (Overall):', resOverall.data[0].total);
        }

        // 2. Test getPlayers with matchNumber=1
        console.log('\n[TEST 2] Testing Match 1 Players view...');
        const resMatch1 = await axios.get(`${baseUrl}/getPlayers?tournamentId=${tournamentId}&matchNumber=1`);
        console.log('Match 1 Response Status:', resMatch1.status);
        if (resMatch1.data.length > 0) {
            console.log('Sample Player Total (Match 1):', resMatch1.data[0].total);
        }

        // 3. Test getSquads without matchNumber
        console.log('\n[TEST 3] Testing Overall Squads view...');
        const resSquadsOverall = await axios.get(`${baseUrl}/getSquads?tournamentId=${tournamentId}`);
        console.log('Overall Squads Response Status:', resSquadsOverall.status);
        if (Array.isArray(resSquadsOverall.data) && resSquadsOverall.data.length > 0) {
            console.log('Sample Squad Total Kills (Overall):', resSquadsOverall.data[0].totalKills);
        }

        // 4. Test getSquads with matchNumber=1
        console.log('\n[TEST 4] Testing Match 1 Squads view...');
        const resSquadsMatch1 = await axios.get(`${baseUrl}/getSquads?tournamentId=${tournamentId}&matchNumber=1`);
        console.log('Match 1 Squads Response Status:', resSquadsMatch1.status);
        if (Array.isArray(resSquadsMatch1.data) && resSquadsMatch1.data.length > 0) {
            console.log('Sample Squad Total Kills (Match 1):', resSquadsMatch1.data[0].totalKills);
        }

        console.log('\n✅ API Verification complete.');
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

verifyMatchSwitching();
