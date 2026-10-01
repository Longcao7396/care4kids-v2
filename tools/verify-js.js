// Parse the AdminDonationsPage.js source to verify it's valid JS
// and that the Unicode escape sequences produce the expected chars.
const fs = require('fs');

function checkFile(path) {
  const src = fs.readFileSync(path, 'utf8');
  console.log(`=== ${path} ===`);
  console.log(`File size: ${src.length} bytes`);
  console.log(`Non-ASCII char count: ${[...src].filter(c => c.codePointAt(0) > 127).length}`);
  // Quick check: ensure no mojibake patterns remain
  const mojibakePatterns = [
    /\u00E2\u20AC\u201D/g, // mojibake of U+2500
    /\u00E2\u20AC\u00A6/g, // mojibake of U+2026
    /\u00E2\u20AC\u00BA/g, // mojibake of U+203A
    /\u00E2\u20AC\u00B9/g, // mojibake of U+2039
    /\u00C2\u00B7/g,       // mojibake of U+00B7
  ];
  let totalMojibake = 0;
  for (const p of mojibakePatterns) {
    const m = src.match(p);
    if (m) {
      console.log(`  Pattern ${p} found ${m.length} times`);
      totalMojibake += m.length;
    }
  }
  if (totalMojibake === 0) {
    console.log('  No mojibake patterns found.');
  }

  // Use Function constructor to validate the JS syntax (won't execute React code)
  // We can't actually parse as JS module without a bundler, so just check
  // the file is at least syntactically loadable as JS source.
  try {
    // Wrap in async function to allow await usage and top-level expressions
    new Function('module', 'require', src.replace(/^import .*$/gm, '').replace(/^export .*$/gm, ''));
    console.log('  Syntax: valid (excluding import/export)');
  } catch (e) {
    console.log(`  Syntax error: ${e.message}`);
  }
}

checkFile(process.argv[2]);