const puppeteer = require('puppeteer');
const file = require('./file.js');
const { checkAndLogin } = require('./login');
const { 周五 } = require('./util.js');
const { noticeMail, sendDetailedEffortReport } = require('./noticezen.js');

// 配置常量
const CONFIG = {
    TARGET_HOURS: 8,
    BASE_URL: 'https://proj.uhouzz.com',
    HEADLESS: true
};

/**
 * 初始化浏览器和页面
 */
async function initializeBrowser() {
    console.log('🚀 启动浏览器...');
    const browser = await puppeteer.launch({
        headless: CONFIG.HEADLESS
    });
    
    // 设置cookies
    await browser.setCookie(...file.readCookieFromFile());
    
    // 检查并登录
    await checkAndLogin(browser);
    
    const page = await browser.newPage();
    return { browser, page };
}

/**
 * 获取工时页面数据
 */
async function fetchEffortData(page, day) {
    try {
        // 尝试访问工时页面
        const directUrl = `${CONFIG.BASE_URL}/my-effort-${day}-date_desc-1-500-1.html`;
        console.log('📄 访问工时页面:', directUrl);
        
        const response = await page.goto(directUrl, { waitUntil: 'networkidle2' });
        
        // 检查HTTP响应状态
        const statusCode = response.status();
        console.log('🔍 HTTP状态码:', statusCode);
        
        // 获取页面信息
        const currentUrl = await page.url();
        const title = await page.title();
        console.log('🔍 当前页面URL:', currentUrl);
        console.log('🔍 页面标题:', title);
        
        // 处理403禁止访问错误
        if (statusCode === 403 || title.includes('403') || title.includes('禁止访问')) {
            console.log('🚫 检测到403禁止访问错误');
            console.log('📋 错误详情:');
            console.log('   - 请求URL:', directUrl);
            console.log('   - 状态码:', statusCode);
            console.log('   - 页面标题:', title);
            
            // 获取403错误页面的详细信息
            const errorInfo = await page.evaluate(() => {
                const infoDiv = document.querySelector('.info');
                if (infoDiv) {
                    const pElements = infoDiv.querySelectorAll('p');
                    return Array.from(pElements).map(p => p.textContent.trim());
                }
                return [];
            });
            
            console.log('📝 服务器错误信息:', errorInfo);
            
            // 返回403错误的特殊标识结果
            return {
                sumTime: 0,
                tasks: [],
                error: {
                    type: '403_FORBIDDEN',
                    message: '无权访问工时数据页面',
                    statusCode: statusCode,
                    url: directUrl,
                    title: title,
                    serverInfo: errorInfo,
                    timestamp: new Date().toISOString()
                }
            };
        }
        
        // 检查登录状态
        if (currentUrl.includes('user-login')) {
            console.log('❌ 页面重定向到登录页，需要重新认证');
            return {
                sumTime: 0,
                tasks: [],
                error: {
                    type: 'LOGIN_REQUIRED',
                    message: '需要重新登录认证',
                    url: currentUrl
                }
            };
        }
        
        console.log('✅ 页面访问成功，状态码:', statusCode);
        
    } catch (error) {
        console.log('❌ 页面访问异常:', error.message);
        return {
            sumTime: 0,
            tasks: [],
            error: {
                type: 'NETWORK_ERROR',
                message: '网络访问异常: ' + error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
    
    // 尝试等待iframe加载，如果失败则继续执行
    try {
        await page.waitForSelector('#appIframe-my', { timeout: 10000 });
        console.log('✅ iframe 元素已加载');
        
        // 获取iframe并切换到iframe内容
        const iframe = await page.$('#appIframe-my');
        if (iframe) {
            const iframeSrc = await iframe.evaluate(el => el.src);
            console.log('🔍 iframe src:', iframeSrc);
            
            // 切换到iframe内容
            const frame = await iframe.contentFrame();
            if (frame) {
                console.log('🔄 切换到iframe内容进行数据解析');
                
                // 等待iframe内的工时表格加载
                try {
                    await frame.waitForSelector('.table-effort', { timeout: 10000 });
                    console.log('✅ iframe内工时表格已加载');
                } catch (error) {
                    console.log('⚠️  iframe内工时表格未找到，检查其他选择器');
                }
                
                // 在iframe内解析工时数据
                return await frame.evaluate(() => {
                    let sumTime = 0;
                    
                    console.log('🔍 在iframe内开始解析工时数据...');
                    
                    // 尝试多种选择器
                    let rows = Array.from(document.querySelectorAll('.table-effort tbody tr'));
                    console.log('🔍 .table-effort tbody tr 找到行数:', rows.length);
                    
                    if (rows.length === 0) {
                        rows = Array.from(document.querySelectorAll('table tbody tr'));
                        console.log('🔍 table tbody tr 找到行数:', rows.length);
                    }
                    
                    if (rows.length === 0) {
                        rows = Array.from(document.querySelectorAll('tr'));
                        console.log('🔍 tr 找到行数:', rows.length);
                        
                        // 过滤包含工时数据的行
                        rows = rows.filter(row => {
                            const text = row.textContent || '';
                            return text.includes('小时') || text.includes('h') || /\d+\.?\d*/.test(text);
                        });
                        console.log('🔍 过滤后包含时间信息的行数:', rows.length);
                    }
                    
                    const tasks = rows.map((row, index) => {
                        const cells = Array.from(row.querySelectorAll('td'));
                        const task = { 
                            id: row.getAttribute('data-id') || `row-${index}`,
                            debug_cellCount: cells.length,
                            debug_rowText: (row.textContent || '').substring(0, 200)
                        };
                        
                        console.log(`🔍 处理第${index + 1}行，单元格数量:`, cells.length);
                        
                        cells.forEach((cell, cellIndex) => {
                            const cellText = cell.textContent.trim();
                            const classList = Array.from(cell.classList);
                            
                            console.log(`  单元格${cellIndex + 1}: "${cellText}", 类名: [${classList.join(', ')}]`);
                            
                            // 通过类名精确匹配
                            if (cell.classList.contains('c-objectType')) {
                                task.name = cellText;
                            } else if (cell.classList.contains('c-date')) {
                                task.date = cellText;
                            } else if (cell.classList.contains('c-consumed')) {
                                // 精确解析工时字段
                                task.consumed = cellText;
                                // 只取纯数字部分
                                const timeMatch = cellText.match(/(\d+\.?\d*)/);
                                if (timeMatch) {
                                    const timeValue = parseFloat(timeMatch[1]) || 0;
                                    sumTime += timeValue;
                                    console.log(`    解析工时: "${cellText}" -> ${timeValue}`);
                                }
                            } else if (cell.classList.contains('c-account')) {
                                task.account = cellText;
                            }
                            
                            // 备用匹配（当类名不可用时）
                            if (!task.name && cellText.includes('任务 #')) {
                                task.name = cellText;
                            }
                            if (!task.date && /\d{4}-\d{2}-\d{2}/.test(cellText)) {
                                task.date = cellText;
                            }
                            if (!task.account && cellText.includes('李印晓')) {
                                task.account = cellText;
                            }
                        });
                        
                        return task;
                    });
                    
                    console.log('🔍 iframe内最终解析结果 - 总工时:', sumTime, '任务数:', tasks.length);
                    return { sumTime, tasks };
                });
            }
        }
    } catch (error) {
        console.log('⚠️  iframe处理失败，尝试直接解析页面:', error.message);
        
        // 调试：检查页面实际内容
        const bodyHTML = await page.evaluate(() => {
            return document.body.innerHTML.substring(0, 1000); // 获取前1000个字符
        });
        console.log('🔍 页面body内容片段:', bodyHTML);
    }
    
    // 等待表格元素加载
    try {
        await page.waitForSelector('.table-effort', { timeout: 5000 });
        console.log('✅ 工时表格已加载');
    } catch (error) {
        console.log('⚠️  工时表格未找到，检查可能的表格选择器');
        
        // 调试：查找可能的表格相关元素
        const tableElements = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            const tableInfo = Array.from(tables).map(table => ({
                className: table.className,
                id: table.id,
                rowCount: table.rows ? table.rows.length : 0
            }));
            return tableInfo;
        });
        console.log('🔍 页面中的表格元素:', JSON.stringify(tableElements, null, 2));
        
        // 调试：查找包含"工时"、"effort"、"consumed"等关键词的元素
        const effortElements = await page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            const effortRelated = Array.from(allElements).filter(el => {
                const text = el.textContent || '';
                const className = el.className || '';
                const id = el.id || '';
                return text.includes('工时') || text.includes('effort') || text.includes('consumed') ||
                       className.includes('effort') || className.includes('time') ||
                       id.includes('effort') || id.includes('time');
            }).slice(0, 5).map(el => ({
                tag: el.tagName,
                className: el.className,
                id: el.id,
                text: (el.textContent || '').substring(0, 100)
            }));
            return effortRelated;
        });
        console.log('🔍 包含工时相关信息的元素:', JSON.stringify(effortElements, null, 2));
    }
    
    // 调试：保存页面截图用于分析
    await page.screenshot({ path: `debug-page-${day}.png`, fullPage: true });
    console.log('📸 调试截图已保存: debug-page-' + day + '.png');
    
    return await page.evaluate(() => {
        let sumTime = 0;
        
        // 调试：尝试多种可能的选择器
        console.log('🔍 开始解析页面数据...');
        
        // 方法1：原始选择器
        let rows = Array.from(document.querySelectorAll('.table-effort tbody tr'));
        console.log('🔍 .table-effort tbody tr 找到行数:', rows.length);
        
        if (rows.length === 0) {
            // 方法2：尝试其他可能的表格选择器
            rows = Array.from(document.querySelectorAll('table tbody tr'));
            console.log('🔍 table tbody tr 找到行数:', rows.length);
        }
        
        if (rows.length === 0) {
            // 方法3：尝试更宽泛的选择器
            rows = Array.from(document.querySelectorAll('tr'));
            console.log('🔍 tr 找到行数:', rows.length);
            
            // 过滤出可能包含工时数据的行
            rows = rows.filter(row => {
                const text = row.textContent || '';
                return text.includes('小时') || text.includes('h') || /\\d+\\.?\\d*/.test(text);
            });
            console.log('🔍 过滤后包含时间信息的行数:', rows.length);
        }
        
        const tasks = rows.map((row, index) => {
            const cells = Array.from(row.querySelectorAll('td'));
            const task = { 
                id: row.getAttribute('data-id') || `row-${index}`,
                debug_cellCount: cells.length,
                debug_rowText: (row.textContent || '').substring(0, 200)
            };
            
            console.log(`🔍 处理第${index + 1}行，单元格数量:`, cells.length);
            
            cells.forEach((cell, cellIndex) => {
                const cellText = cell.textContent.trim();
                const classList = Array.from(cell.classList);
                
                console.log(`  单元格${cellIndex + 1}: "${cellText}", 类名: [${classList.join(', ')}]`);
                
                if (cell.classList.contains('c-objectType') || cellText.includes('任务')) {
                    task.name = cellText;
                }
                if (cell.classList.contains('c-date') || /\\d{4}-\\d{2}-\\d{2}/.test(cellText)) {
                    task.date = cellText;
                }
                if (cell.classList.contains('c-consumed') || /\\d+\\.?\\d*[h小时]?$/.test(cellText)) {
                    task.consumed = cellText;
                    const timeValue = parseFloat(cellText) || 0;
                    sumTime += timeValue;
                    console.log(`    解析工时: "${cellText}" -> ${timeValue}`);
                }
                if (cell.classList.contains('c-account') || cellText.includes('李印晓')) {
                    task.account = cellText;
                }
            });
            
            return task;
        });
        
        console.log('🔍 最终解析结果 - 总工时:', sumTime, '任务数:', tasks.length);
        return { sumTime, tasks };
    });
}

