param(
    [ValidateSet('tudo', 'api', 'web', 'celular', 'preparar', 'migrar')]
    [string]$Servico = 'tudo',
    [string]$IP,
    [int]$PortaApi,
    [int]$PortaExpo,
    [switch]$LimparCache,
    [switch]$Verificar
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Instale Node 22.23.1 e abra um novo terminal. Consulte STARTUP.md.'
}
$serviceNames = @{ tudo = 'all'; api = 'api'; web = 'web'; celular = 'lan'; preparar = 'setup'; migrar = 'migrate' }
$startupArgs = @((Join-Path $PSScriptRoot 'scripts/dev.cjs'), $serviceNames[$Servico])
if ($IP) { $startupArgs += @('--host', $IP) }
if ($PSBoundParameters.ContainsKey('PortaApi')) { $startupArgs += @('--api-port', [string]$PortaApi) }
if ($PSBoundParameters.ContainsKey('PortaExpo')) { $startupArgs += @('--port', [string]$PortaExpo) }
if ($LimparCache) { $startupArgs += '--clear' }
if ($Verificar) { $startupArgs += '--check' }
& node @startupArgs
exit $LASTEXITCODE
