import { SitemapStream, streamToPromise } from 'sitemap';
import { writeFile } from 'fs/promises';

(async () => {
  const hostname = 'https://khtherapy.ie';
  const routes = [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/about', changefreq: 'monthly', priority: 0.8 },
    { url: '/services', changefreq: 'weekly', priority: 0.9 },
    { url: '/booking', changefreq: 'weekly', priority: 0.9 },
    { url: '/contact', changefreq: 'monthly', priority: 0.7 },
    { url: '/testimonials', changefreq: 'monthly', priority: 0.6 },
  ];

  try {
    const sitemap = new SitemapStream({ hostname });
    routes.forEach(route => sitemap.write(route));
    sitemap.end();
    const xml = (await streamToPromise(sitemap)).toString();
    await writeFile('./public/sitemap.xml', xml);
    console.log('✅ sitemap.xml generated successfully.');
  } catch (err) {
    console.error('❌ Failed to generate sitemap:', err);
    process.exit(1);
  }
})();