/**
 * 格式化日期显示
 */
function formatDateDisplay(dateString) {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6) - 1;
    const day = dateString.substring(6, 8);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('zh-CN', { weekday: 'long' });
}

/**
 * 打印工时统计结果
 */
function printEffortSummary(day, effortData) {
    console.log('\n📊 工时数据详情:');
    console.log(JSON.stringify(effortData, null, 2));
    
    console.log('\n=== 工时统计结果 ===');
    console.log(`📅 查询日期: ${day} (${formatDateDisplay(day)})`);
    console.log(`⏰ 总工时: ${effortData.sumTime} 小时`);
    console.log(`📝 任务数量: ${effortData.tasks.length} 个`);
    console.log(`🎯 目标工时: ${CONFIG.TARGET_HOURS} 小时`);
    console.log(`📊 工时状态: ${effortData.sumTime >= CONFIG.TARGET_HOURS ? '✅ 已达标' : '❌ 不足'}`);
    
    return effortData.sumTime >= CONFIG.TARGET_HOURS;
}

/**
 * 处理工时不足情况
 */
async function handleInsufficientHours(day, effortData, timestamp) {
    const remainingTime = CONFIG.TARGET_HOURS - effortData.sumTime;
    console.log(`⚠️  缺少工时: ${remainingTime} 小时`);
    console.log('⏸️  跳过自动补录工时');
    
    // 发送详细报告邮件
    const reportData = {
        date: day,
        sumTime: effortData.sumTime,
        targetHours: CONFIG.TARGET_HOURS,
        tasks: effortData.tasks,
        isEnough: false,
        remainingTime: remainingTime,
        timestamp: timestamp,
        hasError: false
    };
    
    sendDetailedEffortReport(reportData);
    
    return remainingTime;
}

