using BCrypt.Net;

var password = "Admin@123";
var hash = BCrypt.Net.BCrypt.HashPassword(password, 11);
Console.WriteLine(hash);
// Self-verify
Console.WriteLine($"Verify: {BCrypt.Net.BCrypt.Verify(password, hash)}");