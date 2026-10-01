try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3000/login' -TimeoutSec 10 -UseBasicParsing
    Write-Host ('STATUS: ' + $r.StatusCode)
    Write-Host ('CONTENT-TYPE: ' + $r.Headers['Content-Type'])
    Write-Host ('FIRST 500 CHARS:')
    Write-Host ($r.Content.Substring(0, [Math]::Min(500, $r.Content.Length)))
} catch {
    Write-Host ('ERROR: ' + $_.Exception.Message)
}