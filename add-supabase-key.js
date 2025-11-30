const https = require('https');

const TOKEN = 'Qsttz8Cmot74HkrpTIUPUhFd';
const PROJECT_ID = 'prj_N3AcodCDYqGd6iQq8zrXpw0PlA2E';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaXV2b3FiYmloZXh5c2h0emp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQ5ODk1MCwiZXhwIjoyMDgwMDc0OTUwfQ.yuCIb2TVlqSYFVWQWLbG7TTiZzM3IdbteRH-feqHeec';

function addEnvVar(name, value, environment) {
  return new Promise((resolve, reject) => {
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
        } else if (responseData.includes('already exists') || responseData.includes('duplicate')) {
          console.log(`⚠ ${name} already exists in ${environment}`);
          resolve(true);
        } else {
          console.log(`✗ Failed: ${responseData}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`✗ Error: ${error.message}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Adding SUPABASE_SERVICE_ROLE_KEY to all environments...\n');
  
  const environments = ['production', 'preview', 'development'];
  
  for (const env of environments) {
    await addEnvVar('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_KEY, env);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n✅ All environment variables added!');
  console.log('\n🚀 Ready to deploy!');
}

main().catch(console.error);
