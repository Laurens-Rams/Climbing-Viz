import React, { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { 
  getVisualizationState, 
  markAsUpdated, 
  ProcessedMove, 
  VisualizationState,
  updateSelectedBoulder,
  detectAndProcessMoves
} from '../store/visualizationStore'

// The visualization component that reads from global store at 15 FPS
function VisualizationScene() {
  const meshRef = useRef<THREE.Group>(null)
  const ringsRef = useRef<THREE.Group>(null)
  const centerTextRef = useRef<THREE.Mesh | null>(null)
  const attemptLinesRef = useRef<THREE.Group>(null)
  const moveLinesRef = useRef<THREE.Group>(null) // Add move lines ref
  const managedObjects = useRef<THREE.Object3D[]>([])
  const lastUpdateRef = useRef<number>(0)
  const lastSettingsRef = useRef<any>(null)
  const frameCountRef = useRef<number>(0)
  
  // Clean up materials on unmount
  useEffect(() => {
    return () => {
      managedObjects.current.forEach(obj => {
        if ((obj as any).geometry) (obj as any).geometry.dispose()
        if ((obj as any).material) {
          if (Array.isArray((obj as any).material)) {
            (obj as any).material.forEach((mat: THREE.Material) => mat.dispose())
          } else {
            (obj as any).material.dispose()
          }
        }
      })
      managedObjects.current.length = 0
    }
  }, [])
  
  // Seeded random function for consistent attempt generation
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }
  
  // Use frame to read from global store at ~15 FPS
  useFrame((state) => {
    frameCountRef.current++
    
    const vizState = getVisualizationState()
    
    // Check if we need to recreate the visualization (data or major settings changed)
    const needsRecreation = vizState.needsUpdate || 
                           vizState.lastUpdateTime !== lastUpdateRef.current ||
                           !lastSettingsRef.current ||
                           JSON.stringify(vizState.visualizerSettings) !== JSON.stringify(lastSettingsRef.current)
    
    if (needsRecreation) {
      // Only log on actual data changes, not settings changes
      if (vizState.needsUpdate || vizState.lastUpdateTime !== lastUpdateRef.current) {
        console.log(`🧗‍♂️ [BoulderVisualizerSimple] RECREATING VISUALIZATION - Moves: ${vizState.processedMoves?.length || 0}`)
      }
      
      lastUpdateRef.current = vizState.lastUpdateTime
      lastSettingsRef.current = { ...vizState.visualizerSettings }
      markAsUpdated()
      
      // Clear existing visualization
      clearSceneObjects()
      
      // Create new visualization if we have data (async, non-blocking)
      if (vizState.selectedBoulder && vizState.processedMoves && vizState.processedMoves.length > 0) {
        createVisualization(vizState).catch(error => {
          console.error('[BoulderVisualizerSimple] Error creating visualization:', error)
        })
      }
    }
    
    // Apply continuous animations without recreating geometry
    if (meshRef.current && vizState.visualizerSettings.animationEnabled) {
      // Rotation animation
      if (vizState.visualizerSettings.rotationSpeed > 0) {
        meshRef.current.rotation.z = state.clock.elapsedTime * vizState.visualizerSettings.rotationSpeed * 0.5
      }
      
      // Update liquid effects by modifying existing ring positions
      if (vizState.visualizerSettings.liquidEffect && ringsRef.current && ringsRef.current.children.length > 0) {
        updateLiquidAnimation(state.clock.elapsedTime, vizState.visualizerSettings)
      }
      
      // Update attempt line animations
      if (vizState.visualizerSettings.showAttemptLines && attemptLinesRef.current && attemptLinesRef.current.children.length > 0) {
        updateAttemptAnimation(state.clock.elapsedTime, vizState.visualizerSettings)
      }
    }
  })
  
  const updateLiquidAnimation = (elapsedTime: number, settings: any) => {
    // Update existing ring vertices for liquid animation without recreating geometry
    if (!ringsRef.current) return
    
    ringsRef.current.children.forEach((ring, ringIndex) => {
      if (ring instanceof THREE.Mesh && ring.geometry) {
        const positions = ring.geometry.attributes.position
        if (positions) {
          const positionArray = positions.array as Float32Array
          const animatedTime = elapsedTime * settings.liquidSpeed
          
          // For TubeGeometry, we need to be more careful about vertex manipulation
          // Apply a subtle scaling effect instead of direct position modification
          const liquidScale = 1 + Math.sin(animatedTime + ringIndex * 0.5) * 0.02 * settings.liquidSize
          ring.scale.setScalar(liquidScale)
        }
      }
    })
  }
  
  const updateAttemptAnimation = (elapsedTime: number, settings: any) => {
    // Update attempt line wave animations
    if (!attemptLinesRef.current) return
    
    attemptLinesRef.current.children.forEach((child, index) => {
      if (child instanceof THREE.Line && child.geometry) {
        const positions = child.geometry.attributes.position
        if (positions) {
          const positionArray = positions.array as Float32Array
          
          for (let i = 0; i < positionArray.length; i += 3) {
            const t = i / (positionArray.length - 3)
            const waveOffset = Math.sin(elapsedTime * 2 + index * 0.1 + t * Math.PI * 4) * settings.attemptWaviness * 0.1
            
            // Apply wave to Z position
            positionArray[i + 2] += waveOffset
          }
          
          positions.needsUpdate = true
        }
      }
    })
  }
  
  const clearSceneObjects = () => {
    managedObjects.current.forEach(obj => {
      if (obj.parent) obj.parent.remove(obj)
      if ((obj as any).geometry) (obj as any).geometry.dispose()
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((mat: THREE.Material) => mat.dispose())
        } else {
          (obj as any).material.dispose()
        }
      }
    })
    managedObjects.current.length = 0
    
    if (ringsRef.current) ringsRef.current.clear()
    if (attemptLinesRef.current) attemptLinesRef.current.clear()
    if (moveLinesRef.current) moveLinesRef.current.clear() // Clear move lines
    if (centerTextRef.current) {
      if (centerTextRef.current.parent) centerTextRef.current.parent.remove(centerTextRef.current)
      if (centerTextRef.current.geometry) centerTextRef.current.geometry.dispose()
      if (centerTextRef.current.material && !Array.isArray(centerTextRef.current.material)) {
        (centerTextRef.current.material as THREE.Material).dispose()
      }
      centerTextRef.current = null
    }
  }
  
  // Font loading utility
  const loadCustomFont = async () => {
    if (document.fonts && document.fonts.check) {
      try {
        const fontLoaded = document.fonts.check('bold 16px TT-Supermolot-Neue-Trial-Expanded-Bold')
        if (!fontLoaded) {
          console.log('[BoulderVisualizerSimple] Loading TT-Supermolot font...')
          await document.fonts.load('bold 16px TT-Supermolot-Neue-Trial-Expanded-Bold')
          console.log('[BoulderVisualizerSimple] TT-Supermolot font loaded successfully')
        }
        return true
      } catch (error) {
        console.warn('[BoulderVisualizerSimple] Font loading failed:', error)
        return false
      }
    }
    return false
  }
  
  const createVisualization = async (vizState: VisualizationState) => {
    if (!ringsRef.current || !attemptLinesRef.current || !vizState.processedMoves) return
    
    const settings = vizState.visualizerSettings
    const moves = vizState.processedMoves
    const moveCount = moves.length
    
    console.log(`[BoulderVisualizerSimple] Creating ${settings.ringCount} rings for ${moveCount} moves`)
    
    // Ensure font is loaded
    await loadCustomFont()
    
    // Create center text with custom font
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (context) {
      canvas.width = 512
      canvas.height = 512
      
      // Make canvas background transparent
      context.clearRect(0, 0, canvas.width, canvas.height)
      
      // Use TT-Supermolot font
      const fontFamily = 'TT-Supermolot-Neue-Trial-Expanded-Bold, Arial, sans-serif'
      context.font = `bold 220px ${fontFamily}`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillStyle = '#ffffff'
      
      // Display move count centered in the middle, slightly down
      const displayText = moveCount.toString()
      context.fillText(displayText, canvas.width / 2, canvas.height / 2 + 15)
      
      // Create texture and mesh
      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true
      
      const textGeometry = new THREE.PlaneGeometry(2.5 * settings.centerTextSize, 2.5 * settings.centerTextSize)
      const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        alphaTest: 0.1
      })
      
      centerTextRef.current = new THREE.Mesh(textGeometry, textMaterial)
      centerTextRef.current.position.z = 0.01
    } else {
      // Fallback to sphere if canvas context fails
      const sphereRadius = 0.3 * settings.centerTextSize
      const sphereGeo = new THREE.SphereGeometry(sphereRadius, 16, 16)
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.8 })
      centerTextRef.current = new THREE.Mesh(sphereGeo, sphereMat)
    }
    
    if (meshRef.current && centerTextRef.current) {
      meshRef.current.add(centerTextRef.current)
      managedObjects.current.push(centerTextRef.current)
    }
    
    // Create rings
    let ringsCreated = 0
    for (let ringIndex = 0; ringIndex < settings.ringCount; ringIndex++) {
      const ring = createSingleRing(ringIndex, moves, settings)
      if (ring) {
        ringsRef.current.add(ring)
        managedObjects.current.push(ring)
        ringsCreated++
      }
    }
    
    // Create attempt lines if enabled
    if (settings.showAttemptLines && settings.attemptCount > 0) {
      createAttemptLines(moves, settings)
    }
    
    // Create move position lines - straight lines from center to specific radius
    createMovePositionLines(moves, settings)
    
    console.log(`[BoulderVisualizerSimple] Successfully created ${ringsCreated} rings`)
  }
  
  const createAttemptLines = (moves: ProcessedMove[], settings: any) => {
    if (!attemptLinesRef.current) return
    
    // Use maxAttempts instead of attemptCount for proper original logic
    const attemptCount = Math.floor(settings.maxAttempts || settings.attemptCount || 71)
    const baseRadius = settings.baseRadius * settings.combinedSize
    const maxRadius = (baseRadius + (settings.ringCount * settings.ringSpacing) + 0.5) * (settings.attemptRadius || 1.0)
    
    console.log(`[BoulderVisualizerSimple] Creating ${attemptCount} attempt lines`)
    
    // Calculate how many attempts should be completed (25%)
    const completedAttemptCount = Math.floor(attemptCount * 0.25)
    
    for (let i = 0; i < attemptCount; i++) {
      // Generate attempt data like the original
      const boulderSeed = 789.123 // Simple seed
      const angle = seededRandom(boulderSeed + i * 100.123) * Math.PI * 2
      
      // Determine if this attempt is completed (first 25% are completed)
      const isCompleted = i < completedAttemptCount
      
      // Generate completion percentage
      let completionPercent
      if (isCompleted) {
        // Completed attempts always reach 100%
        completionPercent = 1.0
      } else {
        // Non-completed attempts have exponential distribution (more failures early)
        const randomValue = seededRandom(boulderSeed + i * 200.456)
        if (randomValue < 0.5) {
          completionPercent = 0.1 + randomValue * 0.4 // 10-30%
        } else if (randomValue < 0.8) {
          completionPercent = 0.3 + (randomValue - 0.5) * 1.0 // 30-60%
        } else {
          completionPercent = 0.6 + (randomValue - 0.8) * 1.25 // 60-85%
        }
        completionPercent = Math.min(0.85, Math.max(0.1, completionPercent)) // Cap at 85% for non-completed
      }
      
      // Calculate dramatic completion for more visual impact
      const dramaticCompletion = Math.pow(completionPercent, 1.8)
      const endRadius = baseRadius + (maxRadius - baseRadius) * dramaticCompletion
      
      // Create wavy line points
      const points = []
      const segments = Math.max(20, Math.floor((endRadius - baseRadius) * 4))
      const attemptSpecificRandomPhase = seededRandom(i * 12.345) * Math.PI * 2
      
      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        const currentRadius = baseRadius + (endRadius - baseRadius) * t
        
        // Enhanced wavy effect with multiple frequencies
        const wave1 = Math.sin(t * Math.PI * 2 + i + attemptSpecificRandomPhase) * settings.attemptWaviness * t * 0.6
        const wave2 = Math.sin(t * Math.PI * 4 + i * 2 + attemptSpecificRandomPhase) * settings.attemptWaviness * t * 0.3
        const wave3 = Math.sin(t * Math.PI * 6 + i * 3 + attemptSpecificRandomPhase) * settings.attemptWaviness * t * 0.1
        const waveOffset = wave1 + wave2 + wave3
        const waveAngle = angle + waveOffset
        
        const x = Math.cos(waveAngle) * currentRadius
        const y = Math.sin(waveAngle) * currentRadius
        
        // Z-offset based on completion (shorter attempts get more Z-offset)
        const progressiveZOffset = (settings.attemptDotZOffsetMax || 1.0) * (1 - completionPercent) * (settings.attemptDotZEffectStrength || 0.5) * t
        const z = progressiveZOffset
        
        points.push(new THREE.Vector3(x, y, z))
      }
      
      if (points.length < 2) continue
      
      // Create single tube with vertex alpha for smooth gradient
      const attemptCurve = new THREE.CatmullRomCurve3(points)
      const tubeRadius = 0.03 * (settings.attemptThickness || 1.0) * settings.lineWidth
      const tubeSegments = Math.max(64, points.length * 2) // High resolution for smooth gradient
      const tubeGeometry = new THREE.TubeGeometry(attemptCurve, tubeSegments, tubeRadius, 8, false)
      
      // Create alpha attributes for smooth opacity gradient
      const alphas = []
      const positions = tubeGeometry.attributes.position
      const vertexCount = positions.count
      const radialSegments = 8 // TubeGeometry has 8 vertices around each cross-section
      
      // Calculate alpha for each vertex based on its position along the line
      for (let i = 0; i < vertexCount; i++) {
        // Calculate which cross-section this vertex belongs to
        const crossSectionIndex = Math.floor(i / radialSegments)
        // Position along the tube (0 = start/center, 1 = end/outside)
        const tubePosition = crossSectionIndex / tubeSegments
        
        // Linear fade: 0% opacity at start (center), 100% at end (outside)
        const fadeMultiplier = settings.attemptFadeStrength * 3.0 // 300% more strength
        const alpha = tubePosition * fadeMultiplier * settings.attemptOpacity
        const finalAlpha = Math.min(1.0, Math.max(0.0, alpha))
        
        alphas.push(finalAlpha)
      }
      
      // Add alpha attribute to geometry
      tubeGeometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1))
      
      // Different colors for completed vs incomplete attempts
      // White with 10% turquoise for completed attempts
      const completedColor = new THREE.Color(0xffffff).lerp(new THREE.Color(0x40e0d0), 0.1) // White + 10% turquoise
      const lineColor = isCompleted ? completedColor : new THREE.Color(0xffffff) // Turquoise-tinted white for completed, pure white for incomplete
      
      // Use custom shader material for smooth opacity gradient
      const material = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: lineColor }
        },
        vertexShader: `
          attribute float alpha;
          varying float vAlpha;
          void main() {
            vAlpha = alpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          varying float vAlpha;
          void main() {
            gl_FragColor = vec4(color, vAlpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      })
      
      const line = new THREE.Mesh(tubeGeometry, material)
      attemptLinesRef.current.add(line)
      managedObjects.current.push(line)
      
      // Add completion dot at the end - ALWAYS 100% WHITE with size adjustments
      const lastPoint = points[points.length - 1]
      const baseDotSize = 0.015 + 0.03 * completionPercent
      // Finished dots are 30% bigger, unfinished dots are 30% smaller
      const dotSize = isCompleted ? baseDotSize * 1.3 : baseDotSize * 0.7
      const dotGeometry = new THREE.SphereGeometry(dotSize, 10, 6)
      const dotMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, // ALWAYS 100% WHITE
        transparent: false, // No transparency - always 100% opacity
        opacity: 1.0 // Always 100% opacity
      })
      
      const dot = new THREE.Mesh(dotGeometry, dotMaterial)
      dot.position.set(lastPoint.x, lastPoint.y, lastPoint.z)
      attemptLinesRef.current.add(dot)
      managedObjects.current.push(dot)
    }
  }
  
  const createSingleRing = (ringIndex: number, moves: ProcessedMove[], settings: any) => {
    const moveCount = moves.length
    if (moveCount < 2) return null

    // Improved dynamics normalization
    const allDynamics = moves.map(move => move.dynamics)
    const minDynamics = Math.min(...allDynamics)
    const maxDynamics = Math.max(...allDynamics)
    const dynamicsRange = maxDynamics - minDynamics || 1
    const currentBaseRadius = (settings.baseRadius + (ringIndex * (settings.ringSpacing + 0.001))) * settings.combinedSize

    if (!isFinite(currentBaseRadius) || currentBaseRadius <= 0) return null

    const points = []
    const detailLevel = Math.min(Math.max(moveCount * 4, 8), 32)

    for (let i = 0; i < detailLevel; i++) {
      const normalizedPosition = i / detailLevel
      const angle = normalizedPosition * Math.PI * 2 + Math.PI / 2
      const movePosition = normalizedPosition * moveCount
      const moveIndex1 = Math.floor(movePosition) % moveCount
      const moveIndex2 = (moveIndex1 + 1) % moveCount
      const lerpFactor = movePosition - Math.floor(movePosition)
      const move1 = moves[moveIndex1]
      const move2 = moves[moveIndex2]

      if (!move1 || !move2) continue

      const dynamics1 = move1.dynamics
      const dynamics2 = move2.dynamics
      const rawDynamics = dynamics1 * (1 - lerpFactor) + dynamics2 * lerpFactor
      const dynamics = dynamicsRange > 0 ? (rawDynamics - minDynamics) / dynamicsRange : 0.5

      if (!isFinite(dynamics)) continue

      let radius = currentBaseRadius
      const ringProgress = ringIndex / settings.ringCount

      // Enhanced dynamics calculation with better scaling
      let enhancedDynamics
      if (dynamics < 0.3) enhancedDynamics = dynamics * 0.05 // Reduced from 0.1
      else if (dynamics < 0.6) enhancedDynamics = 0.015 + (dynamics - 0.3) * 0.8 // Reduced from 1.5
      else enhancedDynamics = 0.25 + Math.pow(dynamics - 0.6, 2.5) * 2.0 // Reduced from 8.0
      enhancedDynamics *= (1 + ringProgress * 0.6) // Reduced from 1.2

      const dynamicsEffect = enhancedDynamics * settings.dynamicsMultiplier * 0.3 // Scale down overall effect
      if (!isFinite(dynamicsEffect)) continue
      
      radius += dynamicsEffect * Math.pow(ringProgress, 0.6)

      // Organic noise
      if (settings.organicNoise > 0) {
        const complexity = 1.0
        const staticNoiseAngleComponent = normalizedPosition * Math.PI
        const noise = (
          Math.sin(staticNoiseAngleComponent * (200 * complexity)) * 0.005 +
          Math.sin(staticNoiseAngleComponent * (400 * complexity)) * 0.003 +
          Math.sin(staticNoiseAngleComponent * (800 * complexity)) * 0.002 +
          Math.sin(staticNoiseAngleComponent * (1600 * complexity)) * 0.001
        ) * dynamicsEffect * Math.pow(ringProgress, 0.6) * settings.organicNoise * 10
        radius += noise
      }

      // Crux boost
      let cruxBoost = 0
      for (let j = 0; j < moveCount; j++) {
        const move = moves[j]
        if (move && move.isCrux) {
          const cruxPosition = j / moveCount
          let distance = Math.abs(normalizedPosition - cruxPosition)
          distance = Math.min(distance, 1 - distance)
          
          const falloffRate = 15
          const cruxStrength = Math.exp(-distance * falloffRate)
          
          const moveDyn = move.dynamics
          cruxBoost = Math.max(cruxBoost, moveDyn * settings.cruxEmphasis * 0.3 * cruxStrength)
        }
      }
      radius += cruxBoost * ringProgress
      
      // Animated liquid effect
      if (settings.liquidEffect) {
        const liquidFrequency = 20 * settings.liquidSize
        const liquidAmplitude = 0.05
        radius += (Math.sin(normalizedPosition * Math.PI * liquidFrequency + ringIndex * 0.5) * liquidAmplitude + 
                  Math.cos(normalizedPosition * Math.PI * (liquidFrequency * 0.75) + ringIndex * 0.3) * (liquidAmplitude * 0.6)) * 
                  dynamicsEffect * Math.pow(ringProgress, 0.6)
      }

      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      
      // 3D depth effect
      const primaryDepth = Math.sin(normalizedPosition * Math.PI * 2) * settings.depthEffect * ringProgress
      const secondaryDepth = Math.sin(normalizedPosition * Math.PI * 4 + ringIndex * 0.3) * settings.depthEffect * 0.3 * ringProgress
      const tertiaryDepth = Math.cos(normalizedPosition * Math.PI * 6 + ringIndex * 0.7) * settings.depthEffect * 0.15 * ringProgress
      const dynamicsDepth = (dynamics - 0.5) * settings.depthEffect * 0.4 * ringProgress
      
      const z = primaryDepth + secondaryDepth + tertiaryDepth + dynamicsDepth

      if (isFinite(x) && isFinite(y) && isFinite(z)) {
        points.push(new THREE.Vector3(x, y, z))
      }
    }

    if (points.length < 3) return null
    
    try {
      const curve = new THREE.CatmullRomCurve3(points, true)
      const smoothPoints = curve.getPoints(settings.curveResolution)
      const validSmoothPoints = smoothPoints.filter(p => isFinite(p.x) && isFinite(p.y) && isFinite(p.z))
      if (validSmoothPoints.length === 0) return null

      const geometry = new THREE.BufferGeometry().setFromPoints(validSmoothPoints)
      
      // Create colors with crux influence
      const colorsArray = []
      for (let i = 0; i < validSmoothPoints.length; i++) {
        const normPos = i / validSmoothPoints.length
        let cInf = 0
        for (let j = 0; j < moveCount; j++) {
          const move = moves[j]
          if (move && move.isCrux) {
            const cPos = j / moveCount
            let dist = Math.abs(normPos - cPos)
            dist = Math.min(dist, 1 - dist)
            if (dist < 0.12) cInf = Math.max(cInf, 1 - (dist / 0.12))
          }
        }
        const normalColor = new THREE.Color(settings.moveColor)
        const cruxColor = new THREE.Color(settings.cruxColor)
        colorsArray.push(...normalColor.lerp(cruxColor, cInf).toArray())
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsArray, 3))
      
      // Ring opacity with center fade
      let ringOpacity = settings.opacity * (1 - ringIndex / settings.ringCount * 0.3)
      ringOpacity *= (1 - (settings.centerFade * Math.pow(1 - (ringIndex / settings.ringCount), 2.5)))
      
      // Use TubeGeometry for proper thickness control
      const tubeRadius = 0.02 * settings.lineWidth
      const tubeGeometry = new THREE.TubeGeometry(curve, settings.curveResolution, tubeRadius, 8, true)
      
      // Create colors for tube geometry
      const tubeColors = []
      const tubePositions = tubeGeometry.attributes.position.array
      const segmentCount = tubePositions.length / 3
      
      for (let i = 0; i < segmentCount; i++) {
        const normPos = (i % (validSmoothPoints.length * 8)) / (validSmoothPoints.length * 8)
        let cInf = 0
        for (let j = 0; j < moveCount; j++) {
          const move = moves[j]
          if (move && move.isCrux) {
            const cPos = j / moveCount
            let dist = Math.abs(normPos - cPos)
            dist = Math.min(dist, 1 - dist)
            if (dist < 0.12) cInf = Math.max(cInf, 1 - (dist / 0.12))
          }
        }
        const normalColor = new THREE.Color(settings.moveColor)
        const cruxColor = new THREE.Color(settings.cruxColor)
        const finalColor = normalColor.lerp(cruxColor, cInf)
        tubeColors.push(finalColor.r, finalColor.g, finalColor.b)
      }
      tubeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tubeColors, 3))
      
      const material = new THREE.MeshBasicMaterial({ 
        vertexColors: true, 
        transparent: true, 
        opacity: Math.max(0.1, ringOpacity)
      })
      
      return new THREE.Mesh(tubeGeometry, material)
    } catch (e) { 
      console.error("Error creating ring:", e)
      return null
    }
  }
  
  // Create move position lines - straight lines from center to specific radius
  const createMovePositionLines = (moves: ProcessedMove[], settings: any) => {
    if (!settings.showMovePositionLines || !moveLinesRef.current) return
    
    const moveCount = moves.length
    if (moveCount <= 0) return
    
    console.log(`[BoulderVisualizerSimple] Creating ${moveCount} move position lines`)
    console.log(`[BoulderVisualizerSimple] Move details:`)
    moves.forEach((move, index) => {
      console.log(`  Line ${index}: dynamics=${move.dynamics}, accel=${move.acceleration}, range=${JSON.stringify(move.accelerationRange)}, isCrux=${move.isCrux}`)
    })
    
    // Calculate the radius where lines end (controllable from settings)
    const startRadius = settings.baseRadius * settings.combinedSize
    const endRadius = startRadius + settings.moveLineLength
    
    for (let i = 0; i < moveCount; i++) {
      const move = moves[i]
      
      // Calculate angle for this move - start at 12 o'clock (top) by adding PI/2
      const anglePerMove = (Math.PI * 2) / moveCount
      const moveAngle = i * anglePerMove + Math.PI / 2
      
      console.log(`[BoulderVisualizerSimple] Move ${i}: angle=${(moveAngle * 180 / Math.PI).toFixed(1)}°, dynamics=${move.dynamics}`)
      
      // Calculate line start and end positions
      const startX = Math.cos(moveAngle) * startRadius
      const startY = Math.sin(moveAngle) * startRadius
      const endX = Math.cos(moveAngle) * endRadius
      const endY = Math.sin(moveAngle) * endRadius
      
      // Create line geometry
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startX, startY, 0),
        new THREE.Vector3(endX, endY, 0)
      ])
      
      // Determine line color based on move properties
      const isStartMove = i === 0 && move.dynamics === 0
      const isCrux = move.isCrux
      
      let lineColor = 0xffffff // Default white
      if (isStartMove) {
        lineColor = 0x00ff00 // Green for start move
      } else if (isCrux) {
        lineColor = parseInt(settings.cruxColor.replace('#', ''), 16) // Crux color
      } else {
        lineColor = parseInt(settings.moveColor.replace('#', ''), 16) // Normal move color
      }
      
      // Create line material with opacity
      const lineMaterial = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: settings.moveLineOpacity || 0.8,
        linewidth: settings.moveLineWidth || 2
      })
      
      // Create line mesh
      const line = new THREE.Line(lineGeometry, lineMaterial)
      line.position.z = 0.1 // Place slightly in front of rings
      
      moveLinesRef.current.add(line)
      managedObjects.current.push(line)
      
      // Add visualization of acceleration range instead of just a dot
      if (move.accelerationRange) {
        const { min, max, avg } = move.accelerationRange
        
        // Create multiple segments to show the range
        const rangeSegments = 5
        const segmentLength = (endRadius - startRadius) / rangeSegments
        
        for (let seg = 0; seg < rangeSegments; seg++) {
          const segmentStart = startRadius + (seg * segmentLength)
          const segmentEnd = segmentStart + segmentLength
          
          // Calculate intensity for this segment based on range
          const segmentProgress = seg / (rangeSegments - 1)
          const segmentAccel = min + (max - min) * segmentProgress
          const intensity = (segmentAccel - min) / (max - min) || 0
          
          // Create segment geometry
          const segmentGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(Math.cos(moveAngle) * segmentStart, Math.sin(moveAngle) * segmentStart, 0),
            new THREE.Vector3(Math.cos(moveAngle) * segmentEnd, Math.sin(moveAngle) * segmentEnd, 0)
          ])
          
          // Color based on intensity within the range
          let segmentColor = lineColor
          if (!isStartMove) {
            // Blend from dark to bright based on intensity
            const baseColor = new THREE.Color(lineColor)
            const brightColor = new THREE.Color(lineColor).multiplyScalar(1.5)
            segmentColor = baseColor.lerp(brightColor, intensity).getHex()
          }
          
          // Create segment material with varying opacity
          const segmentMaterial = new THREE.LineBasicMaterial({
            color: segmentColor,
            transparent: true,
            opacity: (settings.moveLineOpacity || 0.8) * (0.3 + intensity * 0.7),
            linewidth: (settings.moveLineWidth || 2) * (0.5 + intensity * 0.5)
          })
          
          // Create segment line
          const segmentLine = new THREE.Line(segmentGeometry, segmentMaterial)
          segmentLine.position.z = 0.1 + seg * 0.01 // Slight Z offset for each segment
          
          moveLinesRef.current.add(segmentLine)
          managedObjects.current.push(segmentLine)
        }
        
        // Add a dot at the peak (max acceleration position)
        const peakProgress = (max - min) / (max - min) || 1
        const peakRadius = startRadius + (endRadius - startRadius) * peakProgress
        const peakX = Math.cos(moveAngle) * peakRadius
        const peakY = Math.sin(moveAngle) * peakRadius
        
        const dotGeometry = new THREE.SphereGeometry(0.03, 8, 6)
        const dotMaterial = new THREE.MeshBasicMaterial({
          color: lineColor,
          transparent: true,
          opacity: settings.moveLineOpacity || 0.8
        })
        
        const dot = new THREE.Mesh(dotGeometry, dotMaterial)
        dot.position.set(peakX, peakY, 0.15)
        
        moveLinesRef.current.add(dot)
        managedObjects.current.push(dot)
      } else {
        // Fallback: single dot at end (for backwards compatibility)
        const dotGeometry = new THREE.SphereGeometry(0.05, 8, 6)
        const dotMaterial = new THREE.MeshBasicMaterial({
          color: lineColor,
          transparent: true,
          opacity: settings.moveLineOpacity || 0.8
        })
        
        const dot = new THREE.Mesh(dotGeometry, dotMaterial)
        dot.position.set(endX, endY, 0.1)
        
        moveLinesRef.current.add(dot)
        managedObjects.current.push(dot)
      }
    }
    
    console.log(`[BoulderVisualizerSimple] Created ${moveCount} move position lines`)
  }
  
  return (
    <group ref={meshRef}>
      <group ref={ringsRef} />
      <group ref={attemptLinesRef} />
      <group ref={moveLinesRef} />
    </group>
  )
}

// Main component
export function BoulderVisualizerSimple() {
  // Add live data event listener
  useEffect(() => {
    let liveRecordingId: number | null = null
    
    const handleLiveDataUpdate = (event: CustomEvent) => {
      const { data, isRecording, timestamp } = event.detail
      
      if (data && data.acc_time && data.accX && data.accY && data.accZ) {
        console.log('[BoulderVisualizerSimple] Received live data update:', {
          timePoints: data.acc_time.buffer?.length || 0,
          isRecording,
          timestamp
        })
        
        // Convert Phyphox data to CSV format for compatibility with the store
        const timeArray = data.acc_time.buffer || []
        const accXArray = data.accX.buffer || []
        const accYArray = data.accY.buffer || []
        const accZArray = data.accZ.buffer || []
        
        if (timeArray.length > 0) {
          // Create or update live recording ID
          if (liveRecordingId === null) {
            liveRecordingId = Date.now() // Use timestamp as unique ID
            console.log('[BoulderVisualizerSimple] Created new live recording ID:', liveRecordingId)
          }
          
          const duration = timeArray.length > 0 ? timeArray[timeArray.length - 1] - timeArray[0] : 0
          const recordingNumber = Math.floor(Date.now() / 1000) % 1000 // Simple incrementing number
          
          // Create a live boulder data object
          const liveBoulderData = {
            id: liveRecordingId,
            name: `LiveRecording${recordingNumber} (${Math.floor(duration)}s)`,
            grade: 'Live',
            type: 'csv' as const,
            description: `Live recording - ${Math.floor(duration)}s duration`,
            csvFile: `live-recording-${liveRecordingId}.csv`,
            routeSetter: 'Live Recording',
            numberOfMoves: 0,
            moves: [],
            csvData: {
              time: timeArray.map((t: number) => t - timeArray[0]), // Normalize to start at 0
              absoluteAcceleration: timeArray.map((_: number, i: number) => {
                const x = accXArray[i] || 0
                const y = accYArray[i] || 0
                const z = accZArray[i] || 0
                return Math.sqrt(x * x + y * y + z * z)
              }),
              filename: `live-recording-${liveRecordingId}.csv`,
              duration: duration,
              maxAcceleration: 0, // Will be calculated
              avgAcceleration: 0, // Will be calculated
              sampleCount: timeArray.length
            },
            stats: {
              duration: '0',
              maxAcceleration: '0',
              avgAcceleration: '0',
              moveCount: 0,
              sampleCount: timeArray.length
            },
            recordedAt: new Date().toISOString(),
            source: 'live'
          }
          
          // Calculate acceleration statistics
          if (liveBoulderData.csvData) {
            const accels = liveBoulderData.csvData.absoluteAcceleration
            liveBoulderData.csvData.maxAcceleration = Math.max(...accels)
            liveBoulderData.csvData.avgAcceleration = accels.reduce((a: number, b: number) => a + b, 0) / accels.length
            liveBoulderData.stats.maxAcceleration = liveBoulderData.csvData.maxAcceleration.toFixed(2)
            liveBoulderData.stats.avgAcceleration = liveBoulderData.csvData.avgAcceleration.toFixed(2)
            liveBoulderData.stats.duration = liveBoulderData.csvData.duration.toFixed(1)
          }
          
          // Get current threshold for move detection
          const currentState = getVisualizationState()
          const threshold = currentState.threshold || 12.0
          
          // Process moves from live data
          if (liveBoulderData.csvData) {
            const moves = detectAndProcessMoves(
              liveBoulderData.csvData.time,
              liveBoulderData.csvData.absoluteAcceleration
            )
            
            liveBoulderData.numberOfMoves = moves.length
            liveBoulderData.stats.moveCount = moves.length
            
            // Save to localStorage as Phyphox boulder
            const existingBoulders = JSON.parse(localStorage.getItem('climbing-boulders') || '[]')
            const existingIndex = existingBoulders.findIndex((b: any) => b.id === liveRecordingId)
            
            const boulderForStorage = {
              id: liveBoulderData.id,
              name: liveBoulderData.name,
              grade: liveBoulderData.grade,
              routeSetter: liveBoulderData.routeSetter,
              numberOfMoves: liveBoulderData.numberOfMoves,
              date: new Date().toISOString().split('T')[0],
              recordedAt: liveBoulderData.recordedAt,
              moves: moves,
              rawData: {
                acc_time: { buffer: timeArray },
                accX: { buffer: accXArray },
                accY: { buffer: accYArray },
                accZ: { buffer: accZArray }
              },
              source: 'phyphox',
              isLiveRecording: true
            }
            
            if (existingIndex >= 0) {
              // Update existing entry
              existingBoulders[existingIndex] = boulderForStorage
            } else {
              // Add new entry
              existingBoulders.push(boulderForStorage)
            }
            
            localStorage.setItem('climbing-boulders', JSON.stringify(existingBoulders))
            
            // Update the store
            updateSelectedBoulder(liveBoulderData)
            
            // Trigger boulder list refresh and selection
            window.dispatchEvent(new CustomEvent('boulderSaved', { 
              detail: { boulder: liveBoulderData }
            }))
            
            // Auto-select this boulder in the UI
            document.dispatchEvent(new CustomEvent('boulderSelectionChanged', {
              detail: { boulderId: liveBoulderData.id, source: 'live-recording' }
            }))
            
            console.log('[BoulderVisualizerSimple] Updated live recording:', {
              name: liveBoulderData.name,
              moves: moves.length,
              dataPoints: liveBoulderData.csvData.time.length,
              duration: liveBoulderData.stats.duration
            })
          }
        }
      }
    }
    
    // Listen for live data updates
    window.addEventListener('liveDataUpdate', handleLiveDataUpdate as EventListener)
    
    // Cleanup
    return () => {
      window.removeEventListener('liveDataUpdate', handleLiveDataUpdate as EventListener)
      liveRecordingId = null
    }
  }, [])

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: 'transparent' }}>
      <Canvas
        camera={{ position: [0, 0, 20], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} />
          <VisualizationScene />
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            zoomSpeed={0.6}
            panSpeed={0.8}
            rotateSpeed={0.4}
            minDistance={5}
            maxDistance={50}
            target={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  )
} 