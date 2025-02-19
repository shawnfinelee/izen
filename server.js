const puppeteer = require('puppeteer');
const file = require( './file.js');
const { checkAndLogin } = require('./login');
const { today } = require('./util.js');
const { noticeMail } = require('./noticezen.js');

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

    // todo 应该针对每个fetch任务建立一个封装
    // 例如fetchMyEffort、fetchMyTask等
    // 我的日志
    const day = today();
    // await page.goto(`https://proj.uhouzz.com/my-effort-${day}.html`);
    // await page.waitForNavigation();
    await page.goto(`https://proj.uhouzz.com/my-effort-${day}-date_desc-1-500-1.html`);

    // 等待 iframe 元素加载
    const iframeElement = await page.$('iframe');

    // 获取 iframe 的上下文
    const iframe = await iframeElement.contentFrame();

    // 获取表格中的所有行 (tr) 并解析它们的内容
    const myEfforts = await iframe.evaluate(() => {

        const summary = document.querySelector('.table-footer .pull-left');
        let sumTime = 0;
        if (summary) {
            const match = summary.textContent.match(/\d+(\.\d+)?/)
            sumTime = parseFloat(match[0])
        }
        console.log('summary', summary ? summary.textContent : null)

        // 获取所有的 <tr> 元素
        const rows = Array.from(document.querySelectorAll('.table-effort tbody tr'));

        // 遍历每一行，获取每个 <td> 元素的文本内容
        const tasks = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            task = { id: row.getAttribute('data-id') };
            cells.map(cell => {
                if (cell.classList.contains('c-date')) {
                    task.date = cell.textContent.trim()
                }
                if (cell.classList.contains('c-name')) {
                    task.name = cell.title.trim()
                }
                if (cell.classList.contains('c-consumed')) {
                    task.consumed = cell.textContent.trim()
                }
                if (cell.classList.contains('c-account')) {
                    task.account = cell.textContent.trim()
                }
            }); // 获取每个单元格的文本并去除空白字符
            return task;
        });
        return {
            'sumTime': sumTime,
            'tasks': tasks
        }
    });

    // 打印解析后的数据
    console.log(JSON.stringify(myEfforts, null, 2));

    // 如果工时不够8,发送提醒邮件
    noticeMail(myEfforts)

    // 截图
    await page.screenshot({ path: `zen-${day}.png` });
    console.log('Screenshot saved as zen.png');

    // 关闭浏览器
    await browser.close();
})();
