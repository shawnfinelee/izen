const nodemailer = require('nodemailer');

// 创建发送邮件的传输对象
const transporter = nodemailer.createTransport({
  host: 'smtp.163.com', // 邮件服务器地址 (例如 Gmail 的为 smtp.gmail.com)
  port: 25,               // SMTP 端口号 (通常是 587 或 465)
  secure: false,           // 是否使用 SSL/TLS (true 为 465，false 为 587)
  auth: {
    user: 'shawnfinelee@163.com', // 你的邮箱账号
    pass: 'FKm5UyaJZk2ZW9rP',    // 你的邮箱密码或应用专用密码
  },
});

// 定义邮件内容
const mailOptions = {
  from: '"李印晓" <shawnfinelee@163.com>', // 发件人信息
  to: 'shawnfinelee@163.com',                 // 收件人邮箱，多个用逗号分隔
  subject: '今天的工时不够啊！！！',              // 邮件主题
  text: '这个 这个.',    // 文本正文
  html: '<p>fsfsf<b>HTML</b> email body.</p>', // HTML 正文
};

module.exports = function () {
  // 发送邮件
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}