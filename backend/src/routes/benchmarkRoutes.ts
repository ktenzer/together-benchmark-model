import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BenchmarkService } from '../services/benchmarkService';
import { ModelingService } from '../services/modelingService';

const router = Router();
const benchmarkService = new BenchmarkService();
const modelingService = new ModelingService();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'benchmark-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Upload benchmark CSV
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await benchmarkService.uploadBenchmark(req.file.path);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      benchmark_id: result.benchmark_id,
      rows_inserted: result.rows_inserted,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload benchmark' });
  }
});

// Get all models
router.get('/models', async (req: Request, res: Response) => {
  try {
    const models = await benchmarkService.getAllModels();
    res.json(models);
  } catch (error: any) {
    console.error('Get models error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch models' });
  }
});

// Get benchmarks for a specific model
router.get('/models/:model/benchmarks', async (req: Request, res: Response) => {
  try {
    const model = decodeURIComponent(req.params.model);
    const benchmarks = await benchmarkService.getBenchmarksByModel(model);
    res.json(benchmarks);
  } catch (error: any) {
    console.error('Get benchmarks error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch benchmarks' });
  }
});

// Get specific benchmark data
router.get('/benchmarks/:id', async (req: Request, res: Response) => {
  try {
    const data = await benchmarkService.getBenchmarkData(req.params.id);
    if (data.length === 0) {
      return res.status(404).json({ error: 'Benchmark not found' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Get benchmark error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch benchmark' });
  }
});

// Delete benchmark
router.delete('/benchmarks/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await benchmarkService.deleteBenchmark(req.params.id);
    if (deleted === 0) {
      return res.status(404).json({ error: 'Benchmark not found' });
    }
    res.json({ success: true, deleted });
  } catch (error: any) {
    console.error('Delete benchmark error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete benchmark' });
  }
});

// Get models available for modeling
router.get('/modeling/models', async (req: Request, res: Response) => {
  try {
    const models = await modelingService.getModelsAvailableForModeling();
    res.json(models);
  } catch (error: any) {
    console.error('Get modeling models error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch models' });
  }
});

// Predict performance
router.post('/modeling/predict', async (req: Request, res: Response) => {
  try {
    const { model, input_tokens, output_tokens, traffic_level, method } = req.body;

    if (!model || !input_tokens || !output_tokens) {
      return res.status(400).json({ 
        error: 'Missing required fields: model, input_tokens, output_tokens' 
      });
    }

    const result = await modelingService.predictPerformance({
      model,
      input_tokens: Number(input_tokens),
      output_tokens: Number(output_tokens),
      traffic_level: traffic_level ? Number(traffic_level) : undefined,
      method: method || 'auto_detect',
    });

    if (!result) {
      return res.status(400).json({
        error: 'Insufficient data for modeling. Need at least some benchmark data.',
      });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: error.message || 'Failed to predict performance' });
  }
});

// Export prediction as CSV
router.post('/modeling/export', async (req: Request, res: Response) => {
  try {
    const { result } = req.body;

    if (!result) {
      return res.status(400).json({ error: 'No prediction result provided' });
    }

    // Create CSV header
    const headers = [
      'provider_name', 'provider_model', 'traffic_mode', 'traffic_level',
      'input_avg_len', 'input_stdev_len', 'input_min_len', 'input_max_len', 'input_total_tokens',
      'output_avg_len', 'output_stdev_len', 'output_min_len', 'output_max_len', 'output_total_tokens',
      'ttft_mean', 'ttft_stdev', 'ttft_p05', 'ttft_p50', 'ttft_p80', 'ttft_p95', 'ttft_p99', 'ttft_p999',
      'ttft_distribution',
      'user_tps_mean', 'user_tps_stdev', 'user_tps_p05', 'user_tps_p50', 'user_tps_p80', 'user_tps_p95', 'user_tps_p99', 'user_tps_p999',
      'user_tps_distribution',
      'e2e_mean', 'e2e_stdev', 'e2e_p05', 'e2e_p50', 'e2e_p80', 'e2e_p95', 'e2e_p99', 'e2e_p999',
      'e2e_distribution',
      'summary_total_num_requests', 'summary_total_elapsed_time_s', 'summary_job_level_tps',
      'summary_actual_qps', 'summary_num_failed_requests',
      'per_gpu_num_gpus', 'per_gpu_tps_mean', 'per_gpu_tps_stdev', 'acceptance_rate', 'hf_dataset_name'
    ];

    // Create CSV row from prediction
    const p = result.predictions;
    const row = [
      'predicted', // provider_name
      result.model, // provider_model
      'prediction', // traffic_mode
      '', // traffic_level
      result.input_tokens, // input_avg_len
      '', // input_stdev_len
      result.input_tokens, // input_min_len
      result.input_tokens, // input_max_len
      result.input_tokens, // input_total_tokens
      result.output_tokens, // output_avg_len
      '', // output_stdev_len
      result.output_tokens, // output_min_len
      result.output_tokens, // output_max_len
      result.output_tokens, // output_total_tokens
      p.ttft_mean,
      p.ttft_stdev,
      p.ttft_p05,
      p.ttft_p50,
      p.ttft_p80,
      p.ttft_p95,
      p.ttft_p99,
      p.ttft_p999,
      '', // ttft_distribution
      p.user_tps_mean,
      p.user_tps_stdev,
      p.user_tps_p05,
      p.user_tps_p50,
      p.user_tps_p80,
      p.user_tps_p95,
      p.user_tps_p99,
      p.user_tps_p999,
      '', // user_tps_distribution
      p.e2e_mean,
      p.e2e_stdev,
      p.e2e_p05,
      p.e2e_p50,
      p.e2e_p80,
      p.e2e_p95,
      p.e2e_p99,
      p.e2e_p999,
      '', // e2e_distribution
      1, // summary_total_num_requests
      '', // summary_total_elapsed_time_s
      p.throughput, // summary_job_level_tps
      '', // summary_actual_qps
      0, // summary_num_failed_requests
      '', // per_gpu_num_gpus
      '', // per_gpu_tps_mean
      '', // per_gpu_tps_stdev
      '', // acceptance_rate
      '', // hf_dataset_name
    ];

    const csv = headers.join(',') + '\n' + row.join(',');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="prediction-${result.model.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message || 'Failed to export prediction' });
  }
});

export default router;

