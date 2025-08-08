require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const { getRecommendedSymbols, startBackgroundUpdate } = require('./utils/getRecommendedSymbols');

const app = express();
const port = 3003;

app.use(cors());

// Khởi động background update cho recommended symbols
startBackgroundUpdate();

// New unified API list with {symbol} placeholder

// API list cho giao dịch "scalping" (giao dịch chớp nhoáng)
const apiListScalpingTrading = [
  // 1. Thông tin tĩnh & Snapshot thị trường (gọi khi cần cập nhật trạng thái)
  "https://fapi.binance.com/fapi/v1/exchangeInfo", // Chỉ cần gọi 1 lần khi bắt đầu session để lấy quy tắc giao dịch
  "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}",
  "https://fapi.binance.com/fapi/v1/premiumIndex?symbol={symbol}",

  // 2. Dữ liệu Nến (ưu tiên timeframe nhỏ cho scalping)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1m&limit=120", // 2 giờ
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=5m&limit=72",  // 6 giờ
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=15m&limit=32", // 8 giờ

  // 3. Dữ liệu Tâm lý & Dòng tiền (đồng bộ ở khoảng thời gian ngắn)
  "https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit=8", // ~1 ngày
  "https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period=5m&limit=48", // 4 giờ
  "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol={symbol}&period=5m&limit=48", // 4 giờ
  "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={symbol}&period=5m&limit=48", // 4 giờ
  "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol={symbol}&period=5m&limit=48", // 4 giờ
  "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol={symbol}&period=5m&limit=48", // 4 giờ

  // 4. Dữ liệu Sổ lệnh & Giao dịch tức thời (ưu tiên độ sâu lớn)
  "https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=100",
  "https://fapi.binance.com/fapi/v1/aggTrades?symbol={symbol}&limit=100"
];

const apiListIntradayTrading = [
  // 1. Thông tin tĩnh & Snapshot thị trường (gọi khi cần cập nhật trạng thái)
  "https://fapi.binance.com/fapi/v1/exchangeInfo", // Chỉ cần gọi 1 lần khi bắt đầu session để lấy quy tắc giao dịch
  "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}",
  "https://fapi.binance.com/fapi/v1/premiumIndex?symbol={symbol}",

  // 2. Dữ liệu Nến (từ ngắn hạn đến dài hạn để AI xác định bối cảnh)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=15m&limit=60", // ~15 giờ
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1h&limit=48",  // 2 ngày
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=4h&limit=24",  // 4 ngày
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1d&limit=7",   // 1 tuần

  // 3. Dữ liệu Tâm lý & Dòng tiền (đồng bộ ở khoảng thời gian ~4 giờ)
  "https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit=8", // ~1 ngày
  "https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period=5m&limit=48", // 4 giờ
  "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol={symbol}&period=5m&limit=48", // 4 giờ
  "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={symbol}&period=5m&limit=48", // 4 giờ
  "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol={symbol}&period=5m&limit=48", // 4 giờ
  "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol={symbol}&period=5m&limit=48", // 4 giờ

  // 4. Dữ liệu Sổ lệnh & Giao dịch tức thời
  "https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=50",
  "https://fapi.binance.com/fapi/v1/aggTrades?symbol={symbol}&limit=50"
];

