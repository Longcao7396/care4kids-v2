Add-Type -AssemblyName System.Text.Encoding
$root = 'c:\Users\admin\Desktop\project NGO.v2'

$paths = @(
    (Join-Path $root 'GiveAID.Client\src'),
    (Join-Path $root 'src')
)

$files = foreach ($p in $paths) {
    Get-ChildItem -Path $p -Recurse -File | Where-Object { $_.Extension -in @('.js','.jsx','.css','.html','.cs') }
}

# Diagnostic 2-char mojibake sequences
$targets = @(
    @{ A = 0x00E2; B = 0x2014 },  # em-dash
    @{ A = 0x00E2; B = 0x2013 },  # en-dash
    @{ A = 0x00E2; B = 0x2019 },  # right single quote
    @{ A = 0x00E2; B = 0x201C },  # left double quote
    @{ A = 0x00E2; B = 0x201D },  # right double quote
    @{ A = 0x00E2; B = 0x2026 },  # ellipsis
    @{ A = 0x00C2; B = 0x00B7 },  # middot
    @{ A = 0x00E2; B = 0x2039 },  # lsaquo
    @{ A = 0x00E2; B = 0x203A },  # rsaquo
    @{ A = 0x00E2; B = 0x2018 },  # lsqu
    @{ A = 0x00C3; B = 0x00A9 },  # é
    @{ A = 0x00C3; B = 0x00A8 },  # è
    @{ A = 0x00C3; B = 0x00A1 },  # á
    @{ A = 0x00C3; B = 0x00B1 },  # ñ
    @{ A = 0x00C3; B = 0x00BC },  # ü
    @{ A = 0x00C3; B = 0x00B6 },  # ö
    @{ A = 0x00C3; B = 0x00A4 },  # ä
    @{ A = 0x00C3; B = 0x00A7 },  # ç
    @{ A = 0x00C4; B = 0x0091 },  # đ
    @{ A = 0x00C6; B = 0x00A1 },  # ơ
    @{ A = 0x00C6; B = 0x00B0 }   # ư
)

$hits = @()
foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    if ($bytes.Length -lt 2) { continue }
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    foreach ($t in $targets) {
        $a = [char]$t.A
        $b = [char]$t.B
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
            $relPath = $f.FullName.Substring($root.Length + 1)
            $hits += [PSCustomObject]@{
                File    = $relPath
                Pattern = ('U+{0:X4} U+{1:X4}' -f $t.A, $t.B)
                Count   = $count
            }
        }
    }
}

Write-Host ("Files scanned: {0}" -f $files.Count)
Write-Host ""
if ($hits.Count -gt 0) {
    Write-Host "Mojibake byte-pattern hits:"
    $hits | Format-Table -AutoSize
    Write-Host ("Total hits: {0}" -f $hits.Count)
    exit 1
} else {
    Write-Host "CLEAN: No mojibake byte-patterns found."
    exit 0
}
