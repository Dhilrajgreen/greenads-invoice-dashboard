const fs = require('fs');
const https = require('https');

const TOKEN = 'Qsttz8Cmot74HkrpTIUPUhFd';
const PROJECT_ID = 'prj_N3AcodCDYqGd6iQq8zrXpw0PlA2E';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  }
});

const varsToAdd = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_REFRESH_TOKEN',
  'ZOHO_ORG_ID'
];

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
          console.log(`✗ Failed to add ${name} to ${environment}: ${responseData}`);
          resolve(false);
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
  console.log('Reading .env.local...\n');
  
  // Show found values (first 20 chars)
  varsToAdd.forEach(name => {
    const value = envVars[name];
    if (value) {
      console.log(`Found ${name}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`⚠ ${name} not found in .env.local`);
    }
  });
  
  console.log('\nAdding to Vercel...\n');

  const environments = ['production', 'preview', 'development'];
  
  for (const env of environments) {
    console.log(`=== ${env.toUpperCase()} ===`);
    for (const varName of varsToAdd) {
      await addEnvVar(varName, envVars[varName], env);
    }
    console.log('');
  }
  
  console.log('✅ Done!');
}

main().catch(console.error);

