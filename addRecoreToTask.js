const puppeteer = require('puppeteer');
const file = require( './file.js');
const { checkAndLogin } = require('./login.js');
const { format } = require('date-fns');


(async () => {
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
    const taskId = 74235;
    await page.goto(`https://proj.uhouzz.com/effort-createForObject-task-${taskId}--.html`);

    // 填写表单
// 首先等待这3个选择器内容加载完成
await page.waitForSelector('#work\\[1\\]');
await page.waitForSelector('input[name="consumed[1]"]');
await page.waitForSelector('input[name="left[1]"]');

await page.type('#work\\[1\\]', '代码编写');
await page.type('#consumed\\[1\\]', '8');
await page.type('#left\\[1\\]', '15');

    // // 点击保存按钮
    await page.click('#submit');
    await page.waitForNavigation();

     // 截图保存
     const time = format(new Date(), 'yyyy-MM-dd,HH:mm:ss');
     await page.screenshot({ path: `zen-addTime-${time}.png` });
     console.log('Screenshot saved');

    // 关闭浏览器
    await browser.close();
})();
