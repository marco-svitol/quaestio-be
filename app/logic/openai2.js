/*
can you write a nodejs application that obtains a token from the Open Patent Service and use this token as the apikey to the /rest-services/published-data/search endpoint. The application should also contain a method to update the token one minute before it expires. The duration of the token, in seconds, is contained in a field called "expires_in"
*/

const https = require('https');

let access_token;
let expires_in;

// Function to get the access token
const getAccessToken = () => {
  const data = JSON.stringify({
    grant_type: 'client_credentials',
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET'
  });

  const options = {
    hostname: 'ops.epo.org',
    port: 443,
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    res.on('data', (d) => {
      let response = JSON.parse(d);
      if (response.access_token) {
        access_token = response.access_token;
        expires_in = response.expires_in;
        scheduleNextTokenRefresh();
      }
    });
  });

  req.on('error', (error) => {
    console.error(error);
  });

  req.write(data);
  req.end();
}

// Function to schedule the next token refresh
const scheduleNextTokenRefresh = () => {
  setTimeout(() => {
    getAccessToken();
  }, (expires_in - 60) * 1000);
}

// Function to make a request to the search endpoint using the access token
const search = (query) => {

  const options = {
    hostname: 'ops.epo.org',
    port: 443,
    path: `/rest-services/published-data/search?q=${query}`,
    method: 'GET',
    headers: {
    'Authorization': `Bearer ${access_token}`
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
    }
    
    // Call the getAccessToken function to get the initial access token
    getAccessToken();
    
    // Call the search function with a query parameter to search for patents
    search('query parameter');