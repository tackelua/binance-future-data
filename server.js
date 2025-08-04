require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());

// New unified API list with {symbol} placeholder
const apiList = [
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=5m&limit=20",
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=15m&limit=20",
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1h&limit=30",
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1d&limit=10",
  "https://fapi.binance.com/fapi/v1/exchangeInfo",
  "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}",
  "https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit=7",
  "https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period=5m&limit=7",
  "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol={symbol}&period=5m&limit=7",
  "https://fapi.binance.com/fapi/v1/premiumIndex?symbol={symbol}",
  "https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=20",
  "https://fapi.binance.com/fapi/v1/aggTrades?symbol={symbol}&limit=7",
  "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={symbol}&period=5m&limit=10",
  "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol={symbol}&period=5m&limit=7",
  "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol={symbol}&period=5m&limit=7"
];

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

    const requests = apiList.map(async (url) => {
      const finalUrl = url.replace('{symbol}', symbol);
      try {
        const response = await axios.get(finalUrl);
        let data = response.data;
        if (url.includes('exchangeInfo') && data && Array.isArray(data.symbols)) {
          data = {
            ...data,
            symbols: data.symbols.filter(s => s.symbol === symbol)
          };
        }
        return { url: finalUrl, data };
      } catch (error) {
        console.error(`Error fetching ${finalUrl}: ${error.message}`);
        return null;
      }
    });


    // Add private positionRisk, openOrders, userTrades, and account endpoints if API key/secret are set
    let positionRiskData = null;
    let openOrdersData = null;
    let userTradesData = null;
    let accountData = null;
    if (BINANCE_API_KEY && BINANCE_API_SECRET) {
      try {
        // positionRisk
        const timestamp = Date.now();
        const queryString = `symbol=${symbol}&timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', BINANCE_API_SECRET).update(queryString).digest('hex');
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

        // // account (no symbol param)
        // const accountTimestamp = Date.now();
        // const accountQueryString = `timestamp=${accountTimestamp}`;
        // const accountSignature = crypto.createHmac('sha256', BINANCE_API_SECRET).update(accountQueryString).digest('hex');
        // const accountUrl = `https://fapi.binance.com/fapi/v2/account?${accountQueryString}&signature=${accountSignature}`;
        // const accountRes = await axios.get(accountUrl, {
        //   headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
        // });
        // accountData = { url: accountUrl, data: accountRes.data };
      } catch (error) {
        console.error(`Error fetching private endpoints: ${error.message}`);
      }
    }

    const responses = await Promise.all(requests);
    const filteredData = responses.filter(item => item !== null);
    if (positionRiskData) filteredData.push(positionRiskData);
    if (openOrdersData) filteredData.push(openOrdersData);
    if (positionRiskData) filteredData.push(positionRiskData);
    if (openOrdersData) filteredData.push(openOrdersData);
    if (userTradesData) filteredData.push(userTradesData);
    if (accountData) filteredData.push(accountData);
    if (filteredData.length === 0) {
      throw new Error('All API requests failed');
    }

    // Read prompt.txt
    const promptText = fs.readFileSync('./prompt.txt', 'utf8');

    res.json({
      prompt: promptText,
      'binance-data': filteredData
    });
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
