#!/bin/bash
# AI 自动化测试系统 - 一键运行脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   AI 自动化测试系统${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 显示帮助信息
function show_help() {
    echo "用法：./run-ai-test.sh [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  run      运行完整的自动化测试流水线"
    echo "  demo     运行演示示例"
    echo "  check    检查环境配置"
    echo "  help     显示帮助信息"
    echo ""
    echo "选项:"
    echo "  --requirement <描述>  需求描述（中文）"
    echo "  --type <smoke|regression>  测试类型（默认：smoke）"
    echo "  --headed               使用有头模式"
    echo "  --slow-mo <毫秒>       慢动作延迟"
    echo ""
    echo "示例:"
    echo "  # 运行完整流水线
    ./run-ai-test.sh run --requirement '登录和主检评估流程' --type smoke"
    echo ""
    echo "  # 运行演示
    ./run-ai-test.sh demo"
    echo ""
    echo "  # 检查环境
    ./run-ai-test.sh check"
}

# 检查环境配置
function check_env() {
    echo -e "${YELLOW}检查环境配置...${NC}"

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

    # 检查 npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

    # 检查 .env 文件
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        echo -e "${YELLOW}⚠️  .env 文件不存在，复制示例配置${NC}"
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    fi
    echo -e "${GREEN}✅ .env 文件存在${NC}"

    # 检查 LLM 配置
    if grep -q "LLM_API_URL=" "$PROJECT_ROOT/.env" && [ -n "$(grep "LLM_API_URL=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)" ]; then
        echo -e "${GREEN}✅ LLM_API_URL 已配置${NC}"
    else
        echo -e "${YELLOW}⚠️  LLM_API_URL 未配置，AI 功能将不可用${NC}"
    fi

    # 检查 Playwright 浏览器
    if npx playwright install --dry-run &> /dev/null; then
        echo -e "${GREEN}✅ Playwright 浏览器已安装${NC}"
    else
        echo -e "${YELLOW}⚠️  Playwright 浏览器可能需要安装${NC}"
        echo "   运行：npx playwright install chromium"
    fi

    echo ""
    echo -e "${GREEN}环境检查完成${NC}"
}

# 运行演示
function run_demo() {
    echo -e "${YELLOW}运行 AI 自动化测试演示...${NC}"
    echo ""

    cd "$PROJECT_ROOT"

    # 运行示例测试
    echo -e "${BLUE}运行示例测试：report-view-ai.spec.ts${NC}"
    npx playwright test tests/ai-example/report-view-ai.spec.ts --project=smoke-chromium --reporter=line

    echo ""
    echo -e "${GREEN}演示完成${NC}"
}

# 运行完整流水线
function run_pipeline() {
    local requirement=""
    local test_type="smoke"
    local headed=""
    local slow_mo="0"

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --requirement)
                requirement="$2"
                shift 2
                ;;
            --type)
                test_type="$2"
                shift 2
                ;;
            --headed)
                headed="--headed"
                shift
                ;;
            --slow-mo)
                slow_mo="$2"
                shift 2
                ;;
            *)
                echo "未知选项：$1"
                show_help
                exit 1
                ;;
        esac
    done

    if [ -z "$requirement" ]; then
        echo -e "${RED}❌ 请提供需求描述${NC}"
        echo "用法：$0 run --requirement '需求描述'"
        exit 1
    fi

    cd "$PROJECT_ROOT"

    echo -e "${YELLOW}启动 AI 自动化测试流水线...${NC}"
    echo -e "需求：${BLUE}${requirement}${NC}"
    echo -e "类型：${BLUE}${test_type}${NC}"
    echo ""

    # 运行 AI 流水线
    npx ts-node ai/pipeline-cli.ts run \
        --requirement "$requirement" \
        --type "$test_type" \
        $headed \
        --slow-mo "$slow_mo"
}

# 主函数
case "${1:-help}" in
    run)
        shift
        run_pipeline "$@"
        ;;
    demo)
        run_demo
        ;;
    check)
        check_env
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}未知命令：$1${NC}"
        show_help
        exit 1
        ;;
esac
