import React, { useState } from 'react'
import * as RadioGroup from '@radix-ui/react-radio-group'
import MoveList from './MoveList'

export interface Move {
  id: string
  name: string
  moveType: number // -100 to 100: -100 = fully static, 0 = neutral, 100 = fully dynamic
  isCrux: boolean
}

interface ManualBoulderCreatorProps {
  onBack: () => void
  isControlPanelVisible?: boolean
}

export function ManualBoulderCreator({ onBack, isControlPanelVisible = true }: ManualBoulderCreatorProps) {
  const [boulderName, setBoulderName] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [gradeSystem, setGradeSystem] = useState<'V' | 'Font' | 'YDS'>('V')
  const [routeSetter, setRouteSetter] = useState('')
  const [numberOfMoves, setNumberOfMoves] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [betaInsight, setBetaInsight] = useState('')
  const [moves, setMoves] = useState<Move[]>([
    { id: '1', name: 'Describe the move', moveType: 0, isCrux: false }
  ])
  
  // Grade systems
  const gradeSystems = {
    V: {
      name: 'V-Scale',
      grades: ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17']
    },
    Font: {
      name: 'Font',
      grades: ['3', '4', '4+', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C', '8C+']
    },
    YDS: {
      name: 'YDS',
      grades: ['5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a']
    }
  }

  const addMove = () => {
    const newMove: Move = {
      id: Date.now().toString(),
      name: 'Describe the move',
      moveType: 0,
      isCrux: false
    }
    setMoves([...moves, newMove])
  }

  const updateMove = (id: string, updates: Partial<Move>) => {
    setMoves(moves.map(move => 
      move.id === id ? { ...move, ...updates } : move
    ))
  }

  const deleteMove = (id: string) => {
    setMoves(moves.filter(move => move.id !== id))
  }

  const saveBoulder = () => {
    const boulderData = {
      name: boulderName,
      grade: selectedGrade,
      moves: moves,
      createdAt: new Date().toISOString()
    }
    
    console.log('Saving boulder:', boulderData)
    // Here you would typically save to your data store
    onBack() // Navigate back after saving
  }

  const canSave = boulderName.trim() && selectedGrade && moves.length > 0

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 to-black">
      <div className={`h-full flex items-center justify-center transition-all duration-300 ${
        isControlPanelVisible ? 'pr-[25rem]' : 'pr-0'
      }`}>
        <div className="w-full max-w-5xl mx-auto p-8 h-full flex flex-col">
          {/* Header with back button */}
          <div className="flex items-center mb-6">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-black/50 hover:bg-black/70 text-cyan-400 rounded-lg transition-all text-sm font-medium border border-cyan-400/40 mr-6"
            >
              ← Back
            </button>
            <div className="flex-1">
              <h1 className="text-white tracking-light text-3xl font-bold leading-tight">
                Add Boulder Manually
              </h1>
              <p className="text-gray-400 text-base mt-1">
                Create a custom boulder with moves and difficulty settings
              </p>
            </div>
          </div>

          {/* Boulder Info Fields */}
          <div className="mb-6 bg-black/50 border border-cyan-400/40 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">Boulder Information</h3>
            
            {/* Boulder Name - First field with 80% width */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                Type the name *
              </label>
              <input
                type="text"
                value={boulderName}
                onChange={(e) => setBoulderName(e.target.value)}
                placeholder="Enter boulder name (e.g., 'Crimpy Corner', 'Overhang Beast')"
                className="w-4/5 px-4 py-3 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none text-lg overflow-hidden text-ellipsis whitespace-nowrap"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                  Route Setter
                </label>
                <input
                  type="text"
                  value={routeSetter}
                  onChange={(e) => setRouteSetter(e.target.value)}
                  placeholder="Who set this route?"
                  className="w-full px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                  Grade
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="flex-1 px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="" className="bg-black text-cyan-400">Select grade...</option>
                    {gradeSystems[gradeSystem].grades.map((grade) => (
                      <option key={grade} value={grade} className="bg-black text-cyan-400">
                        {grade}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const systems: ('V' | 'Font' | 'YDS')[] = ['V', 'Font', 'YDS']
                      const currentIndex = systems.indexOf(gradeSystem)
                      const nextIndex = (currentIndex + 1) % systems.length
                      setGradeSystem(systems[nextIndex])
                      setSelectedGrade('') // Reset grade when changing system
                    }}
                    className="px-3 py-2 bg-cyan-400/20 border border-cyan-400/40 text-cyan-400 rounded-lg hover:bg-cyan-400/30 transition-all text-sm font-medium whitespace-nowrap"
                    title="Switch grade system"
                  >
                    {gradeSystems[gradeSystem].name}
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                  Number of Moves
                </label>
                <input
                  type="number"
                  value={numberOfMoves}
                  onChange={(e) => setNumberOfMoves(e.target.value)}
                  placeholder="Total moves"
                  className="w-full px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                Beta Insight
              </label>
              <textarea
                value={betaInsight}
                onChange={(e) => setBetaInsight(e.target.value)}
                placeholder="Key tips for climbing this boulder..."
                rows={2}
                className="w-full px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-black/70 border border-cyan-400/40 rounded-2xl backdrop-blur-sm overflow-hidden">
            <div className="h-full p-6 flex flex-col">
              
              {/* Moves Section */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-cyan-400">Boulder Moves</h3>
                  <span className="text-sm text-gray-400">{moves.length} moves</span>
                </div>
                
                <MoveList
                  moves={moves}
                  onAddMove={addMove}
                  onUpdateMove={updateMove}
                  onDeleteMove={deleteMove}
                />
              </div>

              {/* Save Button */}
              <div className="mt-6 pt-4 border-t border-cyan-400/20">
                <button
                  onClick={saveBoulder}
                  disabled={!boulderName.trim() || moves.length === 0}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                    boulderName.trim() && moves.length > 0
                      ? 'bg-green-400/20 text-green-400 hover:bg-green-400/30 border border-green-400/40'
                      : 'bg-gray-600/20 text-gray-500 cursor-not-allowed border border-gray-600/40'
                  }`}
                >
                  💾 Save Boulder to Library
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 