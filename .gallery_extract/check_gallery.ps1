$token = (Get-Content 'C:\Users\admin\Desktop\project NGO.v2\archive\admin_token.txt' -Raw).Trim()
$headers = @{ 'Authorization' = 'Bearer ' + $token; 'Accept' = 'application/json' }
try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/gallery?pageSize=200' -Headers $headers -UseBasicParsing
    $body = $resp.Content | ConvertFrom-Json
    Write-Host ('totalCount=' + $body.data.totalCount)
    Write-Host ('items_count=' + $body.data.items.Count)
    if ($body.data.items.Count -gt 0) {
        $body.data.items | Select-Object galleryId,title,category,isFeatured | Format-Table -AutoSize
    }
} catch {
    Write-Host ('ERR: ' + $_.Exception.Message)
}