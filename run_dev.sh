#!/bin/bash

# 设置 NVM 环境
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 切换到项目目录
cd "$SCRIPT_DIR"

# 确保使用正确的 Node.js 版本
# 如果您想使用特定版本，可以将 'node' 改为具体版本号，比如 '16'
nvm use node

# 运行开发服务器
# 如果有传入日期参数，则传递给 node server.js
if [ $# -gt 0 ]; then
    echo "使用指定日期: $1" >> "$SCRIPT_DIR/cron.log"
    node server.js "$1" >> "$SCRIPT_DIR/cron.log" 2>&1
else
    # 检查当前是否为周末（周六=6，周日=0）
    day_of_week=$(date +%w)
    if [ "$day_of_week" -eq 0 ] || [ "$day_of_week" -eq 6 ]; then
        echo "$(date): 今天是周末，跳过执行工时统计" >> "$SCRIPT_DIR/cron.log"
        exit 0
    fi
    
    echo "使用当前日期" >> "$SCRIPT_DIR/cron.log"
    npm run dev >> "$SCRIPT_DIR/cron.log" 2>&1
fi