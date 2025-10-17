#!/bin/bash

# Vercel 环境变量配置助手
# 用途：帮助收集和验证所有必需的环境变量

echo "=================================="
echo "🚀 Vercel 部署环境变量配置助手"
echo "=================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 创建临时文件存储环境变量
ENV_FILE="vercel-env-variables.txt"
> "$ENV_FILE"

echo -e "${BLUE}📝 步骤 1/5: Supabase 配置${NC}"
echo "请访问: https://supabase.com/dashboard"
echo "选择您的项目 → Settings → API"
echo ""

read -p "请输入 Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
read -p "请输入 Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "请输入 Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY

echo ""
echo -e "${BLUE}📝 步骤 2/5: 数据库连接${NC}"
echo "Supabase Dashboard → Settings → Database → Connection string → URI (Session Pooler)"
echo ""

read -p "请输入 DATABASE_URL: " DATABASE_URL

echo ""
echo -e "${BLUE}📝 步骤 3/5: OpenRouter API 配置${NC}"
echo "请访问: https://openrouter.ai/"
echo ""

read -p "请输入 OpenRouter API Key: " OPENROUTER_API_KEY
read -p "请输入 AI Model (默认: google/gemini-2.5-flash): " AI_MODEL
AI_MODEL=${AI_MODEL:-google/gemini-2.5-flash}

echo ""
echo -e "${BLUE}📝 步骤 4/5: 生成 Session Secret${NC}"
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "PLEASE-GENERATE-A-RANDOM-32-CHAR-SECRET")
echo "生成的 Session Secret: $SESSION_SECRET"

echo ""
echo -e "${BLUE}📝 步骤 5/5: 部署域名配置${NC}"
read -p "请输入 Vercel 应用域名 (https://your-app.vercel.app): " CORS_ORIGIN

# 写入环境变量到文件
cat >> "$ENV_FILE" << EOF
# ================================
# Vercel 环境变量配置
# 生成时间: $(date)
# ================================

# 1. Supabase 配置（后端）
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# 2. Supabase 配置（前端 - 必须与后端一致）
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# 3. 数据库连接
DATABASE_URL=$DATABASE_URL

# 4. AI 服务配置
OPENROUTER_API_KEY=$OPENROUTER_API_KEY
AI_MODEL=$AI_MODEL

# 5. 生产环境配置
NODE_ENV=production
SESSION_SECRET=$SESSION_SECRET
CORS_ORIGIN=$CORS_ORIGIN

# 6. 可选配置
RESUME_AI_MODEL=openai/gpt-4o-mini
ENABLE_VISION_PARSING=true
EOF

echo ""
echo -e "${GREEN}✅ 配置完成！${NC}"
echo ""
echo "环境变量已保存到: $ENV_FILE"
echo ""
echo -e "${YELLOW}⚠️  安全提醒：${NC}"
echo "1. 该文件包含敏感信息，请勿提交到 Git"
echo "2. 配置完成后请删除此文件"
echo "3. 使用完毕后运行: rm $ENV_FILE"
echo ""
echo -e "${BLUE}📋 下一步操作：${NC}"
echo "1. 打开 Vercel Dashboard"
echo "2. 进入项目 Settings → Environment Variables"
echo "3. 逐个添加上述变量（或使用 Vercel CLI）"
echo ""

# 生成 Vercel CLI 命令
CLI_FILE="vercel-cli-commands.sh"
cat > "$CLI_FILE" << 'EOF'
#!/bin/bash
# Vercel CLI 自动配置脚本
# 使用方法: source vercel-cli-commands.sh

echo "开始配置 Vercel 环境变量..."

# 读取环境变量文件
source vercel-env-variables.txt

# 添加环境变量到 Vercel
vercel env add SUPABASE_URL production <<< "$SUPABASE_URL"
vercel env add SUPABASE_ANON_KEY production <<< "$SUPABASE_ANON_KEY"
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "$SUPABASE_SERVICE_ROLE_KEY"
vercel env add VITE_SUPABASE_URL production <<< "$VITE_SUPABASE_URL"
vercel env add VITE_SUPABASE_ANON_KEY production <<< "$VITE_SUPABASE_ANON_KEY"
vercel env add DATABASE_URL production <<< "$DATABASE_URL"
vercel env add OPENROUTER_API_KEY production <<< "$OPENROUTER_API_KEY"
vercel env add AI_MODEL production <<< "$AI_MODEL"
vercel env add NODE_ENV production <<< "production"
vercel env add SESSION_SECRET production <<< "$SESSION_SECRET"
vercel env add CORS_ORIGIN production <<< "$CORS_ORIGIN"

echo "✅ 环境变量配置完成！"
echo "运行 'vercel --prod' 开始部署"
EOF

chmod +x "$CLI_FILE"

echo -e "${GREEN}✨ 已生成 Vercel CLI 自动配置脚本: $CLI_FILE${NC}"
echo "如果您已安装 Vercel CLI，可以直接运行:"
echo "  source $CLI_FILE"
echo ""
