const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const output = path.join(root, 'dist');
const siteUrl = 'https://www.buscarkenyaonline.co.ke';
const siteFiles = [
  'index.html',
  'robots.txt',
  'sitemap.xml',
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
  'route-page.css',
  'auth.js',
  'site-config.js',
  'routes.js',
  'seat-map.js',
  'site.js',
  'protection.js'
];

fs.mkdirSync(output, { recursive: true });

for (const file of siteFiles) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}

fs.cpSync(path.join(root, 'public'), path.join(output, 'public'), { recursive: true });

// Build crawlable route pages from the same schedule and fare data used by the booking UI.
global.window = {};
require(path.join(root, 'routes.js'));
const routeData = global.window.BuscarRouteData;
const routeDirectory = path.join(output, 'routes');
const routeDataDirectory = path.join(output, 'route-data');
fs.rmSync(routeDirectory, { recursive: true, force: true });
fs.rmSync(routeDataDirectory, { recursive: true, force: true });
fs.mkdirSync(routeDataDirectory, { recursive: true });
fs.mkdirSync(routeDirectory, { recursive: true });
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const cityName = (value) => value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
const slugPart = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const bookingLinkScript = `<script>
(() => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const dateParts = {};
  parts.forEach(({ type, value }) => { dateParts[type] = value; });
  const travelDate = dateParts.year + '-' + dateParts.month + '-' + dateParts.day;
  document.querySelectorAll('.route-booking-link').forEach((link) => {
    const params = new URLSearchParams({
      from: link.dataset.from,
      to: link.dataset.to,
      date: travelDate,
      trip: 'one-way',
      variant: '0'
    });
    link.href = '../results.html?' + params.toString();
  });
})();
</script>`;
const routePairs = [...new Set(routeData.getRoutes().map(([from, to]) => `${from}|${to}`))];
const routeLinks = [];

for (const route of routePairs) {
  const [from, to] = route.split('|');
  const fromName = cityName(from);
  const toName = cityName(to);
  const slug = `${slugPart(from)}-to-${slugPart(to)}`;
  const schedules = routeData.getSchedules(from, to);
  const fares = routeData.getFares(from, to);
  fs.writeFileSync(
    path.join(routeDataDirectory, `${slug}.json`),
    JSON.stringify({
      version: 1,
      from,
      to,
      fares,
      schedules,
      boardPoints: routeData.getStations(from),
      dropPoints: routeData.getStations(to)
    })
  );
  const redirectScript = `(() => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const dateParts = {};
  parts.forEach(({ type, value }) => { dateParts[type] = value; });
  const params = new URLSearchParams({
    from: ${JSON.stringify(from)},
    to: ${JSON.stringify(to)},
    date: dateParts.year + '-' + dateParts.month + '-' + dateParts.day,
    trip: 'one-way',
    variant: '0'
  });
  window.location.replace('../results.html?' + params.toString());
})();`;
  fs.writeFileSync(
    path.join(routeDirectory, `${slug}.html`),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Opening BUSCAR booking results</title></head><body><p>Opening booking results. <a href="../results.html?from=${encodeURIComponent(from)}&amp;to=${encodeURIComponent(to)}&amp;trip=one-way&amp;variant=0">Continue to booking</a></p><script>${redirectScript}</script></body></html>`
  );
  routeLinks.push(`<li><a class="route-booking-link" data-from="${escapeHtml(from)}" data-to="${escapeHtml(to)}" href="${slug}.html">Bus tickets from ${escapeHtml(fromName)} to ${escapeHtml(toName)}</a></li>`);
}

const routeIndex = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Choose a Bus Route | BUSCAR</title><meta name="description" content="Choose a BUSCAR route and go directly to available booking results."><link rel="canonical" href="${siteUrl}/routes/"><link rel="stylesheet" href="../styles.css"><link rel="stylesheet" href="../route-page.css"></head><body><main class="route-page"><nav class="route-breadcrumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span aria-hidden="true">›</span><span>Routes</span></nav><h1>Choose a route to book</h1><p class="route-intro">Select your route to view available buses and start a booking request.</p><ul class="route-directory">${routeLinks.join('\n')}</ul><a class="route-cta" href="../index.html#ticket">Search a trip</a></main>${bookingLinkScript}</body></html>`;
fs.writeFileSync(
  path.join(routeDirectory, 'index.html'),
  routeIndex.replace('</head>', '<script src="../protection.js" defer></script></head>')
);

const sitemapPath = path.join(output, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
sitemap = sitemap.replace(/\s*<url>\s*<loc>https:\/\/www\.buscarkenyaonline\.co\.ke\/routes\/[^<]+<\/loc>\s*<\/url>/g, '');
sitemap = sitemap.replace('</urlset>', `  <url><loc>${siteUrl}/routes/</loc></url>\n</urlset>`);
fs.writeFileSync(sitemapPath, sitemap);

console.log(`Copied ${siteFiles.length} site files and public assets; generated ${routePairs.length} booking redirects and route-data files.`);
