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
fs.mkdirSync(routeDirectory, { recursive: true });
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const cityName = (value) => value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
const slugPart = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = (value) => Number(value).toLocaleString('en-KE');
const indexableRoutes = [...new Set(routeData.getRoutes().map(([from, to]) => `${from}|${to}`))];
const routeLinks = [];

for (const route of indexableRoutes) {
  const [from, to] = route.split('|');
  const fromName = cityName(from);
  const toName = cityName(to);
  const slug = `${slugPart(from)}-to-${slugPart(to)}`;
  const canonical = `${siteUrl}/routes/${slug}.html`;
  const schedules = routeData.getSchedules(from, to);
  const fares = routeData.getFares(from, to);
  const rows = schedules.length ? schedules.map((schedule) => '<tr><td>' + escapeHtml(schedule.depart) + ' to ' + escapeHtml(schedule.arrive) + '</td><td>' + escapeHtml(schedule.bus) + '</td><td>KSh ' + money(schedule.fares.Vip) + '</td><td>KSh ' + money(schedule.fares.Normal) + '</td><td>KSh ' + money(schedule.fares.Bclass) + '</td></tr>').join('')
    : '<tr><td>Reference fare</td><td>Route option</td><td>KSh ' + money(fares.Vip) + '</td><td>KSh ' + money(fares.Normal) + '</td><td>KSh ' + money(fares.Bclass) + '</td></tr>';
  const indexedFares = schedules.length ? { Vip: Math.min(...schedules.map((schedule) => schedule.fares.Vip)), Normal: Math.min(...schedules.map((schedule) => schedule.fares.Normal)) } : fares;
  const title = `Bus Tickets from ${fromName} to ${toName} | BUSCAR`;
  const description = `Bus tickets from ${fromName} to ${toName}. Normal fares from KES ${money(indexedFares.Normal)} and VIP from KES ${money(indexedFares.Vip)}. Explore BUSCAR routes and fares.`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}"><link rel="stylesheet" href="../styles.css"><link rel="stylesheet" href="../route-page.css">
</head><body><header class="site-header"><div class="nav-wrap"><a class="brand" href="../index.html">BUSCAR Kenya</a><nav class="main-nav" aria-label="Main navigation"><a href="../index.html">Home</a><a href="../about.html">About</a><a href="../contact.html">Contact</a></nav></div></header>
<main class="route-page"><nav class="route-breadcrumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span aria-hidden="true">›</span><a href="index.html">Routes</a><span aria-hidden="true">›</span><span>${escapeHtml(fromName)} to ${escapeHtml(toName)}</span></nav>
<h1>Bus tickets from ${escapeHtml(fromName)} to ${escapeHtml(toName)}</h1><p class="route-intro">${schedules.length ? 'Compare listed BUSCAR departures and reference fares' : 'View indicative BUSCAR route fares'} for travel from ${escapeHtml(fromName)} to ${escapeHtml(toName)}. Select a travel date and contact the team to confirm current trip availability and border details.</p>
<section class="route-schedule" aria-labelledby="schedule-heading"><h2 id="schedule-heading">${schedules.length ? 'Listed departures and reference fares' : 'Indicative route fares'}</h2><div class="route-table-wrap"><table><thead><tr><th>Departure – arrival</th><th>Bus</th><th>VIP</th><th>Normal</th><th>B-Class</th></tr></thead><tbody>${rows}</tbody></table></div><p class="fare-note">${schedules.length ? 'Schedules and fares are reference information and may change.' : 'This connection and fare are indicative. Confirm the operating route, border arrangements, current price, and availability with BUSCAR before booking.'} Contact BUSCAR to plan your trip and check the listed route details.</p></section>
<a class="route-cta" href="../index.html#ticket">Search travel dates <span aria-hidden="true">→</span></a><p class="route-help">For booking assistance, <a href="../contact.html">contact BUSCAR</a>.</p></main><footer class="route-footer"><a href="../index.html">BUSCAR Kenya</a> · <a href="../contact.html">Contact</a></footer></body></html>`;
  fs.writeFileSync(
    path.join(routeDirectory, `${slug}.html`),
    html.replace('</head>', '<script src="../protection.js" defer></script></head>')
  );
  routeLinks.push(`<li><a href="${slug}.html">Bus tickets from ${escapeHtml(fromName)} to ${escapeHtml(toName)}</a></li>`);
}

const routeIndex = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bus Routes and Fares in Kenya & East Africa | BUSCAR</title><meta name="description" content="Explore BUSCAR bus tickets, routes, and fares across Kenya, Uganda, and Tanzania."><link rel="canonical" href="${siteUrl}/routes/"><link rel="stylesheet" href="../styles.css"><link rel="stylesheet" href="../route-page.css"></head><body><main class="route-page"><nav class="route-breadcrumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span aria-hidden="true">›</span><span>Routes</span></nav><h1>BUSCAR bus routes and fares</h1><p class="route-intro">Explore bus connections and reference fares from Nairobi, Mombasa, Kisumu, and Nakuru to Kenya and East Africa destinations.</p><ul class="route-directory">${routeLinks.join('\n')}</ul><a class="route-cta" href="../index.html#ticket">Search a trip</a></main></body></html>`;
fs.writeFileSync(
  path.join(routeDirectory, 'index.html'),
  routeIndex.replace('</head>', '<script src="../protection.js" defer></script></head>')
);

