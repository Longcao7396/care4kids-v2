# Comprehensive mojibake scan using Select-String (very fast).
#
# Approach: read each file as UTF-8 text, then search for canonical
# mojibake strings via [char] casts of the codepoints.

$root = 'c:\Users\admin\Desktop\project NGO.v2'

$jsFiles = Get-ChildItem -Path (Join-Path $root 'GiveAID.Client\src') -Recurse -File |
    Where-Object { $_.Extension -in @('.js','.jsx','.css','.html') }

$csFiles = Get-ChildItem -Path (Join-Path $root 'src') -Recurse -File |
    Where-Object { $_.Extension -eq '.cs' }

$allFiles = @($jsFiles) + @($csFiles)

# Build pattern list using [char]0xNNNN. Each tuple is (label, codepoint array).
$patterns = @(
    # Latin-1 / Western European
    @{ Name = 'e-acute';   Code = 0x00E9 },
    @{ Name = 'e-grave';   Code = 0x00E8 },
    @{ Name = 'a-acute';   Code = 0x00E1 },
    @{ Name = 'a-grave';   Code = 0x00E0 },
    @{ Name = 'n-tilde';   Code = 0x00F1 },
    @{ Name = 'u-umlaut';  Code = 0x00FC },
    @{ Name = 'o-umlaut';  Code = 0x00F6 },
    @{ Name = 'a-umlaut';  Code = 0x00E4 },
    @{ Name = 'c-cedilla'; Code = 0x00E7 },
    @{ Name = 'i-acute';   Code = 0x00ED },
    @{ Name = 'o-acute';   Code = 0x00F3 },
    @{ Name = 'u-acute';   Code = 0x00FA },
    @{ Name = 'i-dieresis';Code = 0x00EF },
    @{ Name = 'e-circ';    Code = 0x00EA },
    @{ Name = 'o-grave';   Code = 0x00F2 },
    @{ Name = 'middot';    Code = 0x00B7 },
    # Vietnamese
    @{ Name = 'd-stroke';  Code = 0x0111 },
    @{ Name = 'D-stroke';  Code = 0x0110 },
    @{ Name = 'o-horn';    Code = 0x01A1 },
    @{ Name = 'O-horn';    Code = 0x01A0 },
    @{ Name = 'u-horn';    Code = 0x01B0 },
    @{ Name = 'U-horn';    Code = 0x01AF },
    @{ Name = 'a-quest';   Code = 0x1EA3 },  # ả
    @{ Name = 'a-breve';  Code = 0x1EB1 },  # ằ
    @{ Name = 'a-circ';   Code = 0x1EA5 },  # ầ
    @{ Name = 'u-tilde';  Code = 0x1EE9 },  # ứ
    @{ Name = 'u-hook';   Code = 0x1EEB },  # ử
    @{ Name = 'o-tilde';  Code = 0x1ECF },  # ọ
    @{ Name = 'o-hook';   Code = 0x1ECD },  # ọ
    # Punctuation
    @{ Name = 'em-dash';   Code = 0x2014 },
    @{ Name = 'en-dash';   Code = 0x2013 },
    @{ Name = 'lquot';     Code = 0x2018 },
    @{ Name = 'rquot';     Code = 0x2019 },
    @{ Name = 'ldquo';     Code = 0x201C },
    @{ Name = 'rdquo';     Code = 0x201D },
    @{ Name = 'hellip';    Code = 0x2026 },
    @{ Name = 'lsaquo';    Code = 0x2039 },
    @{ Name = 'rsaquo';    Code = 0x203A }
)

# Build a single string of "next" codepoint for each pattern. Mojibake is
# only when 0x00E2 (â) or 0x00C3 (Ã) or 0x00C4 (Ä) is followed by a specific
# continuation byte. The truly diagnostic mojibake sequences are:
#   U+00E2 U+20AC U+2014 (â€" em-dash) - 3 chars
#   U+00C3 U+00A9 - not in pattern, but U+00C3 alone is suspicious if followed by U+00A9/U+00A8/...
# So we need to check for 2-char or 3-char sequences.

