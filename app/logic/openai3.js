
/*
can you create a nodejs code that queries the OPS using the search query API and produces a list of patent titles and authors?   
*/

/*
In this example, I'm using the https module to make a GET request to the /rest-services/published-data/search endpoint with the query parameter passed to it. The response from the server is a JSON object that contains a list of patents and their respective data. This code parses the response, and for each item, it logs the title and authors of the patent to the console.

You can also use other libraries such as axios, request, or superagent to make the request.
It's important to keep in mind that you should also read the EPO's Open Patent Services API documentation to understand the different parameters that you can use to filter and sort the results, and also to be aware of the rate limits and usage restrictions.
*/

/*
can you extend the previous code to include also the document id, the published date and the url to the OPS document?
*/

/*
document ID from the publication_number.document_number field, the second line will get the published date from the publication_number.date field, and the third line will generate the URL to access the document on the OPS website using the document number, in this case I'm using the https://ops.epo.org/rest-services/published-data/publication/epodoc/ endpoint and concatenating the document number and '.pdf' at the end of it.

It's worth noting that you can access the document in other formats such as XML by replacing the '.pdf' with '.xml' or other supported formats by the API.
It's also important to keep in mind that the published date might not be available for certain documents and the data structure may vary depending on the type of document and the data source. So, it's always a good idea to check the documentation and test the API before building the production version of your application.
*/

/*
can you extend the previous code so that the results should be limited to documents published after a certain date and before another date?
*/

/*
In this example, I've added a filter to the query parameter by concatenating the date filter to it. The filter is set to retrieve documents published between the startDate and endDate that are set at the beginning of the code. The format of the date should be YYYY-MM-DD.

You can also use other filters such as pn, pn-type, pn-lg, pn-original to filter the results by patent number and other attributes. You can check the Open Patent Services API documentation for more details on the available filters.
*/

const https = require('https');

// Set the start and end date in the format YYYY-MM-DD
const startDate = '2022-01-01';
const endDate = '2022-12-31';

const query = `query parameter AND date=${startDate}-${endDate}`;

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
  res.on('data', (d) => {
    let response = JSON.parse(d);
    response.search_response.items.forEach(item => {
      console.log(`Title: ${item.publication.bibliographic_data.invention_title.text}`);
      console.log(`Authors: ${item.publication.bibliographic_data.parties.applicants.map(applicant => applicant.name).join(', ')}`);
      console.log(`Document ID: ${item.publication.bibliographic_data.publication_number.document_number}`);
      console.log(`Published Date: ${item.publication.bibliographic_data.publication_number.date}`);
      console.log(`URL: https://ops.epo.org/rest-services/published-data/publication/epodoc/${item.publication.bibliographic_data.publication_number.document_number}.pdf`);
    });
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
