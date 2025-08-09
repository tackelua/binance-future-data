const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const { fearGreedHighestSearched } = require('./fearGreedIndex');
const { getRecommendedSymbols } = require('./getRecommendedSymbols');
const {
    VWAP, OBV, RSI, Stochastic, MACD, EMA, SMA, CCI, ATR, BollingerBands, WMA, TRIX, PSAR, MFI, StochasticRSI, WilliamsR
} = require('technicalindicators');

// API configurations
const apiListScalpingTrading = [
    "https://fapi.binance.com/fapi/v1/exchangeInfo",
    "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}",
    "https://fapi.binance.com/fapi/v1/premiumIndex?symbol={symbol}",
    "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1m&limit=120",
    "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=5m&limit=72",
    "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=15m&limit=32",
    "https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit=8",
    "https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period=5m&limit=48",
    "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol={symbol}&period=5m&limit=48",
    "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={symbol}&period=5m&limit=48",
    "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol={symbol}&period=5m&limit=48",
    "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol={symbol}&period=5m&limit=48",
    "https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=100",
    "https://fapi.binance.com/fapi/v1/aggTrades?symbol={symbol}&limit=100"
];

const apiListIntradayTrading = [
    "https://fapi.binance.com/fapi/v1/exchangeInfo",
    "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}",
    "https://fapi.binance.com/fapi/v1/premiumIndex?symbol={symbol}",
    "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=15m&limit=60",
    "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1h&limit=48",
    "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=4h&limit=24",
    "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1d&limit=7",
    "https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit=8",
    "https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period=5m&limit=48",
    "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol={symbol}&period=5m&limit=48",
    "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={symbol}&period=5m&limit=48",
    "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol={symbol}&period=5m&limit=48",
    "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol={symbol}&period=5m&limit=48",
    "https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=50",
    "https://fapi.binance.com/fapi/v1/aggTrades?symbol={symbol}&limit=50"
];

const apiListSwingTrading = [
    "https://fapi.binance.com/fapi/v1/exchangeInfo",
    "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}",
    "https://fapi.binance.com/fapi/v1/premiumIndex?symbol={symbol}",
    "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=4h&limit=60",
    "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1d&limit=180",
    "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1w&limit=180",
    "https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit=90",
    "https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period=1h&limit=72",
    "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol={symbol}&period=1h&limit=72",
    "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={symbol}&period=1h&limit=72",
    "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol={symbol}&period=1h&limit=72",
    "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol={symbol}&period=1h&limit=72",
    "https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=50",
    "https://fapi.binance.com/fapi/v1/aggTrades?symbol={symbol}&limit=50"
];

const apiConfigurations = {
    scalping: apiListScalpingTrading,
    intraday: apiListIntradayTrading,
    swing: apiListSwingTrading
};

/**
 * Validate and normalize symbol
 * @param {string} symbol - The symbol to validate
 * @param {string[]} symbolsSupport - Array of supported symbols
 * @returns {string} - Valid symbol or default BTCUSDT
 */
function validateSymbol(symbol, symbolsSupport) {
    return symbolsSupport.includes(symbol) ? symbol : 'BTCUSDT';
}

/**
 * Load supported symbols from symbols.json
 * @returns {string[]} - Array of supported symbols
 */
function loadSupportedSymbols() {
    try {
        return JSON.parse(fs.readFileSync('./symbols.json', 'utf8'));
    } catch (e) {
        console.error('Could not read symbols.json:', e.message);
        return [];
    }
}

/**
 * Calculate technical indicators for klines data
 * @param {Array} klines - Formatted klines data
 * @returns {Object} - Calculated indicators grouped by category
 */
