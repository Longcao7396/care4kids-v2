Set-Location 'C:\Users\admin\Desktop\project NGO.v2'
$code = Get-Content 'GiveAID.Client\src\data\galleryData.js' -Raw
$tmpJs = '.gallery_extract\__parse_check.js'
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $tmpJs), $code)
$out = node --check $tmpJs 2>&1
Remove-Item $tmpJs -ErrorAction SilentlyContinue
if ($LASTEXITCODE -eq 0) {
    Write-Host "SYNTAX OK"
} else {
    Write-Host "SYNTAX ERR:"
    Write-Host $out
}