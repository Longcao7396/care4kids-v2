using BCrypt.Net;

// admin hash from DB
var adminHash = "$2a$11$DmvHDrx7G1PK327EFsGblutSAyGGU8eQ8WEQivI0xTRNfC8LyGQ2O";
var demoHash  = "$2a$11$fJHVCD5ovhgDH2qS4b2AkOnAX7XavhQc0SnN4SphZNnI3yhz1e/aK";

Console.WriteLine($"admin hash + Admin@123 -> {BCrypt.Net.BCrypt.Verify("Admin@123", adminHash)}");
Console.WriteLine($"admin hash + admin     -> {BCrypt.Net.BCrypt.Verify("admin", adminHash)}");
Console.WriteLine($"admin hash + Demo@123  -> {BCrypt.Net.BCrypt.Verify("Demo@123", adminHash)}");

Console.WriteLine($"demo  hash + Demo@123  -> {BCrypt.Net.BCrypt.Verify("Demo@123", demoHash)}");
Console.WriteLine($"demo  hash + demo      -> {BCrypt.Net.BCrypt.Verify("demo", demoHash)}");
Console.WriteLine($"demo  hash + Admin@123 -> {BCrypt.Net.BCrypt.Verify("Admin@123", demoHash)}");