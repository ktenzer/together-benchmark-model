import { useEffect, useState } from 'react'
import { api, ModelingResult } from '../api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type MetricType = 'ttft' | 'user_tps' | 'e2e'
type PercentileType = 'mean' | 'stdev' | 'p05' | 'p50' | 'p80' | 'p95' | 'p99' | 'p999'

export default function ModelingPage() {
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [inputTokens, setInputTokens] = useState('')
  const [outputTokens, setOutputTokens] = useState('')
  const [trafficLevel, setTrafficLevel] = useState('')
  const [result, setResult] = useState<ModelingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [predictionMethod, setPredictionMethod] = useState<string>('auto_detect')
  
  // Metric and percentile selection
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(['ttft', 'user_tps', 'e2e'])
  const [selectedPercentiles, setSelectedPercentiles] = useState<PercentileType[]>(['p50', 'p95', 'p99'])

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const data = await api.getModelingModels()
      setModels(data)
      if (data.length > 0) {
        setSelectedModel(data[0])
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  const handlePredict = async () => {
    if (!selectedModel || !inputTokens || !outputTokens) {
      setError('Please fill in all fields')
      return
    }

    const input = Number(inputTokens)
    const output = Number(outputTokens)
    const traffic = trafficLevel ? Number(trafficLevel) : undefined

    if (isNaN(input) || isNaN(output) || input <= 0 || output <= 0) {
      setError('Please enter valid positive numbers')
      return
    }

    if (traffic !== undefined && (isNaN(traffic) || traffic <= 0)) {
      setError('Please enter a valid positive number for traffic level')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await api.predictPerformance(selectedModel, input, output, predictionMethod, traffic)
      setResult(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to predict performance')
    } finally {
      setLoading(false)
    }
  }

  const getMethodName = (method: string) => {
    const names: Record<string, string> = {
      'polynomial_regression': '📐 Polynomial Regression',
      'multivariate_linear': '📊 Linear Regression',
      'simple_average': '📈 Simple Average',
      'auto_linear': '🎯 Auto-Detected: Linear Regression',
      'auto_polynomial': '🎯 Auto-Detected: Polynomial Regression',
      'auto_simple_average': '🎯 Auto-Detected: Simple Average',
    }
    return names[method] || method
  }

  const handleExport = async () => {
    if (!result) return
    
    setExporting(true)
    try {
      await api.exportPrediction(result)
    } catch (err: any) {
      alert('Failed to export prediction')
    } finally {
      setExporting(false)
    }
  }

  const toggleMetric = (metric: MetricType) => {
    setSelectedMetrics(prev =>
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    )
  }

  const togglePercentile = (percentile: PercentileType) => {
    setSelectedPercentiles(prev =>
      prev.includes(percentile) ? prev.filter(p => p !== percentile) : [...prev, percentile]
    )
  }

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[confidence as keyof typeof colors] || colors.low
  }

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(2)} ms`
    return `${(ms / 1000).toFixed(2)} s`
  }

  const getChartData = (metric: MetricType) => {
    if (!result) return []
    
    const p = result.predictions
    const data: any[] = []

    if (selectedPercentiles.includes('mean')) {
      data.push({ name: 'Mean', value: (p as any)[`${metric}_mean`] })
    }
    if (selectedPercentiles.includes('stdev')) {
      data.push({ name: 'Stdev', value: (p as any)[`${metric}_stdev`] })
    }
    if (selectedPercentiles.includes('p05')) {
      data.push({ name: 'P05', value: (p as any)[`${metric}_p05`] })
    }
    if (selectedPercentiles.includes('p50')) {
      data.push({ name: 'P50', value: (p as any)[`${metric}_p50`] })
    }
    if (selectedPercentiles.includes('p80')) {
      data.push({ name: 'P80', value: (p as any)[`${metric}_p80`] })
    }
    if (selectedPercentiles.includes('p95')) {
      data.push({ name: 'P95', value: (p as any)[`${metric}_p95`] })
    }
    if (selectedPercentiles.includes('p99')) {
      data.push({ name: 'P99', value: (p as any)[`${metric}_p99`] })
    }
    if (selectedPercentiles.includes('p999')) {
      data.push({ name: 'P999', value: (p as any)[`${metric}_p999`] })
    }

    return data
  }

  const getMetricName = (metric: MetricType) => {
    const names = {
      ttft: 'Time to First Token (TTFT)',
      user_tps: 'User Throughput (TPS)',
      e2e: 'End-to-End Latency',
    }
    return names[metric]
  }

  const getMetricColor = (metric: MetricType) => {
    const colors = {
      ttft: '#8b5cf6',
      user_tps: '#10b981',
      e2e: '#f59e0b',
    }
    return colors[metric]
  }

  const getMetricUnit = (metric: MetricType) => {
    const units = {
      ttft: 'milliseconds',
      user_tps: 'tokens/second',
      e2e: 'milliseconds',
    }
    return units[metric]
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="card mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Performance Modeling</h2>
        <p className="text-gray-600 mb-8">
          Predict model performance based on input and output token sizes using historical benchmark data.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="input-field"
              disabled={models.length === 0}
            >
              {models.length === 0 ? (
                <option>No models available</option>
              ) : (
                models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Input Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Input Tokens
            </label>
            <input
              type="number"
              value={inputTokens}
              onChange={(e) => setInputTokens(e.target.value)}
              placeholder="e.g., 1024"
              className="input-field"
              min="1"
            />
          </div>

          {/* Output Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Output Tokens
            </label>
            <input
              type="number"
              value={outputTokens}
              onChange={(e) => setOutputTokens(e.target.value)}
              placeholder="e.g., 256"
              className="input-field"
              min="1"
            />
          </div>

          {/* Traffic Level (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Traffic Level (QPS/Concurrency) 
              <span className="text-gray-500 text-xs ml-1">(Optional - improves system throughput accuracy)</span>
            </label>
            <input
              type="number"
              value={trafficLevel}
              onChange={(e) => setTrafficLevel(e.target.value)}
              placeholder="e.g., 0.5 (QPS) or 10 (concurrency)"
              className="input-field"
              step="0.1"
              min="0"
            />
          </div>

          {/* Prediction Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prediction Method
            </label>
            <select
              value={predictionMethod}
              onChange={(e) => setPredictionMethod(e.target.value)}
              className="input-field"
            >
              <option value="auto_detect">🎯 Auto-Detect (Recommended)</option>
              <option value="polynomial">📐 Polynomial Regression</option>
              <option value="linear">📊 Linear Regression</option>
              <option value="average">📈 Simple Average</option>
            </select>
          </div>
        </div>

        <button
          onClick={handlePredict}
          disabled={loading || models.length === 0}
          className={`btn-primary w-full ${
            loading || models.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Calculating...' : 'Predict Performance'}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {models.length === 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
            No models available for modeling. Upload some benchmark data first!
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Info Banner */}
          {result.num_benchmarks_used < 3 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold text-yellow-900">Limited Benchmark Data</h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    Only {result.num_benchmarks_used} benchmark{result.num_benchmarks_used === 1 ? '' : 's'} available.
                    {result.num_benchmarks_used === 1 && (
                      <> Statistical methods (linear/polynomial) cannot be used with a single benchmark. Using {result.interpolation_method.includes('llm') ? 'LLM' : 'simple averaging'} instead.</>
                    )}
                    {result.num_benchmarks_used === 2 && (
                      <> Polynomial regression requires 3+ benchmarks. Using linear methods instead.</>
                    )}
                    {' '}Upload more benchmarks with varying input/output token configurations for better accuracy.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
              <div className="text-sm text-blue-600 font-medium mb-1">Prediction Method</div>
              <div className="text-sm font-bold text-blue-900">
                {getMethodName(result.interpolation_method)}
              </div>
              <div
                className={`mt-2 inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getConfidenceBadge(
                  result.confidence
                )}`}
              >
                {result.confidence.toUpperCase()} confidence
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
              <div className="text-sm text-green-600 font-medium mb-1">Benchmarks Used</div>
              <div className="text-3xl font-bold text-green-900">{result.num_benchmarks_used}</div>
            </div>

            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
              <div className="text-sm text-purple-600 font-medium mb-1">Avg TTFT</div>
              <div className="text-2xl font-bold text-purple-900">
                {formatLatency(result.predictions.ttft_mean)}
              </div>
            </div>

            <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
              <div className="text-sm text-orange-600 font-medium mb-1">Throughput</div>
              <div className="text-2xl font-bold text-orange-900">
                {result.predictions.throughput.toFixed(2)} TPS
              </div>
            </div>
          </div>

          {/* Prediction Breakdown - if ensemble method */}
          {result.breakdown && result.breakdown.length > 1 && (
            <div className="card mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Ensemble Method Breakdown</h3>
              <p className="text-sm text-gray-600 mb-4">
                Multiple prediction methods are combined using weighted averaging for improved accuracy.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.breakdown.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800">{item.method}</span>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        {(item.weight * 100).toFixed(0)}% weight
                      </span>
                    </div>
                    <div className="text-xs space-y-1 text-gray-600">
                      <div>TTFT p50: {item.predictions.ttft_p50?.toFixed(2)} ms</div>
                      <div>TPS p50: {item.predictions.user_tps_p50?.toFixed(2)} tok/s</div>
                      <div>E2E p50: {item.predictions.e2e_p50?.toFixed(2)} ms</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-green-800">
                    <strong>Ensemble Advantage:</strong> Combining multiple methods reduces individual model bias and typically provides 15-30% better accuracy than any single method.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="mb-8 flex justify-end">
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`btn-primary ${exporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {exporting ? 'Exporting...' : '📥 Export as CSV'}
            </button>
          </div>

          {/* Metric and Percentile Selection */}
          <div className="card mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Display Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Metric Selection */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Metrics to Display</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes('ttft')}
                      onChange={() => toggleMetric('ttft')}
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Time to First Token (TTFT)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes('user_tps')}
                      onChange={() => toggleMetric('user_tps')}
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">User Throughput (TPS)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes('e2e')}
                      onChange={() => toggleMetric('e2e')}
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">End-to-End Latency</span>
                  </label>
                </div>
              </div>

              {/* Percentile Selection */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Percentiles to Display</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(['mean', 'stdev', 'p05', 'p50', 'p80', 'p95', 'p99', 'p999'] as PercentileType[]).map((p) => (
                    <label key={p} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedPercentiles.includes(p)}
                        onChange={() => togglePercentile(p)}
                        className="mr-2 h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-sm">{p.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Charts */}
          {selectedMetrics.map((metric) => (
            <div key={metric} className="card mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6">{getMetricName(metric)}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={getChartData(metric)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: getMetricUnit(metric), angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    formatter={(value: number) =>
                      metric === 'user_tps' ? value.toFixed(2) : formatLatency(value)
                    }
                  />
                  <Bar dataKey="value" fill={getMetricColor(metric)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}

          {/* Detailed Metrics Table */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Detailed Metrics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Metric
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Mean
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Stdev
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      P05
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      P50
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      P80
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      P95
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      P99
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      P999
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      TTFT (ms)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.ttft_mean.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.ttft_stdev.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.ttft_p05.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.ttft_p50.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.ttft_p80.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.ttft_p95.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.ttft_p99.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.ttft_p999.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      User TPS
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.user_tps_mean.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.user_tps_stdev.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.user_tps_p05.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.user_tps_p50.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.user_tps_p80.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.user_tps_p95.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.user_tps_p99.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.user_tps_p999.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      E2E Latency (ms)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.e2e_mean.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.e2e_stdev.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.e2e_p05.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.e2e_p50.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.e2e_p80.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.e2e_p95.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.e2e_p99.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.predictions.e2e_p999.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
