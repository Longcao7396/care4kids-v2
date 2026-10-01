try {
    # Hit what the React app actually posts to, with the same body the LoginPage sends.
    $r = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/auth/login' `
        -Method POST -ContentType 'application/json' `
        -Headers @{'Origin'='http://localhost:3000'} `
        -Body '{"username":"demo","password":"Demo@123"}' `
        -TimeoutSec 15 -UseBasicParsing
    Write-Host ('STATUS: ' + $r.StatusCode)
    Write-Host ('CORS HEADERS:')
    $r.Headers.GetEnumerator() | Where-Object { $_.Key -match 'access-control' } | ForEach-Object {
        Write-Host ('  ' + $_.Key + ': ' + ($_.Value -join ', '))
    }
} catch {
    Write-Host ('ERROR: ' + $_.Exception.Message)
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host ('BODY: ' + $reader.ReadToEnd())
    }
}