const maintenanceOverlay = `<style>
  html:has(.site-maintenance-overlay),
  body:has(.site-maintenance-overlay) {
    overflow: hidden !important;
  }

  .site-maintenance-overlay {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;
    display: grid !important;
    min-height: 100vh !important;
    padding: 24px !important;
    place-items: center !important;
    overflow: auto !important;
    background: #111827 !important;
    color: #f9fafb !important;
    font: 16px/1.6 Arial, Helvetica, sans-serif !important;
    text-align: center !important;
  }

  .site-maintenance-overlay * {
    box-sizing: border-box !important;
  }

  .site-maintenance-overlay__content {
    max-width: 520px !important;
  }

  .site-maintenance-overlay__status {
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 8px 12px !important;
    border: 1px solid #374151 !important;
    border-radius: 999px !important;
    color: #d1d5db !important;
    font-size: 14px !important;
  }

  .site-maintenance-overlay__status::before {
    width: 8px !important;
    height: 8px !important;
    border-radius: 50% !important;
    background: #f59e0b !important;
    content: "" !important;
  }

  .site-maintenance-overlay h1 {
    margin: 24px 0 12px !important;
    color: #f9fafb !important;
    font-size: clamp(32px, 7vw, 48px) !important;
    letter-spacing: -0.04em !important;
  }

  .site-maintenance-overlay p {
    margin: 0 !important;
    color: #d1d5db !important;
    font-size: 17px !important;
  }
</style>
<main class="site-maintenance-overlay" role="dialog" aria-modal="true" aria-labelledby="maintenance-title">
  <div class="site-maintenance-overlay__content">
    <span class="site-maintenance-overlay__status">Work in progress</span>
    <h1 id="maintenance-title">BUSCAR is temporarily unavailable</h1>
    <p>Error — this page is temporarily unavailable. Please try again later.</p>
  </div>
</main>`;

function addMaintenanceOverlay(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      addMaintenanceOverlay(file);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const html = fs.readFileSync(file, 'utf8');
      if (html.includes('site-maintenance-overlay')) continue;
      if (!/<\/head>/i.test(html) || !/<body\b[^>]*>/i.test(html)) {
        throw new Error(`Cannot add maintenance overlay to HTML page: ${file}`);
      }
      const styledHtml = html.replace(/<\/head>/i, `${maintenanceOverlay.match(/<style>[\s\S]*<\/style>/)[0]}</head>`);
      fs.writeFileSync(
        file,
        styledHtml.replace(/(<body\b[^>]*>)/i, `$1${maintenanceOverlay.slice(maintenanceOverlay.indexOf('<main'))}`)
      );
    }
  }
}

addMaintenanceOverlay(output);

const routeUrls = indexableRoutes.map((route) => {
  const [from, to] = route.split('|');
  return `  <url><loc>${siteUrl}/routes/${slugPart(from)}-to-${slugPart(to)}.html</loc></url>`;
}).join('\n');
const sitemapPath = path.join(output, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
sitemap = sitemap.replace('</urlset>', `  <url><loc>${siteUrl}/routes/</loc></url>\n${routeUrls}\n</urlset>`);
fs.writeFileSync(sitemapPath, sitemap);

console.log(`Copied ${siteFiles.length} site files and public assets; generated ${indexableRoutes.length} route pages.`);
