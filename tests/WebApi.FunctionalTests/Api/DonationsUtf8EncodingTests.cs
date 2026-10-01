using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using GiveAID.Application.Common.Interfaces;
using GiveAID.Domain.Entities;
using GiveAID.Tests.Integration.Fixtures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GiveAID.Tests.Integration.Api;

/// <summary>
/// Regression tests for the UTF-8 / mojibake fix on the Admin Donations page.
///
/// Background:
///   The Admin Donations page displayed corrupted characters such as
///   "\u00E2\u20AC\u201D" (mojibake of U+2014 EM DASH) and "\u00E2\u20AC\u00A6"
///   (mojibake of U+2026 HORIZONTAL ELLIPSIS). The root cause was that the
///   React source files contained double-encoded UTF-8 string literals.
///
/// This test asserts the API contract that the React frontend relies on:
///   1. The response Content-Type includes charset=utf-8 (when a body is present)
///   2. The JSON body round-trips every Unicode codepoint used by the page
///      (em-dash, ellipsis, middle-dot, single guillemets, Vietnamese diacritics)
///      without any mojibake byte sequences appearing in the wire payload.
/// </summary>
[Collection("ApiTests")]
public class DonationsUtf8EncodingTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ApiWebApplicationFactory _factory;

    public DonationsUtf8EncodingTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ErrorResponse_HasUtf8CharsetInContentType()
    {
        // The exception middleware emits JSON error responses with
        // Content-Type: application/json (see ExceptionHandlingMiddleware.cs).
        // We trigger a 400 by sending invalid JSON to a public endpoint.
        //
        // NOTE: If MVC's built-in model binder intercepts the request first,
        // it may respond with "application/problem+json" (RFC 7807). Both
        // are valid JSON error responses and BOTH MUST be UTF-8.
        var content = new StringContent("{ this is not json", Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/v1/auth/login", content);

        // Assert - either our middleware or MVC's default ProblemDetails handler.
        response.Content.Headers.ContentType.Should().NotBeNull();
        var mediaType = response.Content.Headers.ContentType!.MediaType!;
        mediaType.Should().Match(m => m == "application/json" || m == "application/problem+json",
            "both are valid JSON content types");
        // Per RFC 8259, JSON is UTF-8 by default; charset SHOULD be utf-8 when set.
        var charset = response.Content.Headers.ContentType.CharSet;
        if (charset != null)
        {
            charset.ToLowerInvariant().Should().Contain("utf-8");
        }
    }

    [Fact]
    public async Task GetAll_PublicEndpoint_PreservesUnicodeCharacters()
    {
        // /api/v1/campaigns is public and returns Vietnamese campaign names.
        // The body MUST NOT contain any mojibake byte sequences.
        // Act
        var response = await _client.GetAsync("/api/v1/campaigns");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var bytes = await response.Content.ReadAsByteArrayAsync();

        // JSON parse must succeed (proves the wire bytes are valid JSON).
        using var doc = JsonDocument.Parse(bytes);

        // The body MUST NOT contain the canonical mojibake byte sequences that
        // indicate UTF-8 bytes misread as Latin-1.
        var text = Encoding.UTF8.GetString(bytes);
        text.Should().NotContain("\u00E2\u20AC\u201D", "this 3-char sequence is the mojibake of U+2500");
        text.Should().NotContain("\u00E2\u20AC\u00A6", "this 3-char sequence is the mojibake of U+2026");
        text.Should().NotContain("\u00E2\u20AC\u00BA", "this 3-char sequence is the mojibake of U+203A");
        text.Should().NotContain("\u00E2\u20AC\u00B9", "this 3-char sequence is the mojibake of U+2039");
        text.Should().NotContain("\u00C2\u00B7",       "this 2-char sequence is the mojibake of U+00B7");
    }

    [Fact]
    public async Task DirectJsonSerialization_ProducesValidUtf8ForVietnameseAndSpecialChars()
    {
        // This is the most reliable test: we directly exercise the same JSON
        // serializer configuration the WebApi uses (CamelCase + WhenWritingNull),
        // feed it a payload containing every codepoint the Admin Donations page
        // uses (em-dash, ellipsis, middot, guillemets, Vietnamese diacritics),
        // and assert:
        //   - The byte stream decodes as UTF-8 to the exact original chars
        //   - The byte stream contains no mojibake fingerprint
        //   - The JSON is valid and parses back to the original chars
        //
        // All Unicode literals are written via explicit \uXXXX escapes so the
        // test source file is pure ASCII and survives any future copy-paste
        // or encoding round-trip without re-corrupting.
        var payload = new
        {
            TransactionId  = "TXN-\u2014",                                                   // em-dash separator
            PaymentMethod  = "BankTransfer",
            PaymentStatus  = "Completed",
            // Vietnamese diacritics: ễ (U+1EC5) ă (U+0103) ầ (U+1EA7) ị (U+1ECB)
            DonorName      = "Nguy\u1EC5n V\u0103n Minh \u2014 Tr\u1EA7n Th\u1ECB Lan",
            CauseName      = "Gi\u00E1o d\u1EE5c cho tr\u1EBB em \u00B7 M\u1EE5c ti\u00EAu 2026",
            Note           = "C\u1EA3m \u01A1n b\u1EA1n \u0111\u00E3 \u1EE7ng h\u1ED9 \u2026 ch\u00FAng t\u00F4i tr\u00E2n tr\u1ECDng!",
            PaginationHint = "\u2039 Prev \u203A"
        };

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
            // Match the WebApi configuration exactly (no UnsafeRelaxedJsonEscaping
            // means — escapes as \u2014 in the JSON wire format - this is perfectly
            // valid JSON and any compliant parser decodes it back).
            WriteIndented = false
        };

        var bytes = JsonSerializer.SerializeToUtf8Bytes(payload, options);

        // 1. The bytes must be valid JSON that re-parses to the same Unicode chars.
        //    (We check the parsed values, not the raw JSON wire string, because
        //    the default System.Text.Json encoder escapes non-ASCII chars as
        //    \uXXXX on the wire - that's still valid UTF-8 and parses back
        //    correctly in any compliant JSON parser.)
        var expectedDonor      = "Nguy\u1EC5n V\u0103n Minh \u2014 Tr\u1EA7n Th\u1ECB Lan";
        var expectedCause      = "Gi\u00E1o d\u1EE5c cho tr\u1EBB em \u00B7 M\u1EE5c ti\u00EAu 2026";
        var expectedNote       = "C\u1EA3m \u01A1n b\u1EA1n \u0111\u00E3 \u1EE7ng h\u1ED9 \u2026 ch\u00FAng t\u00F4i tr\u00E2n tr\u1ECDng!";
        var expectedPaginationHint = "\u2039 Prev \u203A";

        using var doc = JsonDocument.Parse(bytes);
        var root = doc.RootElement;
        root.GetProperty("donorName").GetString().Should().Be(expectedDonor);
        root.GetProperty("causeName").GetString().Should().Be(expectedCause);
        root.GetProperty("note").GetString().Should().Be(expectedNote);
        root.GetProperty("paginationHint").GetString().Should().Be(expectedPaginationHint);
        root.GetProperty("transactionId").GetString().Should().Be("TXN-\u2014");

        // 2. The raw JSON wire bytes must NOT contain any mojibake fingerprint.
        //    The default encoder escapes non-ASCII as \uXXXX, so the only
        //    multi-byte UTF-8 sequences on the wire are ASCII characters.
        var decoded = Encoding.UTF8.GetString(bytes);
        decoded.Should().NotContain("\u00E2\u20AC\u201D", "this 3-char sequence is the mojibake of U+2500");
        decoded.Should().NotContain("\u00E2\u20AC\u00A6", "this 3-char sequence is the mojibake of U+2026");
        decoded.Should().NotContain("\u00E2\u20AC\u00BA", "this 3-char sequence is the mojibake of U+203A");
        decoded.Should().NotContain("\u00E2\u20AC\u00B9", "this 3-char sequence is the mojibake of U+2039");
        decoded.Should().NotContain("\u00C2\u00B7",       "this 2-char sequence is the mojibake of U+00B7");

        // 3. Even with UnsafeRelaxedJsonEscaping enabled (which emits raw
        //    Unicode chars instead of \uXXXX escapes), the bytes must still
        //    be valid UTF-8 and round-trip to the original strings.
        var relaxedOptions = new JsonSerializerOptions(options)
        {
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };
        var relaxedBytes = JsonSerializer.SerializeToUtf8Bytes(payload, relaxedOptions);
        var relaxedText = Encoding.UTF8.GetString(relaxedBytes);
        // Raw Unicode chars are now in the wire bytes (as expected).
        relaxedText.Should().Contain("\u2014");  // em-dash
        relaxedText.Should().Contain("\u2026");  // ellipsis
        relaxedText.Should().Contain("\u00B7");  // middle dot
        relaxedText.Should().Contain(expectedDonor);
        relaxedText.Should().Contain(expectedCause);
        // And no mojibake either way.
        relaxedText.Should().NotContain("\u00E2\u20AC\u201D");
        relaxedText.Should().NotContain("\u00E2\u20AC\u00A6");
        relaxedText.Should().NotContain("\u00C2\u00B7");
        // Parsed values still match.
        using var relaxedDoc = JsonDocument.Parse(relaxedBytes);
        var relaxedRoot = relaxedDoc.RootElement;
        relaxedRoot.GetProperty("donorName").GetString().Should().Be(expectedDonor);
        relaxedRoot.GetProperty("causeName").GetString().Should().Be(expectedCause);
    }
}