const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());

// New unified API list with {symbol} placeholder
const apiList = [
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=5m&limit=32",
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1h&limit=32",
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1d&limit=32",
  "https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=3d&limit=32",
  "https://fapi.binance.com/fapi/v1/exchangeInfo",
  "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}",
  "https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit=32",
  "https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period=5m&limit=32",
  "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol={symbol}&period=5m&limit=32",
  "https://fapi.binance.com/fapi/v1/premiumIndex?symbol={symbol}",
  "https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=32",
  "https://fapi.binance.com/fapi/v1/trades?symbol={symbol}&limit=32",
  "https://fapi.binance.com/fapi/v1/aggTrades?symbol={symbol}&limit=32",
  "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={symbol}&period=5m&limit=32",
  "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol={symbol}&period=5m&limit=32",
  "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol={symbol}&period=5m&limit=32"
];

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

    const responses = await Promise.all(requests);
    const filteredData = responses.filter(item => item !== null);
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
