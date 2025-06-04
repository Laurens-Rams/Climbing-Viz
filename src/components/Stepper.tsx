import React from 'react'
import { Check } from 'lucide-react'

export interface Step {
  id: string
  title: string
  description: string
  icon?: string
  isCompleted?: boolean
  isActive?: boolean
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (stepIndex: number) => void
  onNext?: (currentStep: number) => boolean | void
  onPrevious?: () => void
  onComplete?: () => void
  className?: string
}

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  onNext,
  onPrevious,
  onComplete,
  className = ''
}: StepperProps) {
  const handleNext = () => {
    if (onNext) {
      const canProceed = onNext(currentStep)
      if (canProceed === false) {
        return // Don't proceed if onNext returns false
      }
    }
    
    if (currentStep === steps.length - 1) {
      onComplete?.()
    }
  }

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious()
    }
  }

  const canGoNext = currentStep < steps.length - 1
  const canGoPrevious = currentStep > 0
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className={`stepper-container ${className}`}>
      {/* Step Indicators */}
      <div className="flex flex-col items-center mb-8">
        {/* Circles and connecting lines row */}
        <div className="flex items-center justify-center mb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all cursor-pointer ${
                  index < currentStep
                    ? 'bg-green-400/20 border-green-400 text-green-400'
                    : index === currentStep
                    ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400'
                    : 'bg-gray-600/20 border-gray-600 text-gray-400'
                }`}
                onClick={() => onStepClick?.(index)}
              >
                <span className="text-sm font-bold">
                  {index < currentStep ? <Check size={16} className="text-green-400" strokeWidth={3} /> : (step.icon || (index + 1))}
                </span>
              </div>
              {/* Connecting line positioned right after the circle */}
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 transition-all ${
                    index < currentStep ? 'bg-green-400' : 'bg-gray-600'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Labels row - positioned to align with circles */}
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <React.Fragment key={`label-${step.id}`}>
              <div className={`w-10 text-xs text-center ${
                index <= currentStep ? 'text-cyan-400' : 'text-gray-400'
              }`}>
                {step.title}
              </div>
              {/* Spacer to match the connecting line width */}
              {index < steps.length - 1 && (
                <div className="w-16" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
} 