function calculateTechnicalIndicators(klines) {
    const closes = klines.map(k => k[4]);
    const highs = klines.map(k => k[2]);
    const lows = klines.map(k => k[3]);
    const volumes = klines.map(k => k[5]);

    const indicators = {
        volume_based: {},
        momentum: {},
        trend: {},
        volatility: {}
    };

    try {
        // Volume-based indicators
        try {
            indicators.volume_based.vwap = VWAP.calculate({
                high: highs,
                low: lows,
                close: closes,
                volume: volumes,
            });
        } catch (e) { console.log(`VWAP error: ${e.message}`); }

        try {
            indicators.volume_based.obv = OBV.calculate({
                close: closes,
                volume: volumes,
            });
        } catch (e) { console.log(`OBV error: ${e.message}`); }

        try {
            indicators.volume_based.mfi_14 = MFI.calculate({
                high: highs,
                low: lows,
                close: closes,
                volume: volumes,
                period: 14
            });
        } catch (e) { console.log(`MFI error: ${e.message}`); }

        // Momentum indicators
        try {
            indicators.momentum.rsi_14 = RSI.calculate({
                values: closes,
                period: 14
            });
        } catch (e) { console.log(`RSI error: ${e.message}`); }

        try {
            indicators.momentum.stochastic_14_3_3 = Stochastic.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 14,
                signalPeriod: 3
            });
        } catch (e) { console.log(`Stochastic error: ${e.message}`); }

        try {
            indicators.momentum.stoch_rsi_14_3_3 = StochasticRSI.calculate({
                values: closes,
                rsiPeriod: 14,
                stochasticPeriod: 14,
                kPeriod: 3,
                dPeriod: 3
            });
        } catch (e) { console.log(`StochasticRSI error: ${e.message}`); }

        try {
            indicators.momentum.williams_r_14 = WilliamsR.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 14
            });
        } catch (e) { console.log(`WilliamsR error: ${e.message}`); }

        try {
            indicators.momentum.trix_15 = TRIX.calculate({
                values: closes,
                period: 15
            });
        } catch (e) { console.log(`TRIX error: ${e.message}`); }

        // Trend indicators
        try {
            indicators.trend.macd_12_26_9 = MACD.calculate({
                values: closes,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9
            });
        } catch (e) { console.log(`MACD error: ${e.message}`); }

        indicators.trend.moving_averages = {};
        try {
            indicators.trend.moving_averages.ema_20 = EMA.calculate({
                values: closes,
                period: 20
            });
        } catch (e) { console.log(`EMA_20 error: ${e.message}`); }

        try {
            indicators.trend.moving_averages.ema_50 = EMA.calculate({
                values: closes,
                period: 50
            });
        } catch (e) { console.log(`EMA_50 error: ${e.message}`); }

        try {
            indicators.trend.moving_averages.sma_200 = SMA.calculate({
                values: closes,
                period: 200
            });
        } catch (e) { console.log(`SMA_200 error: ${e.message}`); }

        try {
            indicators.trend.moving_averages.wma_20 = WMA.calculate({
                values: closes,
                period: 20
            });
        } catch (e) { console.log(`WMA_20 error: ${e.message}`); }

        try {
            indicators.trend.cci_20 = CCI.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 20
            });
        } catch (e) { console.log(`CCI error: ${e.message}`); }

        try {
            indicators.trend.sar = PSAR.calculate({
                high: highs,
                low: lows,
                step: 0.02,
                max: 0.2
            });
        } catch (e) { console.log(`PSAR error: ${e.message}`); }

        // Volatility indicators
        try {
            indicators.volatility.atr_14 = ATR.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 14
            });
        } catch (e) { console.log(`ATR error: ${e.message}`); }

        try {
            indicators.volatility.bollinger_bands_20 = BollingerBands.calculate({
                values: closes,
                period: 20,
                stdDev: 2
            });
        } catch (e) { console.log(`BollingerBands error: ${e.message}`); }

    } catch (error) {
        console.error(`General indicator calculation error: ${error.message}`);
    }

    return indicators;
}

/**
 * Process klines data with technical indicators
 * @param {string} finalUrl - The API URL
 * @param {number} originalLimit - Original limit requested
 * @param {string} validSymbol - Valid symbol
 * @returns {Promise<Object>} - Processed klines data with indicators
 */
