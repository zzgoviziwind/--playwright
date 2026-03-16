#!/bin/bash

# AI 自动化测试系统 UI 启动脚本

echo "================================================"
echo "   AI 自动化测试系统 UI 启动器"
echo "================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$SCRIPT_DIR/e2e-tests"

echo "正在启动 UI 服务器..."
echo ""

cd "$E2E_DIR" || exit 1
npx tsx ai/ui-server.ts
