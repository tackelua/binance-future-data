const axios = require('axios');

const BINANCE_FUTURES_API_BASE_URL = 'https://fapi.binance.com'; // Base URL for Binance Futures API [10, 14]

/**
 * Fetches 24-hour ticker data for all symbols on Binance Futures.
 * @returns {Promise<Array>} An array of ticker objects, each containing symbol, volume, quoteVolume, etc.
 */
async function getFutures24hrTickerData() {
    const endpoint = '/fapi/v1/ticker/24hr'; // Endpoint to get 24hr ticker data [1, 8, 17]
    try {
        // Make a GET request to the Binance Futures API [2, 3, 4, 5, 6]
        const response = await axios.get(`${BINANCE_FUTURES_API_BASE_URL}${endpoint}`);
        return response.data; // The response data contains an array of ticker information [17]
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ticker 24 giờ từ Binance Futures:', error.message);
        if (error.response) {
            console.error('Mã trạng thái HTTP:', error.response.status);
            console.error('Dữ liệu phản hồi lỗi:', error.response.data);
        }
        return []; // Return an empty array in case of an error
    }
}

/**
 * Filters and sorts the ticker data by quote volume in descending order.
 * @param {Array} tickerData - An array of ticker objects.
 * @param {number} limit - The number of top coins to return.
 * @returns {Array} An array of top coins sorted by quote volume.
 */
function getTopVolumeFuturesCoins(tickerData, limit = 10) {
    // Filter out symbols that might not have significant trading or are not active
    // And ensure quoteVolume is a number for proper sorting
    const filteredData = tickerData.filter(item => {
        // Binance API returns volume and quoteVolume as strings, convert to Number [17]
        const quoteVolume = Number(item.quoteVolume);
        // Only include items with a positive quote volume to filter out inactive pairs
        return !isNaN(quoteVolume) && quoteVolume > 0;
    });

    // Sort by quoteVolume (volume in the quote asset, e.g., USDT) in descending order [17]
    const sortedData = filteredData.sort((a, b) => {
        return Number(b.quoteVolume) - Number(a.quoteVolume);
    });

    // Return the top N coins
    return sortedData.slice(0, limit);
}

/**
 * Main function to execute the script.
 */
async function main() {
    console.log('Đang kiểm tra các cặp giao dịch Binance Futures có khối lượng lớn gần đây...');
    const tickerData = await getFutures24hrTickerData();

    if (tickerData.length > 0) {
        const topCoins = getTopVolumeFuturesCoins(tickerData, 15); // Get top 15 coins

        console.log('\n--- Top 15 cặp giao dịch Binance Futures có khối lượng 24h lớn nhất ---');
        topCoins.forEach((coin, index) => {
            console.log(
                `${index + 1}. ${coin.symbol}: ` +
                `Khối lượng (Base): ${Number(coin.volume).toFixed(2)} | ` +
                `Khối lượng (Quote): ${Number(coin.quoteVolume).toFixed(2)} | ` +
                `Giá cuối: ${Number(coin.lastPrice).toFixed(4)} | ` +
                `Thay đổi 24h: ${Number(coin.priceChangePercent).toFixed(2)}%`
            );
        });
        console.log('\nLưu ý: Khối lượng (Quote) thường là khối lượng tính bằng USDT/BUSD.');
    } else {
        console.log('Không thể lấy dữ liệu hoặc không có dữ liệu nào được trả về.');
    }
}

// Execute the main function
main();