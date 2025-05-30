import React, { useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { Move } from './AddCustomBoulder'

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
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(move.name)

  const handleNameSubmit = () => {
    onUpdate({ name: editName })
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setEditName(move.name)
      setIsEditing(false)
    }
  }

  return (
    <div className="bg-black/70 border border-cyan-400/40 rounded-xl p-6 group hover:border-cyan-400/60 transition-all duration-200 backdrop-blur-sm">
      {/* Move Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <span className="text-gray-400 text-sm font-medium">Move {index + 1}</span>
          <div className="flex flex-col justify-center flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleKeyPress}
                className="bg-black/50 border border-cyan-400/40 rounded-lg px-3 py-2 text-white text-base font-medium focus:border-cyan-400 focus:outline-none backdrop-blur-sm"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-white text-base font-medium leading-normal text-left hover:text-cyan-400 transition-colors"
              >
                {move.name}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all text-sm font-medium opacity-0 group-hover:opacity-100"
          title="Delete move"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" fill="currentColor" viewBox="0 0 256 256">
            <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
          </svg>
        </button>
      </div>

      {/* Power Slider */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-white text-base font-medium">Power</p>
          <span className="text-cyan-400 text-sm font-medium bg-cyan-400/10 px-3 py-1 rounded-lg border border-cyan-400/40">
            {move.power}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Slider.Root
            value={[move.power]}
            onValueChange={(value) => onUpdate({ power: value[0] })}
            max={100}
            step={1}
            className="relative flex h-2 w-full touch-none select-none items-center"
          >
            <Slider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-black/50 border border-cyan-400/40">
              <Slider.Range className="absolute h-full bg-gradient-to-r from-cyan-400 to-cyan-300 rounded-full" />
            </Slider.Track>
            <Slider.Thumb className="block h-5 w-5 rounded-full bg-cyan-400 shadow-lg hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black transition-colors border-2 border-white/20" />
          </Slider.Root>
        </div>
      </div>
    </div>
  )
}

export function MoveList({ moves, onAddMove, onUpdateMove, onDeleteMove }: MoveListProps) {
  return (
    <div className="space-y-6">
      {moves.map((move, index) => (
        <MoveItem
          key={move.id}
          move={move}
          index={index}
          onUpdate={(updates) => onUpdateMove(move.id, updates)}
          onDelete={() => onDeleteMove(move.id)}
        />
      ))}
      
      {/* Add New Move Button */}
      <button
        onClick={onAddMove}
        className="w-full bg-black/50 hover:bg-black/70 border border-dashed border-cyan-400/40 hover:border-cyan-400/60 rounded-xl p-6 transition-all duration-200 group backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-start">
            <p className="text-white text-base font-medium">Add a new move</p>
            <p className="text-gray-400 text-sm">Click to add move {moves.length + 1}</p>
          </div>
          <div className="px-4 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 rounded-lg transition-all group-hover:bg-cyan-400/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
              <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  )
} 