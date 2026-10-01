using BCrypt.Net;
using Microsoft.Data.SqlClient;

// Generates a fresh BCrypt hash for "Admin@123" (WorkFactor=11, matches PasswordHasher)
// and updates the admin user row in the local LocalDB.

var password = "Admin@123";
var hash = BCrypt.Net.BCrypt.HashPassword(password, 11);

Console.WriteLine($"New hash: {hash}");
Console.WriteLine($"Self-verify: {BCrypt.Net.BCrypt.Verify(password, hash)}");

const string connStr = "Server=(localdb)\\MSSQLLocalDB;Database=GiveAIDDB;Integrated Security=True;TrustServerCertificate=True";

using var conn = new SqlConnection(connStr);
conn.Open();

using var cmd = conn.CreateCommand();
cmd.CommandText = "UPDATE dbo.Users SET password_hash = @hash, password_changed_at = SYSUTCDATETIME() WHERE username = 'admin'";
cmd.Parameters.AddWithValue("@hash", hash);

var rows = cmd.ExecuteNonQuery();
Console.WriteLine($"Rows updated: {rows}");

// Read back and verify
using var verifyCmd = conn.CreateCommand();
verifyCmd.CommandText = "SELECT password_hash FROM dbo.Users WHERE username = 'admin'";
var storedHash = (string)verifyCmd.ExecuteScalar();
Console.WriteLine($"DB round-trip verify: {BCrypt.Net.BCrypt.Verify(password, storedHash)}");