const axios = require('axios');

// Base URL cho API Binance Futures
const BINANCE_FUTURES_API_BASE_URL = 'https://fapi.binance.com';

/**
 * Lấy dữ liệu thống kê 24 giờ cho tất cả các cặp giao dịch trên Binance Futures.
 */
async function getFutures24hrTickerData() {
    const endpoint = '/fapi/v1/ticker/24hr';
    try {
        const response = await axios.get(`${BINANCE_FUTURES_API_BASE_URL}${endpoint}`);
        return response.data;
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ticker 24 giờ từ Binance Futures:', error.message);
        return [];
    }
}

/**
 * Phân tích các cặp giao dịch Binance Futures để tìm kiếm tiềm năng tăng giá.
 */
function analyzeFuturesCoinsForPotential(tickerData) {
    const potentialBounce = [];
    const strongMomentum = [];
    const highVolumeActive = [];

    const MIN_QUOTE_VOLUME = 5_000_000; // 5 triệu USDT
    const NEGATIVE_CHANGE_THRESHOLD = -3; // Giảm hơn 3%
    const POSITIVE_CHANGE_THRESHOLD = 3;  // Tăng hơn 3%
    const PROXIMITY_TO_LOW_HIGH_THRESHOLD = 0.01; // 1%

    tickerData.forEach(item => {
        const symbol = item.symbol;
        const lastPrice = Number(item.lastPrice);
        const highPrice = Number(item.highPrice);
        const lowPrice = Number(item.lowPrice);
        const priceChangePercent = Number(item.priceChangePercent);
        const quoteVolume = Number(item.quoteVolume);

        // Bỏ qua các mục có dữ liệu không hợp lệ hoặc khối lượng quá thấp
        if (isNaN(lastPrice) || isNaN(highPrice) || isNaN(lowPrice) ||
            isNaN(priceChangePercent) || isNaN(quoteVolume) ||
            quoteVolume < MIN_QUOTE_VOLUME) {
            return;
        }

        // Điều kiện cho "tiềm năng phục hồi"
        if (priceChangePercent < NEGATIVE_CHANGE_THRESHOLD &&
            (lastPrice - lowPrice) / lowPrice < PROXIMITY_TO_LOW_HIGH_THRESHOLD) {
            potentialBounce.push(item);
        }
        // Điều kiện cho "đà tăng mạnh"
        else if (priceChangePercent > POSITIVE_CHANGE_THRESHOLD &&
            (highPrice - lastPrice) / lastPrice < PROXIMITY_TO_LOW_HIGH_THRESHOLD) {
            strongMomentum.push(item);
        }
        // Các cặp có khối lượng cao
        else if (quoteVolume >= MIN_QUOTE_VOLUME * 2) {
            highVolumeActive.push(item);
        }
    });

    // Sắp xếp theo khối lượng giao dịch giảm dần
    potentialBounce.sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume));
    strongMomentum.sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume));
    highVolumeActive.sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume));

    return { potentialBounce, strongMomentum, highVolumeActive };
}

/**
 * Tạo HTML buttons cho từng loại symbol
 */
function generateSymbolButtons(symbols, type) {
    let buttonStyle = '';
    switch (type) {
        case 'strongMomentum':
            buttonStyle = 'background: #28a745; color: white;';
            break;
        case 'potentialBounce':
            buttonStyle = 'background: #17a2b8; color: white;';
            break;
        case 'highVolumeActive':
            buttonStyle = 'background: #ffc107; color: black;';
            break;
    }

    return symbols.slice(0, 5).map(symbol =>
        `<button class="symbol-btn" onclick="changeSymbol('${symbol}')" style="${buttonStyle}">${symbol}</button>`
    ).join('\n    ');
}

// Cache cho recommended symbols
let cachedRecommendedSymbols = null;
let lastUpdateTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

/**
 * Lấy các symbol được đề xuất theo từng loại (có cache)
 */
