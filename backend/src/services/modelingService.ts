import { getDatabase } from '../db/database';
import { BenchmarkRow } from '../db/schema';

export type PredictionMethod = 'auto_detect' | 'polynomial' | 'linear' | 'average';

export interface ModelingRequest {
  model: string;
  input_tokens: number;
  output_tokens: number;
  traffic_level?: number; // Optional: QPS or concurrency level for system throughput prediction
  method?: PredictionMethod;
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

export class ModelingService {

  /**
   * Predict performance metrics based on input/output tokens using LLM or linear regression
   */
  async predictPerformance(request: ModelingRequest): Promise<ModelingResult | null> {
    const db = await getDatabase();
    
    // Get all benchmark data for this model
    const stmt = db.prepare(`
      SELECT DISTINCT
        benchmark_id,
        input_avg_len,
        output_avg_len,
        traffic_level,
        AVG(ttft_mean) as ttft_mean,
        AVG(ttft_stdev) as ttft_stdev,
        AVG(ttft_p05) as ttft_p05,
        AVG(ttft_p50) as ttft_p50,
        AVG(ttft_p80) as ttft_p80,
        AVG(ttft_p95) as ttft_p95,
        AVG(ttft_p99) as ttft_p99,
        AVG(ttft_p999) as ttft_p999,
        AVG(user_tps_mean) as user_tps_mean,
        AVG(user_tps_stdev) as user_tps_stdev,
        AVG(user_tps_p05) as user_tps_p05,
        AVG(user_tps_p50) as user_tps_p50,
        AVG(user_tps_p80) as user_tps_p80,
        AVG(user_tps_p95) as user_tps_p95,
        AVG(user_tps_p99) as user_tps_p99,
        AVG(user_tps_p999) as user_tps_p999,
        AVG(e2e_mean) as e2e_mean,
        AVG(e2e_stdev) as e2e_stdev,
        AVG(e2e_p05) as e2e_p05,
        AVG(e2e_p50) as e2e_p50,
        AVG(e2e_p80) as e2e_p80,
        AVG(e2e_p95) as e2e_p95,
        AVG(e2e_p99) as e2e_p99,
        AVG(e2e_p999) as e2e_p999,
        AVG(summary_job_level_tps) as throughput
      FROM benchmarks
      WHERE provider_model = ?
      GROUP BY benchmark_id, input_avg_len, output_avg_len, traffic_level
      ORDER BY input_avg_len, output_avg_len, traffic_level
    `);

    stmt.bind([request.model]);
    const benchmarks: any[] = [];
    
    while (stmt.step()) {
      benchmarks.push(stmt.getAsObject());
    }
    
    stmt.free();

    if (benchmarks.length === 0) {
      return null; // Need at least some benchmark data
    }

        // Debug logging
        console.log('=== PREDICTION DEBUG ===');
        console.log('Model:', request.model);
        console.log('Request tokens:', request.input_tokens, '/', request.output_tokens);
        console.log('Traffic level:', request.traffic_level || 'not specified');
        console.log('Benchmarks found:', benchmarks.length);
        if (benchmarks.length > 0) {
          console.log('Sample benchmark data:', {
            input_avg_len: benchmarks[0].input_avg_len,
            output_avg_len: benchmarks[0].output_avg_len,
            traffic_level: benchmarks[0].traffic_level,
            ttft_mean: benchmarks[0].ttft_mean,
            ttft_p50: benchmarks[0].ttft_p50,
            user_tps_mean: benchmarks[0].user_tps_mean,
            user_tps_p50: benchmarks[0].user_tps_p50,
            throughput: benchmarks[0].throughput,
          });
        }
        console.log('=======================');

    const method = request.method || 'auto_detect';
    
    // Check data sufficiency and override method if necessary
    const uniqueInputs = new Set(benchmarks.map(b => Math.round(b.input_avg_len as number)));
    const uniqueOutputs = new Set(benchmarks.map(b => Math.round(b.output_avg_len as number)));
    const hasVariation = uniqueInputs.size >= 2 || uniqueOutputs.size >= 2;
    
        // Override method based on data availability
        let effectiveMethod = method;
        
        if (benchmarks.length === 1 || !hasVariation) {
          // Only 1 benchmark or no variation: Use simple average
          effectiveMethod = 'average';
        } else if (benchmarks.length < 3 && method === 'polynomial') {
          // Less than 3 benchmarks: Polynomial not reliable, use linear instead
          effectiveMethod = 'linear';
        }
    
        // Handle method selection (simplified - no LLM)
        switch (effectiveMethod) {
          case 'auto_detect':
            return this.predictAutoDetect(benchmarks, request);
          
          case 'polynomial':
            return this.predictWithPolynomial(benchmarks, request);
          
          case 'linear':
            return this.predictWithLinear(benchmarks, request);
          
          case 'average':
            return this.predictWithAverage(benchmarks, request);
          
          default:
            return this.predictAutoDetect(benchmarks, request);
        }
  }

