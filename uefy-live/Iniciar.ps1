$ErrorActionPreference = 'Stop'
$uefyRoot = $PSScriptRoot
$uefyOrigin = 'http://127.0.0.1:17831'
try { $uefyHealth = Invoke-RestMethod ($uefyOrigin + '/health') -TimeoutSec 2 } catch { $uefyHealth = $null }
if ($uefyHealth -and $uefyHealth.app -ne 'UEFY LIVE') { throw 'A porta 17831 está ocupada por outro aplicativo.' }
if (-not $uefyHealth) {
 $uefyCandidates = @((Join-Path $env:ProgramFiles 'nodejs\node.exe'),(Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'))
 $uefyCommand = Get-Command node.exe -ErrorAction SilentlyContinue
 if ($uefyCommand) { $uefyCandidates = @($uefyCommand.Source) + $uefyCandidates }
 $uefyNode = $uefyCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
 if (-not $uefyNode) { throw 'Node.js 20 ou superior não encontrado.' }
 Start-Process -FilePath $uefyNode -ArgumentList ('"' + (Join-Path $uefyRoot 'server.mjs') + '"') -WorkingDirectory $uefyRoot -WindowStyle Hidden
 for ($uefyAttempt=0; $uefyAttempt -lt 30; $uefyAttempt++) {
  Start-Sleep -Milliseconds 200
  try { $uefyHealth = Invoke-RestMethod ($uefyOrigin + '/health') -TimeoutSec 1; break } catch {}
 }
 if (-not $uefyHealth -or $uefyHealth.app -ne 'UEFY LIVE') { throw 'A central não iniciou.' }
}
Start-Process ($uefyOrigin + '/painel.html')
