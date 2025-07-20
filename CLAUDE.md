# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Puppeteer 的禅道(ZenTao)自动化工具，主要用于自动化工时统计和补录功能。

## 开发命令

### 启动和运行
```bash
# 启动主服务 (工时检查和自动补录)
npm run dev
# 或者
node server.js

# 手动添加工时记录
npm run add
# 或者
node addRecoreToTask.js [剩余工时]
```

### 开发脚本
```bash
# 运行开发环境脚本
./run_dev.sh
```

## 核心架构

### 主要模块结构

1. **server.js** - 主入口文件，执行工时检查和自动补录流程
2. **login.js** - 处理禅道系统登录和认证
3. **addRecoreToTask.js** - 工时补录功能模块
4. **file.js** - 文件操作和 Cookie 管理
5. **util.js** - 通用工具函数
6. **noticezen.js** - 邮件通知功能

### 工作流程

1. **自动工时检查 (server.js)**:
   - 启动无头浏览器
   - 读取存储的 cookies 进行登录验证
   - 访问当日工时页面 (`my-effort-{date}-date_desc-1-500-1.html`)
   - 解析工时表格数据，计算总工时
   - 如果工时不足8小时，自动调用补录功能
   - 发送邮件通知结果

2. **登录管理 (login.js)**:
   - 检查当前登录状态
   - 自动填写登录表单
   - 保存登录后的 cookies

3. **工时补录 (addRecoreToTask.js)**:
   - 访问指定任务的工时录入页面
   - 自动填写工时信息
   - 提交表单完成补录

### 依赖管理

项目使用以下主要依赖：
- `puppeteer`: 无头浏览器自动化
- `nodemailer`: 邮件发送服务  
- `date-fns`: 日期处理工具

### 数据管理

- **cookies.json**: 存储登录会话信息
- **cron.log**: 定时任务日志

### 配置说明

- 默认任务ID: 通过环境变量 ZENTAO_DEFAULT_TASK_ID 配置
- 目标工时: 8小时
- 禅道域名: 通过环境变量 ZENTAO_BASE_URL 配置
- 邮件服务: 163邮箱 SMTP

### 安全注意事项

- 所有敏感信息已迁移到 .env 文件中统一管理
- .env 文件已添加到 .gitignore 中，不会被提交到版本控制
- cookies.json 包含敏感会话信息，不应提交到版本控制
- 部署前请确保正确配置 .env 文件中的所有变量

### 辅助工具

- **effort-calculator.js**: 工时统计计算器
- **effort-calculator-complete.js**: 完整版工时统计计算器

### 开发建议

1. 修改配置时注意更新对应的常量和URL
2. 新增功能时遵循现有的模块化结构
3. 测试时注意检查登录状态和权限
4. 调试可通过截图功能查看页面状态