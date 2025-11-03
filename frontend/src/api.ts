import axios from 'axios';

const API_BASE = '/api/benchmarks';

export interface ModelSummary {
  provider_model: string;
  num_benchmarks: number;
  num_runs: number;
  input_token_range: { min: number; max: number };
  output_token_range: { min: number; max: number };
}

export interface BenchmarkSummary {
  benchmark_id: string;
  upload_date: string;
  provider_model: string;
  num_runs: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
}

export interface ModelingResult {
  model: string;
  input_tokens: number;
  output_tokens: number;
  predictions: {
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
    throughput: number;
  };
  confidence: 'high' | 'medium' | 'low';
  num_benchmarks_used: number;
  interpolation_method: string;
}

export const api = {
  async uploadBenchmark(file: File): Promise<{ benchmark_id: string; rows_inserted: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getModels(): Promise<ModelSummary[]> {
    const response = await axios.get(`${API_BASE}/models`);
    return response.data;
  },

  async getBenchmarks(model: string): Promise<BenchmarkSummary[]> {
    const response = await axios.get(`${API_BASE}/models/${encodeURIComponent(model)}/benchmarks`);
    return response.data;
  },

  async deleteBenchmark(benchmarkId: string): Promise<void> {
    await axios.delete(`${API_BASE}/benchmarks/${benchmarkId}`);
  },

  async getModelingModels(): Promise<string[]> {
    const response = await axios.get(`${API_BASE}/modeling/models`);
    return response.data;
  },

  async predictPerformance(
    model: string,
    inputTokens: number,
    outputTokens: number,
    method?: string,
    trafficLevel?: number
  ): Promise<ModelingResult> {
    const response = await axios.post(`${API_BASE}/modeling/predict`, {
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      traffic_level: trafficLevel,
      method: method || 'auto_detect',
    });
    return response.data;
  },

  async exportPrediction(result: ModelingResult): Promise<void> {
    const response = await axios.post(`${API_BASE}/modeling/export`, { result }, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `prediction-${result.model.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

