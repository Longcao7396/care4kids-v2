using BCrypt.Net;

var password = args.Length > 0 ? args[0] : "Admin@123";
var hash = BCrypt.Net.BCrypt.HashPassword(password, 11);
Console.WriteLine(hash);
Console.WriteLine($"Verify: {BCrypt.Net.BCrypt.Verify(password, hash)}");
