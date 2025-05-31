import React, { useState } from 'react'
import ElasticSlider from './ui/ElasticSlider'
import { Move } from './ManualBoulderCreator'

interface MoveListProps {
  moves: Move[]
  onAddMove: () => void
  onUpdateMove: (id: string, updates: Partial<Move>) => void
  onDeleteMove: (id: string) => void
}

interface MoveItemProps {
  move: Move
  index: number
  onUpdate: (updates: Partial<Move>) => void
  onDelete: () => void
}

function MoveItem({ move, index, onUpdate, onDelete }: MoveItemProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(move.name)

  const handleNameSubmit = () => {
    onUpdate({ name: editName })
    setIsEditingName(false)
  }

  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setEditName(move.name)
      setIsEditingName(false)
    }
  }

  const getMoveTypeLabel = (value: number) => {
    if (value < -60) return 'Very Static'
    if (value < -20) return 'Static'
    if (value <= 20) return 'Neutral'
    if (value <= 60) return 'Dynamic'
    return 'Very Dynamic'
  }

  const getMoveTypeColor = (value: number) => {
    if (value < -40) return 'text-blue-400'
    if (value < 0) return 'text-cyan-400'
    if (value === 0) return 'text-gray-400'
    if (value <= 40) return 'text-yellow-400'
    return 'text-orange-400'
  }

  return (
    <div className="flex items-center gap-4">
      {/* Move Label - Outside on the left */}
      <div className="min-w-[60px]">
        <span className="text-sm text-cyan-400 font-medium">Move {index + 1}</span>
      </div>

      {/* Main Move Container */}
      <div className="flex-1 bg-black/50 border border-cyan-400/40 rounded-lg p-3">
        
        {/* Single Row: Name, Crux, Type Slider, Label, Delete */}
        <div className="flex items-center gap-3">
          {/* Move Name - Reduced width to 70% */}
          <div className="flex-1 min-w-[105px] max-w-[105px]">
            {isEditingName ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyPress={handleNameKeyPress}
                placeholder="Describe the move"
                className="w-full px-3 py-2 bg-black/50 border border-cyan-400/40 rounded text-cyan-400 text-sm focus:outline-none focus:border-cyan-400"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="w-full text-left text-cyan-400 text-sm px-3 py-2 hover:text-cyan-300 transition-colors hover:bg-cyan-400/10 rounded"
              >
                {move.name || 'Describe the move'}
              </button>
            )}
          </div>

          {/* Crux Field - With border and star icon */}
          <div className="flex items-center">
            <button
              onClick={() => onUpdate({ isCrux: !move.isCrux })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                move.isCrux
                  ? 'bg-yellow-400/20 border-yellow-400/60 text-yellow-400'
                  : 'bg-gray-600/20 border-gray-600/40 text-gray-400 hover:bg-gray-600/30'
              }`}
            >
              <span className="text-sm">{move.isCrux ? '⭐' : '☆'}</span>
              <span className="text-xs font-medium">Crux</span>
            </button>
          </div>

          {/* Move Type Slider - Auto-align between crux and trash */}
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <span className="text-xs text-blue-400 font-medium">Static</span>
            <div className="flex-1" onPointerDown={(e) => e.stopPropagation()}>
              <ElasticSlider
                defaultValue={move.moveType}
                startingValue={-100}
                maxValue={100}
                isStepped={true}
                stepSize={5}
                className="w-full"
                onChange={(value) => onUpdate({ moveType: value })}
                showValue={false}
                compact={true}
              />
            </div>
            <span className="text-xs text-orange-400 font-medium">Dynamic</span>
          </div>

          {/* Live Label - Bigger and same level */}
          <div className="min-w-[90px] text-center">
            <span className={`text-base font-bold ${getMoveTypeColor(move.moveType)}`}>
              {getMoveTypeLabel(move.moveType)}
            </span>
          </div>

          {/* Delete Button - Always aligned to the right with border and old icon */}
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded border border-red-400/40 hover:border-red-400/60 transition-all"
            title="Delete move"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MoveList({ moves, onAddMove, onUpdateMove, onDeleteMove }: MoveListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Moves List - Scrollable with Add Move button inline */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0">
        {moves.map((move, index) => (
          <MoveItem
            key={move.id}
            move={move}
            index={index}
            onUpdate={(updates) => onUpdateMove(move.id, updates)}
            onDelete={() => onDeleteMove(move.id)}
          />
        ))}
        
        {/* Add Move Button - Now inline after the last move */}
        <div className="pt-3">
          <button
            onClick={onAddMove}
            className="w-full px-4 py-3 bg-cyan-400/20 border border-cyan-400/40 text-cyan-400 rounded-lg font-medium transition-all hover:bg-cyan-400/30 hover:border-cyan-400/60"
          >
            + Add New Move
          </button>
        </div>
      </div>
    </div>
  )
} 