const apiListSwingTrading = [
  // 1. Thông tin tĩnh & Snapshot thị trường
  "https://fapi.binance.com/fapi/v1/exchangeInfo",
  "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}",
  "https://fapi.binance.com/fapi/v1/premiumIndex?symbol={symbol}",

  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=15m&limit=48", // 12 giờ (để xác định xu hướng ngắn hạn
  // 2. Dữ liệu Nến (tập trung vào các khung thời gian lớn)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1h&limit=48",  // 2 ngày (để tinh chỉnh điểm vào lệnh)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=4h&limit=60",  // 10 ngày (xem sóng gần nhất)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1d&limit=180",   // ~6 tháng (khung thời gian chính)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1w&limit=104",   // ~2 năm (xem xu hướng vĩ mô)

  // 3. Dữ liệu Tâm lý & Dòng tiền (đổi period sang 1h, xem trong 3 ngày gần nhất)
  "https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit=90", // ~11 ngày
  "https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period=1h&limit=72", // 3 ngày
  "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol={symbol}&period=1h&limit=72", // 3 ngày
  "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={symbol}&period=1h&limit=72", // 3 ngày
  "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol={symbol}&period=1h&limit=72", // 3 ngày
  "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol={symbol}&period=1h&limit=72", // 3 ngày

  // 4. Dữ liệu Sổ lệnh & Giao dịch tức thời (ít quan trọng hơn cho Swing)
  "https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=50",
  // aggTrades không thực sự cần thiết cho swing trading nên có thể bỏ qua để prompt gọn hơn
  "https://fapi.binance.com/fapi/v1/aggTrades?symbol={symbol}&limit=50"

];

const apiListDefault = apiListSwingTrading;

