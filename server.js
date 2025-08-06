require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());

// New unified API list with {symbol} placeholder
const apiListIntradayTrading = [
  // 1. Thông tin tĩnh & Snapshot thị trường (gọi khi cần cập nhật trạng thái)
  "https://fapi.binance.com/fapi/v1/exchangeInfo", // Chỉ cần gọi 1 lần khi bắt đầu session để lấy quy tắc giao dịch
  "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}",
  "https://fapi.binance.com/fapi/v1/premiumIndex?symbol={symbol}",

  // 2. Dữ liệu Nến (từ ngắn hạn đến dài hạn để AI xác định bối cảnh)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=15m&limit=60", // ~15 giờ
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1h&limit=24",  // 1 ngày
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=4h&limit=12",  // 2 ngày
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1d&limit=7",   // 1 tuần

  // 3. Dữ liệu Tâm lý & Dòng tiền (đồng bộ ở khoảng thời gian ~2 giờ)
  "https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit=8", // ~1 ngày
  "https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period=5m&limit=24", // 2 giờ
  "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol={symbol}&period=5m&limit=24", // 2 giờ
  "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={symbol}&period=5m&limit=24", // 2 giờ
  "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol={symbol}&period=5m&limit=24", // 2 giờ
  "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol={symbol}&period=5m&limit=24", // 2 giờ

  // 4. Dữ liệu Sổ lệnh & Giao dịch tức thời
  "https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=50",
  "https://fapi.binance.com/fapi/v1/aggTrades?symbol={symbol}&limit=50"
];

const apiListSwingTrading = [
  // 1. Thông tin tĩnh & Snapshot thị trường
  "https://fapi.binance.com/fapi/v1/exchangeInfo",
  "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}",
  "https://fapi.binance.com/fapi/v1/premiumIndex?symbol={symbol}",

  // 2. Dữ liệu Nến (tập trung vào các khung thời gian lớn)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1h&limit=48",  // 2 ngày (để tinh chỉnh điểm vào lệnh)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=4h&limit=60",  // 10 ngày (xem sóng gần nhất)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1d&limit=90",   // ~3 tháng (khung thời gian chính)
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1w&limit=26",   // ~6 tháng (xem xu hướng vĩ mô)

  // 3. Dữ liệu Tâm lý & Dòng tiền (đổi period sang 1h, xem trong 3 ngày gần nhất)
  "https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit=90", // ~11 ngày
  "https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period=1h&limit=72", // 3 ngày
  "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol={symbol}&period=1h&limit=72", // 3 ngày
  "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={symbol}&period=1h&limit=72", // 3 ngày
  "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol={symbol}&period=1h&limit=72", // 3 ngày
  "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol={symbol}&period=1h&limit=72", // 3 ngày

  // 4. Dữ liệu Sổ lệnh & Giao dịch tức thời (ít quan trọng hơn cho Swing)
  "https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=20"
  // aggTrades không thực sự cần thiết cho swing trading nên có thể bỏ qua để prompt gọn hơn
  // "https://fapi.binance.com/fapi/v1/aggTrades?symbol={symbol}&limit=50"

];

const apiListDefault = apiListIntradayTrading;

// For private endpoint
const crypto = require('crypto');
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;


// Add parameters to URLs
const addUrlParams = (url, params) => {
  const urlObj = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.append(key, value);
  });
  return urlObj.toString();
};

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
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
    
    const apiList = apiListDefault;
    const requests = apiList.map(async (url) => {
      const finalUrl = url.replace('{symbol}', validSymbol);
      try {
        const response = await axios.get(finalUrl);
        let data = response.data;
        if (url.includes('exchangeInfo') && data && Array.isArray(data.symbols)) {
          data = {
            ...data,
            symbols: data.symbols.filter(s => s.symbol === validSymbol)
          };
        }
        return { url: finalUrl, data };
      } catch (error) {
        console.error(`Error fetching ${finalUrl}: ${error.message}`);
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
        .replace(/\{\{promptText\}\}/g, JSON.stringify(promptText))
        .replace(/\{\{symbolsSupport\}\}/g, symbolsSupport ? JSON.stringify(symbolsSupport) : '[]');
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
