Add-Type -AssemblyName System.Data
$pipe = New-Object System.Data.SqlClient.SqlConnection("Server=(localdb)\MSSQLLocalDB;Database=GiveAIDDB;Integrated Security=True")
$pipe.Open()
$cmd = $pipe.CreateCommand()
$cmd.CommandText = "SELECT gallery_id, title, category FROM gallery WHERE is_deleted=0 ORDER BY gallery_id"
$rdr = $cmd.ExecuteReader()
$w1252 = [System.Text.Encoding]::GetEncoding("Windows-1252")
$rows = @()
while ($rdr.Read()) {
    $id = $rdr.GetInt32(0)
    $title = $rdr.GetString(1)
    # The DB column has VARCHAR with cp1252 collation; .NET reads it as a System.String
    # whose internal bytes ARE the original Vietnamese UTF-8 octets mapped to cp1252 chars.
    # Re-encode to raw bytes (default ANSI), then decode as UTF-8 to get the correct text.
    $rawBytes = [System.Text.Encoding]::GetEncoding("Windows-1252").GetBytes($title)
    try {
        $asUtf8 = [System.Text.Encoding]::UTF8.GetString($rawBytes)
    } catch {
        $asUtf8 = $title
    }
    $cat = $rdr.GetString(2)
    $rows += [PSCustomObject]@{ ID=$id; Title=$asUtf8; Category=$cat }
}
$rdr.Close()
$pipe.Close()
$rows | Format-Table -AutoSize -Wrap
$rows | Export-Csv -Encoding utf8 -Path "C:\Users\admin\Desktop\project NGO.v2\gallery_decoded.csv" -NoTypeInformation
Write-Host "Written CSV."