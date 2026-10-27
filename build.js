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
  'site.js'
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
fs.mkdirSync(routeDirectory, { recursive: true });
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const cityName = (value) => value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
const slugPart = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = (value) => Number(value).toLocaleString('en-KE');
const scheduledRoutes = [...new Set(routeData.getRoutes()
  .filter(([from, to]) => routeData.getSchedules(from, to).length)
  .map(([from, to]) => `${from}|${to}`))];
const routeLinks = [];

for (const route of scheduledRoutes) {
  const [from, to] = route.split('|');
  const fromName = cityName(from);
  const toName = cityName(to);
  const slug = `${slugPart(from)}-to-${slugPart(to)}`;
  const canonical = `${siteUrl}/routes/${slug}.html`;
  const schedules = routeData.getSchedules(from, to);
  const rows = schedules.map((schedule) => `
        <tr><td>${escapeHtml(schedule.depart)} – ${escapeHtml(schedule.arrive)}</td><td>${escapeHtml(schedule.bus)}</td><td>KSh ${money(schedule.fares.Vip)}</td><td>KSh ${money(schedule.fares.Normal)}</td><td>KSh ${money(schedule.fares.Bclass)}</td></tr>`).join('');
  const title = `Bus from ${fromName} to ${toName} | BUSCAR Kenya`;
  const description = `View BUSCAR bus departures and reference fares from ${fromName} to ${toName}. Confirm current schedules, prices, and availability before booking.`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}"><link rel="stylesheet" href="../styles.css"><link rel="stylesheet" href="../route-page.css">
</head><body><header class="site-header"><div class="nav-wrap"><a class="brand" href="../index.html">BUSCAR Kenya</a><nav class="main-nav" aria-label="Main navigation"><a href="../index.html">Home</a><a href="../about.html">About</a><a href="../contact.html">Contact</a></nav></div></header>
<main class="route-page"><nav class="route-breadcrumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span aria-hidden="true">›</span><a href="index.html">Routes</a><span aria-hidden="true">›</span><span>${escapeHtml(fromName)} to ${escapeHtml(toName)}</span></nav>
<h1>Bus from ${escapeHtml(fromName)} to ${escapeHtml(toName)}</h1><p class="route-intro">Compare listed BUSCAR departures and reference fares for travel from ${escapeHtml(fromName)} to ${escapeHtml(toName)}. Select a travel date to search and contact the team to confirm current trip availability.</p>
<section class="route-schedule" aria-labelledby="schedule-heading"><h2 id="schedule-heading">Listed departures and reference fares</h2><div class="route-table-wrap"><table><thead><tr><th>Departure – arrival</th><th>Bus</th><th>VIP</th><th>Normal</th><th>B-Class</th></tr></thead><tbody>${rows}</tbody></table></div><p class="fare-note">Schedules and fares are reference information and may change. Confirm current details and availability with BUSCAR before payment; this page does not reserve a seat.</p></section>
<a class="route-cta" href="../index.html#ticket">Search travel dates <span aria-hidden="true">→</span></a><p class="route-help">For booking assistance, <a href="../contact.html">contact BUSCAR</a>.</p></main><footer class="route-footer"><a href="../index.html">BUSCAR Kenya</a> · <a href="../contact.html">Contact</a></footer></body></html>`;
  fs.writeFileSync(path.join(routeDirectory, `${slug}.html`), html);
  routeLinks.push(`<li><a href="${slug}.html">Bus from ${escapeHtml(fromName)} to ${escapeHtml(toName)}</a></li>`);
}

const routeIndex = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bus Routes and Schedules | BUSCAR Kenya</title><meta name="description" content="Browse BUSCAR bus routes with listed schedules and reference fares."><link rel="canonical" href="${siteUrl}/routes/"><link rel="stylesheet" href="../styles.css"><link rel="stylesheet" href="../route-page.css"></head><body><main class="route-page"><nav class="route-breadcrumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span aria-hidden="true">›</span><span>Routes</span></nav><h1>BUSCAR routes and schedules</h1><p class="route-intro">Browse routes with schedule information currently listed by BUSCAR. Confirm availability and fares before booking.</p><ul class="route-directory">${routeLinks.join('\n')}</ul><a class="route-cta" href="../index.html#ticket">Search a trip</a></main></body></html>`;
fs.writeFileSync(path.join(routeDirectory, 'index.html'), routeIndex);

const routeUrls = scheduledRoutes.map((route) => {
  const [from, to] = route.split('|');
  return `  <url><loc>${siteUrl}/routes/${slugPart(from)}-to-${slugPart(to)}.html</loc></url>`;
}).join('\n');
const sitemapPath = path.join(output, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
sitemap = sitemap.replace('</urlset>', `  <url><loc>${siteUrl}/routes/</loc></url>\n${routeUrls}\n</urlset>`);
fs.writeFileSync(sitemapPath, sitemap);

console.log(`Copied ${siteFiles.length} site files and public assets; generated ${scheduledRoutes.length} route pages.`);
