import { getDatabase, saveDatabase } from '../db/database';
import { BenchmarkRow } from '../db/schema';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface BenchmarkSummary {
  benchmark_id: string;
  upload_date: string;
  provider_model: string;
  num_runs: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
}

export interface ModelSummary {
  provider_model: string;
  num_benchmarks: number;
  num_runs: number;
  input_token_range: { min: number; max: number };
  output_token_range: { min: number; max: number };
}

export class BenchmarkService {
  async uploadBenchmark(filePath: string): Promise<{ benchmark_id: string; rows_inserted: number }> {
    const db = await getDatabase();
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      cast: true,
      cast_date: false,
    });

    const benchmark_id = uuidv4();
    const upload_date = new Date().toISOString();

    for (const row of records) {
      db.run(
        `INSERT INTO benchmarks (
          benchmark_id, upload_date, provider_name, provider_model, traffic_mode, traffic_level,
          input_avg_len, input_stdev_len, input_min_len, input_max_len, input_total_tokens,
          output_avg_len, output_stdev_len, output_min_len, output_max_len, output_total_tokens,
          ttft_mean, ttft_stdev, ttft_p50, ttft_p95, ttft_p99,
          user_tps_mean, user_tps_stdev, user_tps_p50, user_tps_p95, user_tps_p99,
          e2e_mean, e2e_stdev, e2e_p50, e2e_p95, e2e_p99,
          summary_total_num_requests, summary_total_elapsed_time_s, summary_job_level_tps,
          summary_actual_qps, summary_num_failed_requests, per_gpu_num_gpus, acceptance_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          benchmark_id,
          upload_date,
          row.provider_name,
          row.provider_model,
          row.traffic_mode,
          row.traffic_level,
          row.input_avg_len,
          row.input_stdev_len,
          row.input_min_len,
          row.input_max_len,
          row.input_total_tokens,
          row.output_avg_len,
          row.output_stdev_len,
          row.output_min_len,
          row.output_max_len,
          row.output_total_tokens,
          row.ttft_mean,
          row.ttft_stdev,
          row.ttft_p50,
          row.ttft_p95,
          row.ttft_p99,
          row.user_tps_mean,
          row.user_tps_stdev,
          row.user_tps_p50,
          row.user_tps_p95,
          row.user_tps_p99,
          row.e2e_mean,
          row.e2e_stdev,
          row.e2e_p50,
          row.e2e_p95,
          row.e2e_p99,
          row.summary_total_num_requests,
          row.summary_total_elapsed_time_s,
          row.summary_job_level_tps,
          row.summary_actual_qps,
          row.summary_num_failed_requests,
          row.per_gpu_num_gpus,
          row.acceptance_rate,
        ]
      );
    }

    saveDatabase();
    return { benchmark_id, rows_inserted: records.length };
  }

  async getBenchmarksByModel(model: string): Promise<BenchmarkSummary[]> {
    const db = await getDatabase();
    const stmt = db.prepare(`
      SELECT 
        benchmark_id,
        upload_date,
        provider_model,
        COUNT(*) as num_runs,
        AVG(input_avg_len) as avg_input_tokens,
        AVG(output_avg_len) as avg_output_tokens
      FROM benchmarks
      WHERE provider_model = ?
      GROUP BY benchmark_id, upload_date, provider_model
      ORDER BY upload_date DESC
    `);
    
    stmt.bind([model]);
    const results: BenchmarkSummary[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row as unknown as BenchmarkSummary);
    }
    
    stmt.free();
    return results;
  }

  async getAllModels(): Promise<ModelSummary[]> {
    const db = await getDatabase();
    const stmt = db.prepare(`
      SELECT 
        provider_model,
        COUNT(DISTINCT benchmark_id) as num_benchmarks,
        COUNT(*) as num_runs,
        MIN(input_avg_len) as min_input,
        MAX(input_avg_len) as max_input,
        MIN(output_avg_len) as min_output,
        MAX(output_avg_len) as max_output
      FROM benchmarks
      GROUP BY provider_model
      ORDER BY provider_model
    `);

    const results: ModelSummary[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      results.push({
        provider_model: row.provider_model,
        num_benchmarks: row.num_benchmarks,
        num_runs: row.num_runs,
        input_token_range: { min: row.min_input, max: row.max_input },
        output_token_range: { min: row.min_output, max: row.max_output },
      });
    }
    
    stmt.free();
    return results;
  }

  async getBenchmarkData(benchmark_id: string): Promise<BenchmarkRow[]> {
    const db = await getDatabase();
    const stmt = db.prepare('SELECT * FROM benchmarks WHERE benchmark_id = ?');
    stmt.bind([benchmark_id]);
    
    const results: BenchmarkRow[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as BenchmarkRow);
    }
    
    stmt.free();
    return results;
  }

  async deleteBenchmark(benchmark_id: string): Promise<number> {
    const db = await getDatabase();
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM benchmarks WHERE benchmark_id = ?');
    countStmt.bind([benchmark_id]);
    countStmt.step();
    const count = (countStmt.getAsObject() as any).count;
    countStmt.free();
    
    db.run('DELETE FROM benchmarks WHERE benchmark_id = ?', [benchmark_id]);
    saveDatabase();
    
    return count;
  }
}
