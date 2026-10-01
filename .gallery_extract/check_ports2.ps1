Set-Location 'C:\Users\admin\Desktop\project NGO.v2'
$ports = @(5000, 5001, 5231, 7000, 7001, 8080, 8081, 3000, 3001)
foreach ($p in $ports) {
    try {
        $c = New-Object System.Net.Sockets.TcpClient
        $iar = $c.BeginConnect('127.0.0.1', $p, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne(800, $false)
        if ($ok -and $c.Connected) {
            Write-Host ("Port ${p}: LISTENING")
            $c.Close()
        } else {
            Write-Host ("Port ${p}: closed")
            $c.Close()
        }
    } catch {
        Write-Host ("Port ${p}: $($_.Exception.Message)")
    }
}