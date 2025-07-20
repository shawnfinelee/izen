const file = require('./file.js')

function checkUserLogin(url) {
    const regex = /user-login/;  // 正则表达式匹配 "user-login"
    return regex.test(url);  // 如果 url 包含 "user-login"，返回 true，否则返回 false
}

async function checkAndLogin(browser) {
    const page = await browser.newPage();
    // 访问 禅道 我的地盘
    await page.goto('https://proj.uhouzz.com/my-work-task.html');
    const url = await page.url();
    // 输出当前 URL
    console.log('当前页面的 URL:', url);

    if (checkUserLogin(url)) { //需要登录
        await doLogin(browser, page)
    } else {
        console.log('已经登录');
    }
}

async function doLogin(browser, page) {
    console.log('需要登录');
    await page.type('#account', 'yinxiao.li');
    await page.type('input[name="password"]', 't01HUF1UZ4@BmxpY1');

    // // 提交表单（假设提交按钮的选择器为#submit）
    await page.click('#submit');  // 提交按钮的选择器需要根据实际情况调整

    // // 等待页面导航完成
    await page.waitForNavigation();
    console.log('完成登录');

    file.saveCookieToFile(browser)
}

module.exports = {
    checkAndLogin
}