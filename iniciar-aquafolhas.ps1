param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("pedido", "admin")]
  [string]$Area,
  [switch]$ValidateOnly
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$baseUrl = "http://127.0.0.1:5173"
$pageUrl = if ($Area -eq "admin") { "$baseUrl/admin" } else { "$baseUrl/pedido" }
$outputLog = Join-Path $root "aqua-servidor-saida.log"
$errorLog = Join-Path $root "aqua-servidor-erro.log"

Set-Location -LiteralPath $root

function Write-Step([string]$Message) {
  Write-Host $Message -ForegroundColor Cyan
}

function Test-AquaFolhas {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $baseUrl -TimeoutSec 2
    return $response.StatusCode -ge 200
  }
  catch {
    return $false
  }
}

function Find-Node {
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"),
    (Join-Path $env:ProgramFiles "nodejs\node.exe")
  )

  if (${env:ProgramFiles(x86)}) {
    $candidates += Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe"
  }

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
      return $candidate
    }
  }

  throw "Node.js nao encontrado. Instale o Node.js 22 ou abra este projeto pelo Codex antes de tentar novamente."
}

function Test-Dependencies {
  $vinextEntry = Join-Path $root "node_modules\vinext\dist\cli.js"
  return Test-Path -LiteralPath $vinextEntry -PathType Leaf
}

function Repair-Dependencies([string]$NodePath) {
  Write-Step "O projeto foi movido ou copiado. Preparando as dependencias no novo local..."
  Write-Host "Na primeira abertura isso pode levar alguns minutos."

  $pnpmPath = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs"
  $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $npmCommand) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
  }

  if (Test-Path -LiteralPath $pnpmPath -PathType Leaf) {
    & $NodePath $pnpmPath install --force --prefer-offline --no-frozen-lockfile --config.node-linker=hoisted
    if ($LASTEXITCODE -ne 0) {
      throw "Nao foi possivel preparar as dependencias com o instalador do Codex."
    }
  }
  elseif ($npmCommand) {
    & $npmCommand.Source install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      throw "Nao foi possivel preparar as dependencias com o npm."
    }
  }
  else {
    throw "As dependencias ficaram invalidas depois da copia e nenhum instalador foi encontrado. Instale o Node.js pelo site oficial e tente novamente."
  }

  if (-not (Test-Dependencies)) {
    throw "As dependencias foram instaladas, mas o sistema ainda nao conseguiu localiza-las."
  }
}

try {
  Write-Step "Preparando o AquaFolhas..."

  $packageFile = Join-Path $root "package.json"
  if (-not (Test-Path -LiteralPath $packageFile -PathType Leaf)) {
    throw "O aplicativo esta incompleto: o arquivo package.json nao foi encontrado. Copie ou extraia a pasta AquaFolhas completa para o pendrive, e nao somente os atalhos."
  }

  $node = Find-Node

  if (-not (Test-Dependencies)) {
    Repair-Dependencies -NodePath $node
  }

  if ($ValidateOnly) {
    Write-Step "Verificacao concluida com sucesso."
    exit 0
  }

  if (-not (Test-AquaFolhas)) {
    $vinextCache = Join-Path $root ".vinext"
    if ((Test-Path -LiteralPath $vinextCache) -and $vinextCache.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
      Remove-Item -LiteralPath $vinextCache -Recurse -Force
    }

    Remove-Item -LiteralPath $outputLog -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $errorLog -Force -ErrorAction SilentlyContinue

    Write-Step "Iniciando o servidor local..."
    $server = Start-Process `
      -FilePath $node `
      -ArgumentList @("scripts/run-framework.mjs", "dev") `
      -WorkingDirectory $root `
      -WindowStyle Hidden `
      -RedirectStandardOutput $outputLog `
      -RedirectStandardError $errorLog `
      -PassThru

    $ready = $false
    for ($attempt = 0; $attempt -lt 120; $attempt++) {
      Start-Sleep -Seconds 1
      if (Test-AquaFolhas) {
        $ready = $true
        break
      }
      if ($server.HasExited) {
        break
      }
    }

    if (-not $ready) {
      Write-Host ""
      Write-Host "O servidor nao iniciou. Relatorio:" -ForegroundColor Red
      if (Test-Path -LiteralPath $errorLog) {
        Get-Content -LiteralPath $errorLog -Tail 40
      }
      if (Test-Path -LiteralPath $outputLog) {
        Get-Content -LiteralPath $outputLog -Tail 40
      }
      throw "O sistema nao iniciou dentro do tempo esperado."
    }
  }

  Write-Step "AquaFolhas pronto. Abrindo no navegador..."
  Start-Process $pageUrl
  exit 0
}
catch {
  Write-Host ""
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
