function today() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份需要补零
    const day = String(now.getDate()).padStart(2, '0'); // 日期需要补零
    return `${year}${month}${day}`;
}
module.exports = {
    today
}
