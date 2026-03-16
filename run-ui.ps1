# AI 自动化测试系统 UI 启动脚本
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   AI 自动化测试系统 UI 启动器" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$e2eDir = Join-Path $scriptDir "e2e-tests"

Write-Host "正在启动 UI 服务器..." -ForegroundColor Yellow
Write-Host ""

Set-Location $e2eDir
npx tsx ai/ui-server.ts
