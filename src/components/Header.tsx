import React from 'react'

interface HeaderProps {
  currentView: 'visualizer' | 'add-boulder' | 'dataviz';
  onViewChange: (view: 'visualizer' | 'add-boulder' | 'dataviz') => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  return (
    <header className="h-16 bg-black border-b border-gray-800 flex items-center justify-between px-6 relative z-50">
      <div className="flex items-center space-x-4">
        <h1 className="text-white text-xl font-bold">Climbing Visualizer</h1>
        <nav className="flex space-x-4">
          <button
            onClick={() => onViewChange('visualizer')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentView === 'visualizer'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            🧗 Visualizer
          </button>
          <button
            onClick={() => onViewChange('dataviz')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentView === 'dataviz'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            📊 Data Analysis
          </button>
          <button
            onClick={() => onViewChange('add-boulder')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentView === 'add-boulder'
                ? 'bg-green-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            ➕ Add Boulder
          </button>
        </nav>
      </div>
    </header>
  )
} 