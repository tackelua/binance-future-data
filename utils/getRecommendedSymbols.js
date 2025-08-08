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
 * Lấy dữ liệu open interest cho một symbol cụ thể.
 */
async function getOpenInterest(symbol) {
    const endpoint = '/fapi/v1/openInterest';
    try {
        const response = await axios.get(`${BINANCE_FUTURES_API_BASE_URL}${endpoint}`, {
            params: { symbol }
        });
        return response.data;
    } catch (error) {
        // Lỗi này có thể xảy ra thường xuyên với các symbol không có OI, nên giảm mức độ log
        // console.error(`Lỗi khi lấy open interest cho ${symbol}:`, error.message);
        return null;
    }
}

/**
 * Lấy dữ liệu funding rate cho tất cả các cặp.
 */
async function getAllFundingRates() {
    const endpoint = '/fapi/v1/fundingRate';
    try {
        const response = await axios.get(`${BINANCE_FUTURES_API_BASE_URL}${endpoint}`);
        // Tạo một map để truy cập nhanh funding rate theo symbol
        const fundingRateMap = new Map();
        response.data.forEach(item => {
            fundingRateMap.set(item.symbol, item);
        });
        return fundingRateMap;
    } catch (error) {
        console.error('Lỗi khi lấy tất cả funding rates:', error.message);
        return new Map();
    }
}


/**
 * Phân tích các cặp giao dịch Binance Futures để tìm kiếm tiềm năng.
 */
async function analyzeFuturesCoinsForPotential(tickerData, fundingRateMap) {
    const highVolume = [];
    const largePriceChange = [];
    const increasingOI = [];
    const abnormalFundingRate = [];

    const MIN_QUOTE_VOLUME = 50_000_000; // 50 triệu USDT
    const PRICE_CHANGE_THRESHOLD = 5; // 5%
    const ABNORMAL_FUNDING_RATE_THRESHOLD = 0.0005; // 0.05%

    // Lọc các symbol có volume cao hoặc % thay đổi giá lớn để tối ưu hóa
    const filteredByTicker = tickerData.filter(item => {
        const quoteVolume = Number(item.quoteVolume);
        const priceChangePercent = Number(item.priceChangePercent);
        return item.symbol.endsWith('USDT') && (quoteVolume > MIN_QUOTE_VOLUME || Math.abs(priceChangePercent) > PRICE_CHANGE_THRESHOLD);
    });

    // Lấy dữ liệu Open Interest cho các symbol đã lọc
    for (const item of filteredByTicker) {
        const symbol = item.symbol;
        const quoteVolume = Number(item.quoteVolume);
        const priceChangePercent = Number(item.priceChangePercent);
        const fundingInfo = fundingRateMap.get(symbol);

        // 1. Volume cao
        if (quoteVolume > MIN_QUOTE_VOLUME) {
            highVolume.push({ symbol, value: quoteVolume });
        }

        // 2. % Thay đổi giá lớn
        if (Math.abs(priceChangePercent) > PRICE_CHANGE_THRESHOLD) {
            largePriceChange.push({ symbol, value: priceChangePercent });
        }

        // 3. Funding Rate bất thường
        if (fundingInfo && Math.abs(Number(fundingInfo.fundingRate)) > ABNORMAL_FUNDING_RATE_THRESHOLD) {
            abnormalFundingRate.push({ symbol, value: Number(fundingInfo.fundingRate) });
        }

        // 4. Open Interest (chỉ lấy cho các coin đã lọt vào 3 tiêu chí trên)
        if (highVolume.find(c => c.symbol === symbol) || largePriceChange.find(c => c.symbol === symbol) || abnormalFundingRate.find(c => c.symbol === symbol)) {
            const oi = await getOpenInterest(symbol);
            if (oi && oi.openInterest > 0) {
                // Logic OI tăng cần so sánh với dữ liệu cũ. Tạm thời dùng giá trị tuyệt đối.
                increasingOI.push({ symbol, value: Number(oi.openInterest) });
            }
        }
    }

    // Sắp xếp và lấy top 4
    highVolume.sort((a, b) => b.value - a.value);
    largePriceChange.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    increasingOI.sort((a, b) => b.value - a.value);
    abnormalFundingRate.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    return {
        highVolume: highVolume.slice(0, 4),
        largePriceChange: largePriceChange.slice(0, 4),
        increasingOI: increasingOI.slice(0, 4),
        abnormalFundingRate: abnormalFundingRate.slice(0, 4)
    };
}


/**
 * Tạo danh sách 16 coin đáng chú ý theo logic ưu tiên.
 */
