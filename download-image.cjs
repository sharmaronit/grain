const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("public/mountain.jpg");
// Using a reliable source for a stark mountain peak (Wikimedia Commons full size)
https.get("https://upload.wikimedia.org/wikipedia/commons/6/67/Matterhorn_Zermatt_Switzerland.jpg", function(response) {
  response.pipe(file);
  file.on("finish", () => {
    file.close();
    console.log("Download Completed");
  });
});
