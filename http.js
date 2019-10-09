const https = require('https');

function getIPAddress(url, version = 4) {

  return new Promise((resolve, reject) => {
      const options = {
        family: version
      }
     https.get(url, options,  (resp) => {
      let data = '';

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
       resp.on('end', () => {
        resolve(data.trim())
      });

    }).on("error", (error) => {
      reject(error)
      //console.log("Error: " + error.message);
    });

}
)}

module.exports = getIPAddress;