const fs = require('fs');
const path = require('path');
// Use absolute path resolution to handle Windows backslashes
const babelParserPath = path.resolve(__dirname, '..', 'GiveAID.Client', 'node_modules', '@babel', 'parser');
const babelParser = require(babelParserPath);

function checkFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  console.log(`=== ${path.basename(filePath)} ===`);
  try {
    babelParser.parse(src, {
      sourceType: 'module',
      plugins: ['jsx']
    });
    console.log('  Syntax: VALID JSX/JS');
  } catch (e) {
    console.log(`  Syntax ERROR: ${e.message}`);
    if (e.loc) console.log(`  At line ${e.loc.line}, col ${e.loc.column}`);
  }
  console.log(`  File size: ${src.length} bytes`);
  console.log(`  Non-ASCII char count: ${[...src].filter(c => c.codePointAt(0) > 127).length}`);
  console.log('');
}

const files = [
  'GiveAID.Client/src/pages/admin/AdminDonationsPage.js',
  'GiveAID.Client/src/pages/admin/AdminUsersPage.js',
];
for (const f of files) {
  checkFile(f);
}