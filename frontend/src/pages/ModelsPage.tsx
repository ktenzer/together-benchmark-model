import { useEffect, useState } from 'react'
import { api, ModelSummary, BenchmarkSummary } from '../api'

export default function ModelsPage() {
  const [models, setModels] = useState<ModelSummary[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [benchmarks, setBenchmarks] = useState<BenchmarkSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      setLoading(true)
      const data = await api.getModels()
      setModels(data)
    } catch (error) {
      console.error('Failed to load models:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBenchmarks = async (model: string) => {
    try {
      setSelectedModel(model)
      const data = await api.getBenchmarks(model)
      setBenchmarks(data)
    } catch (error) {
      console.error('Failed to load benchmarks:', error)
    }
  }

  const handleDelete = async (benchmarkId: string) => {
    if (!confirm('Are you sure you want to delete this benchmark?')) {
      return
    }

    try {
      setDeleting(benchmarkId)
      await api.deleteBenchmark(benchmarkId)
      // Reload data
      await loadModels()
      if (selectedModel) {
        await loadBenchmarks(selectedModel)
      }
    } catch (error) {
      console.error('Failed to delete benchmark:', error)
      alert('Failed to delete benchmark')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="card mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Models Overview</h2>
        
        {models.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No models found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by uploading your first benchmark CSV file.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => (
              <div
                key={model.provider_model}
                className="border border-gray-200 rounded-lg p-5 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                onClick={() => loadBenchmarks(model.provider_model)}
              >
                <h3 className="font-semibold text-lg text-gray-800 mb-3 truncate">
                  {model.provider_model}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Benchmarks:</span>
                    <span className="font-medium">{model.num_benchmarks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Runs:</span>
                    <span className="font-medium">{model.num_runs}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="text-gray-600 mb-1">Input Tokens:</div>
                    <div className="font-medium text-blue-600">
                      {model.input_token_range.min.toFixed(0)} - {model.input_token_range.max.toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Output Tokens:</div>
                    <div className="font-medium text-green-600">
                      {model.output_token_range.min.toFixed(0)} - {model.output_token_range.max.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Benchmarks Detail */}
      {selectedModel && benchmarks.length > 0 && (
        <div className="card">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Benchmarks for {selectedModel}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Benchmark ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Runs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Input
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Output
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {benchmarks.map((benchmark) => (
                  <tr key={benchmark.benchmark_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {benchmark.benchmark_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(benchmark.upload_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {benchmark.num_runs}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {benchmark.avg_input_tokens.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {benchmark.avg_output_tokens.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(benchmark.benchmark_id)
                        }}
                        disabled={deleting === benchmark.benchmark_id}
                        className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
                      >
                        {deleting === benchmark.benchmark_id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

