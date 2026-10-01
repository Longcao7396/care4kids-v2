# Login to get fresh admin token
$body = @{
    username = 'admin'
    password = 'Admin@123'
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/auth/login' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
    $result = $resp.Content | ConvertFrom-Json
    Write-Host ('Login status: ' + $resp.StatusCode)
    Write-Host ('Success: ' + $result.success)
    Write-Host ('Token: ' + $result.data.token.Substring(0, 50) + '...')
    # Save the token to a file
    $result.data.token | Out-File -FilePath 'C:\Users\admin\Desktop\project NGO.v2\.gallery_extract\admin_fresh.txt' -Encoding utf8 -NoNewline
    Write-Host ('Role: ' + $result.data.user.role)
    Write-Host ('UserId: ' + $result.data.user.userId)
} catch {
    Write-Host ('ERR: ' + $_.Exception.Message)
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host ('Body: ' + $reader.ReadToEnd())
    }
}