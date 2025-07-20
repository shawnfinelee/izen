function today() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份需要补零
    const day = String(now.getDate()).padStart(2, '0'); // 日期需要补零
    return `${year}${month}${day}`;
}

/**
 * 格式化日期为YYYYMMDD格式，方便文件命名
 */
function formatDateForFile(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * 解析命令行参数获取查询日期
 * 支持格式：YYYYMMDD 或 YYYY-MM-DD
 * 如果没有传入参数，返回当前日期
 */
function getQueryDate() {
    const args = process.argv.slice(2);
    const dateArg = args[0];
    
    if (!dateArg) {
        // 没有传入日期参数，返回当前日期
        return today();
    }
    
    // 支持 YYYY-MM-DD 格式
    if (dateArg.includes('-')) {
        const cleanDate = dateArg.replace(/-/g, '');
        if (/^\d{8}$/.test(cleanDate)) {
            return cleanDate;
        }
    }
    
    // 支持 YYYYMMDD 格式
    if (/^\d{8}$/.test(dateArg)) {
        return dateArg;
    }
    
    console.log('⚠️  日期格式错误，使用当前日期。支持格式：YYYYMMDD 或 YYYY-MM-DD');
    return today();
}

function 周五() {
    const now = new Date();
    const currentDay = now.getDay(); // 0=周日, 1=周一, ..., 5=周五, 6=周六
    
    // 计算到本周五的天数差
    let dayDiff;
    if (currentDay === 0) { // 周日
        dayDiff = -2; // 回到周五（两天前）
    } else if (currentDay <= 5) { // 周一到周五
        dayDiff = 5 - currentDay; // 到周五的天数
    } else { // 周六
        dayDiff = -1; // 回到周五（一天前）
    }
    
    // 计算周五的日期
    const friday = new Date(now);
    friday.setDate(now.getDate() + dayDiff);
    
    const year = friday.getFullYear();
    const month = String(friday.getMonth() + 1).padStart(2, '0');
    const day = String(friday.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

module.exports = {
    today,
    周五,
    formatDateForFile,
    getQueryDate
}
