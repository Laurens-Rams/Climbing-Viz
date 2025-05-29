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
    <div className="group bg-[#141a1f] border border-transparent hover:border-[#3d4d5c] rounded-lg transition-all duration-200">
      {/* Move Header */}
      <div className="flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#9daebe] text-sm font-normal">Move {index + 1}</span>
          <div className="flex flex-col justify-center flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleKeyPress}
                className="text-white text-base font-medium bg-transparent border-b border-[#3d4d5c] focus:border-[#dce8f3] outline-none"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-white text-base font-medium leading-normal line-clamp-1 text-left hover:text-[#dce8f3] transition-colors"
              >
                {move.name}
              </button>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <button
            onClick={onDelete}
            className="text-white hover:text-red-400 transition-colors flex size-7 items-center justify-center opacity-0 group-hover:opacity-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Power Slider */}
      <div className="px-4 pb-4">
        <div className="flex w-full flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full shrink-[3] items-center justify-between">
            <p className="text-white text-base font-medium leading-normal">Power</p>
            <p className="text-white text-sm font-normal leading-normal sm:hidden">{move.power}</p>
          </div>
          <div className="flex h-4 w-full items-center gap-4">
            <Slider.Root
              value={[move.power]}
              onValueChange={(value) => onUpdate({ power: value[0] })}
              max={100}
              step={1}
              className="relative flex h-1 w-full touch-none select-none items-center"
            >
              <Slider.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-[#3d4d5c]">
                <Slider.Range className="absolute h-full bg-[#dce8f3]" />
              </Slider.Track>
              <Slider.Thumb className="block h-4 w-4 rounded-full bg-[#dce8f3] shadow-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#dce8f3] focus:ring-offset-2 focus:ring-offset-[#141a1f] transition-colors" />
            </Slider.Root>
            <p className="text-white text-sm font-normal leading-normal hidden sm:block min-w-[2rem] text-right">{move.power}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MoveList({ moves, onAddMove, onUpdateMove, onDeleteMove }: MoveListProps) {
  return (
    <div className="space-y-2">
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
        className="flex items-center gap-4 bg-[#141a1f] hover:bg-[#1f2937] border border-dashed border-[#3d4d5c] hover:border-[#dce8f3] rounded-lg px-4 min-h-[72px] py-2 justify-between w-full transition-all duration-200 group"
      >
        <div className="flex flex-col justify-center">
          <p className="text-white text-base font-medium leading-normal line-clamp-1">Add a new move</p>
          <p className="text-[#9daebe] text-sm font-normal leading-normal line-clamp-2">Click to add move {moves.length + 1}</p>
        </div>
        <div className="shrink-0">
          <div className="text-white group-hover:text-[#dce8f3] transition-colors flex size-7 items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  )
} 