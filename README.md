# LLM Benchmark Modeling Tool

A modern web application for uploading, analyzing, and modeling LLM benchmark performance data. This tool allows you to predict model performance based on input/output token sizes using historical benchmark data.

## Features

- 📊 **CSV Upload**: Upload benchmark results in CSV format
- 📈 **Performance Modeling**: Predict performance metrics based on input/output tokens
- 🎯 **Multi-Model Support**: Manage benchmarks for multiple LLM models
- 📉 **Visual Analytics**: Interactive charts showing TTFT, throughput, and latency
- 🔍 **Confidence Scoring**: Get confidence levels (high/medium/low) for predictions
- 💾 **SQLite Storage**: Lightweight database for benchmark storage

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + Recharts
- **Backend**: Node.js + Express + TypeScript + SQLite
- **Data Processing**: Multivariate linear regression for performance modeling

## Prerequisites

- Node.js 18+ and npm
- Git

## Quick Start

### Option 1: Run Everything with One Command (Recommended)

```bash
# Install all dependencies
npm run install:all

# Start both backend and frontend together
npm run dev
```

That's it! Open your browser at `http://localhost:3000`

### Option 2: Run Backend and Frontend Separately

**Terminal 1 (Backend):**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

## Usage

### Uploading Benchmarks

1. Navigate to the **Upload** page
2. Select a CSV file containing benchmark data
3. Click **Upload** to import the data

### CSV Format Requirements

Your CSV file should include these columns:

- `provider_name` - Provider name (e.g., "together")
- `provider_model` - Model name (e.g., "graphon/graphon-Qwen3-Omni-30B-A3B-Instruct")
- `input_avg_len` - Average input token length
- `output_avg_len` - Average output token length
- `ttft_mean`, `ttft_p50`, `ttft_p95`, `ttft_p99` - Time to First Token metrics
- `user_tps_mean`, `user_tps_p50`, `user_tps_p95`, `user_tps_p99` - Throughput metrics
- `e2e_mean`, `e2e_p50`, `e2e_p95`, `e2e_p99` - End-to-end latency metrics
- Additional metrics (see example CSV below)

### Viewing Models and Benchmarks

1. Navigate to the **Models** page
2. View all models and their benchmark summaries
3. Click on a model to see detailed benchmarks
4. Delete benchmarks if needed

### Performance Modeling

1. Navigate to the **Performance Modeling** page
2. Select a model from the dropdown
3. Enter desired input token count
4. Enter desired output token count
5. Click **Predict Performance**
6. View predicted metrics with confidence scores and charts

**Requirements for Modeling:**
- At least 2 benchmarks for the model
- Benchmarks must have varying input/output token sizes
- More benchmarks = higher prediction confidence

## How It Works

### Modeling Algorithm

The tool uses **multivariate linear regression** to predict performance:

```
metric = a + b*(input_tokens) + c*(output_tokens)
```

For each metric (TTFT, throughput, latency), the system:
1. Analyzes all benchmark data for the selected model
2. Fits a linear model based on input/output token relationships
3. Predicts performance for your specified token counts
4. Calculates confidence based on proximity to existing data points

### Confidence Levels

- **High**: Prediction is close to existing benchmarks (interpolation)
- **Medium**: Moderate distance from existing data
- **Low**: Far from existing benchmarks (extrapolation)

## Example CSV Data

```csv
provider_name,provider_model,traffic_mode,traffic_level,input_avg_len,input_stdev_len,input_min_len,input_max_len,input_total_tokens,output_avg_len,output_stdev_len,output_min_len,output_max_len,output_total_tokens,ttft_mean,ttft_stdev,ttft_p05,ttft_p50,ttft_p80,ttft_p95,ttft_p99,ttft_p999,ttft_distribution,user_tps_mean,user_tps_stdev,user_tps_p05,user_tps_p50,user_tps_p80,user_tps_p95,user_tps_p99,user_tps_p999,user_tps_distribution,e2e_mean,e2e_stdev,e2e_p05,e2e_p50,e2e_p80,e2e_p95,e2e_p99,e2e_p999,e2e_distribution,summary_total_num_requests,summary_total_elapsed_time_s,summary_job_level_tps,summary_actual_qps,summary_num_failed_requests,per_gpu_num_gpus,per_gpu_tps_mean,per_gpu_tps_stdev,acceptance_rate,hf_dataset_name
together,graphon/graphon-Qwen3-Omni-30B-A3B-Instruct,qps,0.6,11570.470588235294,1.5762071772910897,11568,11574,196698,152.05882352941177,6.881095913359887,138,161,2585,10945.902700892048,3575.7261876423577,6300.381850032136,9465.41599999182,14178.01366620697,16332.948258402756,18423.81468522828,18894.25963126403,,28.423920187296854,22.279157941491466,12.363854544771247,19.2551403923085,33.96361100301085,69.06298012527405,93.02800003851546,98.42012951899484,,18593.850320896738,6578.506440646982,9260.732300044037,16482.94258408714,26390.69243343547,27889.894357998855,29191.542437975295,29484.413255969997,,18,40.45644137496129,63.895881895333254,0.4449229687102509,1,4,0,0,,
```

