const axios = require('axios');

// Base URL cho API Binance Futures. [10]
const BINANCE_FUTURES_API_BASE_URL = 'https://fapi.binance.com';

/**
 * Lấy dữ liệu thống kê 24 giờ cho tất cả các cặp giao dịch trên Binance Futures.
 * Endpoint: GET /fapi/v1/ticker/24hr [4, 5]
 * @returns {Promise<Array>} Một mảng các đối tượng ticker, mỗi đối tượng chứa symbol, volume, quoteVolume, v.v.
 */
async function getFutures24hrTickerData() {
    const endpoint = '/fapi/v1/ticker/24hr';
    try {
        // Thực hiện yêu cầu GET đến API Binance Futures. [2, 3, 6]
        const response = await axios.get(`${BINANCE_FUTURES_API_BASE_URL}${endpoint}`);
        // Dữ liệu phản hồi chứa một mảng thông tin ticker. [4]
        return response.data;
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ticker 24 giờ từ Binance Futures:', error.message);
        if (error.response) {
            console.error('Mã trạng thái HTTP:', error.response.status);
            console.error('Dữ liệu phản hồi lỗi:', error.response.data);
        }
        return []; // Trả về mảng rỗng nếu có lỗi.
    }
}

/**
 * Phân tích các cặp giao dịch Binance Futures để tìm kiếm tiềm năng tăng giá.
 * Đây là một heuristic và không thay thế cho phân tích kỹ thuật chuyên sâu.
 * @param {Array} tickerData - Một mảng các đối tượng ticker.
 * @returns {Object} Các danh sách coin được phân loại.
 */
function analyzeFuturesCoinsForPotential(tickerData) {
    const potentialBounce = []; // Các cặp có thể "quá bán" trên khung 24h, có tiềm năng phục hồi.
    const strongMomentum = [];  // Các cặp đang có đà tăng mạnh, có thể tiếp tục tăng.
    const highVolumeActive = []; // Các cặp có khối lượng giao dịch cao nhưng không thuộc hai tiêu chí trên.

    // Ngưỡng tối thiểu cho khối lượng giao dịch (tính bằng USDT) để được xem xét.
    // Điều này giúp loại bỏ các cặp kém thanh khoản.
    const MIN_QUOTE_VOLUME = 5_000_000; // 5 triệu USDT.

    // Ngưỡng phần trăm thay đổi giá âm để xác định tiềm năng phục hồi (quá bán).
    const NEGATIVE_CHANGE_THRESHOLD = -3; // Giảm hơn 3%.

    // Ngưỡng phần trăm thay đổi giá dương để xác định đà tăng mạnh.
    const POSITIVE_CHANGE_THRESHOLD = 3;  // Tăng hơn 3%.

    // Ngưỡng gần với giá thấp nhất/cao nhất trong 24h (trong vòng 1%).
    // Ví dụ: Nếu giá hiện tại chỉ cao hơn giá thấp nhất 1% thì được coi là "gần giá thấp nhất".
    const PROXIMITY_TO_LOW_HIGH_THRESHOLD = 0.01; // 1%.

    tickerData.forEach(item => {
        const symbol = item.symbol;
        const lastPrice = Number(item.lastPrice);
        const highPrice = Number(item.highPrice);
        const lowPrice = Number(item.lowPrice);
        const priceChangePercent = Number(item.priceChangePercent);
        const quoteVolume = Number(item.quoteVolume);

        // Bỏ qua các mục có dữ liệu không hợp lệ hoặc khối lượng quá thấp.
        if (isNaN(lastPrice) || isNaN(highPrice) || isNaN(lowPrice) || isNaN(priceChangePercent) || isNaN(quoteVolume) || quoteVolume < MIN_QUOTE_VOLUME) {
            return;
        }

        // Điều kiện cho "tiềm năng phục hồi" (quá bán trên khung 24h):
        // 1. Phần trăm thay đổi giá âm đáng kể.
        // 2. Giá hiện tại gần với giá thấp nhất trong 24 giờ.
        if (priceChangePercent < NEGATIVE_CHANGE_THRESHOLD &&
            (lastPrice - lowPrice) / lowPrice < PROXIMITY_TO_LOW_HIGH_THRESHOLD) {
            potentialBounce.push(item);
        }
        // Điều kiện cho "đà tăng mạnh":
        // 1. Phần trăm thay đổi giá dương đáng kể.
        // 2. Giá hiện tại gần với giá cao nhất trong 24 giờ.
        else if (priceChangePercent > POSITIVE_CHANGE_THRESHOLD &&
            (highPrice - lastPrice) / lastPrice < PROXIMITY_TO_LOW_HIGH_THRESHOLD) {
            strongMomentum.push(item);
        }
        // Các cặp có khối lượng cao, nhưng không thuộc hai tiêu chí trên.
        // Sử dụng ngưỡng cao hơn để chỉ lấy các cặp thực sự sôi động.
        else if (quoteVolume >= MIN_QUOTE_VOLUME * 2) {
            highVolumeActive.push(item);
        }
    });

    // Sắp xếp các danh mục theo khối lượng giao dịch (quoteVolume) giảm dần để dễ xem.
    potentialBounce.sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume));
    strongMomentum.sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume));
    highVolumeActive.sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume));

    return { potentialBounce, strongMomentum, highVolumeActive };
}

