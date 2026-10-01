Add-Type -AssemblyName System.Data
$pipe = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=GiveAIDDB;Integrated Security=True")
$pipe.Open()
$cmd = $pipe.CreateCommand()
$cmd.CommandText = "SELECT gallery_id, title, category FROM gallery WHERE is_deleted=0 ORDER BY gallery_id"
$rdr = $cmd.ExecuteReader()
$rows = @()
while ($rdr.Read()) {
    $id = $rdr.GetInt32(0)
    $title = $rdr.GetString(1)
    $cat = $rdr.GetString(2)
    $rows += [PSCustomObject]@{ ID=$id; Title=$title; Category=$cat }
}
$rdr.Close()
$pipe.Close()
[System.IO.File]::WriteAllText("C:\Users\admin\Desktop\project NGO.v2\gallery_actual.txt", ($rows | Out-String), [System.Text.Encoding]::UTF8)
Write-Host "Wrote file with UTF8 encoding. Sample row 1:"
Write-Host ($rows | Where-Object ID -eq 1 | Select-Object -ExpandProperty Title)