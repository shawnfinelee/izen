# 禅道工时自动化统计系统

一个基于 Node.js 和 Puppeteer 的禅道工时自动统计和补录工具，支持自动登录、工时数据解析、邮件通知等功能。

## ✨ 主要功能

- 🔐 **自动登录** - 自动处理禅道系统登录认证
- 📊 **工时统计** - 自动解析和统计指定日期的工时数据
- 📧 **邮件通知** - 发送详细的HTML工时报告邮件
- ⏰ **定时执行** - 支持 crontab 定时任务，工作日自动执行
- 🛡️ **错误处理** - 完善的403错误处理和网络异常处理
- 📸 **调试截图** - 自动保存页面截图用于问题排查
- 🗓️ **灵活查询** - 支持查询当前日期或指定日期的工时

## 🚀 快速开始

### 环境要求

- Node.js 16+ 
- npm 或 yarn
- macOS/Linux (推荐)

### 安装

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd izen
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   
   创建 `.env` 文件并配置以下参数：
   ```env
   # 禅道登录凭据
   ZENTAO_USERNAME=your_username
   ZENTAO_PASSWORD=your_password

   # 邮件配置
   EMAIL_HOST=smtp.163.com
   EMAIL_PORT=25
   EMAIL_SECURE=false
   EMAIL_USER=your_email@163.com
   EMAIL_PASS=your_email_password
   EMAIL_FROM="工时助手" <your_email@163.com>
   EMAIL_TO=your_email@163.com
   ```

### 基本使用

1. **查询当前日期工时**
   ```bash
   npm run dev
   # 或
   node server.js
   ```

2. **查询指定日期工时**
   ```bash
   node server.js 2025-07-18
   # 或
   node server.js 20250718
   ```

3. **使用运行脚本**
   ```bash
   # 查询当前日期（工作日自动执行，周末跳过）
   ./run_dev.sh
   
   # 查询指定日期
   ./run_dev.sh 2025-07-18
   ```

## ⚙️ 配置说明

### 目标工时配置

在 `server.js` 中修改 `CONFIG.TARGET_HOURS`：
```javascript
const CONFIG = {
    TARGET_HOURS: 8,  // 目标工时（小时）
    BASE_URL: 'https://proj.uhouzz.com',
    HEADLESS: true
};
```

### 定时任务配置

添加到 crontab 实现自动执行：
```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天18:55、19:04、19:15执行）
55 18 * * * /path/to/izen/run_dev.sh >> /path/to/izen/cron.log 2>&1
4 19 * * * /path/to/izen/run_dev.sh >> /path/to/izen/cron.log 2>&1
15 19 * * * /path/to/izen/run_dev.sh >> /path/to/izen/cron.log 2>&1
```

## 📁 项目结构

```
izen/
├── server.js              # 主程序入口
├── login.js               # 登录处理模块
├── file.js                # 文件和Cookie管理
├── util.js                # 工具函数
├── noticezen.js           # 邮件通知功能
├── addRecoreToTask.js     # 工时补录功能
├── run_dev.sh             # 运行脚本
├── package.json           # 项目依赖
├── .env                   # 环境变量配置
├── cookies.json           # 登录会话信息
├── cron.log              # 运行日志
├── screenshots/          # 截图文件夹
└── CLAUDE.md             # 开发文档
```

## 🔧 高级功能

### 工时补录

手动触发工时补录功能：
```bash
node addRecoreToTask.js [小时数]
```

### 调试模式

开启调试模式查看详细执行过程：
```javascript
// 在 server.js 中设置
const CONFIG = {
    HEADLESS: false  // 显示浏览器窗口
};
```

### 邮件报告

系统会自动发送包含以下信息的HTML邮件报告：
- 📅 查询日期和执行时间
- ⏰ 总工时和目标工时对比
- 📝 详细任务列表
- 🚫 错误信息（如有）
- 💡 处理建议

## 🛠️ 故障排除

### 常见问题

1. **403 禁止访问错误**
   - 检查网络连接
   - 确认VPN连接状态
   - 验证登录凭据是否正确

2. **登录失败**
   - 检查 `.env` 文件中的用户名密码
   - 确认禅道系统可正常访问
   - 删除 `cookies.json` 重新登录

3. **邮件发送失败**
   - 检查邮件服务器配置
   - 确认邮箱密码（可能需要应用专用密码）
   - 验证SMTP设置

4. **定时任务不执行**
   - 检查 crontab 配置是否正确
   - 确认脚本路径为绝对路径
   - 查看 `cron.log` 日志文件

### 日志查看

```bash
# 查看最新日志
tail -f cron.log

# 查看特定日期的日志
grep "2025-07-20" cron.log
```

## 🔒 安全说明

- ✅ 所有敏感信息存储在 `.env` 文件中
- ✅ `.env` 文件已添加到 `.gitignore`，不会被提交
- ✅ 会话信息存储在本地 `cookies.json`
- ✅ 支持应用专用密码，提高邮件安全性

## 📋 系统要求

- **操作系统**: macOS 10.14+, Ubuntu 18.04+, CentOS 7+
- **Node.js**: 16.0.0 或更高版本
- **内存**: 至少 512MB 可用内存
- **磁盘**: 至少 100MB 可用空间
- **网络**: 稳定的互联网连接

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📜 更新日志

### v2.0.0 (Latest)
- ✨ 支持命令行日期参数
- ✨ 周末自动跳过功能
- ✨ 完善的环境变量配置
- ✨ 增强的错误处理和调试功能
- 🔧 代码安全性优化
- 📧 改进的HTML邮件报告

### v1.0.0
- 🎉 初始版本发布
- 🔐 基础登录功能
- 📊 工时统计功能
- 📧 邮件通知功能

## 📄 许可证

本项目仅供内部使用和学习目的。

## 📞 技术支持

如遇问题，请：
1. 查看 [CLAUDE.md](./CLAUDE.md) 开发文档
2. 检查日志文件排查问题
3. 提交 Issue 描述问题详情

---

🚀 **享受自动化工时统计带来的便利！**