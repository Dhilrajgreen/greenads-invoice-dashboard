const https = require('https');

const TOKEN = 'Qsttz8Cmot74HkrpTIUPUhFd';
const PROJECT_ID = 'prj_N3AcodCDYqGd6iQq8zrXpw0PlA2E';

const envVars = {
  'SUPABASE_URL': 'https://zeiuvoqbbihexyshtzjz.supabase.co',
  'ZOHO_CLIENT_ID': '1000.COFK03HI8UUBCB61VACWPLYHY1RKBX',
  'ZOHO_CLIENT_SECRET': '4904f275019b8330557293c8aaa39520a740c2a13a',
  'ZOHO_REFRESH_TOKEN': '1000.74a78244ab2e903aef857accc46e20d1.d88c3936a727cdaac0be133a6a13c404',
  'ZOHO_ORG_ID': '849360641'
};

function addEnvVar(name, value, environment) {
  return new Promise((resolve, reject) => {
    if (!value || value.length === 0) {
      console.log(`⚠ Skipping ${name} (empty)`);
      resolve(false);
      return;
    }

    const data = JSON.stringify({
      key: name,
      value: value,
      type: 'encrypted',
      target: [environment]
    });

    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: `/v10/projects/${PROJECT_ID}/env`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✓ Added ${name} to ${environment}`);
          resolve(true);
        } else {
          // Check if it's a duplicate error
          if (responseData.includes('already exists') || responseData.includes('duplicate')) {
            console.log(`⚠ ${name} already exists in ${environment}`);
            resolve(true);
          } else {
            console.log(`✗ Failed to add ${name} to ${environment}: ${responseData}`);
            resolve(false);
          }
        }
      });
    });

    req.on('error', (error) => {
      console.log(`✗ Error adding ${name}: ${error.message}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Adding environment variables to Vercel...\n');

  const environments = ['production', 'preview', 'development'];
  
  for (const env of environments) {
    console.log(`=== ${env.toUpperCase()} ===`);
    for (const [name, value] of Object.entries(envVars)) {
      await addEnvVar(name, value, env);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log('');
  }
  
  console.log('✅ Done!');
  console.log('\n⚠️  NOTE: You still need to add SUPABASE_SERVICE_ROLE_KEY manually.');
  console.log('   You can add it via: https://vercel.com/zoho-dashboards-projects/greenads-invoice-dashboard/settings/environment-variables');
}

main().catch(console.error);