  private predictAutoDetect(benchmarks: any[], request: ModelingRequest): ModelingResult {
    const uniqueInputs = new Set(benchmarks.map(b => Math.round(b.input_avg_len as number)));
    const uniqueOutputs = new Set(benchmarks.map(b => Math.round(b.output_avg_len as number)));
    const hasVariation = uniqueInputs.size >= 2 || uniqueOutputs.size >= 2;
    
    // If only 1 benchmark or no variation, use simple average
    if (benchmarks.length === 1 || !hasVariation) {
      const avgResult = this.predictWithAverage(benchmarks, request);
      avgResult.interpolation_method = 'auto_simple_average';
      return avgResult;
    }
    
    // If less than 3 benchmarks, use linear (polynomial needs more data)
    if (benchmarks.length < 3) {
      const result = this.predictWithLinear(benchmarks, request);
      result.interpolation_method = 'auto_linear';
      return result;
    }
    
    // Detect if data is more linear or non-linear
    const isLinear = this.detectLinearity(benchmarks);
    
    if (isLinear) {
      const result = this.predictWithLinear(benchmarks, request);
      result.interpolation_method = 'auto_linear';
      return result;
    } else {
      const result = this.predictWithPolynomial(benchmarks, request);
      result.interpolation_method = 'auto_polynomial';
      return result;
    }
  }

  private detectLinearity(benchmarks: any[]): boolean {
    // Calculate R² for linear vs polynomial fit on a sample metric (ttft_mean)
    const linearR2 = this.calculateR2(benchmarks, 'ttft_mean', 'linear');
    const polyR2 = this.calculateR2(benchmarks, 'ttft_mean', 'polynomial');
    
    // If polynomial doesn't improve R² by much (< 10%), consider it linear
    const improvement = polyR2 - linearR2;
    return improvement < 0.1 || linearR2 > 0.85;
  }

  private calculateR2(data: any[], metric: string, type: 'linear' | 'polynomial'): number {
    // Calculate R² (coefficient of determination)
    const n = data.length;
    if (n < 2) return 0;
    
    const yActual = data.map(d => (d[metric] as number) || 0);
    const yMean = yActual.reduce((a, b) => a + b, 0) / n;
    
    let yPredicted: number[];
    if (type === 'linear') {
      const coeffs = this.fitLinearModel(data, metric);
      yPredicted = data.map(d => 
        coeffs.intercept + 
        coeffs.inputCoeff * (d.input_avg_len as number) + 
        coeffs.outputCoeff * (d.output_avg_len as number)
      );
    } else {
      const coeffs = this.fitPolynomialModel(data, metric);
      yPredicted = data.map(d => {
        const x1 = d.input_avg_len as number;
        const x2 = d.output_avg_len as number;
        return coeffs.intercept + 
          coeffs.x1 * x1 + 
          coeffs.x2 * x2 +
          coeffs.x1_sq * x1 * x1 +
          coeffs.x2_sq * x2 * x2 +
          coeffs.x1x2 * x1 * x2;
      });
    }
    
    // Calculate sum of squares
    const ssRes = yActual.reduce((sum, y, i) => sum + Math.pow(y - yPredicted[i], 2), 0);
    const ssTot = yActual.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    
    if (ssTot === 0) return 0;
    return Math.max(0, 1 - (ssRes / ssTot));
  }

