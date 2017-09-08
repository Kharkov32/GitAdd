const SitemapGenerator = require('sitemap-generator');
const path = require('path');
const mail = require('../handlers/mail');

const generator = SitemapGenerator('https://cbdoilmaps.com', {
    filepath: path.join(__dirname, '../sitemap.xml'),
    maxEntriesPerFile: 50000,
    stripQuerystring: false
});

let errored = [];
generator.on('done', async (stats) => {
    await mail.send({
        user: {email: 'adam.mellor@cbdoilmaps.com'},
        filename: 'sitemap',
        subject: 'Sitemap updated',
        stats, errored
    });
});
generator.on('error', (error) => {
    errored.push(error);
});

generator.start();