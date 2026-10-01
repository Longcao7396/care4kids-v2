Write-Host '=== TEST: Wrong password demo ==='
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/auth/login' `
        -Method POST -ContentType 'application/json' `
        -Body '{"username":"demo","password":"WrongPass"}' `
        -TimeoutSec 15 -UseBasicParsing
    Write-Host ('STATUS: ' + $r.StatusCode + ' BODY: ' + $r.Content)
} catch {
    Write-Host ('STATUS: ' + $_.Exception.Response.StatusCode)
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host ('BODY: ' + $reader.ReadToEnd())
}

Write-Host ''
Write-Host '=== TEST: demo account via EMAIL (should fail) ==='
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/auth/login' `
        -Method POST -ContentType 'application/json' `
        -Body '{"username":"demo@give-aid.org","password":"Demo@123"}' `
        -TimeoutSec 15 -UseBasicParsing
    Write-Host ('STATUS: ' + $r.StatusCode + ' BODY: ' + $r.Content)
} catch {
    Write-Host ('STATUS: ' + $_.Exception.Response.StatusCode)
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host ('BODY: ' + $reader.ReadToEnd())
}

Write-Host ''
Write-Host '=== TEST: Unknown user (timing oracle) ==='
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/auth/login' `
        -Method POST -ContentType 'application/json' `
        -Body '{"username":"nonexistent","password":"Demo@123"}' `
        -TimeoutSec 15 -UseBasicParsing
    Write-Host ('STATUS: ' + $r.StatusCode + ' BODY: ' + $r.Content)
} catch {
    Write-Host ('STATUS: ' + $_.Exception.Response.StatusCode)
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host ('BODY: ' + $reader.ReadToEnd())
}

Write-Host ''
Write-Host '=== TEST: Empty username (validator) ==='
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/auth/login' `
        -Method POST -ContentType 'application/json' `
        -Body '{"username":"","password":"Demo@123"}' `
        -TimeoutSec 15 -UseBasicParsing
    Write-Host ('STATUS: ' + $r.StatusCode + ' BODY: ' + $r.Content)
} catch {
    Write-Host ('STATUS: ' + $_.Exception.Response.StatusCode)
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host ('BODY: ' + $reader.ReadToEnd())
}

Write-Host ''
Write-Host '=== TEST: Case-insensitive username (DEMO) ==='
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/auth/login' `
        -Method POST -ContentType 'application/json' `
        -Body '{"username":"DEMO","password":"Demo@123"}' `
        -TimeoutSec 15 -UseBasicParsing
    Write-Host ('STATUS: ' + $r.StatusCode + ' BODY: ' + $r.Content.Substring(0, [Math]::Min(200, $r.Content.Length)))
} catch {
    Write-Host ('STATUS: ' + $_.Exception.Response.StatusCode)
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host ('BODY: ' + $reader.ReadToEnd())
}