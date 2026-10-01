$path = 'c:\Users\admin\Desktop\project NGO.v2\tests\WebApi.FunctionalTests\Api\DonationsUtf8EncodingTests.cs'
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Show first 4000 chars
Write-Host "Decoded (first 4000 chars):"
Write-Host $text.Substring(0, [Math]::Min(4000, $text.Length))

Write-Host ""
Write-Host "Looking for 'Nguy':"
$idx = $text.IndexOf('Nguy')
if ($idx -ge 0) {
    Write-Host "Found at $idx, showing 20 chars:"
    Write-Host $text.Substring($idx, 20)
}

Write-Host ""
Write-Host "Looking for 'Nguy\u1EC5n':"
$idx2 = $text.IndexOf('Nguy\u1EC5n')
if ($idx2 -ge 0) {
    Write-Host "Found at $idx2"
} else {
    Write-Host "NOT found as escape sequence in source"
}

# Check BOM
if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host ""
    Write-Host "File has UTF-8 BOM"
}

# Count 2-byte UTF-8 sequences
$twoByte = 0
$threeByte = 0
for ($i = 0; $i -lt $bytes.Length - 1; $i++) {
    if ($bytes[$i] -ge 0xC0 -and $bytes[$i] -lt 0xE0 -and $bytes[$i+1] -ge 0x80 -and $bytes[$i+1] -lt 0xC0) {
        $twoByte++
    }
}
Write-Host "Total 2-byte UTF-8 sequences: $twoByte"