  private predictWithPolynomial(benchmarks: any[], request: ModelingRequest): ModelingResult {
    const predictions = this.performPolynomialInterpolation(
      benchmarks,
      request.input_tokens,
      request.output_tokens,
      request.traffic_level
    );

    // Polynomial needs at least 3 benchmarks for meaningful results
    let confidence = this.calculateConfidence(
      benchmarks,
      request.input_tokens,
      request.output_tokens
    );
    
    if (benchmarks.length < 3) {
      confidence = 'low'; // Override to low if insufficient data
    }

    return {
      model: request.model,
      input_tokens: request.input_tokens,
      output_tokens: request.output_tokens,
      predictions,
      confidence,
      num_benchmarks_used: benchmarks.length,
      interpolation_method: 'polynomial_regression',
    };
  }

  private predictWithLinear(benchmarks: any[], request: ModelingRequest): ModelingResult {
    const predictions = this.performMultivariateInterpolation(
      benchmarks,
      request.input_tokens,
      request.output_tokens,
      request.traffic_level
    );

    const confidence = this.calculateConfidence(
      benchmarks,
      request.input_tokens,
      request.output_tokens
    );

    return {
      model: request.model,
      input_tokens: request.input_tokens,
      output_tokens: request.output_tokens,
      predictions,
      confidence,
      num_benchmarks_used: benchmarks.length,
      interpolation_method: 'multivariate_linear',
    };
  }

  private predictWithAverage(benchmarks: any[], request: ModelingRequest): ModelingResult {
    const predictions = this.performSimpleAveraging(benchmarks);

    return {
      model: request.model,
      input_tokens: request.input_tokens,
      output_tokens: request.output_tokens,
      predictions,
      confidence: 'low',
      num_benchmarks_used: benchmarks.length,
      interpolation_method: 'simple_average',
    };
  }

  private performSimpleAveraging(benchmarks: any[]): ModelingResult['predictions'] {
    const metrics = [
      'ttft_mean', 'ttft_stdev', 'ttft_p05', 'ttft_p50', 'ttft_p80', 'ttft_p95', 'ttft_p99', 'ttft_p999',
      'user_tps_mean', 'user_tps_stdev', 'user_tps_p05', 'user_tps_p50', 'user_tps_p80', 'user_tps_p95', 'user_tps_p99', 'user_tps_p999',
      'e2e_mean', 'e2e_stdev', 'e2e_p05', 'e2e_p50', 'e2e_p80', 'e2e_p95', 'e2e_p99', 'e2e_p999',
      'throughput'
    ];

    const predictions: any = {};

    for (const metric of metrics) {
      const values = benchmarks.map(b => (b[metric] as number) || 0);
      predictions[metric] = values.reduce((a, b) => a + b, 0) / values.length;
    }

    return predictions;
  }

