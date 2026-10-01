Add-Type -AssemblyName "System.Data.SqlClient"
$conn = New-Object System.Data.SqlClient.SqlConnection "Server=(localdb)\MSSQLLocalDB;Database=GiveAIDDB;Integrated Security=True;TrustServerCertificate=True"
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT user_id, username, password_hash FROM dbo.Users WHERE username IN ('admin','demo') ORDER BY user_id"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("===== user_id=" + $reader["user_id"] + " username=" + $reader["username"] + " =====")
    Write-Host ($reader["password_hash"])
    Write-Host ("Length: " + $reader["password_hash"].ToString().Length)
}
$reader.Close()
$conn.Close()