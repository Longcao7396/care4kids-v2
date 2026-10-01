$path = 'c:\Users\admin\Desktop\project NGO.v2\tools\test-json.js'
@"
const payload = {
  transactionId: 'TXN-001',
  paymentMethod: 'NetBanking',
  paymentStatus: 'Pending',
  emptyDash: '\u2014',
  ellipsis: '\u2026',
  angLeft: '\u2039',
  angRight: '\u203A'
};
console.log(JSON.stringify(payload));
"@ | Out-File -Encoding utf8 $path

Write-Host "Test file written. Running:"
node $path