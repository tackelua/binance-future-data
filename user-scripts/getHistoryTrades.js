const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.BINANCE_API_KEY;
const apiSecret = process.env.BINANCE_API_SECRET;
const baseUrl = 'https://fapi.binance.com';

// ===================================================================
// ✅ CẤU HÌNH
// ===================================================================
const SYMBOLS_TO_CHECK = require('../symbols.json');
const BATCH_SIZE = 10;
// ===================================================================


/**
 * ⭐️ HÀM GỌI API ĐÃ ĐƯỢC NÂNG CẤP VỚI CƠ CHẾ RETRY ⭐️
 *
 * @param {string} method - Phương thức HTTP (GET, POST)
 * @param {string} endpoint - Điểm cuối API
 * @param {object} params - Các tham số cho yêu cầu
 * @param {number} maxRetries - Số lần thử lại tối đa
 * @returns {Promise<any>}
 */
async function callApi(method, endpoint, params = {}, maxRetries = 5) {
    let retries = 0;

    // Vòng lặp để thử lại khi cần thiết
    while (retries < maxRetries) {
        try {
            const timestamp = Date.now();
            const queryString = new URLSearchParams({ ...params, timestamp }).toString();
            const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
            const url = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;

            const response = await axios({
                method,
                url,
                headers: { 'X-MBX-APIKEY': apiKey },
            });

            // Nếu thành công, trả về dữ liệu và thoát khỏi vòng lặp
            return response.data;

        } catch (error) {
            // Kiểm tra xem đây có phải là lỗi rate limit không
            if (error.response && (error.response.status === 429 || error.response.status === 418)) {
                retries++;
                const waitTime = 60; // Chờ 60 giây khi bị ban
                console.warn(`
          ------------------------------------------------------
          🟡 CẢNH BÁO: Bị giới hạn API (Lỗi ${error.response.status}).
          ⏳ Đang tạm dừng ${waitTime} giây... Sẽ thử lại lần ${retries}/${maxRetries}.
          (Endpoint: ${endpoint}, Symbol: ${params.symbol || 'N/A'})
          ------------------------------------------------------
        `);
                // Tạm dừng script
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                continue; // Quay lại đầu vòng lặp để thử lại
            } else {
                // Nếu là lỗi khác (ví dụ: symbol không hợp lệ), không thử lại
                console.error(`❌ Lỗi không thể thử lại tại ${endpoint} cho symbol ${params.symbol || 'N/A'}:`, error.response ? error.response.data.msg : error.message);
                return []; // Trả về mảng rỗng để không làm gián đoạn các batch khác
            }
        }
    }

    // Nếu đã thử lại hết số lần mà vẫn lỗi
    console.error(`🚨 THẤT BẠI: Đã thử lại ${maxRetries} lần cho ${endpoint} với symbol ${params.symbol || 'N/A'} mà không thành công.`);
    return []; // Trả về mảng rỗng
}


/**
 * Lấy toàn bộ lịch sử giao dịch cho MỘT symbol (Không cần thay đổi)
 */
async function getAllTradesForSymbol(symbol) {
    let allTrades = [];
    let lastTradeId = 0;
    const limit = 1000;

    console.log(`  - ⏳ Bắt đầu lấy lịch sử cho [${symbol}]...`);

    while (true) {
        const params = { symbol, limit };
        if (lastTradeId > 0) {
            params.fromId = lastTradeId;
        }

        // Luôn gọi hàm callApi đã được nâng cấp
        const trades = await callApi('GET', '/fapi/v1/userTrades', params);

        if (trades.length === 0) break;

        const newTrades = trades.filter(t => !allTrades.some(at => at.id === t.id));
        if (newTrades.length === 0) break;

        allTrades = allTrades.concat(newTrades);
        lastTradeId = newTrades[newTrades.length - 1].id + 1;

        if (newTrades.length < limit) break;

        await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log(`  - ✅ Hoàn thành [${symbol}], tổng cộng ${allTrades.length} giao dịch.`);
    return allTrades;
}


/**
 * Hàm chính để xử lý theo lô (batch)
 */
async function main() {
    console.log(`🚀 Bắt đầu quá trình lấy lịch sử cho ${SYMBOLS_TO_CHECK.length} symbols.`);
    console.log(`📦 Kích thước mỗi lô: ${BATCH_SIZE} yêu cầu song song.`);
    console.log('------------------------------------------------------');

    let allAccountTrades = [];
    // Thêm dòng này để tính tổng số lô
    const totalBatches = Math.ceil(SYMBOLS_TO_CHECK.length / BATCH_SIZE);

    for (let i = 0; i < SYMBOLS_TO_CHECK.length; i += BATCH_SIZE) {
        const batch = SYMBOLS_TO_CHECK.slice(i, i + BATCH_SIZE);
        const currentBatchNumber = Math.floor(i / BATCH_SIZE) + 1;

        console.log(`\n🌀 Đang xử lý lô ${currentBatchNumber}/${totalBatches}... Bao gồm [${batch.join(', ')}]`);

        const promises = batch.map(symbol => getAllTradesForSymbol(symbol));
        const tradesFromBatch = await Promise.all(promises);

        tradesFromBatch.forEach(trades => {
            if (trades.length > 0) {
                allAccountTrades = allAccountTrades.concat(trades);
            }
        });

        console.log(`\n✅ Đã xử lý xong lô ${currentBatchNumber}/${totalBatches}. Tổng số giao dịch hiện tại: ${allAccountTrades.length}`);

        if (i + BATCH_SIZE < SYMBOLS_TO_CHECK.length) {
            console.log('--- Nghỉ 1 giây trước khi xử lý lô tiếp theo ---');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }


    const outputPath = path.join(__dirname, 'allAccountTrades.json');
    fs.writeFileSync(outputPath, JSON.stringify(allAccountTrades, null, 2), 'utf8');

    console.log('\n======================================================');
    console.log(`🎉 HOÀN TẤT!`);
    console.log(`   - Đã xử lý tổng cộng: ${SYMBOLS_TO_CHECK.length} symbols.`);
    console.log(`   - Tổng số giao dịch lấy được: ${allAccountTrades.length}`);
    console.log(`   - Kết quả đã được lưu vào file: ${outputPath}`);
    console.log('======================================================');
}

main();