$path = 'c:\Users\admin\Desktop\project NGO.v2\GiveAID.Client\src\pages\admin\AdminDonationsPage.js'
$bytes = [System.IO.File]::ReadAllBytes($path)

# Find the first occurrence of 'â' as latin1 (byte 0xE2 = â)
$firstA = -1
for ($i = 0; $i -lt $bytes.Length; $i++) {
    if ($bytes[$i] -eq 0xE2) { $firstA = $i; break }
}
Write-Host "First 0xE2 byte at position: $firstA"

# Print next 50 bytes as hex + ASCII
$start = [Math]::Max(0, $firstA - 10)
$end = [Math]::Min($bytes.Length - 1, $firstA + 60)
Write-Host ""
Write-Host ("Bytes from {0} to {1}:" -f $start, $end)
for ($i = $start; $i -le $end; $i++) {
    $b = $bytes[$i]
    $hex = ('{0:X2}' -f $b)
    $ascii = if ($b -ge 32 -and $b -lt 127) { [char]$b } else { '.' }
    Write-Host ("  {0,5}: {1}  ({2})" -f $i, $hex, $ascii)
}

# Also decode that range using UTF-8 to see what JS engine sees
Write-Host ""
Write-Host "UTF-8 decoded around that position:"
$slice = $bytes[$start..$end]
$text = [System.Text.Encoding]::UTF8.GetString($slice)
Write-Host "  >>>$text<<<"

Write-Host ""
Write-Host "Windows-1252 decoded:"
$enc1252 = [System.Text.Encoding]::GetEncoding(1252)
$text1252 = $enc1252.GetString($slice)
Write-Host "  >>>$text1252<<<"

Write-Host ""
Write-Host "ISO-8859-1 decoded:"
$encl1 = [System.Text.Encoding]::GetEncoding(28591)
$textl1 = $encl1.GetString($slice)
Write-Host "  >>>$textl1<<<"