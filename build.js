const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const output = path.join(root, 'dist');
const siteFiles = [
  'index.html',
  'results.html',
  'about.html',
  'ticket.html',
  'contact.html',
  'gallery.html',
  'signup.html',
  'styles.css',
  'results.css',
  'seats.css',
  'auth.css',
  'site.css',
  'auth.js',
  'routes.js',
  'site.js'
];

fs.mkdirSync(output, { recursive: true });

for (const file of siteFiles) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}

fs.cpSync(path.join(root, 'public'), path.join(output, 'public'), { recursive: true });

console.log(`Copied ${siteFiles.length} site files and public assets to dist.`);