async function processKlinesData(finalUrl, originalLimit, validSymbol) {
    const urlObj = new URL(finalUrl);
    const interval = urlObj.searchParams.get('interval');

    const requiredMinDataForIndicators = 500;
    const fetchLimit = Math.max(originalLimit, requiredMinDataForIndicators);

    urlObj.searchParams.set('limit', fetchLimit);
    const urlToFetch = urlObj.toString();

    console.log({ urlToFetch, originalLimit, fetchLimit });

    const response = await axios.get(urlToFetch);
    let fetchedKlines = response.data;

    if (!fetchedKlines || !Array.isArray(fetchedKlines) || fetchedKlines.length === 0) {
        return {
            url: finalUrl,
            klines: [],
            indicators: {}
        };
    }

    // Format klines data
    fetchedKlines = fetchedKlines.map(kline => [
        parseInt(kline[0]),      // openTime
        parseFloat(kline[1]),    // open
        parseFloat(kline[2]),    // high
        parseFloat(kline[3]),    // low
        parseFloat(kline[4]),    // close
        parseFloat(kline[5]),    // volume
        parseInt(kline[6]),      // closeTime
        parseFloat(kline[7]),    // quoteAssetVolume
        parseInt(kline[8]),      // number of trades
        parseFloat(kline[9]),    // takerBuyBaseAssetVolume
        parseFloat(kline[10]),   // takerBuyQuoteAssetVolume
        parseFloat(kline[11])    // ignore
    ]);

    const closes = fetchedKlines.map(k => k[4]);

    if (closes.length < 200) {
        console.log(`Not enough data for full indicator calculation. Got ${closes.length}, need 200. Returning basic data only.`);
        return {
            url: finalUrl,
            klines: fetchedKlines.slice(-originalLimit),
            indicators: {},
            note: `Insufficient data for indicators. Got ${closes.length} data points, need 200.`
        };
    }

    const calculatedIndicators = calculateTechnicalIndicators(fetchedKlines);

    // Trim data to original limit
    const klinesToReturn = fetchedKlines.slice(-originalLimit);
    const indicatorsToReturn = {};

    for (const group in calculatedIndicators) {
        indicatorsToReturn[group] = {};
        for (const indicatorName in calculatedIndicators[group]) {
            const indicatorArray = calculatedIndicators[group][indicatorName];
            if (Array.isArray(indicatorArray)) {
                indicatorsToReturn[group][indicatorName] = indicatorArray.slice(-originalLimit);
            } else {
                indicatorsToReturn[group][indicatorName] = indicatorArray;
            }
        }
    }

    return {
        url: finalUrl,
        klines: klinesToReturn,
        indicators: indicatorsToReturn
    };
}

/**
 * Process different data types from API responses
 * @param {string} url - Original URL template
 * @param {string} finalUrl - Final URL with symbol
 * @param {Object} data - Response data
 * @returns {Object} - Processed data
 */