## API Endpoints

### Benchmark Management

- `POST /api/benchmarks/upload` - Upload CSV file
- `GET /api/benchmarks/models` - Get all models
- `GET /api/benchmarks/models/:model/benchmarks` - Get benchmarks for a model
- `GET /api/benchmarks/benchmarks/:id` - Get specific benchmark data
- `DELETE /api/benchmarks/benchmarks/:id` - Delete a benchmark

### Performance Modeling

- `GET /api/benchmarks/modeling/models` - Get models available for modeling
- `POST /api/benchmarks/modeling/predict` - Predict performance
  ```json
  {
    "model": "model-name",
    "input_tokens": 1024,
    "output_tokens": 256
  }
  ```

## Development

### Root Level Commands

```bash
npm run install:all    # Install all dependencies
npm run dev            # Start both backend and frontend
npm run dev:backend    # Start only backend
npm run dev:frontend   # Start only frontend
npm run build          # Build both for production
npm run db:init        # Initialize database
```

### Backend Development

```bash
cd backend
npm run dev      # Start with hot reload
npm run build    # Build for production
npm start        # Run production build
npm run db:init  # Initialize database
```

### Frontend Development

```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Project Structure

```
together-benchmark-model/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts       # Database connection
│   │   │   ├── schema.ts         # Database schema
│   │   │   └── init.ts           # Database initialization
│   │   ├── routes/
│   │   │   └── benchmarkRoutes.ts # API routes
│   │   ├── services/
│   │   │   ├── benchmarkService.ts # Benchmark CRUD
│   │   │   └── modelingService.ts  # Performance prediction
│   │   └── server.ts             # Express server
│   ├── data/                     # SQLite database storage
│   ├── uploads/                  # Temporary upload directory
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── UploadPage.tsx    # CSV upload interface
│   │   │   ├── ModelsPage.tsx    # Models and benchmarks view
│   │   │   └── ModelingPage.tsx  # Performance modeling
│   │   ├── App.tsx               # Main app component
│   │   ├── api.ts                # API client
│   │   └── main.tsx              # Entry point
│   └── package.json
└── README.md
```

## Production Deployment

### Backend

1. Build the backend:
   ```bash
   cd backend
   npm run build
   ```

2. Set environment variables:
   ```bash
   export PORT=3001
   export DATABASE_PATH=./data/benchmarks.db
   export UPLOAD_DIR=./uploads
   ```

3. Start the server:
   ```bash
   npm start
   ```

### Frontend

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Serve the `dist` directory with a web server (nginx, Apache, etc.)

## Environment Variables

### Backend

- `PORT` - Server port (default: 3001)
- `DATABASE_PATH` - SQLite database path (default: ./data/benchmarks.db)
- `UPLOAD_DIR` - Temporary upload directory (default: ./uploads)

## Troubleshooting

### "No models available for modeling"

You need at least 2 benchmarks with varying input/output tokens for each model. Upload more benchmark data with different token configurations.

### CSV Upload Fails

Ensure your CSV file includes all required columns and uses proper formatting. Check the console for specific error messages.

### Charts Not Displaying

Make sure you have valid prediction results. Charts only appear after successful performance prediction.

## Contributing

Contributions are welcome! Please ensure all changes include proper TypeScript types and follow the existing code style.

## License

MIT License

## Support

For issues or questions, please open an issue on the repository.
