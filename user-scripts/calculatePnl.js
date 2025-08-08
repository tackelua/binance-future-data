const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'allAccountTrades.json');

/**
 * Hàm chính để đọc dữ liệu và tính toán PNL
 */
function calculateTotalPnl() {
    console.log('🚀 Bắt đầu tính tổng PnL từ file allAccountTrades.json...');

    try {
        // Đọc và phân tích cú pháp file JSON
        const tradesData = fs.readFileSync(outputPath, 'utf8');
        const trades = JSON.parse(tradesData);

        if (trades.length === 0) {
            console.log('🟡 Không có giao dịch nào để tính toán.');
            return;
        }

        let totalPnl = 0;
        let totalCommission = 0;
        let filteredTrades = 0;

        // Ngày bắt đầu tháng 8/2025 (timestamp)
        const startOfAugust2025 = new Date('2025-08-01T00:00:00Z').getTime();

        // Lặp qua tất cả các giao dịch để tính toán
        trades.forEach(trade => {
            // Kiểm tra thời gian giao dịch (trade.time là timestamp)
            const tradeTime = parseInt(trade.time);

            // Chỉ tính những giao dịch từ đầu tháng 8/2025
            if (tradeTime > startOfAugust2025) {
                return; // Bỏ qua giao dịch này
            }

            filteredTrades++;
            const tradeDate = new Date(tradeTime).toISOString().split('T')[0]; // Format YYYY-MM-DD

            // PnL được lưu trực tiếp trong trường 'pnl' của mỗi giao dịch
            const pnl = parseFloat(trade.realizedPnl);
            if (!isNaN(pnl)) {
                totalPnl += pnl;
            }
            console.log(`- ${trade.symbol} (${tradeDate}): PnL = ${pnl.toFixed(4)} USDT - Total PnL = ${totalPnl.toFixed(4)} USDT`);

            // Phí giao dịch được lưu trong trường 'commission'
            const commission = parseFloat(trade.commission);
            if (!isNaN(commission)) {
                totalCommission += commission;
            }
        });

        console.log('\n======================================================');
        console.log('📊 KẾT QUẢ TÍNH TOÁN (Từ đầu tháng 8/2025)');
        console.log(`   - Tổng số giao dịch: ${trades.length}`);
        console.log(`   - Giao dịch từ 01/08/2025: ${filteredTrades}`);
        console.log(`   - Tổng PnL (Lãi và Lỗ): ${totalPnl.toFixed(4)} USDT`);
        console.log(`   - Tổng phí giao dịch: ${totalCommission.toFixed(4)} USDT`);
        console.log('======================================================');

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ Lỗi: Không tìm thấy file ${outputPath}. Vui lòng chạy script lấy lịch sử giao dịch trước.`);
        } else {
            console.error(`❌ Đã xảy ra lỗi khi đọc hoặc phân tích file JSON: ${error.message}`);
        }
    }
}

// Chạy hàm chính
calculateTotalPnl();