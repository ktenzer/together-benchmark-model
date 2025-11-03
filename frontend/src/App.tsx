import { Routes, Route, Link, useLocation } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import ModelsPage from './pages/ModelsPage'
import ModelingPage from './pages/ModelingPage'

function App() {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
      ? 'bg-blue-700'
      : 'hover:bg-blue-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              <h1 className="text-xl font-bold">LLM Benchmark Modeling</h1>
            </div>
            <div className="flex space-x-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg transition-colors ${isActive('/')}`}
              >
                Upload
              </Link>
              <Link
                to="/models"
                className={`px-4 py-2 rounded-lg transition-colors ${isActive('/models')}`}
              >
                Models
              </Link>
              <Link
                to="/modeling"
                className={`px-4 py-2 rounded-lg transition-colors ${isActive('/modeling')}`}
              >
                Modeling
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/modeling" element={<ModelingPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600">
          <p>LLM Benchmark Modeling Tool - Analyze and predict model performance</p>
        </div>
      </footer>
    </div>
  )
}

export default App

