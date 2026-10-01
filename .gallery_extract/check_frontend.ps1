try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:3000/gallery' -UseBasicParsing -TimeoutSec 10
    Write-Host ('status=' + $resp.StatusCode)
    $titleLine = ($resp.Content -split "`n" | Select-String -Pattern '<title' | Select-Object -First 1)
    if ($titleLine) { Write-Host ('title_line=' + $titleLine.ToString().Trim()) }
} catch {
    Write-Host ('ERR: ' + $_.Exception.Message)
}