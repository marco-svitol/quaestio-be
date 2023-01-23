
const https = require('https');

const data = JSON.stringify({
  grant_type: 'client_credentials'
});

const options = {
  hostname: 'ops.epo.org',
  port: 443,
  path: '/3.2/auth/accesstoken',
  method: 'POST',
  headers: {
    'Authorization': `Basic ${Buffer.from(process.env.OPSCLIENTID+":"+process.env.OPSCLIENTSECRET,'utf8').toString('base64')}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

module.exports = class ops{
  constructor() {
    this.access_token = refreshtoken();
  }
}

let expires_in;

const req = https.request(options, (res) => {
  logger.debug(`statusCode: ${res.statusCode}`);
  res.on('data', (d) => {
    let response = JSON.parse(d);
    if (response.access_token) {
      access_token = response.access_token;
    }
    if (response.expires_in) {
      expires_in = response.expires_in;
    }
    console.log(access_token);
    console.log(expires_in);
    setTimeout(() => {
        sendRequest();
    }, (expires_in - 60) * 1000);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();

function sendRequest(){
    const req = https.request(options, (res) => {
    logger.debug(`statusCode: ${res.statusCode}`);
    res.on('data', (d) => {
        let response = JSON.parse(d);
        if (response.access_token) {
            access_token = response.access_token;
        }
        if (response.expires_in) {
            expires_in = response.expires_in;
        }
        console.log(access_token);
        console.log(expires_in);
        setTimeout(() => {
            sendRequest();
        }, (expires_in - 60) * 1000);
    });
    });
    req.on('error', (error) => {
    console.error(error);
    });
    req.write(data);
    req.end();
}