/**
 * Hàm chính để thực thi script.
 */
async function main() {
    console.log('Đang kiểm tra các cặp giao dịch Binance Futures để tìm tiềm năng tăng giá...');
    const tickerData = await getFutures24hrTickerData();

    if (tickerData.length > 0) {
        const { potentialBounce, strongMomentum, highVolumeActive } = analyzeFuturesCoinsForPotential(tickerData);

        console.log('\n--- Các cặp có tiềm năng phục hồi (quá bán trên khung 24h) ---');
        if (potentialBounce.length > 0) {
            potentialBounce.slice(0, 5).forEach((coin, index) => { // Hiển thị 5 cặp hàng đầu.
                console.log(
                    `${index + 1}. ${coin.symbol}: ` +
                    `Giá cuối: ${Number(coin.lastPrice).toFixed(4)} | ` +
                    `Thay đổi 24h: ${Number(coin.priceChangePercent).toFixed(2)}% | ` +
                    `Giá thấp 24h: ${Number(coin.lowPrice).toFixed(4)} | ` +
                    `Khối lượng (Quote): ${Number(coin.quoteVolume).toFixed(2)}`
                );
            });
        } else {
            console.log('Không tìm thấy cặp nào có dấu hiệu quá bán trên khung 24h theo tiêu chí.');
        }

        console.log('\n--- Các cặp có đà tăng mạnh (có thể tiếp tục tăng) ---');
        if (strongMomentum.length > 0) {
            strongMomentum.slice(0, 5).forEach((coin, index) => { // Hiển thị 5 cặp hàng đầu.
                console.log(
                    `${index + 1}. ${coin.symbol}: ` +
                    `Giá cuối: ${Number(coin.lastPrice).toFixed(4)} | ` +
                    `Thay đổi 24h: ${Number(coin.priceChangePercent).toFixed(2)}% | ` +
                    `Giá cao 24h: ${Number(coin.highPrice).toFixed(4)} | ` +
                    `Khối lượng (Quote): ${Number(coin.quoteVolume).toFixed(2)}`
                );
            });
        } else {
            console.log('Không tìm thấy cặp nào có đà tăng mạnh theo tiêu chí.');
        }

        console.log('\n--- Các cặp có khối lượng giao dịch cao và đang hoạt động ---');
        if (highVolumeActive.length > 0) {
            highVolumeActive.slice(0, 5).forEach((coin, index) => { // Hiển thị 5 cặp hàng đầu.
                console.log(
                    `${index + 1}. ${coin.symbol}: ` +
                    `Giá cuối: ${Number(coin.lastPrice).toFixed(4)} | ` +
                    `Thay đổi 24h: ${Number(coin.priceChangePercent).toFixed(2)}% | ` +
                    `Khối lượng (Quote): ${Number(coin.quoteVolume).toFixed(2)}`
                );
            });
        } else {
            console.log('Không tìm thấy cặp nào có khối lượng giao dịch cao và đang hoạt động theo tiêu chí.');
        }

        console.log('\n--- LƯU Ý QUAN TRỌNG ---');
        console.log('1. Đây chỉ là phân tích sơ bộ dựa trên dữ liệu 24h và không phải lời khuyên đầu tư.');
        console.log('2. Các tiêu chí "quá bán" hoặc "đà tăng mạnh" được xác định dựa trên sự thay đổi giá và vị trí giá trong phạm vi 24h, không phải từ các chỉ báo kỹ thuật chuyên sâu như RSI.');
        console.log('3. Luôn tự nghiên cứu kỹ lưỡng (DYOR) và cân nhắc rủi ro trước khi giao dịch.');

    } else {
        console.log('Không thể lấy dữ liệu hoặc không có dữ liệu nào được trả về.');
    }
}

// Thực thi hàm chính
main();