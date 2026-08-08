const fs = require('fs');

async function downloadImage() {
  try {
    const res = await fetch("https://images.unsplash.com/photo-1543722530-d2c3201371e7?auto=format&fit=crop&w=1200&q=80");
    
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
