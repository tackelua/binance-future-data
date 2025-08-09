require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { getRecommendedSymbols, getRecommendedSymbolsFast, startBackgroundUpdate } = require('./utils/getRecommendedSymbols');
const { prepareDataForResponse } = require('./utils/dataProcessor');

const app = express();
const port = 3000;

app.use(cors());

// Khởi động background update cho recommended symbols
startBackgroundUpdate();

// Environment variables
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
    const tradingStyle = req.query.style || 'swing'; // scalping, intraday, swing

    // Prepare all data using the data processor
    const { symbol: validSymbol, data: binanceData, symbolsSupport } = await prepareDataForResponse(
      symbol,
      tradingStyle,
      BINANCE_API_KEY,
      BINANCE_API_SECRET
    );

    // Read prompt.txt
    const promptText = fs.readFileSync('./prompt.txt', 'utf8');

    // Build response
    const updateTime = new Date().toISOString();
    const minifiedJson = JSON.stringify(binanceData);
    const formattedJson = JSON.stringify(binanceData, null, 2);

    // Render HTML if Accept header prefers HTML, else return JSON
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
      // Lấy recommended symbols (nhanh - từ cache hoặc default)
      const recommendedSymbols = getRecommendedSymbolsFast();

      // Read response.html
      let html = '';
      try {
        html = fs.readFileSync('./response.html', 'utf8');
      } catch (e) {
        return res.status(500).send('Could not read response.html');
      }

      // Replace variables
      const promptTextWithSymbol = promptText.replace(/\{\{symbol\}\}/g, validSymbol) + validSymbol + "\n\n";
      html = html.replace(/\{\{symbol\}\}/g, validSymbol)
        .replace(/\{\{updateTime\}\}/g, updateTime)
        .replace(/\{\{formattedJson\}\}/g, formattedJson)
        .replace(/\{\{minifiedJson\}\}/g, minifiedJson)
        .replace(/\{\{promptText\}\}/g, promptTextWithSymbol)
        .replace(/\{\{symbolsSupport\}\}/g, symbolsSupport ? JSON.stringify(symbolsSupport) : '[]')
        .replace(/\{\{notableCoinButtons\}\}/g, recommendedSymbols.notableCoinButtons || '')

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
        symbolsSupport,
        tradingStyle
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