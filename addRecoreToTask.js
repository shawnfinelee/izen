const puppeteer = require('puppeteer');
const file = require('./file.js');
const { checkAndLogin } = require('./login.js');
const { format } = require('date-fns');
require('dotenv').config();

// 导出一个异步函数，接收 remainingTime 参数
// 注意:这里不要使用立即执行函数,直接导出函数即可
module.exports = async function(remainingTime) {
    // 启动 Puppeteer 浏览器
    const browser = await puppeteer.launch({
        headless: true,
    });
    // 读取本地保存的 cookies 文件
    await browser.setCookie(...file.readCookieFromFile());
    // 检查登录并且登录
    await checkAndLogin(browser)

    // 打开新页面
    const page = await browser.newPage();

    // 页面-我的日志
    const taskId = process.env.ZENTAO_DEFAULT_TASK_ID || '0';
    const baseUrl = process.env.ZENTAO_BASE_URL || 'https://localhost';
    await page.goto(`${baseUrl}/effort-createForObject-task-${taskId}--.html`);

    // 填写表单
    // 首先等待这3个选择器内容加载完成
    await page.waitForSelector('#work\\[1\\]');
    await page.waitForSelector('input[name="consumed[1]"]');
    await page.waitForSelector('input[name="left[1]"]');

    await page.type('#work\\[1\\]', getRandomItems());
    await page.type('#consumed\\[1\\]', remainingTime.toString());
    await page.type('#left\\[1\\]', '1');

    // // 点击保存按钮
    await page.click('#submit');
    await page.waitForNavigation();

    // 截图保存
    const time = format(new Date(), 'yyyy-MM-dd,HH:mm:ss');
    await page.screenshot({ path: `zen-addTime-${time}.png` });
    console.log('Screenshot saved');

    // 关闭浏览器
    await browser.close();
};


function getRandomItems() {
    const arr = ['日常任务处理', '优化代码', '梳理逻辑'];
    const count = Math.random() < 0.5 ? 1 : 2; // 随机决定取 1 个或 2 个
    const shuffled = arr.sort(() => 0.5 - Math.random()); // 打乱数组顺序
    return shuffled.slice(0, count); // 取前 count 个
}