  private performPolynomialInterpolation(
    benchmarks: any[],
    targetInput: number,
    targetOutput: number,
    targetTraffic?: number
  ): ModelingResult['predictions'] {
    // Polynomial regression for TTFT and TPS: y = a + b*x1 + c*x2 + d*x1² + e*x2² + f*x1*x2
    const ttftMetrics = [
      'ttft_mean', 'ttft_stdev', 'ttft_p05', 'ttft_p50', 'ttft_p80', 'ttft_p95', 'ttft_p99', 'ttft_p999'
    ];
    const tpsMetrics = [
      'user_tps_mean', 'user_tps_stdev', 'user_tps_p05', 'user_tps_p50', 'user_tps_p80', 'user_tps_p95', 'user_tps_p99', 'user_tps_p999'
    ];
    // E2E metrics: when traffic_level is provided, predict all via regression (including mean)
    // When no traffic_level, predict percentiles/stdev via regression, but calculate mean mechanistically
    const e2eRegressionMetrics = [
      'e2e_stdev', 'e2e_p05', 'e2e_p50', 'e2e_p80', 'e2e_p95', 'e2e_p99', 'e2e_p999'
    ];

    const predictions: any = {};

    // Use 3D regression if traffic level is provided (captures queuing/batching effects)
    const use3D = targetTraffic !== undefined;
    
    // When using 3D, also predict E2E mean via regression (it captures queuing better than mechanistic)
    const e2eMetricsToPredict = use3D ? ['e2e_mean', ...e2eRegressionMetrics] : e2eRegressionMetrics;

    // Predict TTFT using 3D polynomial regression if traffic level provided
    for (const metric of ttftMetrics) {
      if (use3D) {
        const coeffs3D = this.fitPolynomialModel3D(benchmarks, metric);
        predictions[metric] = Math.max(0,
          coeffs3D.intercept +
          coeffs3D.x1 * targetInput +
          coeffs3D.x2 * targetOutput +
          coeffs3D.x3 * targetTraffic +
          coeffs3D.x1_sq * targetInput * targetInput +
          coeffs3D.x2_sq * targetOutput * targetOutput +
          coeffs3D.x3_sq * targetTraffic * targetTraffic +
          coeffs3D.x1x2 * targetInput * targetOutput +
          coeffs3D.x1x3 * targetInput * targetTraffic +
          coeffs3D.x2x3 * targetOutput * targetTraffic
        );
      } else {
        const coeffs = this.fitPolynomialModel(benchmarks, metric);
        predictions[metric] = Math.max(0, 
          coeffs.intercept + 
          coeffs.x1 * targetInput + 
          coeffs.x2 * targetOutput +
          coeffs.x1_sq * targetInput * targetInput +
          coeffs.x2_sq * targetOutput * targetOutput +
          coeffs.x1x2 * targetInput * targetOutput
        );
      }
    }

    // Predict TPS using 3D polynomial regression if traffic level provided
    for (const metric of tpsMetrics) {
      if (use3D) {
        const coeffs3D = this.fitPolynomialModel3D(benchmarks, metric);
        predictions[metric] = Math.max(0,
          coeffs3D.intercept +
          coeffs3D.x1 * targetInput +
          coeffs3D.x2 * targetOutput +
          coeffs3D.x3 * targetTraffic +
          coeffs3D.x1_sq * targetInput * targetInput +
          coeffs3D.x2_sq * targetOutput * targetOutput +
          coeffs3D.x3_sq * targetTraffic * targetTraffic +
          coeffs3D.x1x2 * targetInput * targetOutput +
          coeffs3D.x1x3 * targetInput * targetTraffic +
          coeffs3D.x2x3 * targetOutput * targetTraffic
        );
      } else {
        const coeffs = this.fitPolynomialModel(benchmarks, metric);
        predictions[metric] = Math.max(0, 
          coeffs.intercept + 
          coeffs.x1 * targetInput + 
          coeffs.x2 * targetOutput +
          coeffs.x1_sq * targetInput * targetInput +
          coeffs.x2_sq * targetOutput * targetOutput +
          coeffs.x1x2 * targetInput * targetOutput
        );
      }
    }

    // Predict E2E metrics using 3D polynomial regression if traffic level provided
    // When 3D: predict mean + percentiles + stdev (captures queuing at specific traffic level)
    // When 2D: predict only percentiles + stdev (mean calculated mechanistically)
    for (const metric of e2eMetricsToPredict) {
      if (use3D) {
        const coeffs3D = this.fitPolynomialModel3D(benchmarks, metric);
        predictions[metric] = Math.max(0,
          coeffs3D.intercept +
          coeffs3D.x1 * targetInput +
          coeffs3D.x2 * targetOutput +
          coeffs3D.x3 * targetTraffic +
          coeffs3D.x1_sq * targetInput * targetInput +
          coeffs3D.x2_sq * targetOutput * targetOutput +
          coeffs3D.x3_sq * targetTraffic * targetTraffic +
          coeffs3D.x1x2 * targetInput * targetOutput +
          coeffs3D.x1x3 * targetInput * targetTraffic +
          coeffs3D.x2x3 * targetOutput * targetTraffic
        );
      } else {
        const coeffs = this.fitPolynomialModel(benchmarks, metric);
        predictions[metric] = Math.max(0, 
          coeffs.intercept + 
          coeffs.x1 * targetInput + 
          coeffs.x2 * targetOutput +
          coeffs.x1_sq * targetInput * targetInput +
          coeffs.x2_sq * targetOutput * targetOutput +
          coeffs.x1x2 * targetInput * targetOutput
        );
      }
    }

    // Predict throughput using 3D regression if traffic_level is provided
    if (targetTraffic !== undefined) {
      const throughputCoeffs3D = this.fitPolynomialModel3D(benchmarks, 'throughput');
      predictions.throughput = Math.max(0,
        throughputCoeffs3D.intercept +
        throughputCoeffs3D.x1 * targetInput +
        throughputCoeffs3D.x2 * targetOutput +
        throughputCoeffs3D.x3 * targetTraffic +
        throughputCoeffs3D.x1_sq * targetInput * targetInput +
        throughputCoeffs3D.x2_sq * targetOutput * targetOutput +
        throughputCoeffs3D.x3_sq * targetTraffic * targetTraffic +
        throughputCoeffs3D.x1x2 * targetInput * targetOutput +
        throughputCoeffs3D.x1x3 * targetInput * targetTraffic +
        throughputCoeffs3D.x2x3 * targetOutput * targetTraffic
      );
    } else {
      // Fall back to 2D regression if no traffic level specified
      const throughputCoeffs = this.fitPolynomialModel(benchmarks, 'throughput');
      predictions.throughput = Math.max(0, 
        throughputCoeffs.intercept + 
        throughputCoeffs.x1 * targetInput + 
        throughputCoeffs.x2 * targetOutput +
        throughputCoeffs.x1_sq * targetInput * targetInput +
        throughputCoeffs.x2_sq * targetOutput * targetOutput +
        throughputCoeffs.x1x2 * targetInput * targetOutput
      );
    }

    // Calculate E2E mean mechanistically ONLY if we don't have traffic level
    // When traffic_level is provided, use the 3D regression for E2E (more accurate with queuing)
    if (!use3D) {
      this.calculateE2EMeanMechanistically(predictions, targetOutput);
    }

    return predictions;
  }

