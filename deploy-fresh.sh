#!/bin/bash

# Vercel 全新项目部署脚本
# 用途：创建新项目并部署（不链接现有项目）

set -e

clear
echo "=================================="
echo "🚀 Vercel 全新项目部署"
echo "=================================="
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📌 重要说明：${NC}"
echo "由于现有项目创建不完整，我们将创建一个全新的 Vercel 项目"
echo "这不会影响您的代码或 GitHub 仓库"
echo ""

echo -e "${BLUE}📋 步骤 1/2: 检查登录状态${NC}"
if [ -f ~/.vercel/auth.json ]; then
    echo -e "${GREEN}✅ 已登录 Vercel${NC}"
else
    echo "需要先登录..."
    npx vercel login
fi
echo ""

echo -e "${BLUE}📋 步骤 2/2: 部署到生产环境（创建新项目）${NC}"
echo ""
echo -e "${YELLOW}接下来会问您几个问题：${NC}"
echo "1. 'Set up and deploy?' → 输入 ${GREEN}Y${NC}"
echo "2. 'Which scope?' → 直接按 ${GREEN}Enter${NC}"
echo "3. 'Link to existing project?' → 输入 ${RED}N${NC} （重要！）"
echo "4. 'Project name?' → 输入 ${GREEN}hr-ai-recruit${NC} 或其他名称"
echo "5. 'In which directory?' → 直接按 ${GREEN}Enter${NC}"
echo "6. 其他配置问题 → 都按 ${GREEN}Enter${NC} 使用默认值"
echo ""
read -p "准备好了吗？按 Enter 继续..." dummy

echo ""
echo "开始部署..."
echo ""

npx vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=================================="
    echo "✅ 部署成功！"
    echo "==================================${NC}"
    echo ""
    echo -e "${YELLOW}📝 重要：请复制上方显示的生产环境 URL！${NC}"
    echo ""
    echo -e "${BLUE}下一步操作：${NC}"
    echo ""
    echo "1️⃣ 配置环境变量："
    echo "   打开: https://vercel.com/dashboard"
    echo "   进入项目 → Settings → Environment Variables"
    echo "   添加所有 11 个必需变量（参考 VERCEL-ENV-CHECKLIST.md）"
    echo ""
    echo "2️⃣ 重新部署以应用环境变量："
    echo "   npx vercel --prod"
    echo ""
    echo "3️⃣ 更新 CORS_ORIGIN："
    echo "   npx vercel env add CORS_ORIGIN production"
    echo "   # 输入您的 Vercel 域名"
    echo "   npx vercel --prod"
    echo ""
else
    echo -e "${RED}❌ 部署失败${NC}"
    echo "请查看上方的错误信息并告诉 Claude"
fi