# Diagnostic 2-char mojibake pairs:
$pairs = @(
    # "â€" prefix sequences
    @{ Name = 'mojibake-em-dash';    A = 0x00E2; B = 0x2014 },
    @{ Name = 'mojibake-en-dash';    A = 0x00E2; B = 0x2013 },
    @{ Name = 'mojibake-rsq';        A = 0x00E2; B = 0x2019 },
    @{ Name = 'mojibake-ldq';        A = 0x00E2; B = 0x201C },
    @{ Name = 'mojibake-rdq';        A = 0x00E2; B = 0x201D },
    @{ Name = 'mojibake-hellip';     A = 0x00E2; B = 0x2026 },
    @{ Name = 'mojibake-middot';     A = 0x00C2; B = 0x00B7 },
    @{ Name = 'mojibake-lsaquo';     A = 0x00E2; B = 0x2039 },
    @{ Name = 'mojibake-rsaquo';     A = 0x00E2; B = 0x203A },
    @{ Name = 'mojibake-lsqu';       A = 0x00E2; B = 0x2018 },
    # "Ã" + Latin-1 byte
    @{ Name = 'mojibake-eacute';     A = 0x00C3; B = 0x00A9 },
    @{ Name = 'mojibake-egrave';     A = 0x00C3; B = 0x00A8 },
    @{ Name = 'mojibake-aacute';     A = 0x00C3; B = 0x00A1 },
    @{ Name = 'mojibake-ntilde';     A = 0x00C3; B = 0x00B1 },
    @{ Name = 'mojibake-uuml';       A = 0x00C3; B = 0x00BC },
    @{ Name = 'mojibake-ouml';       A = 0x00C3; B = 0x00B6 },
    @{ Name = 'mojibake-auml';       A = 0x00C3; B = 0x00A4 },
    @{ Name = 'mojibake-cced';       A = 0x00C3; B = 0x00A7 },
    # Vietnamese specific
    @{ Name = 'mojibake-dstroke';    A = 0x00C4; B = 0x0091 },
    @{ Name = 'mojibake-ohorn';      A = 0x00C6; B = 0x00A1 },
    @{ Name = 'mojibake-uhorn';      A = 0x00C6; B = 0x00B0 }
)

$fileHits = @()
foreach ($f in $allFiles) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)

    $hits = @()
    foreach ($p in $pairs) {
        $a = [char]$p.A
        $b = [char]$p.B
        $count = 0
        $idx2 = 0
        while (($idx2 = $text.IndexOf($a, $idx2)) -ge 0) {
            if ($idx2 + 1 -lt $text.Length -and $text[$idx2 + 1] -eq $b) {
                $count++
                $idx2 += 2
            } else {
                $idx2++
            }
        }
        if ($count -gt 0) {
            $hits += ('{0} x{1}' -f $p.Name, $count)
        }
    }
    if ($hits.Count -gt 0) {
        $relPath = $f.FullName.Substring($root.Length + 1)
        $fileHits += [PSCustomObject]@{
            File = $relPath
            Hits = $hits
        }
    }
}

Write-Host ("Total files scanned: {0}" -f $allFiles.Count)
Write-Host ""
if ($fileHits.Count -gt 0) {
    Write-Host "Files containing mojibake byte-patterns:"
    foreach ($fh in $fileHits) {
        Write-Host ("  {0}" -f $fh.File)
        foreach ($h in $fh.Hits) {
            Write-Host ("    - {0}" -f $h)
        }
    }
    Write-Host ""
    Write-Host ("Total files: {0}" -f $fileHits.Count)
    exit 1
} else {
    Write-Host "SUCCESS: No mojibake patterns found in any source file."
    exit 0
}
