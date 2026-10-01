$path = 'c:\Users\admin\Desktop\project NGO.v2\GiveAID.Client\src\pages\admin\AdminDonationsPage.js'
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Use node to evaluate the string content - just extract the constants
$lines = $text -split "`r?`n"
foreach ($line in $lines) {
    if ($line -match 'const (EM_DASH|ELLIPSIS|MIDDOT|ANGLE_L|ANGLE_R)\s*=') {
        Write-Host $line
    }
}

Write-Host ""
Write-Host "Node verification:"
$nodeScript = @'
const EM_DASH  = '\u2014';
const ELLIPSIS = '\u2026';
const MIDDOT   = '\u00B7';
const ANGLE_L  = '\u2039';
const ANGLE_R  = '\u203A';
console.log('EM_DASH  =', JSON.stringify(EM_DASH), 'codepoint:', EM_DASH.codePointAt(0).toString(16));
console.log('ELLIPSIS =', JSON.stringify(ELLIPSIS), 'codepoint:', ELLIPSIS.codePointAt(0).toString(16));
console.log('MIDDOT   =', JSON.stringify(MIDDOT), 'codepoint:', MIDDOT.codePointAt(0).toString(16));
console.log('ANGLE_L  =', JSON.stringify(ANGLE_L), 'codepoint:', ANGLE_L.codePointAt(0).toString(16));
console.log('ANGLE_R  =', JSON.stringify(ANGLE_R), 'codepoint:', ANGLE_R.codePointAt(0).toString(16));
console.log('Sample string:', `Every donation that has reached GiveAID ${EM_DASH} track status.`);
'@
$tempFile = 'c:\Users\admin\Desktop\project NGO.v2\tools\verify_unicode.js'
$nodeScript | Out-File -Encoding utf8 -NoNewline $tempFile
node $tempFile 2>&1