$ErrorActionPreference = 'Stop'
$root = 'C:\Users\admin\Desktop\project NGO.v2'
$tmp  = Join-Path $root '.gallery_extract'

$ns = @{
    w   = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    a   = 'http://schemas.openxmlformats.org/drawingml/2006/main'
    r   = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

$order = @(
    'NGO_Gallery_Titles',
    'NGO_Gallery_Titles_Batch2',
    'NGO_Gallery_Titles_Batch3',
    'NGO_Gallery_Titles_Batch4'
)

# Regex to split a cell's flattened text into: number, title, filename
# Pattern: <digits><spaces><Title...><filename ending in .ext>
$cellRegex = [regex]'^(?<num>\d+)\s+(?<rest>.+)$'
$fileRegex = [regex]'(?<fname>[A-Za-z0-9_\-\.\(\)]+\.(jpg|jpeg|png|webp|gif))$'

$manifest = @()

foreach ($name in $order) {
    $out = Join-Path $tmp $name

    $relsPath = Join-Path $out 'word\_rels\document.xml.rels'
    $rels = @{}
    [xml]$relXml = Get-Content -LiteralPath $relsPath -Raw -Encoding UTF8
    foreach ($rel in $relXml.Relationships.Relationship) { $rels[$rel.Id] = $rel.Target }

    [xml]$docXml = Get-Content -LiteralPath (Join-Path $out 'word\document.xml') -Raw -Encoding UTF8
    $nsm = New-Object System.Xml.XmlNamespaceManager($docXml.NameTable)
    foreach ($k in $ns.Keys) { $nsm.AddNamespace($k, $ns[$k]) }

    # Images in document order (flat list)
    $imgs = @()
    foreach ($blip in $docXml.SelectNodes('//a:blip', $nsm)) {
        $embed = $blip.GetAttribute('embed', $ns.r)
        if ($rels.ContainsKey($embed)) { $imgs += $rels[$embed] }
    }

    # Titles in order: walk every table cell, each cell may itself be "NN Title filename"
    # but rows had 2 cells = 2 photo entries. Flatten in row-then-cell order.
    $titleEntries = @()
    foreach ($row in $docXml.SelectNodes('//w:tbl/w:tr', $nsm)) {
        foreach ($tc in $row.SelectNodes('./w:tc', $nsm)) {
            $t = (($tc.SelectNodes('.//w:t', $nsm) | ForEach-Object { $_.InnerText }) -join '').Trim()
            if ($t) { $titleEntries += $t }
        }
    }

    Write-Output ('=== ' + $name + ' : ' + $titleEntries.Count + ' title-cells, ' + $imgs.Count + ' images ===')

    for ($i = 0; $i -lt $titleEntries.Count; $i++) {
        $cell = $titleEntries[$i]
        $m = $cellRegex.Match($cell)
        $num = if ($m.Success) { $m.Groups['num'].Value } else { '?' }
        $rest = if ($m.Success) { $m.Groups['rest'].Value } else { $cell }
        $fm = $fileRegex.Match($rest)
        $fname = if ($fm.Success) { $fm.Groups['fname'].Value } else { '' }
        $title = if ($fm.Success) { $rest.Substring(0, $fm.Index).Trim() } else { $rest }

        $img = if ($i -lt $imgs.Count) { Join-Path $out $imgs[$i] } else { $null }
        # normalize media path separators
        if ($img) { $img = $img -replace '/', '\' }

        $manifest += [PSCustomObject]@{
            Num          = $num
            Title        = $title
            OrigFileName = $fname
            ImagePath    = $img
            Doc          = $name
        }
    }
}

Write-Output ''
Write-Output ('TOTAL MANIFEST ENTRIES: ' + $manifest.Count)
$manifest | ForEach-Object {
    Write-Output ("{0} | {1} | {2} | {3}" -f $_.Num, $_.Title, $_.OrigFileName, (Split-Path $_.ImagePath -Leaf))
}

$manifestPath = Join-Path $root '.gallery_extract\manifest.json'
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Output ('MANIFEST JSON: ' + $manifestPath)
