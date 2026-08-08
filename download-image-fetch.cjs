const fs = require('fs');

async function downloadImage() {
  try {
    // A stable, redirect-free, high-res Wikimedia image of the Matterhorn
    const res = await fetch("https://upload.wikimedia.org/wikipedia/commons/6/67/Matterhorn_Zermatt_Switzerland.jpg");
    
    if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`);
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync('public/mountain.jpg', buffer);
    console.log("Successfully downloaded Matterhorn image (size: " + buffer.length + " bytes)");
  } catch (err) {
    console.error("Failed to download image: ", err);
  }
}

downloadImage();
