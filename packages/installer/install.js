#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const CORE_DIST = path.resolve(__dirname, '../../node_modules/.pnpm/@code-inspector+core@1.2.10/node_modules/@code-inspector/core/dist');
const FORK_URL = 'https://raw.githubusercontent.com/MarkShawn2020/code-inspector/main/packages/core/dist';

const FILES = ['client.iife.js', 'client.umd.js'];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function install() {
  if (!fs.existsSync(CORE_DIST)) {
    console.log('⚠️  @code-inspector/core not found. Please install code-inspector-plugin first.');
    return;
  }

  console.log('📦 Installing enhanced code-inspector...');

  try {
    for (const file of FILES) {
      const url = `${FORK_URL}/${file}`;
      const dest = path.join(CORE_DIST, file);
      await download(url, dest);
      console.log(`✓ Downloaded ${file}`);
    }

    console.log('✅ Enhanced code-inspector installed successfully!');
    console.log('   Features: Shift+Alt+C to toggle IDE/Copy mode');
  } catch (error) {
    console.error('❌ Installation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  install();
}

module.exports = install;
