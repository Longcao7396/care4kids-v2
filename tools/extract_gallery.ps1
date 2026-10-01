$ErrorActionPreference = 'Stop'
$root = 'C:\Users\admin\Desktop\project NGO.v2'

# Discover the gallery source folder by wildcard so the Vietnamese name never
# has to survive a trip through the command-line encoding.
$src = Get-ChildItem -LiteralPath $root -Directory |
    Where-Object { $_.Name -match 'gallery' -and $_.Name -notmatch '^\.' } |
    Select-Object -First 1

if (-not $src) { throw 'Gallery source folder not found' }
Write-Output ("SOURCE FOLDER: " + $src.Name)

$tmp = Join-Path $root '.gallery_extract'
if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force }
New-Item -ItemType Directory -Path $tmp | Out-Null

$ns = @{
    w  = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    a  = 'http://schemas.openxmlformats.org/drawingml/2006/main'
    r  = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    pic= 'http://schemas.openxmlformats.org/drawingml/2006/picture'
}

foreach ($doc in (Get-ChildItem -LiteralPath $src.FullName -Filter *.docx | Sort-Object Name)) {
    $zip = Join-Path $tmp ($doc.BaseName + '.zip')
    Copy-Item -LiteralPath $doc.FullName -Destination $zip
    $out = Join-Path $tmp $doc.BaseName
    Expand-Archive -LiteralPath $zip -DestinationPath $out -Force

    Write-Output ''
    Write-Output ('=== DOCX: ' + $doc.BaseName + ' ===')

    # rId -> media target map
    $relsPath = Join-Path $out 'word\_rels\document.xml.rels'
    $rels = @{}
    if (Test-Path -LiteralPath $relsPath) {
        [xml]$relXml = Get-Content -LiteralPath $relsPath -Raw
        foreach ($rel in $relXml.Relationships.Relationship) {
            $rels[$rel.Id] = $rel.Target
        }
    }

    [xml]$docXml = Get-Content -LiteralPath (Join-Path $out 'word\document.xml') -Raw
    $nsm = New-Object System.Xml.XmlNamespaceManager($docXml.NameTable)
    foreach ($k in $ns.Keys) { $nsm.AddNamespace($k, $ns[$k]) }

    # Walk block-level children of the body in document order.
    $body = $docXml.SelectSingleNode('//w:body', $nsm)
    $idx = 0
    foreach ($node in $body.ChildNodes) {
        # Any images inside this block?
        $blips = $node.SelectNodes('.//a:blip', $nsm)
        foreach ($blip in $blips) {
            $embed = $blip.GetAttribute('embed', $ns.r)
            $target = if ($rels.ContainsKey($embed)) { $rels[$embed] } else { '??' }
            $idx++
            Write-Output ("  [IMG {0}] {1}" -f $idx, $target)
        }
        # Text of this block
        $texts = $node.SelectNodes('.//w:t', $nsm)
        if ($texts.Count -gt 0) {
            $line = (($texts | ForEach-Object { $_.InnerText }) -join '').Trim()
            if ($line) { Write-Output ("  TEXT: " + $line) }
        }
    }
}

Write-Output ''
Write-Output '=== MEDIA FILE INVENTORY ==='
Get-ChildItem -LiteralPath $tmp -Recurse -File |
    Where-Object { $_.DirectoryName -match 'media' } |
    ForEach-Object {
        $dim = ''
        try {
            Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
            $img = [System.Drawing.Image]::FromFile($_.FullName)
            $dim = "$($img.Width)x$($img.Height)"
            $img.Dispose()
        } catch { $dim = 'n/a' }
        $parent = Split-Path (Split-Path $_.DirectoryName -Parent) -Leaf
        Write-Output ("{0} | {1} | {2} | {3} KB" -f $parent, $_.Name, $dim, [math]::Round($_.Length/1KB))
    }
