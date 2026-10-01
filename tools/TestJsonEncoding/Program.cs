using System;
using System.Text.Json;
using System.Text.Encodings.Web;

var payload = new {
    TransactionId = "TXN-001",
    PaymentMethod = "NetBanking",
    EmptyDash = "\u2014",
    Ellipsis = "\u2026",
    AngLeft = "\u2039",
    AngRight = "\u203A"
};

Console.WriteLine("Default encoder:");
Console.WriteLine(JsonSerializer.Serialize(payload));

var opts = new JsonSerializerOptions {
    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
};
Console.WriteLine();
Console.WriteLine("UnsafeRelaxedJsonEscaping encoder:");
Console.WriteLine(JsonSerializer.Serialize(payload, opts));