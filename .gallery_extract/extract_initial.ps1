Set-Location 'C:\Users\admin\Desktop\project NGO.v2'
$files = @(
    @{ Path = 'GiveAID.Client/src/pages/GalleryPage.js';  Out = '.gallery_extract\GalleryPage.initial.js' },
    @{ Path = 'GiveAID.Client/src/pages/GalleryPage.css'; Out = '.gallery_extract\GalleryPage.initial.css' },
    @{ Path = 'GiveAID.Client/src/data/galleryData.js';   Out = '.gallery_extract\galleryData.initial.js' },
    @{ Path = 'wireframes/gallery-wireframe.html';        Out = '.gallery_extract\gallery-wireframe.initial.html' },
    @{ Path = 'GiveAID.Web/Controllers/GalleryController.cs'; Out = '.gallery_extract\GalleryController.initial.cs' }
)
foreach ($f in $files) {
    $content = & git show "cd1bd92:`"$($f.Path)`""
    if ($LASTEXITCODE -eq 0 -and $null -ne $content) {
        [System.IO.File]::WriteAllText((Join-Path (Get-Location) $f.Out), $content, [System.Text.UTF8Encoding]::new($false))
        Write-Host "OK: $($f.Out)"
    } else {
        Write-Host "FAILED: $($f.Path)"
    }
}
Get-ChildItem .gallery_extract\GalleryPage.initial.js,.gallery_extract\GalleryPage.initial.css,.gallery_extract\galleryData.initial.js,.gallery_extract\gallery-wireframe.initial.html,.gallery_extract\GalleryController.initial.cs | Select-Object Name, Length | Format-Table -AutoSize