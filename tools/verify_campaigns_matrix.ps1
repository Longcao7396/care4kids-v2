Add-Type -AssemblyName System.Data

function Get-DbRows($table, $where) {
    $pipe = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=GiveAIDDB;Integrated Security=True")
    $pipe.Open()
    $cmd = $pipe.CreateCommand()
    $cmd.CommandText = "SELECT campaign_id, campaign_name, cause_id, goal_amount, raised_amount, status, is_featured, image_url FROM campaigns WHERE is_deleted=0 ORDER BY campaign_id"
    $rdr = $cmd.ExecuteReader()
    $rows = @()
    while ($rdr.Read()) {
        $rows += [PSCustomObject]@{
            ID = $rdr.GetInt32(0)
            Name = $rdr.GetString(1)
            Cause = $rdr.GetInt32(2)
            Goal = $rdr.GetDecimal(3)
            Raised = $rdr.GetDecimal(4)
            Status = $rdr.GetString(5)
            Featured = $rdr.GetBoolean(6)
            Image = $rdr.GetString(7)
        }
    }
    $rdr.Close()
    $pipe.Close()
    return $rows
}

# Get DB rows
$dbRows = Get-DbRows

# Get API rows
$api = Invoke-RestMethod -Uri "http://localhost:5231/api/v1/campaigns?pageSize=200" -Method Get
$apiRows = $api.data.items

# Build matrix
$report = @()
$matches = 0
$mismatches = 0
foreach ($dbRow in $dbRows) {
    $apiRow = $apiRows | Where-Object { $_.campaignId -eq $dbRow.ID } | Select-Object -First 1
    if (-not $apiRow) {
        $mismatches++
        $report += [PSCustomObject]@{ ID=$dbRow.ID; Match="DB_ONLY"; Field="EXISTENCE"; DB="yes"; API="no"; Public="no" }
        continue
    }
    $checks = @{
        Name = ($dbRow.Name -eq $apiRow.campaignName)
        Cause = ($dbRow.Cause -eq $apiRow.causeId)
        Goal = ($dbRow.Goal -eq $apiRow.goalAmount)
        Raised = ($dbRow.Raised -eq $apiRow.raisedAmount)
        Status = ($dbRow.Status -eq $apiRow.status)
        Featured = ($dbRow.Featured -eq $apiRow.isFeatured)
        Image = ($dbRow.Image -eq $apiRow.imageUrl)
    }
    $allMatch = ($checks.Values | Where-Object { -not $_ } | Measure-Object).Count -eq 0
    if ($allMatch) { $matches++ } else { $mismatches++ }
    foreach ($k in $checks.Keys) {
        if (-not $checks[$k]) {
            $report += [PSCustomObject]@{ ID=$dbRow.ID; Match="MISMATCH"; Field=$k; DB=$dbRow.($k); API=$apiRow.($k); Public="depends" }
        }
    }
}

Write-Host "Total DB rows:" $dbRows.Count
Write-Host "Total API rows:" $apiRows.Count
Write-Host "Matching rows:" $matches
Write-Host "Mismatches:" $mismatches
Write-Host ""
Write-Host "Mismatched fields:"
$report | Format-Table -AutoSize

$report | Export-Csv -Encoding utf8 -Path "C:\Users\admin\Desktop\project NGO.v2\campaigns_matrix.csv" -NoTypeInformation
Write-Host "Saved matrix to campaigns_matrix.csv"