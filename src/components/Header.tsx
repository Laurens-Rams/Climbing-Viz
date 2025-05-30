import React from 'react'

interface HeaderProps {
  currentView: 'visualizer' | 'add-boulder' | 'dataviz';
  onViewChange: (view: 'visualizer' | 'add-boulder' | 'dataviz') => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  return (
    <header className="h-20 bg-black/70 border-b border-cyan-400/40 flex items-center justify-between px-8 relative z-50 backdrop-blur-sm">
      <div className="flex items-center space-x-6">
        <h1 className="text-white text-2xl font-bold">Climbing Visualizer</h1>
        <nav className="flex space-x-4">
          <button
            onClick={() => onViewChange('visualizer')}
            className={`px-6 py-3 rounded-xl transition-all duration-200 font-medium ${
              currentView === 'visualizer'
                ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50 border border-transparent hover:border-gray-600'
            }`}
          >
            🧗 Visualizer
          </button>
          <button
            onClick={() => onViewChange('dataviz')}
            className={`px-6 py-3 rounded-xl transition-all duration-200 font-medium ${
              currentView === 'dataviz'
                ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50 border border-transparent hover:border-gray-600'
            }`}
          >
            📊 Data Analysis
          </button>
          <button
            onClick={() => onViewChange('add-boulder')}
            className={`px-6 py-3 rounded-xl transition-all duration-200 font-medium ${
              currentView === 'add-boulder'
                ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50 border border-transparent hover:border-gray-600'
            }`}
          >
            ➕ Add Boulder
          </button>
        </nav>
      </div>
    </header>
  )
} 