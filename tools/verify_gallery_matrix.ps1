Add-Type -AssemblyName System.Data
$pipe = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=GiveAIDDB;Integrated Security=True")
$pipe.Open()
$cmd = $pipe.CreateCommand()
$cmd.CommandText = "SELECT gallery_id, title, category, is_featured, photo_url, display_order FROM gallery WHERE is_deleted=0 ORDER BY gallery_id"
$rdr = $cmd.ExecuteReader()
$dbRows = @()
while ($rdr.Read()) {
    $dbRows += [PSCustomObject]@{
        ID = $rdr.GetInt32(0)
        Title = $rdr.GetString(1)
        Category = $rdr.GetString(2)
        Featured = $rdr.GetBoolean(3)
        PhotoUrl = $rdr.GetString(4)
        DisplayOrder = $rdr.GetInt32(5)
    }
}
$rdr.Close()
$pipe.Close()

$api = Invoke-RestMethod -Uri "http://localhost:5231/api/v1/gallery?pageSize=200" -Method Get
$apiRows = $api.data.items

$report = @()
$matches = 0
$mismatches = 0
foreach ($dbRow in $dbRows) {
    $apiRow = $apiRows | Where-Object { $_.galleryId -eq $dbRow.ID } | Select-Object -First 1
    if (-not $apiRow) {
        $mismatches++
        $report += [PSCustomObject]@{ ID=$dbRow.ID; Match="DB_ONLY"; Field="EXISTENCE" }
        continue
    }
    $checks = @{
        Title = ($dbRow.Title -eq $apiRow.title)
        Category = ($dbRow.Category -eq $apiRow.category)
        Featured = ($dbRow.Featured -eq $apiRow.isFeatured)
        PhotoUrl = ($dbRow.PhotoUrl -eq $apiRow.photoUrl)
        DisplayOrder = ($dbRow.DisplayOrder -eq $apiRow.displayOrder)
    }
    $allMatch = ($checks.Values | Where-Object { -not $_ } | Measure-Object).Count -eq 0
    if ($allMatch) { $matches++ } else { $mismatches++ }
    foreach ($k in $checks.Keys) {
        if (-not $checks[$k]) {
            $report += [PSCustomObject]@{ ID=$dbRow.ID; Match="MISMATCH"; Field=$k; DB=$dbRow.($k); API=$apiRow.($k) }
        }
    }
}

Write-Host "DB active gallery rows:" $dbRows.Count
Write-Host "API items:" $apiRows.Count
Write-Host "Matching rows:" $matches
Write-Host "Mismatches:" $mismatches
if ($mismatches -gt 0) { $report | Format-Table -AutoSize -Wrap }
$report | Export-Csv -Encoding utf8 -Path "C:\Users\admin\Desktop\project NGO.v2\gallery_matrix.csv" -NoTypeInformation