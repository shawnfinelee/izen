const path = require('path');
const fs = require('fs');

function saveAsFile(content, fileName) {
    const fpath = path.join(__dirname, fileName);
    fs.writeFileSync(fpath, content);
}

async function saveCookieToFile(browser) {
    const cookies = await browser.cookies();
    // // 保存 cookies 到本地文件
    saveAsFile(JSON.stringify(cookies, null, 2), 'cookies.json')
}

function readCookieFromFile() {
    // 读取本地保存的 cookies 文件
    const cookiesPath = path.join(__dirname, 'cookies.json');
    return JSON.parse(fs.readFileSync(cookiesPath));
}

module.exports = {
    saveAsFile,
    saveCookieToFile,
    readCookieFromFile
}