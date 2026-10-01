try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/auth/login' `
        -Method POST -ContentType 'application/json' `
        -Body '{"username":"demo","password":"Demo@123"}' `
        -TimeoutSec 15 -UseBasicParsing
    Write-Host ('STATUS: ' + $r.StatusCode)
    Write-Host ('BODY: ' + $r.Content)
} catch {
    Write-Host ('ERROR: ' + $_.Exception.Message)
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host ('BODY: ' + $reader.ReadToEnd())
    }
}