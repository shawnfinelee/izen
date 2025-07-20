/**
 * 禅道工作日志耗时统计脚本
 * 用于统计 class="main-table table-effort" 表格中的总耗时
 */

class EffortCalculator {
    constructor() {
        this.totalEffort = 0;
        this.records = [];
        this.debug = true;
    }

    /**
     * 解析时间字符串，支持多种格式
     * @param {string} timeStr - 时间字符串
     * @returns {number} - 小时数
     */
    parseTimeString(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        
        let totalHours = 0;
        const text = timeStr.trim();
        
        // 匹配纯数字（默认为小时）
        const numberMatch = text.match(/^(\d+(?:\.\d+)?)$/);
        if (numberMatch) {
            return parseFloat(numberMatch[1]);
        }
        
        // 匹配小时格式
        const hourPatterns = [
            /(\d+(?:\.\d+)?)\s*h/gi,  // 1.5h, 2h
            /(\d+(?:\.\d+)?)\s*小时/g,          // 2小时
            /(\d+(?:\.\d+)?)\s*时/g,            // 2时
        ];
        
        // 匹配分钟格式
        const minutePatterns = [
            /(\d+)\s*m/gi,            // 30m
            /(\d+)\s*分钟/g,          // 30分钟
            /(\d+)\s*分/g,            // 30分
        ];
        
        // 处理小时
        hourPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const num = parseFloat(match.replace(/[^\d.]/g, ''));
                    if (!isNaN(num)) {
                        totalHours += num;
                    }
                });
            }
        });
        
        // 处理分钟
        minutePatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const num = parseFloat(match.replace(/[^\d.]/g, ''));
                    if (!isNaN(num)) {
                        totalHours += num / 60;
                    }
                });
            }
        });
        
        // 处理复合格式如 "2h30m"
        const complexPattern = /(\d+)\s*h\s*(\d+)\s*m/gi;
        const complexMatches = text.match(complexPattern);
        if (complexMatches) {
            complexMatches.forEach(match => {
                const parts = match.match(/(\d+)/g);
                if (parts && parts.length >= 2) {
                    totalHours += parseInt(parts[0]) + parseInt(parts[1]) / 60;
                }
            });
        }
        
        return totalHours;
    }

    /**
     * 查找并统计耗时表格
     * @returns {Object} - 统计结果
     */
    calculateEffort() {
        this.totalEffort = 0;
        this.records = [];
        
        // 查找目标表格
        const targetTables = document.querySelectorAll('.main-table.table-effort, table.main-table.table-effort');
        
        if (this.debug) {
            console.log('🔍 查找目标表格...');
            console.log(`找到 ${targetTables.length} 个目标表格`);
        }
        
        if (targetTables.length === 0) {
            // 如果没找到特定类名的表格，查找所有表格
            const allTables = document.querySelectorAll('table');
            if (this.debug) {
                console.log(`未找到目标表格，检查所有 ${allTables.length} 个表格...`);
            }
            
            allTables.forEach((table, index) => {
                this.processTable(table, index);
            });
        } else {
            targetTables.forEach((table, index) => {
                this.processTable(table, index, true);
            });
        }
        
        // 验证页面底部的总计信息
        this.validateWithPageTotal();
        
        return {
            totalHours: this.totalEffort,
            recordCount: this.records.length,
            records: this.records,
            summary: this.generateSummary()
        };
    }

    /**
     * 处理单个表格
     * @param {HTMLElement} table - 表格元素
     * @param {number} tableIndex - 表格索引
     * @param {boolean} isTargetTable - 是否为目标表格
     */
    processTable(table, tableIndex, isTargetTable = false) {
        if (this.debug) {
            console.log(`📊 处理表格 ${tableIndex} (目标表格: ${isTargetTable})`);
            console.log('表格类名:', table.className);
        }
        
        // 查找表头，确定耗时列的位置
        const headers = table.querySelectorAll('thead th, tr:first-child th, tr:first-child td');
        let effortColumnIndex = -1;
        
        headers.forEach((header, index) => {
            const headerText = header.textContent.trim();
            if (headerText.includes('耗时') || headerText.includes('工时') || 
                headerText.includes('时间') || headerText.includes('effort') ||
                headerText.includes('consumed')) {
                effortColumnIndex = index;
                if (this.debug) {
                    console.log(`✅ 找到耗时列: "${headerText}" (索引: ${index})`);
                }
            }
        });
        
        // 处理数据行
        const dataRows = table.querySelectorAll('tbody tr, tr');
        let tableTotal = 0;
        
        dataRows.forEach((row, rowIndex) => {
            // 跳过表头行
            if (row.parentElement.tagName === 'THEAD') return;
            
            const cells = row.querySelectorAll('td, th');
            if (cells.length === 0) return;
            
            let rowEffort = 0;
            let workContent = '';
            let recordId = '';
            let date = '';
            
            if (effortColumnIndex >= 0 && cells[effortColumnIndex]) {
                // 使用确定的耗时列
                const effortText = cells[effortColumnIndex].textContent.trim();
                rowEffort = this.parseTimeString(effortText);
                
                // 提取其他信息
                if (cells[0]) recordId = cells[0].textContent.trim();
                if (cells[1]) date = cells[1].textContent.trim();
                if (cells[2]) workContent = cells[2].textContent.trim();
                
                if (rowEffort > 0) {
                    tableTotal += rowEffort;
                    this.records.push({
                        tableIndex,
                        rowIndex,
                        id: recordId,
                        date: date,
                        work: workContent,
                        effort: rowEffort,
                        effortText: effortText
                    });
                    
                    if (this.debug) {
                        console.log(`📝 记录 ${this.records.length}: ${workContent} - ${effortText} (${rowEffort}小时)`);
                    }
                }
            } else if (isTargetTable || table.className.includes('effort')) {
                // 如果是目标表格但没找到耗时列，搜索所有列
                cells.forEach((cell, cellIndex) => {
                    const cellText = cell.textContent.trim();
                    const effort = this.parseTimeString(cellText);
                    
                    if (effort > 0) {
                        // 避免重复计算同一行的数据
                        const existingRecord = this.records.find(r => 
                            r.tableIndex === tableIndex && r.rowIndex === rowIndex
                        );
                        
                        if (!existingRecord) {
                            tableTotal += effort;
                            
                            // 提取其他信息
                            if (cells[0]) recordId = cells[0].textContent.trim();
                            if (cells[1]) date = cells[1].textContent.trim();
                            if (cells[2]) workContent = cells[2].textContent.trim();
                            
                            this.records.push({
                                tableIndex,
                                rowIndex,
                                id: recordId,
                                date: date,
                                work: workContent,
                                effort: effort,
                                effortText: cellText,
                                columnIndex: cellIndex
                            });
                            
                            if (this.debug) {
                                console.log(`📝 记录 ${this.records.length}: ${workContent} - ${cellText} (${effort}小时)`);
                            }
                        }
                    }
                });
            }
        });
        
        if (tableTotal > 0) {
            this.totalEffort += tableTotal;
            if (this.debug) {
                console.log(`📊 表格 ${tableIndex} 小计: ${tableTotal} 小时`);
            }
        }
    }

    /**
     * 验证页面底部的总计信息
     */
    validateWithPageTotal() {
        const footerElements = document.querySelectorAll('.table-footer .text, .footer-info, .total-info');
        
        footerElements.forEach(element => {
            const text = element.textContent;
            const match = text.match(/总消耗\s*(\d+(?:\.\d+)?)\s*小时/);
            if (match) {
                const pageTotal = parseFloat(match[1]);
                if (this.debug) {
                    console.log(`🔍 页面显示总计: ${pageTotal} 小时`);
                    console.log(`📊 脚本计算总计: ${this.totalEffort} 小时`);
                    console.log(`✅ 验证结果: ${Math.abs(pageTotal - this.totalEffort) < 0.01 ? '一致' : '不一致'}`);
                }
            }
        });
    }

    /**
     * 生成统计摘要
     * @returns {string} - 摘要信息
     */
    generateSummary() {
        if (this.records.length === 0) {
            return '未找到任何工作记录';
        }
        
        const dates = [...new Set(this.records.map(r => r.date))];
        const summary = [
            `📊 工作日志统计摘要`,
            `📅 统计日期: ${dates.join(', ')}`,
            `📝 记录数量: ${this.records.length} 条`,
            `⏱️  总耗时: ${this.totalEffort} 小时`,
            ``,
            `📋 详细记录:`
        ];
        
        this.records.forEach((record, index) => {
            summary.push(`${index + 1}. ${record.work || record.id} - ${record.effort}小时`);
        });
        
        return summary.join('\n');
    }

    /**
     * 在控制台输出结果
     */
    printResults() {
        const result = this.calculateEffort();
        console.log('\n' + '='.repeat(50));
        console.log(result.summary);
        console.log('='.repeat(50));
        return result;
    }
}

// 创建全局实例
window.effortCalculator = new EffortCalculator();

// 提供简化的调用方法
window.calculateEffort = function(debug = true) {
    window.effortCalculator.debug = debug;
    return window.effortCalculator.printResults();
};

// 自动执行（如果在浏览器环境中）
if (typeof document !== 'undefined') {
    console.log('🚀 工作日志耗时统计脚本已加载');
    console.log('💡 使用方法: calculateEffort() 或 effortCalculator.printResults()');
}

// 导出（如果在Node.js环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EffortCalculator;
}
