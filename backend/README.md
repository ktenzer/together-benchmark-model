# LLM Benchmark Backend

Backend API service for the LLM Benchmark Modeling Tool.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **CSV Parsing**: csv-parse
- **File Upload**: Multer

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Initialize the database:
   ```bash
   npm run db:init
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production build
- `npm run db:init` - Initialize the SQLite database

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Benchmark Management
- `POST /api/benchmarks/upload` - Upload benchmark CSV
- `GET /api/benchmarks/models` - List all models
- `GET /api/benchmarks/models/:model/benchmarks` - Get benchmarks for specific model
- `GET /api/benchmarks/benchmarks/:id` - Get benchmark details
- `DELETE /api/benchmarks/benchmarks/:id` - Delete benchmark

### Performance Modeling
- `GET /api/benchmarks/modeling/models` - Get models with sufficient data for modeling
- `POST /api/benchmarks/modeling/predict` - Predict performance metrics

## Database Schema

The SQLite database contains a single `benchmarks` table with columns for:
- Benchmark metadata (ID, upload date, provider, model)
- Input token metrics (avg, stdev, min, max, total)
- Output token metrics (avg, stdev, min, max, total)
- Performance metrics (TTFT, TPS, E2E latency with percentiles)

## Environment Variables

Create a `.env` file with:

```env
PORT=3001
DATABASE_PATH=./data/benchmarks.db
UPLOAD_DIR=./uploads
```

## Architecture

### Services

**BenchmarkService**
- Handles CSV upload and parsing
- CRUD operations for benchmarks
- Model and benchmark queries

**ModelingService**
- Performance prediction using multivariate linear regression
- Confidence scoring based on data proximity
- Model validation for sufficient data

### Data Flow

1. CSV file uploaded via multer
2. Parsed using csv-parse
3. Validated and inserted into SQLite
4. Queried for modeling predictions
5. Results returned with confidence scores

## Development

The backend uses:
- TypeScript for type safety
- Better-sqlite3 for synchronous database access
- Express middleware for CORS and JSON parsing
- Multer for handling multipart file uploads

