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

foreach ($name in $order) {
    $out = Join-Path $tmp $name
    Write-Output ''
    Write-Output ('=== ' + $name + ' ===')

    $relsPath = Join-Path $out 'word\_rels\document.xml.rels'
    $rels = @{}
    [xml]$relXml = Get-Content -LiteralPath $relsPath -Raw -Encoding UTF8
    foreach ($rel in $relXml.Relationships.Relationship) { $rels[$rel.Id] = $rel.Target }

    [xml]$docXml = Get-Content -LiteralPath (Join-Path $out 'word\document.xml') -Raw -Encoding UTF8
    $nsm = New-Object System.Xml.XmlNamespaceManager($docXml.NameTable)
    foreach ($k in $ns.Keys) { $nsm.AddNamespace($k, $ns[$k]) }

    # Collect images in document order
    $imgs = @()
    foreach ($blip in $docXml.SelectNodes('//a:blip', $nsm)) {
        $embed = $blip.GetAttribute('embed', $ns.r)
        if ($rels.ContainsKey($embed)) { $imgs += $rels[$embed] }
    }

    # Walk table rows: each row = [index, title, original filename]
    $rowNum = 0
    foreach ($row in $docXml.SelectNodes('//w:tbl/w:tr', $nsm)) {
        $cells = @()
        foreach ($tc in $row.SelectNodes('./w:tc', $nsm)) {
            $t = (($tc.SelectNodes('.//w:t', $nsm) | ForEach-Object { $_.InnerText }) -join '').Trim()
            $cells += $t
        }
        $joined = ($cells | Where-Object { $_ }) -join ' || '
        if ($joined) {
            $rowNum++
            $img = if ($rowNum -le $imgs.Count) { $imgs[$rowNum-1] } else { 'NO-IMG' }
            Write-Output ("ROW {0} :: {1} :: IMG={2}" -f $rowNum, $joined, $img)
        }
    }
    Write-Output ("TOTAL IMAGES IN DOC: " + $imgs.Count)
}
