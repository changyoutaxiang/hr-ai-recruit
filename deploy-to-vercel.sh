#!/bin/bash

# Vercel 手动部署脚本
# 用途：当 Vercel Dashboard 无法使用时，通过 CLI 手动部署

set -e  # 遇到错误立即退出
set -u  # 使用未定义变量时退出
set -o pipefail  # 管道命令失败时退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 错误处理函数
error_exit() {
    echo -e "\n${RED}❌ 错误: 脚本在第 $1 行失败${NC}" >&2
    echo -e "${YELLOW}💡 提示: 检查上方的错误信息，或向 Claude 寻求帮助${NC}" >&2
    exit 1
}

# 设置错误陷阱
trap 'error_exit $LINENO' ERR

echo "=================================="
echo "🚀 Vercel 手动部署脚本"
echo "=================================="
echo ""

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

echo -e "${BLUE}📋 步骤 1/4: 检查项目配置${NC}"
echo "项目目录: $(pwd)"
echo "Git 分支: $(git branch --show-current)"
echo "最新提交: $(git log -1 --oneline)"
echo ""

echo -e "${BLUE}📋 步骤 2/4: 登录 Vercel${NC}"
echo "如果浏览器打开，请在浏览器中完成登录..."
npx vercel login
echo ""

echo -e "${BLUE}📋 步骤 3/4: 链接到 Vercel 项目${NC}"
echo "提示：如果项目已存在，选择链接现有项目"
npx vercel link
echo ""

echo -e "${BLUE}📋 步骤 4/4: 部署到生产环境${NC}"
echo "开始部署..."
npx vercel --prod
echo ""

echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo -e "${YELLOW}📝 后续操作：${NC}"
echo "1. 复制上方显示的生产环境 URL"
echo "2. 前往 Vercel Dashboard → Settings → Environment Variables"
echo "3. 更新 CORS_ORIGIN 为实际域名"
echo "4. 重新部署（或等待下次 git push）"
echo ""
