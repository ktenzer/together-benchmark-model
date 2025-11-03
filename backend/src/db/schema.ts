import { Database } from 'sql.js';

export interface BenchmarkRow {
  id?: number;
  benchmark_id: string;
  upload_date: string;
  provider_name: string;
  provider_model: string;
  traffic_mode: string;
  traffic_level: number;
  input_avg_len: number;
  input_stdev_len: number;
  input_min_len: number;
  input_max_len: number;
  input_total_tokens: number;
  output_avg_len: number;
  output_stdev_len: number;
  output_min_len: number;
  output_max_len: number;
  output_total_tokens: number;
  ttft_mean: number;
  ttft_stdev: number;
  ttft_p05: number;
  ttft_p50: number;
  ttft_p80: number;
  ttft_p95: number;
  ttft_p99: number;
  ttft_p999: number;
  user_tps_mean: number;
  user_tps_stdev: number;
  user_tps_p05: number;
  user_tps_p50: number;
  user_tps_p80: number;
  user_tps_p95: number;
  user_tps_p99: number;
  user_tps_p999: number;
  e2e_mean: number;
  e2e_stdev: number;
  e2e_p05: number;
  e2e_p50: number;
  e2e_p80: number;
  e2e_p95: number;
  e2e_p99: number;
  e2e_p999: number;
  summary_total_num_requests: number;
  summary_total_elapsed_time_s: number;
  summary_job_level_tps: number;
  summary_actual_qps: number;
  summary_num_failed_requests: number;
  per_gpu_num_gpus: number;
  acceptance_rate: number;
}

export function initializeDatabase(db: Database): void {
  // Drop old table to recreate with new schema
  try {
    db.run('DROP TABLE IF EXISTS benchmarks');
  } catch (e) {
    console.log('No existing table to drop');
  }
  
  db.run(`
    CREATE TABLE benchmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      benchmark_id TEXT NOT NULL,
      upload_date TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      provider_model TEXT NOT NULL,
      traffic_mode TEXT,
      traffic_level REAL,
      input_avg_len REAL NOT NULL,
      input_stdev_len REAL,
      input_min_len INTEGER,
      input_max_len INTEGER,
      input_total_tokens INTEGER,
      output_avg_len REAL NOT NULL,
      output_stdev_len REAL,
      output_min_len INTEGER,
      output_max_len INTEGER,
      output_total_tokens INTEGER,
      ttft_mean REAL,
      ttft_stdev REAL,
      ttft_p05 REAL,
      ttft_p50 REAL,
      ttft_p80 REAL,
      ttft_p95 REAL,
      ttft_p99 REAL,
      ttft_p999 REAL,
      user_tps_mean REAL,
      user_tps_stdev REAL,
      user_tps_p05 REAL,
      user_tps_p50 REAL,
      user_tps_p80 REAL,
      user_tps_p95 REAL,
      user_tps_p99 REAL,
      user_tps_p999 REAL,
      e2e_mean REAL,
      e2e_stdev REAL,
      e2e_p05 REAL,
      e2e_p50 REAL,
      e2e_p80 REAL,
      e2e_p95 REAL,
      e2e_p99 REAL,
      e2e_p999 REAL,
      summary_total_num_requests INTEGER,
      summary_total_elapsed_time_s REAL,
      summary_job_level_tps REAL,
      summary_actual_qps REAL,
      summary_num_failed_requests INTEGER,
      per_gpu_num_gpus INTEGER,
      acceptance_rate REAL
    );

  `);
  
  db.run('CREATE INDEX IF NOT EXISTS idx_provider_model ON benchmarks(provider_model)');
  db.run('CREATE INDEX IF NOT EXISTS idx_benchmark_id ON benchmarks(benchmark_id)');
}

