Add-Type -AssemblyName System.Text.Encoding
$paths = @(
  'src\Infrastructure\Persistence\Seed\SeedData.cs',
  'src\Scripts\UpsertRealPhotos\Mapping.cs'
)

foreach ($p in $paths) {
  $bytes = [System.IO.File]::ReadAllBytes($p)
  $content = [System.Text.Encoding]::UTF8.GetString($bytes)
  Write-Host '===' $p '==='
  Write-Host 'Bytes:' $bytes.Length '  Text-chars:' $content.Length

  $lines = $content -split "`n"
  $mojibakeLines = @()
  for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    $hasMojibake = $false
    if ($line -match 'L[^A-Za-z]p h' -or $line -match 'Kh[^A-Za-z]m s' -or $line -match 'X[^A-Za-z]y nh') { $hasMojibake = $true }
    if ($hasMojibake) {
      $mojibakeLines += ("{0,4}: {1}" -f ($i+1), $line.Trim())
    }
  }
  Write-Host 'Mojibake-candidate lines (count):' $mojibakeLines.Count
  if ($mojibakeLines.Count -gt 0) {
    $mojibakeLines | Select-Object -First 5 | ForEach-Object { Write-Host $_ }
  }
}
