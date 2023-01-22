let access_token;
let expires_in;

const https = require('https');

const data = JSON.stringify({
  key1: 'value1',
  key2: 'value2'
});

const options = {
  hostname: 'example.com',
  port: 443,
  path: '/submit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
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
    console.log(`statusCode: ${res.statusCode}`);
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
