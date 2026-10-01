Set-Location 'C:\Users\admin\Desktop\project NGO.v2'
$files = @(
    @{ Ref = 'master';  Path = 'GiveAID.Client/src/pages/GalleryPage.js';    Out = '.gallery_extract\GalleryPage.master.js' },
    @{ Ref = 'master';  Path = 'GiveAID.Client/src/data/galleryData.js';     Out = '.gallery_extract\galleryData.master.js' },
    @{ Ref = 'master';  Path = 'GiveAID.Client/src/pages/GalleryPage.css';   Out = '.gallery_extract\GalleryPage.master.css' }
)
foreach ($f in $files) {
    $content = & git show "$($f.Ref):`"$($f.Path)`"" 2>&1
    if ($LASTEXITCODE -eq 0 -and $null -ne $content) {
        [System.IO.File]::WriteAllText((Join-Path (Get-Location) $f.Out), $content, [System.Text.UTF8Encoding]::new($false))
        Write-Host "OK: $($f.Out)"
    } else {
        Write-Host "FAILED: $($f.Path)"
    }
}
Get-ChildItem .gallery_extract\GalleryPage.master.js,.gallery_extract\galleryData.master.js,.gallery_extract\GalleryPage.master.css | Select-Object Name, Length | Format-Table -AutoSize