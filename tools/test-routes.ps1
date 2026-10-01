Write-Host '=== TEST 1: Root / ==='
try { (Invoke-WebRequest -Uri 'http://localhost:3000/' -TimeoutSec 10 -UseBasicParsing).StatusCode } catch { Write-Host ('  ERR: ' + $_.Exception.Message) }

Write-Host '=== TEST 2: /login (SPA route) ==='
try { (Invoke-WebRequest -Uri 'http://localhost:3000/login' -TimeoutSec 10 -UseBasicParsing).StatusCode } catch { Write-Host ('  ERR: ' + $_.Exception.Message) }

Write-Host '=== TEST 3: index.html ==='
try { (Invoke-WebRequest -Uri 'http://localhost:3000/index.html' -TimeoutSec 10 -UseBasicParsing).StatusCode } catch { Write-Host ('  ERR: ' + $_.Exception.Message) }

Write-Host '=== TEST 4: Backend healthz ==='
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5231/healthz' -TimeoutSec 10 -UseBasicParsing
    Write-Host ('  STATUS: ' + $r.StatusCode + ' BODY: ' + $r.Content)
} catch { Write-Host ('  ERR: ' + $_.Exception.Message) }

Write-Host '=== TEST 5: Backend causes (public) ==='
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/causes' -TimeoutSec 10 -UseBasicParsing
    Write-Host ('  STATUS: ' + $r.StatusCode + ' FIRST 200: ' + $r.Content.Substring(0, [Math]::Min(200, $r.Content.Length)))
} catch { Write-Host ('  ERR: ' + $_.Exception.Message) }