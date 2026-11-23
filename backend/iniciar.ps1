param(
    [ValidateSet('tudo', 'api', 'web', 'celular', 'preparar', 'migrar')]
    [string]$Servico = 'api',
    [string]$IP,
    [int]$PortaApi,
    [int]$PortaExpo,
    [switch]$LimparCache,
    [switch]$Verificar
)

$startupFile = Join-Path (Split-Path -Parent $PSScriptRoot) 'iniciar.ps1'
$startupArgs = @{ Servico = $Servico }
foreach ($key in $PSBoundParameters.Keys) { $startupArgs[$key] = $PSBoundParameters[$key] }
& $startupFile @startupArgs
exit $LASTEXITCODE