  private performMultivariateInterpolation(
    benchmarks: any[],
    targetInput: number,
    targetOutput: number,
    targetTraffic?: number
  ): ModelingResult['predictions'] {
    // Simple multivariate linear regression: y = a + b*input + c*output
    const ttftMetrics = [
      'ttft_mean', 'ttft_stdev', 'ttft_p05', 'ttft_p50', 'ttft_p80', 'ttft_p95', 'ttft_p99', 'ttft_p999'
    ];
    const tpsMetrics = [
      'user_tps_mean', 'user_tps_stdev', 'user_tps_p05', 'user_tps_p50', 'user_tps_p80', 'user_tps_p95', 'user_tps_p99', 'user_tps_p999'
    ];
    // E2E metrics: when traffic_level is provided, predict all via regression (including mean)
    // When no traffic_level, predict percentiles/stdev via regression, but calculate mean mechanistically
    const e2eRegressionMetrics = [
      'e2e_stdev', 'e2e_p05', 'e2e_p50', 'e2e_p80', 'e2e_p95', 'e2e_p99', 'e2e_p999'
    ];

    const predictions: any = {};

    // Use 3D regression if traffic level is provided (captures queuing/batching effects)
    const use3D = targetTraffic !== undefined;
    
    // When using 3D, also predict E2E mean via regression (it captures queuing better than mechanistic)
    const e2eMetricsToPredict = use3D ? ['e2e_mean', ...e2eRegressionMetrics] : e2eRegressionMetrics;

    // Predict TTFT using 3D linear regression if traffic level provided
    for (const metric of ttftMetrics) {
      if (use3D) {
        const coeffs3D = this.fitLinearModel3D(benchmarks, metric);
        predictions[metric] = Math.max(0,
          coeffs3D.intercept +
          coeffs3D.x1Coeff * targetInput +
          coeffs3D.x2Coeff * targetOutput +
          coeffs3D.x3Coeff * targetTraffic
        );
      } else {
        const coeffs = this.fitLinearModel(benchmarks, metric);
        predictions[metric] = Math.max(0, 
          coeffs.intercept + 
          coeffs.inputCoeff * targetInput + 
          coeffs.outputCoeff * targetOutput
        );
      }
    }

    // Predict TPS using 3D linear regression if traffic level provided
    for (const metric of tpsMetrics) {
      if (use3D) {
        const coeffs3D = this.fitLinearModel3D(benchmarks, metric);
        predictions[metric] = Math.max(0,
          coeffs3D.intercept +
          coeffs3D.x1Coeff * targetInput +
          coeffs3D.x2Coeff * targetOutput +
          coeffs3D.x3Coeff * targetTraffic
        );
      } else {
        const coeffs = this.fitLinearModel(benchmarks, metric);
        predictions[metric] = Math.max(0, 
          coeffs.intercept + 
          coeffs.inputCoeff * targetInput + 
          coeffs.outputCoeff * targetOutput
        );
      }
    }

    // Predict E2E metrics using 3D linear regression if traffic level provided
    // When 3D: predict mean + percentiles + stdev (captures queuing at specific traffic level)
    // When 2D: predict only percentiles + stdev (mean calculated mechanistically)
    for (const metric of e2eMetricsToPredict) {
      if (use3D) {
        const coeffs3D = this.fitLinearModel3D(benchmarks, metric);
        predictions[metric] = Math.max(0,
          coeffs3D.intercept +
          coeffs3D.x1Coeff * targetInput +
          coeffs3D.x2Coeff * targetOutput +
          coeffs3D.x3Coeff * targetTraffic
        );
      } else {
        const coeffs = this.fitLinearModel(benchmarks, metric);
        predictions[metric] = Math.max(0, 
          coeffs.intercept + 
          coeffs.inputCoeff * targetInput + 
          coeffs.outputCoeff * targetOutput
        );
      }
    }

    // Predict throughput using 3D regression if traffic_level is provided
    if (targetTraffic !== undefined) {
      const throughputCoeffs3D = this.fitLinearModel3D(benchmarks, 'throughput');
      predictions.throughput = Math.max(0,
        throughputCoeffs3D.intercept +
        throughputCoeffs3D.x1Coeff * targetInput +
        throughputCoeffs3D.x2Coeff * targetOutput +
        throughputCoeffs3D.x3Coeff * targetTraffic
      );
    } else {
      // Fall back to 2D regression if no traffic level specified
      const throughputCoeffs = this.fitLinearModel(benchmarks, 'throughput');
      predictions.throughput = Math.max(0, 
        throughputCoeffs.intercept + 
        throughputCoeffs.inputCoeff * targetInput + 
        throughputCoeffs.outputCoeff * targetOutput
      );
    }

    // Calculate E2E mean mechanistically ONLY if we don't have traffic level
    // When traffic_level is provided, use the 3D regression for E2E (more accurate with queuing)
    if (!use3D) {
      this.calculateE2EMeanMechanistically(predictions, targetOutput);
    }

    return predictions;
  }

