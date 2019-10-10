const https = require('https');
const isIp = require("is-ip");

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
        const returnedIp = data.trim();

        // if we are asking for version 6 don't return version 4
        if(isIp.version(returnedIp) === version) {
          resolve(data.trim())
        } else {
          resolve('')
        }

      });

    }).on("error", (error) => {
      reject(error)
    });

}
)}

module.exports = getIPAddress;