function processResponseData(url, finalUrl, data) {
    if (url.includes('exchangeInfo') && data && Array.isArray(data.symbols)) {
        return {
            ...data,
            assets: data.assets.filter(s => s.asset === "USDT"),
            symbols: data.symbols.filter(s => s.symbol.includes('USDT'))
        };
    }

    if (url.includes('fundingRate') && Array.isArray(data)) {
        const processedData = data.map(item => [
            parseInt(item.fundingTime),
            parseFloat(item.fundingRate),
            parseFloat(item.markPrice)
        ]);
        processedData.unshift(["fundingTime", "fundingRate", "markPrice"]);
        return { name: 'fundingRate', data: processedData };
    }

    if (url.includes('openInterestHist') && Array.isArray(data)) {
        const processedData = data.map(({ sumOpenInterest, sumOpenInterestValue, timestamp }) => [
            parseFloat(sumOpenInterest),
            parseFloat(sumOpenInterestValue),
            timestamp
        ]);
        processedData.unshift(["sumOpenInterest", "sumOpenInterestValue", "timestamp"]);
        return { name: 'sumOpenInterest', data: processedData };
    }

    if (url.includes('takerlongshortRatio') && Array.isArray(data)) {
        const processedData = data.map(({ buySellRatio, sellVol, buyVol, timestamp }) => [
            parseFloat(buySellRatio),
            parseFloat(sellVol),
            parseFloat(buyVol),
            timestamp
        ]);
        processedData.unshift(["buySellRatio", "sellVol", "buyVol", "timestamp"]);
        return { name: 'takerlongshortRatio', data: processedData };
    }

    if (url.includes('globalLongShortAccountRatio') && Array.isArray(data)) {
        const processedData = data.map(({ longAccount, longShortRatio, shortAccount, timestamp }) => [
            parseFloat(longAccount),
            parseFloat(longShortRatio),
            parseFloat(shortAccount),
            timestamp
        ]);
        processedData.unshift(["longAccount", "longShortRatio", "shortAccount", "timestamp"]);
        return { name: 'globalLongShortAccountRatio', data: processedData };
    }

    if (url.includes('topLongShortAccountRatio') && Array.isArray(data)) {
        const processedData = data.map(({ longAccount, longShortRatio, shortAccount, timestamp }) => [
            parseFloat(longAccount),
            parseFloat(longShortRatio),
            parseFloat(shortAccount),
            timestamp
        ]);
        processedData.unshift(["longAccount", "longShortRatio", "shortAccount", "timestamp"]);
        return { name: 'topLongShortAccountRatio', data: processedData };
    }

    if (url.includes('topLongShortPositionRatio') && Array.isArray(data)) {
        const processedData = data.map(({ longAccount, longShortRatio, shortAccount, timestamp }) => [
            parseFloat(longAccount),
            parseFloat(longShortRatio),
            parseFloat(shortAccount),
            timestamp
        ]);
        processedData.unshift(["longAccount", "longShortRatio", "shortAccount", "timestamp"]);
        return { name: 'topLongShortPositionRatio', data: processedData };
    }

    if (url.includes('depth') && data && data.asks && data.bids) {
        return {
            name: 'depth',
            data: {
                ...data,
                asks: data.asks.map(a => [parseFloat(a[0]), parseFloat(a[1])]),
                bids: data.bids.map(b => [parseFloat(b[0]), parseFloat(b[1])])
            }
        };
    }

    if (url.includes('aggTrades') && Array.isArray(data)) {
        const processedData = data.map(trade => [
            trade.a,                    // id
            parseFloat(trade.p),        // price
            parseFloat(trade.q),        // quantity
            trade.f,                    // firstTradeId
            trade.l,                    // lastTradeId
            trade.T,                    // timestamp
            trade.m                     // isBuyerMaker
        ]);
        processedData.unshift(["id", "price", "quantity", "firstTradeId", "lastTradeId", "timestamp", "isBuyerMaker"]);
        return { name: 'aggTrades', data: processedData };
    }

    return { name: finalUrl, data };
}

/**
 * Fetch private endpoints data (positions, orders, trades, account)
 * @param {string} validSymbol - Valid symbol
 * @param {string} apiKey - Binance API key
 * @param {string} apiSecret - Binance API secret
 * @returns {Promise<Object>} - Private endpoints data
 */
