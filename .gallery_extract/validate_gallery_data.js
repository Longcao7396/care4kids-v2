// Validate the galleryData.js export shape without importing React.
const path = require('path');
const fs = require('fs');

// galleryData.js is ES modules — use a tiny transpile via dynamic import
// (Node 22+ supports `import()` of ESM from CJS via eval trick).
(async () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'GiveAID.Client', 'src', 'data', 'galleryData.js'), 'utf8');
    // Strip "export " keywords to evaluate as a plain script
    const stripped = src
        .replace(/export const /g, 'const ')
        .replace(/export default /g, '');
    const wrapped = `${stripped}; module.exports = { GALLERY_CATEGORIES, GALLERY_IMAGES };`;
    const tmpFile = path.join(__dirname, '__gallery_data_tmp.js');
    fs.writeFileSync(tmpFile, wrapped);
    const m = require(tmpFile);
    fs.unlinkSync(tmpFile);
    console.log('Categories:', m.GALLERY_CATEGORIES.length);
    console.log('Images:', m.GALLERY_IMAGES.length);
    console.log('First image:', JSON.stringify({
        id: m.GALLERY_IMAGES[0].id,
        title: m.GALLERY_IMAGES[0].title,
        category: m.GALLERY_IMAGES[0].category,
        location: m.GALLERY_IMAGES[0].location,
    }, null, 2));
})().catch((e) => { console.error('ERR:', e); process.exit(1); });