  /**
   * Calculate E2E mean latency mechanistically based on TTFT and TPS
   * E2E = TTFT + (output_tokens / TPS)
   * This is more accurate for the mean than regression because it follows the actual physics of LLM inference.
   * E2E percentiles are predicted via regression as they capture queuing and tail latency effects.
   */
  private calculateE2EMeanMechanistically(predictions: any, outputTokens: number): void {
    // Safety function to prevent division by zero or invalid values
    const safeDivide = (numerator: number, denominator: number, fallback: number = 0): number => {
      if (!denominator || denominator <= 0 || !isFinite(denominator)) {
        return fallback;
      }
      const result = numerator / denominator;
      return isFinite(result) ? result : fallback;
    };
    
    // Calculate E2E mean: TTFT (ms) + (output_tokens / TPS) * 1000
    const genTimeMs = safeDivide(outputTokens, predictions.user_tps_mean, outputTokens * 10) * 1000;
    predictions.e2e_mean = predictions.ttft_mean + genTimeMs;
    
    // Safety check: ensure E2E mean is valid
    if (!isFinite(predictions.e2e_mean) || predictions.e2e_mean < 0) {
      // Fallback: use a conservative estimate
      predictions.e2e_mean = predictions.ttft_mean + (outputTokens * 10); // Assume 100 tok/s if calculation fails
    }
  }

  private fitPolynomialModel(
    data: any[],
    targetMetric: string
  ): { intercept: number; x1: number; x2: number; x1_sq: number; x2_sq: number; x1x2: number } {
    const n = data.length;
    
    // Build matrices for polynomial regression
    // Features: [1, x1, x2, x1², x2², x1*x2]
    const X: number[][] = [];
    const y: number[] = [];

    for (const point of data) {
      const x1 = point.input_avg_len as number;
      const x2 = point.output_avg_len as number;
      const yVal = (point[targetMetric] as number) || 0;

      X.push([1, x1, x2, x1 * x1, x2 * x2, x1 * x2]);
      y.push(yVal);
    }

    // Solve using normal equations: (X'X)^-1 X'y
    // Simplified approach: use gradient descent approximation
    const coeffs = this.solvePolynomial(X, y);

    return {
      intercept: coeffs[0] || 0,
      x1: coeffs[1] || 0,
      x2: coeffs[2] || 0,
      x1_sq: coeffs[3] || 0,
      x2_sq: coeffs[4] || 0,
      x1x2: coeffs[5] || 0,
    };
  }

