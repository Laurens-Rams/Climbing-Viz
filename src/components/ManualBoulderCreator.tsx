import React, { useState, useRef, useLayoutEffect } from 'react'
import * as RadioGroup from '@radix-ui/react-radio-group'
import MoveList from './MoveList'
import { MoveItem } from './MoveList'

export interface Move {
  id: string
  name: string
  moveType: number // -100 to 100: -100 = fully static, 0 = neutral, 100 = fully dynamic
  isCrux: boolean
  color?: string // Color for regular moves
  cruxColor?: string // Color for crux moves
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
  const [boulderInfoOpen, setBoulderInfoOpen] = useState(true)
  
  const headerRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  const buttonRowRef = useRef<HTMLDivElement>(null)
  const [movesListHeight, setMovesListHeight] = useState<number | undefined>(undefined)

  // Dynamically calculate moves list height
  useLayoutEffect(() => {
    function updateHeight() {
      const headerH = headerRef.current?.offsetHeight || 0
      const infoH = boulderInfoOpen ? infoRef.current?.offsetHeight || 0 : 0
      const buttonRowH = buttonRowRef.current?.offsetHeight || 0
      // Subtract an extra 64px (4rem) for margin
      const available = window.innerHeight - headerH - infoH - buttonRowH
      setMovesListHeight(available > 0 ? available : 0)
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [boulderInfoOpen])

  // Grade systems data with conversion mappings (from PhyphoxTutorial)
  const gradeSystems = {
    V: { name: 'V-Scale', grades: ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'] },
    Font: { name: 'French', grades: ['3', '4', '4+', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C', '8C+', '9A'] },
    YDS: { name: 'YDS', grades: ['5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a'] }
  }

  // Grade conversion mapping (from PhyphoxTutorial)
  const gradeConversions: Record<string, Record<string, string>> = {
    // V-Scale to others
    'VB': { Font: '4', YDS: '5.6' },
    'V0': { Font: '4+', YDS: '5.7' },
    'V1': { Font: '5+', YDS: '5.8' },
    'V2': { Font: '6A', YDS: '5.9' },
    'V3': { Font: '6A+', YDS: '5.10a' },
    'V4': { Font: '6B+', YDS: '5.10d' },
    'V5': { Font: '6C+', YDS: '5.11b' },
    'V6': { Font: '7A', YDS: '5.11d' },
    'V7': { Font: '7A+', YDS: '5.12a' },
    'V8': { Font: '7B+', YDS: '5.12c' },
    'V9': { Font: '7C', YDS: '5.13a' },
    'V10': { Font: '7C+', YDS: '5.13c' },
    'V11': { Font: '8A', YDS: '5.14a' },
    'V12': { Font: '8A+', YDS: '5.14b' },
    'V13': { Font: '8B', YDS: '5.14c' },
    'V14': { Font: '8B+', YDS: '5.14d' },
    'V15': { Font: '8C', YDS: '5.15a' },
    
    // French to others
    '4': { V: 'VB', YDS: '5.6' },
    '4+': { V: 'V0', YDS: '5.7' },
    '5+': { V: 'V1', YDS: '5.8' },
    '6A': { V: 'V2', YDS: '5.9' },
    '6A+': { V: 'V3', YDS: '5.10a' },
    '6B+': { V: 'V4', YDS: '5.10d' },
    '6C+': { V: 'V5', YDS: '5.11b' },
    '7A': { V: 'V6', YDS: '5.11d' },
    '7A+': { V: 'V7', YDS: '5.12a' },
    '7B+': { V: 'V8', YDS: '5.12c' },
    '7C': { V: 'V9', YDS: '5.13a' },
    '7C+': { V: 'V10', YDS: '5.13c' },
    '8A': { V: 'V11', YDS: '5.14a' },
    '8A+': { V: 'V12', YDS: '5.14b' },
    '8B': { V: 'V13', YDS: '5.14c' },
    '8B+': { V: 'V14', YDS: '5.14d' },
    '8C': { V: 'V15', YDS: '5.15a' },
    
    // YDS to others
    '5.6': { V: 'VB', Font: '4' },
    '5.7': { V: 'V0', Font: '4+' },
    '5.8': { V: 'V1', Font: '5+' },
    '5.9': { V: 'V2', Font: '6A' },
    '5.10a': { V: 'V3', Font: '6A+' },
    '5.10d': { V: 'V4', Font: '6B+' },
    '5.11b': { V: 'V5', Font: '6C+' },
    '5.11d': { V: 'V6', Font: '7A' },
    '5.12a': { V: 'V7', Font: '7A+' },
    '5.12c': { V: 'V8', Font: '7B+' },
    '5.13a': { V: 'V9', Font: '7C' },
    '5.13c': { V: 'V10', Font: '7C+' },
    '5.14a': { V: 'V11', Font: '8A' },
    '5.14b': { V: 'V12', Font: '8A+' },
    '5.14c': { V: 'V13', Font: '8B' },
    '5.14d': { V: 'V14', Font: '8B+' },
    '5.15a': { V: 'V15', Font: '8C' }
  }

  const convertGrade = (currentGrade: string, fromSystem: string, toSystem: string): string => {
    if (!currentGrade || fromSystem === toSystem) return ''
    
    const conversion = gradeConversions[currentGrade]
    if (conversion && conversion[toSystem]) {
      return conversion[toSystem]
    }
    
    return '' // Reset if no conversion found
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
    <div className="h-screen relative">
      <div className={`h-full flex items-center justify-center transition-all duration-300 ${
        isControlPanelVisible ? 'pr-[25rem]' : 'pr-0'
      }`}>
        <div className="w-full max-w-5xl mx-auto p-8 h-full flex flex-col">
          {/* Header with back button, title, and save button */}
          <div ref={headerRef} className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="px-4 py-2 bg-black/50 hover:bg-black/70 text-cyan-400 rounded-lg transition-all text-sm font-medium border border-cyan-400/40 mr-6"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-white tracking-light text-3xl font-bold leading-tight">
                  Add Boulder Manually
                </h1>
                <p className="text-gray-400 text-base mt-1">
                  Create a custom boulder with moves and difficulty settings
                </p>
              </div>
            </div>
          </div>

          {/* Boulder Info Fields */}
          <div ref={infoRef} className="mb-6 bg-black/50 border border-cyan-400/40 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-cyan-400">Boulder Information</h3>
              <button
                onClick={() => setBoulderInfoOpen((open) => !open)}
                className="text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 rounded-lg px-3 py-1 text-xs font-medium hover:bg-cyan-400/20 transition-all"
                aria-expanded={boulderInfoOpen}
                aria-controls="boulder-info-fields"
              >
                {boulderInfoOpen ? 'Hide' : 'Show'} Info
              </button>
            </div>
            <div
              id="boulder-info-fields"
              className={`transition-all duration-300 overflow-hidden ${boulderInfoOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
            >
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
                        const nextSystem = systems[nextIndex]
                        
                        // Convert current grade to new system if possible
                        if (selectedGrade) {
                          const convertedGrade = convertGrade(selectedGrade, gradeSystem, nextSystem)
                          setSelectedGrade(convertedGrade)
                        }
                        
                        // Update grade system
                        setGradeSystem(nextSystem)
                        
                        console.log(`Grade system changed from ${gradeSystem} to ${nextSystem}`)
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
          </div>

          {/* Main Content */}
          <div
            className={`bg-black/70 rounded-2xl backdrop-blur-sm flex flex-col min-h-0 transition-all duration-500 ${boulderInfoOpen ? 'flex-1' : 'h-[60vh]'} overflow-hidden`}
          >
            <div className="flex-1 p-6 flex flex-col min-h-0">
              {/* Moves Section */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-cyan-400">Boulder Moves</h3>
                  <span className="text-sm text-gray-400">{moves.length} moves</span>
                </div>
                {/* Moves List - scrolls to bottom, no border below */}
                <div
                  className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0"
                  style={movesListHeight ? { height: movesListHeight } : {}}
                >
                  {moves.map((move, index) => (
                    <MoveItem
                      key={move.id}
                      move={move}
                      index={index}
                      onUpdate={(updates: Partial<Move>) => updateMove(move.id, updates)}
                      onDelete={() => deleteMove(move.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* Add Move + Save Boulder Buttons Row INSIDE main card, no border, same bg */}
            <div ref={buttonRowRef} className="flex flex-row gap-4 w-full px-8 pb-6 pt-2 bg-black/70 rounded-b-2xl">
              <button
                onClick={addMove}
                className="flex-1 px-4 py-4 bg-cyan-400/20 border border-cyan-400/40 text-cyan-400 rounded-xl font-bold text-lg shadow-lg transition-all hover:bg-cyan-400/30 hover:border-cyan-400/60 backdrop-blur-md"
              >
                + Add New Move
              </button>
              <button
                onClick={saveBoulder}
                className="w-48 px-4 py-4 bg-cyan-400 text-black rounded-xl font-bold text-lg shadow-lg transition-all hover:bg-cyan-300 hover:text-cyan-900 backdrop-blur-md border border-cyan-400/60"
              >
                Save Boulder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 