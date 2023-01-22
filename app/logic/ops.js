const https = require('https');

const apiKey = 'YOUR_API_KEY';

const options = {
  hostname: 'ops.epo.org',
  port: 443,
  path: '/rest-services/published-data/search',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
};

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
