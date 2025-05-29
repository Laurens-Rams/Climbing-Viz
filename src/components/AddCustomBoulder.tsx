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
    <div className="h-full bg-[#141a1f] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-white tracking-light text-[32px] font-bold leading-tight mb-2">
            Add Custom Boulder
          </h1>
          <p className="text-gray-400 text-lg">
            Create a new boulder problem with custom moves and difficulty
          </p>
        </div>

        {/* Grade Selection */}
        <div className="mb-8">
          <h3 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">Grade</h3>
          <RadioGroup.Root
            value={selectedGrade}
            onValueChange={setSelectedGrade}
            className="flex flex-wrap gap-3"
          >
            {grades.map((grade) => (
              <RadioGroup.Item
                key={grade}
                value={grade}
                className="text-sm font-medium leading-normal flex items-center justify-center rounded-xl border border-[#3d4d5c] px-4 h-11 text-white hover:border-[#dce8f3] transition-colors data-[state=checked]:border-[3px] data-[state=checked]:border-[#dce8f3] data-[state=checked]:px-3.5 cursor-pointer"
              >
                {grade}
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </div>

        {/* Moves Section */}
        <div className="mb-8">
          <h3 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">Moves</h3>
          <MoveList
            moves={moves}
            onAddMove={addMove}
            onUpdateMove={updateMove}
            onDeleteMove={deleteMove}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-6 border-t border-[#2b3640]">
          <button
            onClick={handleSave}
            className="bg-[#1e64e7] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1557d1] transition-colors"
          >
            Save Boulder
          </button>
        </div>
      </div>
    </div>
  )
} 