async function fetchPrivateEndpoints(validSymbol, apiKey, apiSecret) {
    if (!apiKey || !apiSecret) {
        return {};
    }

    try {
        const timestamp = Date.now();
        const queryString = `symbol=${validSymbol}&timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
        const headers = { 'X-MBX-APIKEY': apiKey };

        const privateData = {};

        // Position Risk
        try {
            const positionRiskUrl = `https://fapi.binance.com/fapi/v2/positionRisk?${queryString}&signature=${signature}`;
            const positionRiskRes = await axios.get(positionRiskUrl, { headers });
            privateData.positionRisk = { url: positionRiskUrl, data: positionRiskRes.data };
        } catch (error) {
            console.error('Error fetching position risk:', error.message);
        }

        // Open Orders
        try {
            const openOrdersUrl = `https://fapi.binance.com/fapi/v1/openOrders?${queryString}&signature=${signature}`;
            const openOrdersRes = await axios.get(openOrdersUrl, { headers });
            privateData.openOrders = { url: openOrdersUrl, data: openOrdersRes.data };
        } catch (error) {
            console.error('Error fetching open orders:', error.message);
        }

        // User Trades
        try {
            const userTradesUrl = `https://fapi.binance.com/fapi/v1/userTrades?${queryString}&signature=${signature}`;
            const userTradesRes = await axios.get(userTradesUrl, { headers });
            privateData.userTrades = { url: userTradesUrl, data: userTradesRes.data };
        } catch (error) {
            console.error('Error fetching user trades:', error.message);
        }

        // Account (USDT only)
        try {
            const accountTimestamp = Date.now();
            const accountQueryString = `timestamp=${accountTimestamp}`;
            const accountSignature = crypto.createHmac('sha256', apiSecret).update(accountQueryString).digest('hex');
            const accountUrl = `https://fapi.binance.com/fapi/v2/account?${accountQueryString}&signature=${accountSignature}`;
            const accountRes = await axios.get(accountUrl, { headers });
            const usdtAsset = accountRes.data.assets.find(a => a.asset === 'USDT');
            privateData.account = { url: accountUrl, data: usdtAsset };
        } catch (error) {
            console.error('Error fetching account:', error.message);
        }

        return privateData;
    } catch (error) {
        console.error(`Error fetching private endpoints: ${error.message}`);
        return {};
    }
}

/**
 * Main function to prepare data for response
 * @param {string} symbol - Symbol to fetch data for
 * @param {string} tradingStyle - Trading style (scalping, intraday, swing)
 * @param {string} apiKey - Binance API key
 * @param {string} apiSecret - Binance API secret
 * @returns {Promise<Object>} - Prepared data for response
 */
async function prepareDataForResponse(symbol, tradingStyle = 'swing', apiKey, apiSecret) {
    const symbolsSupport = loadSupportedSymbols();
    const validSymbol = validateSymbol(symbol, symbolsSupport);

    const apiList = apiConfigurations[tradingStyle] || apiConfigurations.swing;

    console.log(`Processing request for symbol: ${validSymbol} with ${tradingStyle} style`);

    // Fetch public endpoints
    const requests = apiList.map(async (url, index) => {
        const finalUrl = url.replace('{symbol}', validSymbol);

        try {
            if (finalUrl.includes('klines')) {
                const urlObj = new URL(finalUrl);
                const originalLimit = parseInt(urlObj.searchParams.get('limit'));
                return await processKlinesData(finalUrl, originalLimit, validSymbol);
            }

            // Regular API call
            const response = await axios.get(finalUrl);
            let data = response.data;

            return processResponseData(url, finalUrl, data);
        } catch (error) {
            console.error(`Error fetching ${finalUrl}:`);
            console.error(`Error message: ${error.message}`);
            console.error(`Error response status: ${error.response?.status}`);
            console.error(`Error response data:`, error.response?.data);
            return null;
        }
    });

    // Execute all requests
    const responses = await Promise.all(requests);
    const filteredData = responses.filter(item => item !== null);

    // Fetch private endpoints
    const privateData = await fetchPrivateEndpoints(validSymbol, apiKey, apiSecret);
    Object.values(privateData).forEach(data => {
        if (data) filteredData.push(data);
    });

    // Add fear & greed data
    try {
        const fearGreedData = await fearGreedHighestSearched();
        if (fearGreedData) {
            filteredData.push({ name: 'fearGreedHighestSearched', data: fearGreedData });
        }
    } catch (error) {
        console.error('Error fetching fear & greed data:', error.message);
    }

    if (filteredData.length === 0) {
        throw new Error('All API requests failed');
    }

    return {
        symbol: validSymbol,
        data: filteredData,
        symbolsSupport
    };
}

module.exports = {
    prepareDataForResponse,
    validateSymbol,
    loadSupportedSymbols,
    calculateTechnicalIndicators,
    processKlinesData,
    processResponseData,
    fetchPrivateEndpoints,
    apiConfigurations
};
