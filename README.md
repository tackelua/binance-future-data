# Binance Future Data API Server

This project provides an Express.js server that aggregates and serves data from Binance Futures public and private endpoints for a given trading symbol.

## Features
- Fetches multiple public endpoints from Binance Futures API for a specified symbol (e.g., BTCUSDT).
- Optionally fetches private endpoints (position risk, open orders, user trades) if API key/secret are provided via environment variables.
- Returns all data in a single JSON response, along with a prompt from `prompt.txt`.
- CORS enabled for cross-origin requests.

## Endpoints

### `GET /:symbol`
Fetches data for the specified symbol (e.g., `/BTCUSDT`).
- Aggregates data from multiple Binance Futures endpoints.
- If API credentials are set, includes private data.
- Returns JSON with `prompt` and `binance-data` fields.

### `GET /`
Redirects to `/BTCUSDT` by default.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the project root (optional for private endpoints):
   ```env
   BINANCE_API_KEY=your_api_key
   BINANCE_API_SECRET=your_api_secret
   ```

3. **Start the server:**
   ```bash
   node server.js
   ```
   The server will run at [http://localhost:3000](http://localhost:3000).

## Files
- `server.js` — Main Express server.
- `prompt.txt` — Prompt text included in API responses.
- `data.json` — (Optional) For your own data storage.

## Notes
- Private endpoints require Binance Futures API credentials.
- All requests are proxied; your API key/secret are never exposed to clients.
- For more symbols, use `/SYMBOLNAME` (e.g., `/ETHUSDT`).

## License
MIT
