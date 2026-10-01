try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/auth/login' `
        -Method POST -ContentType 'application/json' `
        -Body '{"username":"admin","password":"Admin@123"}' `
        -TimeoutSec 15 -UseBasicParsing
    Write-Host ('STATUS: ' + $r.StatusCode)
    $body = $r.Content | ConvertFrom-Json
    if ($body.success) {
        Write-Host ('SUCCESS - admin role: ' + $body.data.role)
    } else {
        Write-Host ('BODY: ' + $r.Content)
    }
} catch {
    Write-Host ('ERROR: ' + $_.Exception.Message)
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host ('BODY: ' + $reader.ReadToEnd())
    }
}