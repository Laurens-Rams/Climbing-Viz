import React, { useState } from 'react'
import * as RadioGroup from '@radix-ui/react-radio-group'
import * as Slider from '@radix-ui/react-slider'
import { MoveList } from './MoveList'

export interface Move {
  id: string
  name: string
  power: number
}

export function AddCustomBoulder() {
  const [selectedGrade, setSelectedGrade] = useState('')
  const [moves, setMoves] = useState<Move[]>([
    { id: '1', name: 'Describe the move', power: 50 }
  ])

  const grades = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8']

  const addMove = () => {
    const newMove: Move = {
      id: Date.now().toString(),
      name: 'Describe the move',
      power: 50
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

  const handleSave = () => {
    // TODO: Save boulder data and possibly navigate to visualizer
    console.log('Saving boulder:', { grade: selectedGrade, moves })
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-900 to-black">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-white tracking-light text-4xl font-bold leading-tight mb-4">
            Add Custom Boulder
          </h1>
          <p className="text-gray-400 text-lg">
            Create a new boulder problem with custom moves and difficulty
          </p>
        </div>

        {/* Grade Selection */}
        <div className="bg-black/70 border border-cyan-400/40 rounded-2xl p-8 mb-8 backdrop-blur-sm">
          <h3 className="text-cyan-400 text-xl font-bold mb-6">Grade</h3>
          <RadioGroup.Root
            value={selectedGrade}
            onValueChange={setSelectedGrade}
            className="flex flex-wrap gap-4"
          >
            {grades.map((grade) => (
              <RadioGroup.Item
                key={grade}
                value={grade}
                className="px-6 py-3 bg-black/50 hover:bg-cyan-400/20 border border-cyan-400/40 hover:border-cyan-400/60 text-gray-300 hover:text-cyan-400 data-[state=checked]:bg-cyan-400/20 data-[state=checked]:text-cyan-400 data-[state=checked]:border-cyan-400/60 rounded-xl text-sm font-medium cursor-pointer transition-all backdrop-blur-sm"
              >
                {grade}
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </div>

        {/* Moves Section */}
        <div className="bg-black/70 border border-cyan-400/40 rounded-2xl p-8 mb-8 backdrop-blur-sm">
          <h3 className="text-cyan-400 text-xl font-bold mb-6">Moves</h3>
          <MoveList
            moves={moves}
            onAddMove={addMove}
            onUpdateMove={updateMove}
            onDeleteMove={deleteMove}
          />
        </div>

        {/* Footer */}
        <div className="bg-black/70 border border-cyan-400/40 rounded-2xl p-8 backdrop-blur-sm">
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-8 py-4 bg-green-500/80 hover:bg-green-500 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
            >
              Save Boulder
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 