/**
 * 处理工时充足情况
 */
async function handleSufficientHours(day, effortData, timestamp) {
    console.log('✅ 工时充足，无需补录');
    
    // 发送详细报告邮件
    const reportData = {
        date: day,
        sumTime: effortData.sumTime,
        targetHours: CONFIG.TARGET_HOURS,
        tasks: effortData.tasks,
        isEnough: true,
        remainingTime: 0,
        timestamp: timestamp,
        hasError: false
    };
    
    sendDetailedEffortReport(reportData);
}

/**
 * 保存截图
 */
async function saveScreenshot(page, day) {
    const filename = `zen-${day}.png`;
    await page.screenshot({ path: filename });
    console.log('📸 截图已保存:', filename);
}

/**
 * 主程序流程
 */
async function main() {
    let browser = null;
    
    try {
        const timestamp = new Date().toLocaleString();
        console.log('⏰', timestamp);
        
        // 1. 初始化浏览器
        const { browser: browserInstance, page } = await initializeBrowser();
        browser = browserInstance;
        
        // 2. 获取查询日期
        const day = 周五();
        console.log('📅 查询日期:', day);
        
        // 3. 获取工时数据
        const effortData = await fetchEffortData(page, day);
        
        // 4. 检查是否有错误
        if (effortData.error) {
            console.log('❌ 工时数据获取失败:', effortData.error.message);
            console.log('📋 错误类型:', effortData.error.type);
            
            // 发送错误报告邮件
            const errorReportData = {
                date: day,
                sumTime: 0,
                targetHours: CONFIG.TARGET_HOURS,
                tasks: [],
                isEnough: false,
                remainingTime: CONFIG.TARGET_HOURS,
                timestamp: timestamp,
                hasError: true,
                errorDetails: effortData.error
            };
            
            sendDetailedEffortReport(errorReportData);
            
            console.log('📧 已发送错误报告邮件');
            
        } else {
            // 5. 打印统计结果
            const isHoursSufficient = printEffortSummary(day, effortData);
            
            // 6. 处理工时状态
            if (isHoursSufficient) {
                await handleSufficientHours(day, effortData, timestamp);
            } else {
                await handleInsufficientHours(day, effortData, timestamp);
            }
        }
        
        console.log('==================\n');
        
        // 6. 保存截图
        await saveScreenshot(page, day);
        
        console.log('✅ 程序执行完成');
        
    } catch (error) {
        console.error('❌ 程序执行错误:', error.message);
        console.error('详细错误:', error.stack);
        
        // 发送错误报告邮件
        const timestamp = new Date().toLocaleString();
        const day = 周五();
        const errorReportData = {
            date: day,
            sumTime: 0,
            targetHours: CONFIG.TARGET_HOURS,
            tasks: [],
            isEnough: false,
            remainingTime: CONFIG.TARGET_HOURS,
            timestamp: timestamp,
            hasError: true
        };
        
        sendDetailedEffortReport(errorReportData);
        
    } finally {
        // 7. 清理资源
        if (browser) {
            await browser.close();
            console.log('🔚 浏览器已关闭');
        }
    }
}

// 启动主程序
main();