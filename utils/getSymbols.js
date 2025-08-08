const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BINANCE_FUTURES_API_BASE_URL = 'https://fapi.binance.com';

async function getAndSaveSymbols() {
    try {
        const response = await axios.get(`${BINANCE_FUTURES_API_BASE_URL}/fapi/v1/exchangeInfo`, {
            timeout: 10000
        });

        const symbols = response.data.symbols
            .filter(symbolInfo =>
                symbolInfo.symbol.endsWith('USDT') &&
                symbolInfo.status === 'TRADING' &&
                symbolInfo.contractType === 'PERPETUAL'
            )
            .map(symbolInfo => symbolInfo.symbol);

        const filePath = path.join(__dirname, '..', 'symbols.json');
        fs.writeFileSync(filePath, JSON.stringify(symbols, null, 2), 'utf8');

        return symbols;
    } catch (error) {
        return [];
    }
}

function loadSymbols() {
    try {
        const filePath = path.join(__dirname, '..', 'symbols.json');
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

if (require.main === module) {
    getAndSaveSymbols().then(symbols => {
        process.exit(symbols.length > 0 ? 0 : 1);
    });
}

module.exports = {
    getAndSaveSymbols,
    loadSymbols
};