  private fitPolynomialModel3D(
    data: any[],
    targetMetric: string
  ): { intercept: number; x1: number; x2: number; x3: number; x1_sq: number; x2_sq: number; x3_sq: number; x1x2: number; x1x3: number; x2x3: number } {
    const n = data.length;
    
    // Build matrices for 3D polynomial regression
    // Features: [1, x1, x2, x3, x1², x2², x3², x1*x2, x1*x3, x2*x3]
    const X: number[][] = [];
    const y: number[] = [];

    for (const point of data) {
      const x1 = point.input_avg_len as number;
      const x2 = point.output_avg_len as number;
      const x3 = (point.traffic_level as number) || 0.5; // Default to 0.5 if missing
      const yVal = (point[targetMetric] as number) || 0;

      X.push([1, x1, x2, x3, x1*x1, x2*x2, x3*x3, x1*x2, x1*x3, x2*x3]);
      y.push(yVal);
    }

    // Solve using normal equations: (X'X)^-1 X'y
    const coeffs = this.solvePolynomial(X, y);

    return {
      intercept: coeffs[0] || 0,
      x1: coeffs[1] || 0,
      x2: coeffs[2] || 0,
      x3: coeffs[3] || 0,
      x1_sq: coeffs[4] || 0,
      x2_sq: coeffs[5] || 0,
      x3_sq: coeffs[6] || 0,
      x1x2: coeffs[7] || 0,
      x1x3: coeffs[8] || 0,
      x2x3: coeffs[9] || 0,
    };
  }

  private solvePolynomial(X: number[][], y: number[]): number[] {
    // Simple least squares solution using normal equations
    const n = X.length;
    const m = X[0].length;

    // Initialize coefficients
    const coeffs = new Array(m).fill(0);

    // Calculate X'X and X'y
    const XtX: number[][] = Array(m).fill(0).map(() => Array(m).fill(0));
    const Xty: number[] = Array(m).fill(0);

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        for (let k = 0; k < n; k++) {
          XtX[i][j] += X[k][i] * X[k][j];
        }
      }
      for (let k = 0; k < n; k++) {
        Xty[i] += X[k][i] * y[k];
      }
    }

    // Solve using Gauss-Seidel iteration (simple iterative solver)
    for (let iter = 0; iter < 100; iter++) {
      for (let i = 0; i < m; i++) {
        let sum = Xty[i];
        for (let j = 0; j < m; j++) {
          if (i !== j) {
            sum -= XtX[i][j] * coeffs[j];
          }
        }
        if (Math.abs(XtX[i][i]) > 1e-10) {
          coeffs[i] = sum / XtX[i][i];
        }
      }
    }