// For private endpoint
const crypto = require('crypto');
const { fearGreedHighestSearched } = require('./fear-and-greed-index.js');
const {
  VWAP, OBV, RSI, Stochastic, MACD, EMA, SMA, CCI, ATR, BollingerBands, WMA, TRIX, PSAR, MFI, StochasticRSI, WilliamsR
} = require('technicalindicators');
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Debug endpoint để xem recommended symbols
app.get('/debug/symbols', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const recommendedSymbols = await getRecommendedSymbols(forceRefresh);
    res.json({
      cached: !forceRefresh,
      updateTime: recommendedSymbols.updateTime,
      strongMomentum: recommendedSymbols.symbolLists?.strongMomentum || [],
      potentialBounce: recommendedSymbols.symbolLists?.potentialBounce || [],
      highVolumeActive: recommendedSymbols.symbolLists?.highVolumeActive || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol || 'BTCUSDT';
    console.log(`Processing request for symbol: ${symbol}`);

    // Load symbolsSupport from symbols.json
    let symbolsSupport = [];
    try {
      symbolsSupport = JSON.parse(fs.readFileSync('./symbols.json', 'utf8'));
    } catch (e) {
      console.error('Could not read symbols.json:', e.message);
    }

    // Validate symbol
    const validSymbol = symbolsSupport.includes(symbol) ? symbol : 'BTCUSDT';

    const requests = apiListDefault.map(async (url, index) => {
      const finalUrl = url.replace('{symbol}', validSymbol);

      try {
        // --- START: Modified Klines processing logic ---
        if (finalUrl.includes('klines')) {
          const urlObj = new URL(finalUrl);
          const originalLimit = parseInt(urlObj.searchParams.get('limit'));
          const interval = urlObj.searchParams.get('interval');

          // Determine the minimum data points needed for the indicators used.
          // SMA_200 is the indicator with the largest period (200).
          const requiredMinDataForIndicators = 250;
          // Use a fetchLimit that is at least originalLimit and also large enough for indicators.
          const fetchLimit = Math.max(originalLimit, requiredMinDataForIndicators);

          // Construct the URL to fetch with the potentially increased limit
          urlObj.searchParams.set('limit', fetchLimit);
          const urlToFetch = urlObj.toString();

          console.log({ urlToFetch, originalLimit, fetchLimit });
          const response = await axios.get(urlToFetch);
          let fetchedKlines = response.data;

          if (!fetchedKlines || !Array.isArray(fetchedKlines) || fetchedKlines.length === 0) {
            // Return empty data if no klines are fetched or data is invalid
            return {
              url: finalUrl, // Keep the original URL for context
              klines: [],
              indicators: {}
            };
          }

          // Format fetched klines data
          fetchedKlines = fetchedKlines.map(kline => [
            parseInt(kline[0]),      // openTime - timestamp
            parseFloat(kline[1]),    // open
            parseFloat(kline[2]),    // high
            parseFloat(kline[3]),    // low
            parseFloat(kline[4]),    // close
            parseFloat(kline[5]),    // volume
            parseInt(kline[6]),      // closeTime - timestamp
            parseFloat(kline[7]),    // quoteAssetVolume
            parseInt(kline[8]),      // number of trades
            parseFloat(kline[9]),    // takerBuyBaseAssetVolume
            parseFloat(kline[10]),   // takerBuyQuoteAssetVolume
            parseFloat(kline[11])    // ignore (usually "0")
          ]);

          const closes = fetchedKlines.map(k => k[4]);
          const highs = fetchedKlines.map(k => k[2]);
          const lows = fetchedKlines.map(k => k[3]);
          const volumes = fetchedKlines.map(k => k[5]); // Extract volumes for MFI

          console.log({
            fetchedKlines: fetchedKlines.length,
            closes: closes.length
          });
          // Check if we have enough data for the most demanding indicator (SMA_200 needs 200 points)
          if (closes.length < 200) {
            console.log(`Not enough data for full indicator calculation. Got ${closes.length}, need 200. Returning basic data only.`);
            return {
              url: finalUrl,
              klines: fetchedKlines.slice(-originalLimit),
              indicators: {},
              note: `Insufficient data for indicators. Got ${closes.length} data points, need 200.`
            };
          }

          // Calculate all indicators on the fully fetched data (fetchLimit klines)
          const calculatedIndicators = {};

          try {
            calculatedIndicators.volume_based = {};
            calculatedIndicators.momentum = {};
            calculatedIndicators.trend = {};
            calculatedIndicators.volatility = {};

            // Nhóm 1: Chỉ báo dựa trên Khối lượng
            try {
              calculatedIndicators.volume_based.vwap = VWAP.calculate({
                high: highs,
                low: lows,
                close: closes,
                volume: volumes,
              });
            } catch (e) { console.log(`VWAP error: ${e.message}`); }

            try {
              calculatedIndicators.volume_based.obv = OBV.calculate({
                close: closes,
                volume: volumes,
              });
            } catch (e) { console.log(`OBV error: ${e.message}`); }

            try {
              calculatedIndicators.volume_based.mfi_14 = MFI.calculate({
                high: highs,
                low: lows,
                close: closes,
                volume: volumes,
                period: 14
              });
            } catch (e) { console.log(`MFI error: ${e.message}`); }

            // Nhóm 2: Chỉ báo Động lượng
            try {
              calculatedIndicators.momentum.rsi_14 = RSI.calculate({
                values: closes,
                period: 14
              });
            } catch (e) { console.log(`RSI error: ${e.message}`); }

            try {
              calculatedIndicators.momentum.stochastic_14_3_3 = Stochastic.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 14,
                signalPeriod: 3
              });
            } catch (e) { console.log(`Stochastic error: ${e.message}`); }

            try {
              calculatedIndicators.momentum.stoch_rsi_14_3_3 = StochasticRSI.calculate({
                values: closes,
                rsiPeriod: 14,
                stochasticPeriod: 14,
                kPeriod: 3,
                dPeriod: 3
              });
            } catch (e) { console.log(`StochasticRSI error: ${e.message}`); }

            try {
              calculatedIndicators.momentum.williams_r_14 = WilliamsR.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 14
              });
            } catch (e) { console.log(`WilliamsR error: ${e.message}`); }

            try {
              calculatedIndicators.momentum.trix_15 = TRIX.calculate({
                values: closes,
                period: 15
              });
            } catch (e) { console.log(`TRIX error: ${e.message}`); }

            // Nhóm 3: Chỉ báo Xu hướng
            try {
              calculatedIndicators.trend.macd_12_26_9 = MACD.calculate({
                values: closes,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9
              });
            } catch (e) { console.log(`MACD error: ${e.message}`); }

            calculatedIndicators.trend.moving_averages = {};
            try {
              calculatedIndicators.trend.moving_averages.ema_20 = EMA.calculate({
                values: closes,
                period: 20
              });
            } catch (e) { console.log(`EMA_20 error: ${e.message}`); }

            try {
              calculatedIndicators.trend.moving_averages.ema_50 = EMA.calculate({
                values: closes,
                period: 50
              });
            } catch (e) { console.log(`EMA_50 error: ${e.message}`); }

            try {
              calculatedIndicators.trend.moving_averages.sma_200 = SMA.calculate({
                values: closes,
                period: 200
              });
            } catch (e) { console.log(`SMA_200 error: ${e.message}`); }

            try {
              calculatedIndicators.trend.moving_averages.wma_20 = WMA.calculate({
                values: closes,
                period: 20
              });
            } catch (e) { console.log(`WMA_20 error: ${e.message}`); }

            try {
              calculatedIndicators.trend.cci_20 = CCI.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 20
              });
            } catch (e) { console.log(`CCI error: ${e.message}`); }

            try {
              calculatedIndicators.trend.sar = PSAR.calculate({
                high: highs,
                low: lows,
                step: 0.02,
                max: 0.2
              });
            } catch (e) { console.log(`PSAR error: ${e.message}`); }

            // Nhóm 4: Chỉ báo Biến động
            try {
              calculatedIndicators.volatility.atr_14 = ATR.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 14
              });
            } catch (e) { console.log(`ATR error: ${e.message}`); }

            try {
              calculatedIndicators.volatility.bollinger_bands_20 = BollingerBands.calculate({
                values: closes,
                period: 20,
                stdDev: 2
              });
            } catch (e) { console.log(`BollingerBands error: ${e.message}`); }
          } catch (error) {
            console.error(`General indicator calculation error: ${error.message}`);
            return {
              url: finalUrl,
              klines: fetchedKlines.slice(-originalLimit),
              indicators: {},
              error: `Indicator calculation failed: ${error.message}`
            };
          }

          // Trim the klines data to the originalLimit (take the most recent ones)
          const klinesToReturn = fetchedKlines.slice(-originalLimit);

          // Trim each indicator array to the originalLimit (take the most recent ones)
          const indicatorsToReturn = {};
          for (const group in calculatedIndicators) {
            indicatorsToReturn[group] = {};
            for (const indicatorName in calculatedIndicators[group]) {
              const indicatorArray = calculatedIndicators[group][indicatorName];
              if (Array.isArray(indicatorArray)) {
                indicatorsToReturn[group][indicatorName] = indicatorArray.slice(-originalLimit);
              } else {
                // For non-array indicators (though most are arrays in your current setup)
                indicatorsToReturn[group][indicatorName] = indicatorArray;
              }
            }
          }

          return {
            url: finalUrl, // Return the original URL string for context in the output
            klines: klinesToReturn,
            indicators: indicatorsToReturn
          };
        }
        // --- END: Modified Klines processing logic ---

        // Existing logic for non-klines URLs
        const response = await axios.get(finalUrl);
        let data = response.data;
        if (url.includes('exchangeInfo') && data && Array.isArray(data.symbols)) {
          data = {
            ...data,
            assets: data.assets.filter(s => s.asset === "USDT"),
            symbols: data.symbols.filter(s => s.symbol === validSymbol)
          };
        }

        if (url.includes('fundingRate') && Array.isArray(data)) {
          data = data.map(item => [
            parseInt(item.fundingTime),
            parseFloat(item.fundingRate),
            parseFloat(item.markPrice)
          ]);
          data.unshift(["fundingTime", "fundingRate", "markPrice"]);
          return { name: 'fundingRate', data };
        }

        if (url.includes('openInterestHist') && Array.isArray(data)) {
          data = data.map(({ sumOpenInterest, sumOpenInterestValue, timestamp }) => [
            parseFloat(sumOpenInterest),
            parseFloat(sumOpenInterestValue),
            timestamp
          ]);
          data.unshift(["sumOpenInterest", "sumOpenInterestValue", "timestamp"]);
          return { name: 'sumOpenInterest', data };
        }

        if (url.includes('takerlongshortRatio') && Array.isArray(data)) {
          data = data.map(({ buySellRatio, sellVol, buyVol, timestamp }) => [
            parseFloat(buySellRatio),
            parseFloat(sellVol),
            parseFloat(buyVol),
            timestamp
          ]);
          data.unshift(["buySellRatio", "sellVol", "buyVol", "timestamp"]);
          return { name: 'takerlongshortRatio', data };
        }

        if (url.includes('globalLongShortAccountRatio') && Array.isArray(data)) {
          data = data.map(({ longAccount, longShortRatio, shortAccount, timestamp }) => [
            parseFloat(longAccount),
            parseFloat(longShortRatio),
            parseFloat(shortAccount),
            timestamp
          ]);
          data.unshift(["longAccount", "longShortRatio", "shortAccount", "timestamp"]);
          return { name: 'globalLongShortAccountRatio', data };
        }

        if (url.includes('topLongShortAccountRatio') && Array.isArray(data)) {
          data = data.map(({ longAccount, longShortRatio, shortAccount, timestamp }) => [
            parseFloat(longAccount),
            parseFloat(longShortRatio),
            parseFloat(shortAccount),
            timestamp
          ]);
          data.unshift(["longAccount", "longShortRatio", "shortAccount", "timestamp"]);
          return { name: 'topLongShortAccountRatio', data };
        }

        if (url.includes('topLongShortPositionRatio') && Array.isArray(data)) {
          data = data.map(({ longAccount, longShortRatio, shortAccount, timestamp }) => [
            parseFloat(longAccount),
            parseFloat(longShortRatio),
            parseFloat(shortAccount),
            timestamp
          ]);
          data.unshift(["longAccount", "longShortRatio", "shortAccount", "timestamp"]);
          return { name: 'topLongShortPositionRatio', data };
        }

        if (url.includes('depth') && data && data.asks && data.bids) {
          // Convert asks and bids to arrays of [price, quantity]
          data.asks = data.asks.map(a => [parseFloat(a[0]), parseFloat(a[1])]);
          data.bids = data.bids.map(b => [parseFloat(b[0]), parseFloat(b[1])]);
          return { name: 'depth', data };
        }

        if (url.includes('aggTrades') && Array.isArray(data)) {
          data = data.map(trade => [
            trade.a,                    // id
            parseFloat(trade.p),        // price
            parseFloat(trade.q),        // quantity
            trade.f,                    // firstTradeId
            trade.l,                    // lastTradeId
            trade.T,                    // timestamp
            trade.m                     // isBuyerMaker
          ]);
          data.unshift(["id", "price", "quantity", "firstTradeId", "lastTradeId", "timestamp", "isBuyerMaker"]);
          return { name: 'aggTrades', data };
        }

        return { name: finalUrl, data };
      } catch (error) {
        console.error(`Error fetching ${finalUrl}:`);
        console.error(`Error message: ${error.message}`);
        console.error(`Error response status: ${error.response?.status}`);
        console.error(`Error response data:`, error.response?.data);
        console.error(`Full error:`, error);
        return null;
      }
    });

    // Add private endpoints if API key/secret are set
    let positionRiskData = null;
    let openOrdersData = null;
    let userTradesData = null;
    let accountData = null;
    if (BINANCE_API_KEY && BINANCE_API_SECRET) {
      try {
        const timestamp = Date.now();
        const queryString = `symbol=${validSymbol}&timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', BINANCE_API_SECRET).update(queryString).digest('hex');

        // positionRisk
        const positionRiskUrl = `https://fapi.binance.com/fapi/v2/positionRisk?${queryString}&signature=${signature}`;
        const positionRiskRes = await axios.get(positionRiskUrl, {
          headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
        });
        positionRiskData = { url: positionRiskUrl, data: positionRiskRes.data };
        // openOrders
        const openOrdersUrl = `https://fapi.binance.com/fapi/v1/openOrders?${queryString}&signature=${signature}`;
        const openOrdersRes = await axios.get(openOrdersUrl, {
          headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
        });
        openOrdersData = { url: openOrdersUrl, data: openOrdersRes.data };
        // userTrades
        const userTradesUrl = `https://fapi.binance.com/fapi/v1/userTrades?${queryString}&signature=${signature}`;
        const userTradesRes = await axios.get(userTradesUrl, {
          headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
        });
        userTradesData = { url: userTradesUrl, data: userTradesRes.data };

        // account (chỉ lấy USDT của ví futures)
        const accountTimestamp = Date.now();
        const accountQueryString = `timestamp=${accountTimestamp}`;
        const accountSignature = crypto.createHmac('sha256', BINANCE_API_SECRET).update(accountQueryString).digest('hex');
        const accountUrl = `https://fapi.binance.com/fapi/v2/account?${accountQueryString}&signature=${accountSignature}`;
        const accountRes = await axios.get(accountUrl, {
          headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
        });
        // Chỉ lấy thông tin USDT
        const usdtAsset = accountRes.data.assets.find(a => a.asset === 'USDT');
        accountData = { url: accountUrl, data: usdtAsset };
      } catch (error) {
        console.error(`Error fetching private endpoints: ${error.message}`);
      }
    }

    const responses = await Promise.all(requests);
    const filteredData = responses.filter(item => item !== null);
    if (positionRiskData) filteredData.push(positionRiskData);
    if (openOrdersData) filteredData.push(openOrdersData);
    if (userTradesData) filteredData.push(userTradesData);
    if (accountData) filteredData.push(accountData);
    if (filteredData.length === 0) {
      throw new Error('All API requests failed');
    }

    const fearGreedHighestSearchedData = await fearGreedHighestSearched();
    if (fearGreedHighestSearched) filteredData.push({ name: 'fearGreedHighestSearched', data: fearGreedHighestSearchedData });

    // Read prompt.txt
    const promptText = fs.readFileSync('./prompt.txt', 'utf8');

    // Build response for response.html
    const updateTime = new Date().toISOString();
    const binanceData = filteredData;
    const minifiedJson = JSON.stringify(binanceData);
    const formattedJson = JSON.stringify(binanceData, null, 2);

    // Render HTML if Accept header prefers HTML, else return JSON
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
      // Lấy recommended symbols (từ cache)
      const recommendedSymbols = await getRecommendedSymbols();

      // Read response.html
      let html = '';
      try {
        html = fs.readFileSync('./response.html', 'utf8');
      } catch (e) {
        return res.status(500).send('Could not read response.html');
      }

      // Replace variables: promptText phải là JSON.stringify(promptText), minifiedJson và symbolsSupport giữ nguyên
      html = html.replace(/\{\{symbol\}\}/g, validSymbol)
        .replace(/\{\{updateTime\}\}/g, updateTime)
        .replace(/\{\{formattedJson\}\}/g, JSON.stringify(binanceData, null, 2))
        .replace(/\{\{minifiedJson\}\}/g, minifiedJson)
        .replace(/\{\{promptText\}\}/g, promptText + validSymbol + "\n\n")
        .replace(/\{\{symbolsSupport\}\}/g, symbolsSupport ? JSON.stringify(symbolsSupport) : '[]')
        .replace(/\{\{strongMomentumButtons\}\}/g, recommendedSymbols.strongMomentumButtons || '')
        .replace(/\{\{potentialBounceButtons\}\}/g, recommendedSymbols.potentialBounceButtons || '')
        .replace(/\{\{highVolumeActiveButtons\}\}/g, recommendedSymbols.highVolumeActiveButtons || '');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } else {
      // Default: return JSON
      res.json({
        symbol: validSymbol,
        updateTime,
        formattedJson,
        minifiedJson,
        promptText,
        symbolsSupport
      });
    }
  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    next(error);
  }
});

app.get('/', (req, res) => {
  res.redirect('/BTCUSDT');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});