function createNotableCoinsList(analysisData) {
    const notableCoins = new Set();
    const coinCount = {};

    const categoryLists = {
        highVolume: analysisData.highVolume.map(item => item.symbol),
        largePriceChange: analysisData.largePriceChange.map(item => item.symbol),
        increasingOI: analysisData.increasingOI.map(item => item.symbol),
        abnormalFundingRate: analysisData.abnormalFundingRate.map(item => item.symbol)
    };

    // Bước 1: Đếm số lần xuất hiện của mỗi coin
    Object.values(categoryLists).flat().forEach(symbol => {
        coinCount[symbol] = (coinCount[symbol] || 0) + 1;
    });

    // Bước 2: Sắp xếp các coin theo số lần xuất hiện giảm dần
    const sortedByCount = Object.keys(coinCount).sort((a, b) => coinCount[b] - coinCount[a]);

    // Bước 3: Thêm coin theo mức độ ưu tiên (xuất hiện 4, 3, 2 lần)
    [4, 3, 2].forEach(count => {
        sortedByCount.forEach(symbol => {
            if (coinCount[symbol] === count) {
                notableCoins.add(symbol);
            }
        });
    });

    // Bước 4: Bổ sung tuần tự theo thứ hạng (top 1, 2, 3, 4)
    for (let i = 0; i < 4; i++) {
        Object.values(categoryLists).forEach(list => {
            if (list[i] && !notableCoins.has(list[i])) {
                notableCoins.add(list[i]);
            }
        });
    }

    // Trả về mảng 16 coin đầu tiên
    return Array.from(notableCoins).slice(0, 16);
}


/**
 * Tạo HTML buttons cho một danh sách symbol
 */
function generateSymbolButtons(symbols, type) {
    let buttonStyle = '';
    switch (type) {
        case 'notable':
            buttonStyle = 'background: #6f42c1; color: white; border: 1px solid #c8b6e2;';
            break;
        // Giữ các case cũ nếu cần dùng lại
        default:
            buttonStyle = 'background: #6c757d; color: white;';
    }

    // Đảm bảo symbols là một mảng
    if (!Array.isArray(symbols)) return '';

    return symbols.map(symbol =>
        `<button class="symbol-btn" onclick="changeSymbol('${symbol}')" style="${buttonStyle}">${symbol}</button>`
    ).join('\n    ');
}

// Cache cho recommended symbols
let cachedRecommendedSymbols = null;
let lastUpdateTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

/**
 * Lấy các symbol được đề xuất (có cache)
 */
async function getRecommendedSymbols(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && cachedRecommendedSymbols && lastUpdateTime && (now - lastUpdateTime < CACHE_DURATION)) {
        console.log('Sử dụng cached recommended symbols');
        return cachedRecommendedSymbols;
    }

    try {
        console.log('Đang cập nhật recommended symbols từ Binance Futures...');
        const [tickerData, fundingRateMap] = await Promise.all([
            getFutures24hrTickerData(),
            getAllFundingRates()
        ]);

        if (tickerData.length === 0) {
            console.warn('Không thể lấy dữ liệu ticker, sử dụng symbols mặc định');
            return cachedRecommendedSymbols || getDefaultSymbols();
        }

        const analysis = await analyzeFuturesCoinsForPotential(tickerData, fundingRateMap);

        // Tạo danh sách 16 coin đáng chú ý
        const notableCoinsList = createNotableCoinsList(analysis);

        // Tạo HTML buttons cho danh sách này
        const notableCoinButtons = generateSymbolButtons(notableCoinsList, 'notable');

        cachedRecommendedSymbols = {
            notableCoinsList,
            notableCoinButtons,
            rawData: analysis, // Giữ lại dữ liệu gốc để debug
            updateTime: new Date().toISOString()
        };

        lastUpdateTime = now;
        console.log(`Đã cập nhật ${notableCoinsList.length} recommended symbols thành công.`);
        return cachedRecommendedSymbols;

    } catch (error) {
        console.error('Lỗi khi cập nhật recommended symbols:', error.message);
        return cachedRecommendedSymbols || getDefaultSymbols();
    }
}

/**
 * Trả về symbols mặc định khi không thể lấy dữ liệu
 */
function getDefaultSymbols() {
    return ""
    const defaultList = [
        'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT',
        'DOGEUSDT', 'XRPUSDT', 'PEPEUSDT', 'NOTUSDT',
        'WLDUSDT', 'LINKUSDT', 'AVAXUSDT', 'ADAUSDT',
        'MATICUSDT', 'DOTUSDT', 'ONDOUSDT', 'SUIUSDT'
    ];

    return {
        notableCoinsList: defaultList,
        notableCoinButtons: generateSymbolButtons(defaultList, 'notable'),
        rawData: {},
        updateTime: new Date().toISOString()
    };
}

/**
 * Bắt đầu background job cập nhật mỗi 5 phút
 */
function startBackgroundUpdate() {
    console.log('🚀 Khởi động background update cho recommended symbols mỗi 5 phút');

    getRecommendedSymbols(true).catch(err => {
        console.error('❌ Initial recommended symbols update failed:', err.message);
    });

    setInterval(() => {
        console.log('🔄 Background update: Refreshing recommended symbols...');
        getRecommendedSymbols(true).catch(err => {
            console.error('❌ Background update failed:', err.message);
        });
    }, CACHE_DURATION);
}

module.exports = {
    getRecommendedSymbols,
    startBackgroundUpdate
};