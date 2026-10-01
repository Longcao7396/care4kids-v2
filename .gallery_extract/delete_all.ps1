# Delete all current gallery records using the FRESH token
$token = (Get-Content 'C:\Users\admin\Desktop\project NGO.v2\.gallery_extract\admin_fresh.txt' -Raw).Trim()
$headers = @{ 'Authorization' = 'Bearer ' + $token; 'Accept' = 'application/json' }

try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/gallery?pageSize=200' -Headers $headers -UseBasicParsing
    $body = $resp.Content | ConvertFrom-Json
    Write-Host ('Before delete: totalCount=' + $body.data.totalCount)
    $ids = @($body.data.items | ForEach-Object { $_.galleryId })
    Write-Host ('IDs to delete: ' + ($ids -join ', '))
    foreach ($id in $ids) {
        $del = Invoke-WebRequest -Uri "http://localhost:5231/api/v1/gallery/$id" -Method DELETE -Headers $headers -UseBasicParsing
        Write-Host ("DELETE $id -> status=$($del.StatusCode)")
    }
    # Verify
    $resp2 = Invoke-WebRequest -Uri 'http://localhost:5231/api/v1/gallery?pageSize=200' -Headers $headers -UseBasicParsing
    $body2 = $resp2.Content | ConvertFrom-Json
    Write-Host ('After delete: totalCount=' + $body2.data.totalCount)
} catch {
    Write-Host ('ERR: ' + $_.Exception.Message)
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host ('Body: ' + $reader.ReadToEnd())
    }
}