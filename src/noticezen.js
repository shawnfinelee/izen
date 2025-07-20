const nodemailer = require('nodemailer');
require('dotenv').config();

// 创建发送邮件的传输对象
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.163.com',
  port: parseInt(process.env.EMAIL_PORT) || 25,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 定义邮件内容
const mailOptions = {
  from: process.env.EMAIL_FROM,
  to: process.env.EMAIL_TO,
  subject: '今天的工时！！！',
  html: '<p>空</p>',
};

/**
 * 生成任务详情HTML
 */
function generateTaskListHTML(tasks) {
  if (!tasks || tasks.length === 0) {
    return '<p style="color: #999;">暂无任务记录</p>';
  }

  let taskHTML = '<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">';
  taskHTML += '<tr style="background: #f0f0f0;"><th style="padding: 8px; border: 1px solid #ddd;">任务ID</th><th style="padding: 8px; border: 1px solid #ddd;">任务名称</th><th style="padding: 8px; border: 1px solid #ddd;">工时</th><th style="padding: 8px; border: 1px solid #ddd;">日期</th></tr>';
  
  tasks.forEach(task => {
    taskHTML += `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${task.id || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${task.name || '未知任务'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${task.consumed || '0'}h</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${task.date || 'N/A'}</td>
    </tr>`;
  });
  
  taskHTML += '</table>';
  return taskHTML;
}

/**
 * 格式化日期显示
 */
function formatDateForEmail(dateString) {
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString('zh-CN', { weekday: 'long' });
  return `${year}-${month}-${day} (${weekday})`;
}

/**
 * 发送详细的工时统计报告邮件
 */
function sendDetailedEffortReport(reportData) {
  const {
    date,
    sumTime,
    targetHours,
    tasks,
    isEnough,
    remainingTime,
    timestamp,
    hasError
  } = reportData;

  // 确定邮件主题
  let subject;
  if (hasError) {
    subject = `❌ 数据异常 - ${formatDateForEmail(date)}`;
  } else if (isEnough) {
    subject = `✅ 工时达标 - ${formatDateForEmail(date)} (${sumTime}h/${targetHours}h)`;
  } else {
    subject = `⚠️ 工时不足 - ${formatDateForEmail(date)} (${sumTime}h/${targetHours}h，缺${remainingTime}h)`;
  }

  // 确定状态样式
  const statusStyle = isEnough ? 'color: #28a745; font-weight: bold;' : 'color: #dc3545; font-weight: bold;';
  const statusText = isEnough ? '✅ 已达标' : '❌ 不足';
  
  // 确定处理结果
  let actionResult;
  if (hasError) {
    if (reportData.errorDetails) {
      const error = reportData.errorDetails;
      if (error.type === '403_FORBIDDEN') {
        actionResult = `🚫 访问被拒绝 (HTTP ${error.statusCode})<br>
                       📝 服务器信息: ${error.serverInfo ? error.serverInfo.join('<br>') : '无详细信息'}<br>
                       🔗 请求URL: ${error.url}<br>
                       💡 建议联系系统管理员检查访问权限`;
      } else if (error.type === 'LOGIN_REQUIRED') {
        actionResult = '🔐 需要重新登录认证，请检查用户凭据';
      } else if (error.type === 'NETWORK_ERROR') {
        actionResult = `🌐 网络连接异常: ${error.message}`;
      } else {
        actionResult = `❌ 未知错误: ${error.message}`;
      }
    } else {
      actionResult = '❌ 无法获取工时数据，请检查网络连接或页面结构是否发生变化';
    }
  } else if (isEnough) {
    actionResult = '✅ 工时充足，无需补录';
  } else {
    actionResult = `⏸️ 工时不足 ${remainingTime} 小时，已跳过自动补录功能`;
  }

  // 生成HTML邮件内容
  const htmlContent = `
    <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px;">
      <h2 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">📊 工时统计报告</h2>
      
      <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3498db;">
        <h3 style="color: #2c3e50; margin-top: 0;">📅 基本信息</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; width: 120px;"><strong>查询日期：</strong></td><td>${formatDateForEmail(date)}</td></tr>
          <tr><td style="padding: 5px 0;"><strong>执行时间：</strong></td><td>${timestamp}</td></tr>
          <tr><td style="padding: 5px 0;"><strong>总工时：</strong></td><td style="font-size: 18px; font-weight: bold;">${sumTime} 小时</td></tr>
          <tr><td style="padding: 5px 0;"><strong>目标工时：</strong></td><td>${targetHours} 小时</td></tr>
          <tr><td style="padding: 5px 0;"><strong>状态：</strong></td><td style="${statusStyle}">${statusText}</td></tr>
        </table>
      </div>
      
      <div style="margin: 20px 0;">
        <h3 style="color: #2c3e50;">📝 任务详情 (${tasks.length} 个)</h3>
        ${generateTaskListHTML(tasks)}
      </div>
      
      <div style="background: ${isEnough ? '#d4edda' : '#f8d7da'}; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${isEnough ? '#28a745' : '#dc3545'};">
        <h3 style="color: ${isEnough ? '#155724' : '#721c24'}; margin-top: 0;">💡 处理结果</h3>
        <p style="margin: 0; color: ${isEnough ? '#155724' : '#721c24'};">${actionResult}</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <p style="margin: 0; color: #6c757d; font-size: 14px;">
          📧 此邮件由禅道工时自动化系统发送<br>
          🤖 如有问题请检查系统配置或联系管理员
        </p>
      </div>
    </div>
  `;

  // 发送邮件
  const emailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: subject,
    html: htmlContent
  };

  transporter.sendMail(emailOptions, (error, info) => {
    if (error) {
      console.error('❌ 邮件发送失败:', error);
    } else {
      console.log('📧 邮件发送成功:', info.response);
    }
  });
}

// 保留原有的简单邮件函数以保持兼容性
module.exports.noticeMail = function (str, isEnough) {
  // 发送邮件
  // 根据传入的str参数更新邮件内容
  if (str) {
    mailOptions.html = `<p>${str}</p>`;
  }
  if (isEnough) {
    mailOptions.subject = '今天的工时够了！！！';
  } else {
    mailOptions.subject = '今天的工时不够但补了！！！';
  }
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

// 导出新的详细报告函数
module.exports.sendDetailedEffortReport = sendDetailedEffortReport;