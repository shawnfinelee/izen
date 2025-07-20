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

    const workContent = getWorkContent();
    console.log(`填写工作内容: ${workContent}`);
    await page.type('#work\\[1\\]', workContent);
    
    console.log(`填写消耗工时: ${remainingTime}`);
    await page.type('#consumed\\[1\\]', remainingTime.toString());
    
    const leftTime = '0';
    console.log(`填写剩余工时: ${leftTime}`);
    await page.type('#left\\[1\\]', leftTime);

    // 设置对话框处理程序（在点击按钮前设置）
    page.on('dialog', async dialog => {
        const message = dialog.message();
        console.log(`检测到确认框: ${message}`);
        
        if (message.includes('有剩余工时为零') || message.includes('剩余工时') || message.includes('确认')) {
            console.log('点击确认按钮...');
            await dialog.accept();
        } else {
            console.log('点击取消按钮...');
            await dialog.dismiss();
        }
    });
    
    console.log('点击提交按钮...');
    // 点击保存按钮
    await page.click('#submit');
    
    // 只有当剩余工时为0时才处理确认框
    if (leftTime === '0') {
        console.log('剩余工时为0，等待确认框出现...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
            // 尝试查找并点击确认按钮
            const confirmSelectors = [
                'button:contains("确认")',
                'button:contains("确定")',
                'input[type="button"][value*="确认"]',
                'input[type="button"][value*="确定"]',
                '.btn:contains("确认")',
                '.btn:contains("确定")'
            ];
            
            let confirmClicked = false;
            for (const selector of confirmSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    console.log(`找到确认按钮: ${selector}`);
                    await page.click(selector);
                    console.log('✅ 已点击确认按钮');
                    confirmClicked = true;
                    break;
                } catch (e) {
                    // 继续尝试下一个选择器
                }
            }
            
            if (!confirmClicked) {
                console.log('⚠️ 未找到确认按钮，尝试按Enter键...');
                await page.keyboard.press('Enter');
                console.log('已按Enter键');
            }
            
        } catch (error) {
            console.log('处理确认框时出错:', error.message);
        }
    } else {
        console.log('剩余工时不为0，无需处理确认框');
    }
    
    try {
        console.log('等待页面导航...');
        await page.waitForNavigation({ timeout: 10000 });
        console.log('✅ 页面导航成功');
    } catch (error) {
        console.log('⚠️ 页面导航超时，检查提交结果...');
        
        // 等待一下，让页面有时间更新
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 检查页面是否有成功提示或错误信息
        const pageContent = await page.content();
        if (pageContent.includes('成功') || pageContent.includes('success') || pageContent.includes('保存成功')) {
            console.log('✅ 发现成功提示');
        } else if (pageContent.includes('错误') || pageContent.includes('error') || pageContent.includes('失败')) {
            console.log('❌ 发现错误信息');
            throw new Error('提交失败：页面显示错误信息');
        } else {
            console.log('⚠️ 无法确定提交状态，但已处理确认框');
        }
    }

    // 截图保存
    const time = format(new Date(), 'yyyy-MM-dd,HH:mm:ss');
    await page.screenshot({ path: `screenshots/zen-addTime-${time}.png` });
    console.log('Screenshot saved');

    // 关闭浏览器
    await browser.close();
};

function getWorkContent() {
    return getRandomItems();
}

function getRandomItems() {
    const arr = ['日常任务处理', '优化代码', '梳理逻辑'];
    const count = Math.random() < 0.5 ? 1 : 2; // 随机决定取 1 个或 2 个
    const shuffled = arr.sort(() => 0.5 - Math.random()); // 打乱数组顺序
    return shuffled.slice(0, count); // 取前 count 个
}

// 如果直接运行此文件，执行工时补录
if (require.main === module) {
    const remainingTime = process.argv[2] || 1; // 从命令行参数获取剩余工时，默认1小时
    console.log(`开始执行工时补录，剩余工时: ${remainingTime}小时`);
    
    module.exports(Number(remainingTime))
        .then(() => {
            console.log('✅ 工时补录完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 工时补录失败:', error.message);
            process.exit(1);
        });
}

