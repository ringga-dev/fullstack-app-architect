param(
  [string]$Name = "multi-agent-project",
  [string]$Idea = ""
)

$Dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Dir

Write-Host "Multi-Agent Architect - Auto Start (PowerShell)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Export adapters cross-platform (no bash required)
if (Get-Command bun -ErrorAction SilentlyContinue) {
  Write-Host "-> Exporting for OpenCode / Antigraviti / Hermes..." -ForegroundColor Gray
  & bun run orchestrator/export.ts all 2>$null | Out-Null
}

Write-Host ""
Write-Host "> Running orchestrator..." -ForegroundColor Yellow
Write-Host ""

if (Get-Command bun -ErrorAction SilentlyContinue) {
  & bun run orchestrator/index.ts --name $Name --idea $Idea
  exit $LASTEXITCODE
}

if (Get-Command tsx -ErrorAction SilentlyContinue) {
  & tsx orchestrator/index.ts --name $Name --idea $Idea
  exit $LASTEXITCODE
}

if (Test-Path ".\node_modules\.bin\tsx.cmd") {
  & .\node_modules\.bin\tsx.cmd orchestrator/index.ts --name $Name --idea $Idea
  exit $LASTEXITCODE
}

if (Get-Command npx -ErrorAction SilentlyContinue) {
  & npx --yes tsx orchestrator/index.ts --name $Name --idea $Idea
  exit $LASTEXITCODE
}

if (Test-Path ".\bin\multi-agent-architect") {
  & bash .\bin\multi-agent-architect --name $Name --idea $Idea
  exit $LASTEXITCODE
}

Write-Host "Runtime not found." -ForegroundColor Red
Write-Host "Install: bun.exe (recommended) or node.js + tsx" -ForegroundColor Red
Write-Host "Example: npm i -D tsx; .\run.ps1 -Name my-app -Idea 'todo app'" -ForegroundColor Red
exit 1
