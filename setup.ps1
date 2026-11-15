$ErrorActionPreference = "Stop"

function Write-Section($message) {
  Write-Host ""
  Write-Host "=== $message ===" -ForegroundColor Cyan
}

function Test-CommandExists($commandName) {
  return [bool](Get-Command $commandName -ErrorAction SilentlyContinue)
}

function Install-WithWinget($packageId, $displayName) {
  if (-not (Test-CommandExists "winget")) {
    Write-Host "winget nao encontrado. Instale manualmente: $displayName" -ForegroundColor Yellow
    return $false
  }

  Write-Host "Tentando instalar $displayName via winget..."
  winget install --id $packageId --exact --accept-source-agreements --accept-package-agreements
  return $LASTEXITCODE -eq 0
}

function Show-InstallGuide($name, $url, $wingetId) {
  Write-Host "$name nao esta instalado." -ForegroundColor Yellow
  Write-Host "Instalacao manual:"
  Write-Host "1. Acesse: $url"
  Write-Host "2. Baixe o instalador oficial."
  Write-Host "3. Execute a instalacao."
  if ($wingetId) {
    Write-Host "4. Ou tente via winget: winget install --id $wingetId --exact"
  }
  Write-Host "5. Feche e abra o PowerShell novamente apos a instalacao."
}

function Get-CommandVersion($commandName) {
  $versionArguments = @(
    @("--version"),
    @("version"),
    @("version", "--client"),
    @("version", "--short")
  )

  foreach ($args in $versionArguments) {
    try {
      $output = & $commandName @args 2>$null
      if ($LASTEXITCODE -eq 0 -and $output) {
        return ($output | Select-Object -First 1)
      }
    }
    catch {
      continue
    }
  }

  return "versao nao identificada"
}

function Ensure-Dependency($commandName, $displayName, $url, $wingetId) {
  if (Test-CommandExists $commandName) {
    $versionOutput = Get-CommandVersion $commandName
    Write-Host "$displayName encontrado. $versionOutput" -ForegroundColor Green
    return $true
  }

  Write-Host "$displayName nao encontrado no sistema." -ForegroundColor Yellow
  $installed = $false

  if ($wingetId) {
    $installed = Install-WithWinget $wingetId $displayName
  }

  if (-not $installed) {
    Show-InstallGuide $displayName $url $wingetId
    return $false
  }

  Start-Sleep -Seconds 2
  if (Test-CommandExists $commandName) {
    $versionOutput = Get-CommandVersion $commandName
    Write-Host "$displayName instalado. $versionOutput" -ForegroundColor Green
    return $true
  }

  Write-Host "$displayName ainda nao esta disponivel nesta sessao do PowerShell." -ForegroundColor Yellow
  Write-Host "Abra um novo PowerShell e execute o script novamente."
  return $false
}

function Test-WindowsVersion {
  Write-Section "Validando Windows"
  $osInfo = Get-CimInstance Win32_OperatingSystem
  $version = [version]$osInfo.Version

  Write-Host "Windows detectado: $($osInfo.Caption) ($($osInfo.Version))"

  if ($version.Major -lt 10) {
    throw "Este projeto exige Windows 10 ou superior."
  }
}

function Test-Virtualization {
  Write-Section "Validando virtualizacao"
  $cpuInfo = Get-CimInstance Win32_Processor | Select-Object -First 1

  if (-not $cpuInfo.VirtualizationFirmwareEnabled) {
    Write-Host "Virtualizacao nao parece habilitada na BIOS/UEFI." -ForegroundColor Yellow
    Write-Host "Ative Intel VT-x ou AMD-V na BIOS/UEFI antes de iniciar o Minikube."
    return $false
  }

  Write-Host "Virtualizacao habilitada." -ForegroundColor Green
  return $true
}

function Test-DockerRunning {
  Write-Section "Validando Docker Desktop"
  if (-not (Test-CommandExists "docker")) {
    Write-Host "Docker CLI nao esta disponivel." -ForegroundColor Yellow
    return $false
  }

  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Desktop instalado, mas nao esta em execucao." -ForegroundColor Yellow
    Write-Host "Abra o Docker Desktop e aguarde o status Running."
    return $false
  }

  Write-Host "Docker Desktop esta em execucao." -ForegroundColor Green
  return $true
}

function Install-BackendDependencies {
  Write-Section "Instalando dependencias do backend"
  Push-Location "$PSScriptRoot\backend"
  try {
    npm install
  }
  finally {
    Pop-Location
  }
}

Write-Section "Verificando pre-requisitos"
Test-WindowsVersion
$virtualizationOk = Test-Virtualization

$nodeOk = Ensure-Dependency "node" "Node.js" "https://nodejs.org/en/download" "OpenJS.NodeJS.LTS"
$dockerOk = Ensure-Dependency "docker" "Docker Desktop" "https://www.docker.com/products/docker-desktop/" "Docker.DockerDesktop"
$minikubeOk = Ensure-Dependency "minikube" "Minikube" "https://minikube.sigs.k8s.io/docs/start/" "Kubernetes.minikube"
$kubectlOk = Ensure-Dependency "kubectl" "kubectl" "https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/" "Kubernetes.kubectl"

if (-not ($nodeOk -and $dockerOk -and $minikubeOk -and $kubectlOk -and $virtualizationOk)) {
  throw "Corrija os itens pendentes acima e execute o script novamente."
}

$dockerRunning = Test-DockerRunning
if (-not $dockerRunning) {
  throw "Inicie o Docker Desktop e execute o script novamente."
}

Install-BackendDependencies

Write-Section "Iniciando Minikube"
minikube start --driver=docker

Write-Section "Configurando ambiente Docker do Minikube"
minikube -p minikube docker-env | Invoke-Expression

Write-Section "Validando cluster Kubernetes"
kubectl get nodes

Write-Host ""
Write-Host "Setup concluido com sucesso." -ForegroundColor Green
Write-Host "Proximos passos:"
Write-Host "1. cd backend"
Write-Host "2. docker build -t cadastro-backend:latest ."
Write-Host "3. cd .."
Write-Host "4. kubectl apply -f ."
Write-Host "5. minikube service backend-service"
