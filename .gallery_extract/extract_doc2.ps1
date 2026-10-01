Set-Location 'C:\Users\admin\Desktop\project NGO.v2'
$files = @(
    @{ Ref = 'cd1bd92'; Path = 'wireframes/documentation/GALLERY_PAGE_DOCUMENTATION.md'; Out = '.gallery_extract\GALLERY_PAGE_DOCUMENTATION.initial.md' },
    @{ Ref = 'cd1bd92'; Path = 'GiveAID.Client/src/pages/admin/AdminGalleryPage.js'; Out = '.gallery_extract\AdminGalleryPage.initial.js' }
)
foreach ($f in $files) {
    $content = & git show "$($f.Ref):`"$($f.Path)`""
    if ($LASTEXITCODE -eq 0 -and $null -ne $content) {
        [System.IO.File]::WriteAllText((Join-Path (Get-Location) $f.Out), $content, [System.Text.UTF8Encoding]::new($false))
        Write-Host "OK: $($f.Out)"
    } else {
        Write-Host "FAILED: $($f.Path)"
    }
}
Get-ChildItem .gallery_extract\GALLERY_PAGE_DOCUMENTATION.initial.md,.gallery_extract\AdminGalleryPage.initial.js | Select-Object Name, Length | Format-Table -AutoSize