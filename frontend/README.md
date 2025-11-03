# LLM Benchmark Frontend

Modern React frontend for the LLM Benchmark Modeling Tool.

## Technology Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Charts**: Recharts
- **HTTP Client**: Axios

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open browser at `http://localhost:3000`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Pages

### Upload Page (`/`)
- CSV file upload interface
- File validation and preview
- Upload status feedback
- Format documentation

### Models Page (`/models`)
- Grid view of all models
- Benchmark summaries
- Detailed benchmark tables
- Delete functionality

### Modeling Page (`/modeling`)
- Model selection dropdown
- Input/output token inputs
- Performance prediction
- Interactive charts (TTFT, TPS, E2E)
- Confidence scoring
- Detailed metrics table

## Components

The application uses a clean component structure:

```
src/
├── pages/
│   ├── UploadPage.tsx
│   ├── ModelsPage.tsx
│   └── ModelingPage.tsx
├── App.tsx          # Main app with navigation
├── api.ts           # API client functions
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Styling

The app uses:
- Tailwind CSS for utility-first styling
- Custom CSS classes for reusable components
- Gradient backgrounds for visual appeal
- Responsive design for mobile/desktop

## API Integration

The `api.ts` module provides typed functions for all backend endpoints:

```typescript
import { api } from './api'

// Upload benchmark
await api.uploadBenchmark(file)

// Get models
const models = await api.getModels()

// Predict performance
const result = await api.predictPerformance(model, inputTokens, outputTokens)
```

## Charts

Recharts is used for data visualization:
- Bar charts for TTFT and E2E latency
- Line charts for throughput metrics
- Responsive containers
- Custom tooltips and labels

## Development

The frontend uses Vite for:
- Fast HMR (Hot Module Replacement)
- Optimized production builds
- TypeScript support out of the box
- Proxy configuration for API calls

API calls are proxied to `http://localhost:3001` during development.

