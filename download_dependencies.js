const fs = require('fs');
const https = require('https');
const path = require('path');

const urls = {
  'human.js': 'https://cdn.jsdelivr.net/npm/@vladmandic/human/dist/human.js',
  'models/blazeface.json': 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/blazeface.json',
  'models/blazeface.bin': 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/blazeface.bin'
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirection if jsdelivr redirects
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  console.log('Downloading dependencies...');
  for (const [filepath, url] of Object.entries(urls)) {
    const dest = path.join(__dirname, filepath);
    console.log(`Downloading ${url} to ${dest}...`);
    try {
      await downloadFile(url, dest);
      console.log(`Successfully downloaded ${filepath}`);
    } catch (e) {
      console.error(`Error downloading ${filepath}:`, e);
      process.exit(1);
    }
  }
  console.log('All downloads complete.');
}

run();
