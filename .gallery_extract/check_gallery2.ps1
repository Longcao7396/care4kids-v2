$token = (Get-Content 'C:\Users\admin\Desktop\project NGO.v2\archive\admin_token.txt' -Raw).Trim()
$headers = @{ 'Authorization' = 'Bearer ' + $token; 'Accept' = 'application/json' }

# Admin auth for full visibility
try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/gallery?pageSize=200' -Headers $headers -UseBasicParsing
    $body = $resp.Content | ConvertFrom-Json
    Write-Host ('[ADMIN] totalCount=' + $body.data.totalCount)
    Write-Host ('[ADMIN] items_count=' + $body.data.items.Count)
    $body.data.items | Select-Object galleryId, title, category, isFeatured | Format-Table -AutoSize
} catch {
    Write-Host ('[ADMIN] ERR: ' + $_.Exception.Message)
}

# Anonymous request (what public gallery sees)
try {
    $resp2 = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/gallery?pageSize=200' -UseBasicParsing
    $body2 = $resp2.Content | ConvertFrom-Json
    Write-Host ('[PUBLIC] totalCount=' + $body2.data.totalCount)
    Write-Host ('[PUBLIC] items_count=' + $body2.data.items.Count)
} catch {
    Write-Host ('[PUBLIC] ERR: ' + $_.Exception.Message)
}