async function getRecommendedSymbols(forceRefresh = false) {
    const now = Date.now();

    // Kiểm tra cache còn hiệu lực không
    if (!forceRefresh && cachedRecommendedSymbols && lastUpdateTime && (now - lastUpdateTime < CACHE_DURATION)) {
        console.log('Sử dụng cached recommended symbols');
        return cachedRecommendedSymbols;
    }

    try {
        console.log('Đang cập nhật recommended symbols từ Binance Futures...');
        const tickerData = await getFutures24hrTickerData();

        if (tickerData.length === 0) {
            console.warn('Không thể lấy dữ liệu ticker, sử dụng symbols mặc định');
            const defaultSymbols = getDefaultSymbols();
            if (!cachedRecommendedSymbols) {
                cachedRecommendedSymbols = defaultSymbols;
            }
            return cachedRecommendedSymbols;
        }

        const { potentialBounce, strongMomentum, highVolumeActive } = analyzeFuturesCoinsForPotential(tickerData);

        // Lấy top symbols từ mỗi category
        const symbolLists = {
            strongMomentum: strongMomentum.slice(0, 4).map(item => item.symbol),
            potentialBounce: potentialBounce.slice(0, 2).map(item => item.symbol),
            highVolumeActive: highVolumeActive.slice(0, 3).map(item => item.symbol)
        };

        // Fallback nếu không có đủ dữ liệu
        if (symbolLists.strongMomentum.length === 0) {
            symbolLists.strongMomentum = ['SOLUSDT', 'SUIUSDT', 'BNXUSDT', 'TREEUSDT'];
        }
        if (symbolLists.potentialBounce.length === 0) {
            symbolLists.potentialBounce = ['BTCDOMUSDT', 'KLAYUSDT'];
        }
        if (symbolLists.highVolumeActive.length === 0) {
            symbolLists.highVolumeActive = ['ETHUSDT', 'BTCUSDT', 'XRPUSDT'];
        }

        // Tạo HTML buttons
        const strongMomentumButtons = generateSymbolButtons(symbolLists.strongMomentum, 'strongMomentum');
        const potentialBounceButtons = generateSymbolButtons(symbolLists.potentialBounce, 'potentialBounce');
        const highVolumeActiveButtons = generateSymbolButtons(symbolLists.highVolumeActive, 'highVolumeActive');

        cachedRecommendedSymbols = {
            strongMomentumButtons,
            potentialBounceButtons,
            highVolumeActiveButtons,
            symbolLists,
            rawData: { potentialBounce, strongMomentum, highVolumeActive },
            updateTime: new Date().toISOString()
        };

        lastUpdateTime = now;
        console.log('Đã cập nhật recommended symbols thành công');
        return cachedRecommendedSymbols;

    } catch (error) {
        console.error('Lỗi khi cập nhật recommended symbols:', error.message);
        if (!cachedRecommendedSymbols) {
            cachedRecommendedSymbols = getDefaultSymbols();
        }
        return cachedRecommendedSymbols;
    }
}

/**
 * Trả về symbols mặc định khi không thể lấy dữ liệu
 */
function getDefaultSymbols() {
    const symbolLists = {
        strongMomentum: [],
        potentialBounce: [],
        highVolumeActive: []
    };

    return {
        strongMomentumButtons: generateSymbolButtons(symbolLists.strongMomentum, 'strongMomentum'),
        potentialBounceButtons: generateSymbolButtons(symbolLists.potentialBounce, 'potentialBounce'),
        highVolumeActiveButtons: generateSymbolButtons(symbolLists.highVolumeActive, 'highVolumeActive'),
        symbolLists,
        rawData: { potentialBounce: [], strongMomentum: [], highVolumeActive: [] },
        updateTime: new Date().toISOString()
    };
}

/**
 * Bắt đầu background job cập nhật mỗi 5 phút
 */
function startBackgroundUpdate() {
    console.log('🚀 Khởi động background update cho recommended symbols mỗi 5 phút');

    // Cập nhật ngay lập tức
    getRecommendedSymbols(true).then(() => {
        console.log('✅ Initial recommended symbols update completed');
    }).catch(err => {
        console.error('❌ Initial recommended symbols update failed:', err.message);
    });

    // Cập nhật mỗi 5 phút
    setInterval(() => {
        console.log('🔄 Background update: Refreshing recommended symbols...');
        getRecommendedSymbols(true).then(() => {
            console.log('✅ Background update completed successfully');
        }).catch(err => {
            console.error('❌ Background update failed:', err.message);
        });
    }, CACHE_DURATION);
}

module.exports = {
    getRecommendedSymbols,
    startBackgroundUpdate
};
