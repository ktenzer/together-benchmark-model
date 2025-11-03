import { useState } from 'react'
import { api } from '../api'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setMessage(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first' })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      const result = await api.uploadBenchmark(file)
      setMessage({
        type: 'success',
        text: `Successfully uploaded ${result.rows_inserted} benchmark runs!`,
      })
      setFile(null)
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to upload benchmark',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Upload Benchmark Data</h2>
        <p className="text-gray-600 mb-8">
          Upload a CSV file containing benchmark results. The file should include metrics like input/output
          token lengths, TTFT, throughput, and end-to-end latency.
        </p>

        <div className="space-y-6">
          {/* File Input */}
          <div>
            <label
              htmlFor="file-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select CSV File
            </label>
            <div className="flex items-center space-x-4">
              <input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`btn-primary ${
                  (!file || uploading) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* File Preview */}
          {file && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-700 mb-2">Selected File:</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <button
                  onClick={() => {
                    setFile(null)
                    const fileInput = document.getElementById('file-input') as HTMLInputElement
                    if (fileInput) fileInput.value = ''
                  }}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CSV Format Help */}
        <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">CSV Format Requirements</h3>
          <p className="text-sm text-blue-800 mb-2">
            Your CSV file should include the following columns:
          </p>
          <ul className="text-sm text-blue-800 space-y-1 ml-4">
            <li>• <code className="bg-blue-100 px-1 rounded">provider_name</code> - Provider name</li>
            <li>• <code className="bg-blue-100 px-1 rounded">provider_model</code> - Model name</li>
            <li>• <code className="bg-blue-100 px-1 rounded">input_avg_len</code> - Average input token length</li>
            <li>• <code className="bg-blue-100 px-1 rounded">output_avg_len</code> - Average output token length</li>
            <li>• <code className="bg-blue-100 px-1 rounded">ttft_mean</code>, <code className="bg-blue-100 px-1 rounded">ttft_p50</code>, etc. - Time to first token metrics</li>
            <li>• <code className="bg-blue-100 px-1 rounded">user_tps_mean</code>, <code className="bg-blue-100 px-1 rounded">e2e_mean</code> - Performance metrics</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

