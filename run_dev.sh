#!/bin/bash

# 设置 NVM 环境
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"

# 切换到项目目录
cd /Users/leee/Desktop/AutomatorOfZen

# 确保使用正确的 Node.js 版本
# 如果您想使用特定版本，可以将 'node' 改为具体版本号，比如 '16'
nvm use node

# 运行开发服务器
npm run dev >> /Users/leee/Desktop/AutomatorOfZen/cron.log 2>&1