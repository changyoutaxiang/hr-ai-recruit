#!/bin/bash

# 快速部署脚本 - 交互式版本
# 用途：引导用户完成 Vercel 部署的每一步

set -e  # 遇到错误立即退出
set -u  # 使用未定义变量时退出
set -o pipefail  # 管道命令失败时退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 错误处理函数
error_exit() {
    echo -e "\n${RED}❌ 错误: 脚本在第 $1 行失败${NC}" >&2
    echo -e "${YELLOW}💡 提示: 检查上方的错误信息，或向 Claude 寻求帮助${NC}" >&2
    exit 1
}

# 设置错误陷阱
trap 'error_exit $LINENO' ERR

clear
echo "=================================="
echo "🚀 Vercel 交互式部署向导"
echo "=================================="
echo ""
echo "本脚本将引导您完成 Vercel 部署的每一步。"
echo "请按照提示操作。"
echo ""

# 步骤 1
echo -e "${BLUE}📋 步骤 1/3: Vercel 登录${NC}"
echo ""
echo "即将打开浏览器进行登录..."
echo "如果浏览器没有自动打开，请复制终端中显示的链接"
echo ""
read -p "按 Enter 继续..." dummy

npx vercel login

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 登录成功！${NC}"
    echo ""
else
    echo -e "${RED}❌ 登录失败，请重试${NC}"
    exit 1
fi

# 步骤 2
echo -e "${BLUE}📋 步骤 2/3: 链接项目${NC}"
echo ""
echo "接下来会问您几个问题："
echo "1. 'Set up and deploy?' → 输入 Y"
echo "2. 'Which scope?' → 直接按 Enter"
echo "3. 'Link to existing project?' → 输入 y"
echo "4. 'Project name?' → 输入 hr-ai-recruit"
echo ""
read -p "准备好了吗？按 Enter 继续..." dummy

npx vercel link

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 项目链接成功！${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️ 如果项目不存在，将创建新项目${NC}"
    echo ""
fi

# 步骤 3
echo -e "${BLUE}📋 步骤 3/3: 部署到生产环境${NC}"
echo ""
echo "开始部署，这可能需要 3-5 分钟..."
echo ""
read -p "按 Enter 开始部署..." dummy

npx vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 部署成功！${NC}"
    echo ""
    echo -e "${YELLOW}📝 后续操作：${NC}"
    echo "1. 复制上方显示的生产环境 URL"
    echo "2. 运行以下命令更新 CORS_ORIGIN："
    echo ""
    echo "   npx vercel env add CORS_ORIGIN production"
    echo "   # 然后输入您的 Vercel 域名"
    echo ""
    echo "3. 重新部署："
    echo "   npx vercel --prod"
    echo ""
else
    echo -e "${RED}❌ 部署失败${NC}"
    echo "请查看上方的错误信息"
    echo ""
fi
