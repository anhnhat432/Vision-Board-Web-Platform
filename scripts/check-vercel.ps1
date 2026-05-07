$ErrorActionPreference = 'Stop'
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $r = Invoke-WebRequest -Uri 'https://vision-board-web-platform.vercel.app' -TimeoutSec 15 -UseBasicParsing
    Write-Host "StatusCode: $($r.StatusCode)"
} catch {
    Write-Host "ErrorType: $($_.Exception.GetType().Name)"
    Write-Host "Message: $($_.Exception.Message)"
}
