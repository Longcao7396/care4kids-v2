Set-Location 'C:\Users\admin\Desktop\project NGO.v2'
$refs = @('c13391f', '2d0075b')
foreach ($r in $refs) {
    $arg = $r + ':"GiveAID.Client/src/data/galleryData.js"'
    $content = & git show $arg
    if ($LASTEXITCODE -eq 0 -and $null -ne $content) {
        $out = ".gallery_extract\galleryData.$r.js"
        [System.IO.File]::WriteAllText((Join-Path (Get-Location) $out), $content, [System.Text.UTF8Encoding]::new($false))
        Write-Host "OK: $out"
    } else {
        Write-Host "FAILED: $r"
    }
}
Get-ChildItem .gallery_extract\galleryData.c13391f.js,.gallery_extract\galleryData.2d0075b.js | Select-Object Name, Length | Format-Table -AutoSize