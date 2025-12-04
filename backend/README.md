# ZEC to ETH Transfer - Backend API

Express.js backend for the ZEC to ETH confidential transfer. Stores transaction data submitted by the watcher and provides API endpoints for the frontend.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Watcher   │────▶│   Backend   │◀────│  Frontend   │
│  (Rust)     │     │  (Express)  │     │  (Next.js)  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │
      │ Monitors Zcash     │ In-memory store
      │ blockchain         │ (transactions)
      ▼                    │
┌─────────────┐            │
│   Zcash     │            │
│  Network    │            │
└─────────────┘            │
```

The watcher monitors the Zcash blockchain for transactions to the burn address and submits them to the backend. The frontend polls the backend to check for transactions and fetch data for proof generation.

## Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)

## Installation

```bash
cd backend
pnpm install
```

## Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `WATCHER_SECRET` | Secret for watcher authentication | `dev-secret...` |
| `ZEC_BURN_ADDRESS` | Static burn address | - |
| `BURN_SCRIPT_HASH` | Script hash of burn address | - |
| `REQUIRED_CONFIRMATIONS` | Required confirmations | `6` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Running

### Development

```bash
pnpm dev
```

### Production

```bash
pnpm build
pnpm start
```

## API Endpoints

### Health & Config

#### `GET /api/health`
Health check endpoint.

#### `GET /api/config`
Get public configuration (burn address, required confirmations).

### Frontend Endpoints

#### `GET /api/check-zec-tx`
Check for a Zcash transaction with specific amount. Used by frontend for polling.

**Query Parameters:**
- `address` - Burn address (validated against config)
- `amount` - Amount in ZEC

**Response:**
```json
{
  "found": true,
  "confirmations": 10,
  "txid": "abc123..."
}
```

#### `GET /api/zcash/txdata?txid=<txid>`
Get full transaction data for circuit input.

**Response:**
```json
{
  "tx_bytes": [0, 1, 2, ...],
  "memo_bytes": [0, 0, ...],
  "out_values": [1000000, 0, 0, 0],
  "out_scriptHashes": ["123...", "0", "0", "0"],
  "merkle_sibling_hi": ["...", ...],
  "merkle_sibling_lo": ["...", ...],
  "merkle_path_dir": [0, 1, 0, ...],
  "merkleRoot_hi": "...",
  "merkleRoot_lo": "...",
  "txId_hi": "...",
  "txId_lo": "..."
}
```

#### `GET /api/zcash/tx/:txid`
Get transaction info.

#### `GET /api/zcash/confirmations/:txid`
Get confirmation count for a transaction.

#### `GET /api/transactions`
Get all transactions. Supports filtering:
- `?status=pending|confirmed|processed`
- `?recipient=0x...`
- `?limit=100`

#### `GET /api/transactions/stats`
Get transaction statistics.

### Watcher Endpoints

All watcher endpoints require the `X-Watcher-Secret` header.

#### `POST /api/watcher/submit`
Submit a new transaction from the watcher.

**Headers:**
- `X-Watcher-Secret: <secret>`

**Body:**
```json
{
  "txid": "abc123...",
  "amount": 100000000,
  "recipient": "0x1234567890123456789012345678901234567890",
  "confirmations": 6,
  "txData": {
    "tx_bytes": [...],
    "memo_bytes": [...],
    ...
  }
}
```

#### `POST /api/watcher/update-confirmations`
Update confirmations for a transaction.

**Body:**
```json
{
  "txid": "abc123...",
  "confirmations": 10
}
```

#### `POST /api/transactions/:txid/processed`
Mark a transaction as processed (after bridge mint).

## Data Flow

1. **User sends ZEC** to the burn address with memo containing their Ethereum address
2. **Watcher detects** the transaction and submits it to the backend via `POST /api/watcher/submit`
3. **Frontend polls** `GET /api/check-zec-tx` with the expected amount
4. When found, frontend fetches full data via `GET /api/zcash/txdata`
5. Frontend generates ZK proof and submits to Ethereum bridge contract
6. Watcher (or relayer) marks the transaction as processed

## Transaction States

- `pending` - Transaction submitted but not enough confirmations
- `confirmed` - Has required confirmations, ready for proof generation
- `processed` - Bridge mint completed on Ethereum

## Security

- Watcher endpoints are protected with a shared secret (`X-Watcher-Secret` header)
- Rate limiting is applied to all endpoints
- Helmet.js for security headers
- CORS configured for frontend origin only

## Production Considerations

1. **Database** - Replace in-memory store with PostgreSQL/Redis
2. **Authentication** - Add JWT or API keys for sensitive endpoints
3. **Monitoring** - Add Prometheus metrics and alerts
4. **Caching** - Add Redis for response caching
5. **Clustering** - Use PM2 or similar for multi-process

## License

MIT