    return coeffs;
  }

  private fitLinearModel(
    data: any[],
    targetMetric: string
  ): { intercept: number; inputCoeff: number; outputCoeff: number } {
    const n = data.length;
    
    let sumX1 = 0, sumX2 = 0, sumY = 0;
    let sumX1X1 = 0, sumX2X2 = 0, sumX1X2 = 0;
    let sumX1Y = 0, sumX2Y = 0;

    for (const point of data) {
      const x1 = point.input_avg_len as number;
      const x2 = point.output_avg_len as number;
      const y = (point[targetMetric] as number) || 0;

      sumX1 += x1;
      sumX2 += x2;
      sumY += y;
      sumX1X1 += x1 * x1;
      sumX2X2 += x2 * x2;
      sumX1X2 += x1 * x2;
      sumX1Y += x1 * y;
      sumX2Y += x2 * y;
    }

    // Solve normal equations using matrix algebra (simplified)
    const meanX1 = sumX1 / n;
    const meanX2 = sumX2 / n;
    const meanY = sumY / n;

    let varX1 = 0, varX2 = 0, covX1X2 = 0, covX1Y = 0, covX2Y = 0;

    for (const point of data) {
      const dx1 = (point.input_avg_len as number) - meanX1;
      const dx2 = (point.output_avg_len as number) - meanX2;
      const dy = ((point[targetMetric] as number) || 0) - meanY;

      varX1 += dx1 * dx1;
      varX2 += dx2 * dx2;
      covX1X2 += dx1 * dx2;
      covX1Y += dx1 * dy;
      covX2Y += dx2 * dy;
    }

    // Compute coefficients (simplified - avoiding full matrix inversion)
    const denom = varX1 * varX2 - covX1X2 * covX1X2;
    
    let inputCoeff = 0, outputCoeff = 0;
    
    if (Math.abs(denom) > 1e-10) {
      inputCoeff = (covX1Y * varX2 - covX2Y * covX1X2) / denom;
      outputCoeff = (covX2Y * varX1 - covX1Y * covX1X2) / denom;
    } else {
      // Fallback to simple averaging if matrix is singular
      inputCoeff = varX1 > 0 ? covX1Y / varX1 : 0;
      outputCoeff = varX2 > 0 ? covX2Y / varX2 : 0;
    }

    const intercept = meanY - inputCoeff * meanX1 - outputCoeff * meanX2;

    return { intercept, inputCoeff, outputCoeff };
  }

  private fitLinearModel3D(
    data: any[],
    targetMetric: string
  ): { intercept: number; x1Coeff: number; x2Coeff: number; x3Coeff: number } {
    const n = data.length;
    
    // Build matrices for 3D linear regression
    // Features: [1, x1, x2, x3]
    const X: number[][] = [];
    const y: number[] = [];

    for (const point of data) {
      const x1 = point.input_avg_len as number;
      const x2 = point.output_avg_len as number;
      const x3 = (point.traffic_level as number) || 0.5; // Default to 0.5 if missing
      const yVal = (point[targetMetric] as number) || 0;

      X.push([1, x1, x2, x3]);
      y.push(yVal);
    }

    // Solve using normal equations: (X'X)^-1 X'y
    const coeffs = this.solvePolynomial(X, y);

    return {
      intercept: coeffs[0] || 0,
      x1Coeff: coeffs[1] || 0,
      x2Coeff: coeffs[2] || 0,
      x3Coeff: coeffs[3] || 0,
    };
  }

  private calculateConfidence(
    benchmarks: any[],
    targetInput: number,
    targetOutput: number
  ): 'high' | 'medium' | 'low' {
    // Calculate normalized distance to nearest benchmark
    const inputRange = Math.max(...benchmarks.map(b => b.input_avg_len as number)) - 
                       Math.min(...benchmarks.map(b => b.input_avg_len as number));
    const outputRange = Math.max(...benchmarks.map(b => b.output_avg_len as number)) - 
                        Math.min(...benchmarks.map(b => b.output_avg_len as number));

    let minDistance = Infinity;

    for (const benchmark of benchmarks) {
      const inputDist = inputRange > 0 ? Math.abs((benchmark.input_avg_len as number) - targetInput) / inputRange : 0;
      const outputDist = outputRange > 0 ? Math.abs((benchmark.output_avg_len as number) - targetOutput) / outputRange : 0;
      const distance = Math.sqrt(inputDist * inputDist + outputDist * outputDist);
      minDistance = Math.min(minDistance, distance);
    }

    // Check if we're interpolating or extrapolating
    const minInput = Math.min(...benchmarks.map(b => b.input_avg_len as number));
    const maxInput = Math.max(...benchmarks.map(b => b.input_avg_len as number));
    const minOutput = Math.min(...benchmarks.map(b => b.output_avg_len as number));
    const maxOutput = Math.max(...benchmarks.map(b => b.output_avg_len as number));

    const isExtrapolating = targetInput < minInput || targetInput > maxInput ||
                           targetOutput < minOutput || targetOutput > maxOutput;

    if (minDistance < 0.1 && !isExtrapolating) {
      return 'high';
    } else if (minDistance < 0.3 || !isExtrapolating) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get all unique models that have benchmark data (no minimum requirement)
   */
  async getModelsAvailableForModeling(): Promise<string[]> {
    const db = await getDatabase();
    const stmt = db.prepare(`
      SELECT DISTINCT provider_model
      FROM benchmarks
      ORDER BY provider_model
    `);

    const results: string[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      results.push(row.provider_model);
    }
    
    stmt.free();
    return results;
  }
}
