import { useRef, useEffect, useCallback, useReducer, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Types (consider moving to a types.ts file)
interface BoulderData {
  id: number;
  name: string;
  grade: string;
  moves: { 
    angle?: number; 
    dynamics: number; 
    crux?: boolean;
    isCrux?: boolean;
    move_number: number;
    x?: number;
    y?: number;
    z?: number;
  }[];
  attempts?: AttemptData[];
  isLiveData?: boolean;
  csvData?: {
    time: number[];
    absoluteAcceleration: number[];
  };
}

interface AttemptData {
  attemptNumber: number;
  moves: { angle: number; dynamics: number }[];
  success: boolean;
}

interface VisualizerSettings {
  baseRadius: number;
  maxRadius: number;
  ringCount: number;
  ringSpacing: number;
  opacity: number;
  curveResolution: number;
  dynamicsMultiplier: number;
  centerTextSize: number;
  showMoveNumbers: boolean;
  liquidEffect: boolean;
  organicNoise: number;
  cruxEmphasis: number;
  depthEffect: number;
  centerFade: number;
  showMoveSegments: boolean;
  segmentOpacity: number;
  segmentGap: number;
  showMoveLines: boolean;
  lineLength: number;
  lineOpacity: number;
  dotSize: number;
  dotOpacity: number;
  combinedSize: number;
  liquidSize: number;
  showAttempts: boolean;
  attemptOpacity: number;
  attemptWaviness: number;
  attemptFadeStrength: number;
  attemptThickness: number;
  animationEnabled: boolean;
  rotationSpeed: number;
  liquidSpeed: number;
  
  // New attempt visualization settings
  showAttemptLines: boolean;
  attemptCount: number;
  attemptZHeight: number;
  attemptWaveEffect: number;
  maxRadiusScale: number;
}

interface VisualizerColors {
  cruxMove: number | string;
  normalMove: number | string;
  gradeColors: Record<string, number | string>;
}

const initialSettings: VisualizerSettings = {
    baseRadius: 2.5,
    maxRadius: 12.0,
    ringCount: 28,
    ringSpacing: 0.0,
    opacity: 1.0,
    curveResolution: 240,
    dynamicsMultiplier: 4.9,
    centerTextSize: 1.0,
    showMoveNumbers: true,
    liquidEffect: true,
    organicNoise: 0.02,
    cruxEmphasis: 8.0,
    depthEffect: 2.0,
    centerFade: 1.0,
    showMoveSegments: false,
    segmentOpacity: 0.25,
    segmentGap: 0.06,
    showMoveLines: false,
    lineLength: 4,
    lineOpacity: 1,
    dotSize: 0.07,
    dotOpacity: 1,
    combinedSize: 1.0,
    liquidSize: 1.0,
    showAttempts: true,
    attemptOpacity: 0.55,
    attemptWaviness: 0.124,
    attemptFadeStrength: 1.8,
    attemptThickness: 0.02,
    animationEnabled: true,
    rotationSpeed: 0.0,
    liquidSpeed: 0.5,
    
    // New attempt visualization settings
    showAttemptLines: false,
    attemptCount: 12,
    attemptZHeight: 1.0,
    attemptWaveEffect: 0.0,
    maxRadiusScale: 1.0
};

const initialColors: VisualizerColors = {
    cruxMove: 0xDE501B,
    normalMove: 0x0CFFDB,
    gradeColors: {
        'V1': 0x60e2e8,
        'V2': 0x60e2e8,
        'V3': 0x60e2e8,
        'V4': 0xfddf59,
        'V5': 0x004aac,
        'V6': 0xff914f,
        'V7': 0xff3333,
        'V8': 0x1a1a1a,
        'V9': 0x1a1a1a
    }
};

// State management for settings (can be expanded with context/zustand later)
interface SettingsState {
  settings: VisualizerSettings;
  colors: VisualizerColors;
  isInitialized: boolean;
}

type SettingsAction = 
  | { type: 'UPDATE_SETTINGS'; payload: Partial<VisualizerSettings> }
  | { type: 'UPDATE_COLORS'; payload: Partial<VisualizerColors> }
  | { type: 'INITIALIZE' };

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_COLORS':
      return { ...state, colors: { ...state.colors, ...action.payload } };
    case 'INITIALIZE':
      return { ...state, isInitialized: true };
    default:
      return state;
  }
}

// Helper for seeded random
const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

let helvetikerFont: any = null;
let fontLoadAttempted = false;

const loadFont = () => {
    if (fontLoadAttempted) return;
    fontLoadAttempted = true;
    
const fontLoader = new FontLoader();
fontLoader.load(
    'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
    (font) => {
        helvetikerFont = font;
            console.log('Font loaded successfully');
    },
    undefined,
    (error) => {
            console.warn('FontLoader error loading helvetiker_regular.typeface.json (CORS issue expected):', error instanceof Error ? error.message : String(error));
            console.log('Using fallback sphere geometry for center display instead of text');
            // Font will remain null, createCenterText will use fallback sphere
        }
    );
};

// Initialize font loading
loadFont();
        
// The visualizer should only use move count from boulder data, not calculate thresholds

// Helper function for deep comparison of settings objects
const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
};

export function useBoulderVisualizer(boulderData: BoulderData | null, userSettings?: any) {
    const { scene } = useThree();
    const [state, dispatch] = useReducer(settingsReducer, {
        settings: {
            ...initialSettings,
            ...(userSettings || {})
        },
        colors: initialColors,
        isInitialized: false
    });
    const { settings, colors } = state;

    const ringsRef = useRef<THREE.Group>(new THREE.Group());
    const centerTextRef = useRef<THREE.Mesh | null>(null);
    const attemptLinesRef = useRef<THREE.Group>(new THREE.Group());
    const moveLinesRef = useRef<THREE.Group>(new THREE.Group());
    const moveSegmentsRef = useRef<THREE.Group>(new THREE.Group());
    
    const managedObjects = useRef<THREE.Object3D[]>([]).current;
    const prevBoulderDataRef = useRef<BoulderData | null>(null);
    const prevMoveCountRef = useRef<number>(0);
    const prevBuiltSettingsRef = useRef<VisualizerSettings | null>(null); // Initialize as null to detect first mount
    const prevUserSettingsRef = useRef<any>(userSettings); // Add ref to track previous userSettings

    // Update colors from settings if provided - separate effect for better performance
    useEffect(() => {
        if (userSettings?.moveColor || userSettings?.cruxColor) {
            const colorUpdates: Partial<VisualizerColors> = {};
            
            if (userSettings.moveColor) {
                const moveColor = new THREE.Color(userSettings.moveColor);
                colorUpdates.normalMove = moveColor.getHex();
            }
            
            if (userSettings.cruxColor) {
                const cruxColor = new THREE.Color(userSettings.cruxColor);
                colorUpdates.cruxMove = cruxColor.getHex();
            }
            
            dispatch({ type: 'UPDATE_COLORS', payload: colorUpdates });
            
            // Debounce color updates to prevent excessive updates
            const timeoutId = setTimeout(() => {
                if (boulderData && ringsRef.current.children.length > 0) {
                    console.log('[useBoulderVisualizer] Updating colors');
                    const startTime = performance.now();
                    
                    ringsRef.current.children.forEach((ring, ringIndex) => {
                        if (ring instanceof THREE.LineLoop && ring.geometry) {
                            const geometry = ring.geometry as THREE.BufferGeometry;
                            const moveCount = boulderData.moves.length;
                            const colorsArray = [];
                            
                            const positions = geometry.attributes.position;
                            const pointCount = positions.count;
                            
                            for (let i = 0; i < pointCount; i++) {
                                const normPos = i / pointCount;
                                let cInf = 0;
                                for (let j = 0; j < moveCount; j++) {
                                    const move = boulderData.moves[j];
                                    if (move && (move.isCrux || move.crux)) {
                                        const cPos = j / moveCount;
                                        let dist = Math.abs(normPos - cPos);
                                        dist = Math.min(dist, 1 - dist);
                                        if (dist < 0.12) cInf = Math.max(cInf, 1 - (dist / 0.12));
                                    }
                                }
                                const normalColor = new THREE.Color(colorUpdates.normalMove || colors.normalMove);
                                const cruxColor = new THREE.Color(colorUpdates.cruxMove || colors.cruxMove);
                                colorsArray.push(...normalColor.lerp(cruxColor, cInf).toArray());
                            }
                            
                            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsArray, 3));
                            geometry.attributes.color.needsUpdate = true;
                        }
                    });
                    
                    const endTime = performance.now();
                    console.log(`[useBoulderVisualizer] Color update completed in ${(endTime - startTime).toFixed(2)}ms`);
                }
            }, 100); // 100ms debounce
            
            return () => clearTimeout(timeoutId);
        }
    }, [userSettings?.moveColor, userSettings?.cruxColor, boulderData, colors]);

    const clearSceneObjects = useCallback(() => {
        managedObjects.forEach(obj => {
            if (obj.parent) obj.parent.remove(obj);
            if ((obj as any).geometry) (obj as any).geometry.dispose();
            if ((obj as any).material) {
                if (Array.isArray((obj as any).material)) {
                    (obj as any).material.forEach((mat: THREE.Material) => mat.dispose());
                } else {
                    (obj as any).material.dispose();
                }
            }
        });
        managedObjects.length = 0;
        ringsRef.current.clear();
        attemptLinesRef.current.clear();
        moveLinesRef.current.clear();
        moveSegmentsRef.current.clear();
        if (centerTextRef.current) {
            scene.remove(centerTextRef.current);
            if (centerTextRef.current.geometry) centerTextRef.current.geometry.dispose();
            if (centerTextRef.current.material && !Array.isArray(centerTextRef.current.material)) {
                (centerTextRef.current.material as THREE.Material).dispose();
            }
            centerTextRef.current = null;
        }
    }, [scene, managedObjects]);

    const createCenterText = useCallback((moveCount: number, gradeColor: number) => {
        if (!helvetikerFont || !boulderData) return;
            
        const textMaterial = new THREE.MeshBasicMaterial({ color: gradeColor, transparent: true, opacity: 0.8 });
        const displayText = moveCount.toString();
        const textGeometry = new TextGeometry(displayText, { font: helvetikerFont, size: settings.centerTextSize, height: 0.1 });
        textGeometry.center();
        centerTextRef.current = new THREE.Mesh(textGeometry, textMaterial);
        scene.add(centerTextRef.current);
        managedObjects.push(centerTextRef.current);
    }, [boulderData?.id, boulderData?.moves?.length, settings.centerTextSize, helvetikerFont, scene, managedObjects]);

    const createSingleRing = useCallback((ringIndex: number, moveCount: number) => {
        if (!boulderData || !boulderData.moves || boulderData.moves.length === 0) {
            console.warn(`[useBoulderVisualizer] No boulder data for ring ${ringIndex}`);
            return null;
        }
        if (moveCount < 2) {
            console.warn(`[useBoulderVisualizer] Not enough moves (${moveCount}) for ring ${ringIndex}`);
            return null;
        }

        // Improved dynamics normalization
        const allDynamics = boulderData.moves.map(move => {
            if (move.dynamics !== undefined && isFinite(move.dynamics)) {
                return move.dynamics;
            }
            // If dynamics is missing, use a more meaningful fallback based on move position
            const position = move.move_number || 1;
            return 0.3 + (position / moveCount) * 0.4; // Range from 0.3 to 0.7 based on position
        });
        
        const minDynamics = Math.min(...allDynamics);
        const maxDynamics = Math.max(...allDynamics);
        const dynamicsRange = maxDynamics - minDynamics || 1;
        const currentBaseRadius = (settings.baseRadius + (ringIndex * (settings.ringSpacing + 0.001))) * settings.combinedSize;

        if (!isFinite(currentBaseRadius) || currentBaseRadius <= 0) {
            console.warn(`[useBoulderVisualizer] Invalid base radius ${currentBaseRadius} for ring ${ringIndex}`);
            return null;
        }
        
        // Log dynamics info for first ring only to avoid spam
        if (ringIndex === 0) {
            console.log(`[useBoulderVisualizer] Ring creation - Dynamics range: ${minDynamics.toFixed(3)} - ${maxDynamics.toFixed(3)}, Base radius: ${currentBaseRadius.toFixed(2)}`);
        }

        const points = [];
        const detailLevel = Math.min(Math.max(moveCount * 4, 8), 32);

        for (let i = 0; i < detailLevel; i++) {
            const normalizedPosition = i / detailLevel;
            const angle = normalizedPosition * Math.PI * 2 + Math.PI / 2;
            const movePosition = normalizedPosition * moveCount;
            const moveIndex1 = Math.floor(movePosition) % moveCount;
            const moveIndex2 = (moveIndex1 + 1) % moveCount;
            const lerpFactor = movePosition - Math.floor(movePosition);
            const move1 = boulderData.moves[moveIndex1];
            const move2 = boulderData.moves[moveIndex2];

            if (!move1 || !move2) continue;

            const dynamics1 = (move1.dynamics !== undefined && isFinite(move1.dynamics)) ? move1.dynamics : (move1.move_number || 1) / moveCount;
            const dynamics2 = (move2.dynamics !== undefined && isFinite(move2.dynamics)) ? move2.dynamics : (move2.move_number || 1) / moveCount;
            const rawDynamics = dynamics1 * (1 - lerpFactor) + dynamics2 * lerpFactor;
            const dynamics = dynamicsRange > 0 ? (rawDynamics - minDynamics) / dynamicsRange : 0.5;

            if (!isFinite(dynamics)) continue;

            let radius = currentBaseRadius;
            const ringProgress = ringIndex / settings.ringCount;

            let enhancedDynamics;
            if (dynamics < 0.3) enhancedDynamics = dynamics * 0.1;
            else if (dynamics < 0.6) enhancedDynamics = 0.03 + (dynamics - 0.3) * 1.5;
            else enhancedDynamics = 0.48 + Math.pow(dynamics - 0.6, 2.5) * 8.0;
            enhancedDynamics *= (1 + ringProgress * 1.2);

            const dynamicsEffect = enhancedDynamics * settings.dynamicsMultiplier;
            if (!isFinite(dynamicsEffect)) continue;
            
            radius += dynamicsEffect * Math.pow(ringProgress, 0.6);

            if (settings.organicNoise > 0) {
                 const complexity = 1.0; // Fixed complexity value since waveComplexity was removed
                 const staticNoiseAngleComponent = normalizedPosition * Math.PI;
                 // Make the noise waves much smaller and more detailed with extreme frequency
                 const noise = (
                    Math.sin(staticNoiseAngleComponent * (200 * complexity)) * 0.005 +
                    Math.sin(staticNoiseAngleComponent * (400 * complexity)) * 0.003 +
                    Math.sin(staticNoiseAngleComponent * (800 * complexity)) * 0.002 +
                    Math.sin(staticNoiseAngleComponent * (1600 * complexity)) * 0.001
                ) * dynamicsEffect * Math.pow(ringProgress, 0.6) * settings.organicNoise * 10; // Multiply by 10 to make it more extreme
                radius += noise;
            }

            let cruxBoost = 0;
            for (let j = 0; j < moveCount; j++) {
                const move = boulderData.moves[j];
                if (move && (move.isCrux || move.crux)) {
                    const cruxPosition = j / moveCount;
                    let distance = Math.abs(normalizedPosition - cruxPosition);
                    distance = Math.min(distance, 1 - distance);
                    
                    // Smooth exponential falloff instead of hard cutoff
                    const falloffRate = 15; // Higher = sharper falloff
                    const cruxStrength = Math.exp(-distance * falloffRate);
                    
                    const moveDyn = (move.dynamics !== undefined && isFinite(move.dynamics)) ? move.dynamics : (move.move_number || 1) / moveCount;
                    cruxBoost = Math.max(cruxBoost, moveDyn * settings.cruxEmphasis * 0.3 * cruxStrength);
                }
            }
            radius += cruxBoost * ringProgress;
            
            // Liquid effect with liquidSize controlling wave frequency/length
            const liquidFrequency = 20 * settings.liquidSize; // liquidSize now controls wave frequency
            const liquidAmplitude = 0.05;
            radius += (Math.sin(normalizedPosition * Math.PI * liquidFrequency + ringIndex * 0.5) * liquidAmplitude + Math.cos(normalizedPosition * Math.PI * (liquidFrequency * 0.75) + ringIndex * 0.3) * (liquidAmplitude * 0.6)) * dynamicsEffect * Math.pow(ringProgress, 0.6);

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            // Improved 3D depth effect with multiple layers and better distribution
            const primaryDepth = Math.sin(normalizedPosition * Math.PI * 2) * settings.depthEffect * ringProgress;
            const secondaryDepth = Math.sin(normalizedPosition * Math.PI * 4 + ringIndex * 0.3) * settings.depthEffect * 0.3 * ringProgress;
            const tertiaryDepth = Math.cos(normalizedPosition * Math.PI * 6 + ringIndex * 0.7) * settings.depthEffect * 0.15 * ringProgress;
            // Add dynamics-based depth variation
            const dynamicsDepth = (dynamics - 0.5) * settings.depthEffect * 0.4 * ringProgress;
            
            const z = primaryDepth + secondaryDepth + tertiaryDepth + dynamicsDepth;

            if (isFinite(x) && isFinite(y) && isFinite(z)) {
                points.push(new THREE.Vector3(x, y, z));
            }
        }

        if (points.length < 3) return null;
        try {
            const curve = new THREE.CatmullRomCurve3(points, true);
            const smoothPoints = curve.getPoints(settings.curveResolution);
            const validSmoothPoints = smoothPoints.filter(p => isFinite(p.x) && isFinite(p.y) && isFinite(p.z));
            if (validSmoothPoints.length === 0) return null;

            const geometry = new THREE.BufferGeometry().setFromPoints(validSmoothPoints);
            const colorsArray = [];
            for (let i = 0; i < validSmoothPoints.length; i++) {
                const normPos = i / validSmoothPoints.length;
                let cInf = 0;
                for (let j = 0; j < moveCount; j++) {
                    const move = boulderData.moves[j];
                    if (move && (move.isCrux || move.crux)) {
                        const cPos = j / moveCount;
                        let dist = Math.abs(normPos - cPos);
                        dist = Math.min(dist, 1 - dist);
                        if (dist < 0.12) cInf = Math.max(cInf, 1 - (dist / 0.12));
                    }
                }
                const normalColor = new THREE.Color(colors.normalMove);
                const cruxColor = new THREE.Color(colors.cruxMove);
                colorsArray.push(...normalColor.lerp(cruxColor, cInf).toArray());
            }
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsArray, 3));
            let ringOpacity = settings.opacity * (1 - ringIndex / settings.ringCount * 0.3);
            ringOpacity *= (1 - (settings.centerFade * Math.pow(1 - (ringIndex / settings.ringCount), 2.5)));
            const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: Math.max(0.1, ringOpacity), linewidth: 2, blending: THREE.AdditiveBlending });
            return new THREE.LineLoop(geometry, material);
        } catch (e) { console.error("Error creating ring:", e); return null; }
    }, [boulderData, settings, colors]);

    const createLiquidRings = useCallback(() => {
        if (!boulderData) return;
        const moveCount = boulderData.moves.length;
        console.log(`[useBoulderVisualizer] Creating ${settings.ringCount} rings for ${moveCount} moves`);
        
        let ringsCreated = 0;
        for (let ringIndex = 0; ringIndex < settings.ringCount; ringIndex++) {
            const ring = createSingleRing(ringIndex, moveCount);
            if (ring) {
                ringsRef.current.add(ring);
                managedObjects.push(ring);
                ringsCreated++;
            }
        }
        
        console.log(`[useBoulderVisualizer] Successfully created ${ringsCreated} rings out of ${settings.ringCount} attempted`);
    }, [boulderData, settings.ringCount, createSingleRing, managedObjects]);

    const createAttemptLines = useCallback(() => {
        if (!boulderData || !settings.showAttemptLines) return;
        
        console.log(`[useBoulderVisualizer] Creating ${settings.attemptCount} attempt lines`);
        
        const centerRadius = settings.baseRadius * settings.combinedSize;
        const maxRadius = (settings.baseRadius * settings.combinedSize + (settings.ringCount * settings.ringSpacing) + 8) * settings.maxRadiusScale;
        
        let linesCreated = 0;
        for (let i = 0; i < settings.attemptCount; i++) {
            // Calculate base angle with equal spacing
            const baseAngle = (i / settings.attemptCount) * Math.PI * 2;
            
            // Add random distribution to the angle
            const randomOffset = (seededRandom(i * 123.456) - 0.5) * settings.attemptWaveEffect * Math.PI * 2;
            const angle = baseAngle + randomOffset;
            
            // Generate random end radius (some complete, some fail at different points)
            const completionRate = seededRandom(i * 789.123);
            const endRadius = centerRadius + (maxRadius - centerRadius) * (0.2 + completionRate * 0.8);
            
            // Calculate Z height based on line length (shorter lines = higher Z)
            const lineLength = endRadius - centerRadius;
            const maxLineLength = maxRadius - centerRadius;
            const lengthRatio = 1 - (lineLength / maxLineLength); // Inverted: shorter = higher ratio
            const zHeight = lengthRatio * settings.attemptZHeight * 2;
            
            // Create line points
            const points = [];
            const segments = 20; // Number of segments for wave effect
            
            for (let j = 0; j <= segments; j++) {
                const t = j / segments;
                const currentRadius = centerRadius + (endRadius - centerRadius) * t;
                
                // Apply wave effect
                let waveOffset = 0;
                if (settings.attemptWaveEffect > 0) {
                    waveOffset = Math.sin(t * Math.PI * 4 + i * 0.5) * settings.attemptWaveEffect * 0.5;
                }
                
                const x = Math.cos(angle + waveOffset) * currentRadius;
                const y = Math.sin(angle + waveOffset) * currentRadius;
                const z = zHeight * t; // Z increases along the line
                
                points.push(new THREE.Vector3(x, y, z));
            }
            
            // Create line geometry
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            // Create gradient colors for stroke fade (outside 100% opacity, inside 0% opacity)
            const colors = [];
            for (let j = 0; j <= segments; j++) {
                const t = j / segments;
                const opacity = t; // 0 at center, 1 at outside
                const color = new THREE.Color(0x00ffff);
                colors.push(color.r * opacity, color.g * opacity, color.b * opacity);
            }
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            
            // Create line material
            const material = new THREE.LineBasicMaterial({ 
                vertexColors: true, 
                transparent: true, 
                opacity: 0.7,
                linewidth: 2
            });
            
            const line = new THREE.Line(geometry, material);
            attemptLinesRef.current.add(line);
            managedObjects.push(line);
            
            // Add dot at the end of the line
            const dotGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const dotMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff, 
                transparent: true, 
                opacity: 0.8 
            });
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            
            const lastPoint = points[points.length - 1];
            dot.position.set(lastPoint.x, lastPoint.y, lastPoint.z);
            
            attemptLinesRef.current.add(dot);
            managedObjects.push(dot);
            linesCreated++;
        }
        
        console.log(`[useBoulderVisualizer] Successfully created ${linesCreated} attempt lines out of ${settings.attemptCount} attempted`);
    }, [boulderData, settings, managedObjects]);

    const createVisualization = useCallback(() => {
        if (!boulderData) return;
        
        console.log(`[useBoulderVisualizer] Creating visualization for boulder: ${boulderData.name} with ${boulderData.moves.length} moves`);
        
        clearSceneObjects();
        scene.add(ringsRef.current);
        scene.add(attemptLinesRef.current);
        scene.add(moveLinesRef.current);
        scene.add(moveSegmentsRef.current);

        const gradeColor = colors.gradeColors[boulderData.grade] || 0x00ffcc;
        if (helvetikerFont) {
            createCenterText(boulderData.moves.length, gradeColor as number);
            console.log(`[useBoulderVisualizer] Created center text with font`);
        } else {
            const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
            const sphereMat = new THREE.MeshBasicMaterial({ color: gradeColor, transparent: true, opacity: 0.8 });
            centerTextRef.current = new THREE.Mesh(sphereGeo, sphereMat);
            scene.add(centerTextRef.current);
            managedObjects.push(centerTextRef.current);
            console.log(`[useBoulderVisualizer] Created center sphere (font not loaded)`);
        }
        createLiquidRings();
        createAttemptLines();
        
        console.log(`[useBoulderVisualizer] Visualization creation complete. Total managed objects: ${managedObjects.length}`);
    }, [boulderData, scene, clearSceneObjects, createCenterText, createLiquidRings, colors, managedObjects, createAttemptLines]);

    // Add material-only update function - moved before useEffect
    const updateMaterialsOnly = useCallback(() => {
        // Update ring materials
        ringsRef.current.children.forEach((ring, ringIndex) => {
            if (ring instanceof THREE.LineLoop && ring.material) {
                const material = ring.material as THREE.LineBasicMaterial;
                let ringOpacity = settings.opacity * (1 - ringIndex / settings.ringCount * 0.3);
                const centerDistance = ringIndex / settings.ringCount;
                const centerFadeEffect = 1 - (settings.centerFade * Math.pow(1 - centerDistance, 2.5));
                ringOpacity *= centerFadeEffect;
                material.opacity = Math.max(0.1, ringOpacity);
                material.needsUpdate = true;
            }
        });

        // Update move line materials if they exist
        moveLinesRef.current.children.forEach(line => {
            if (line instanceof THREE.Mesh && line.material) {
                const material = line.material as THREE.MeshBasicMaterial;
                material.opacity = settings.lineOpacity;
                material.needsUpdate = true;
            }
        });

        // Update move segment materials if they exist
        moveSegmentsRef.current.children.forEach(segment => {
            if (segment instanceof THREE.Mesh && segment.material) {
                const material = segment.material as THREE.MeshBasicMaterial;
                material.opacity = settings.segmentOpacity;
                material.needsUpdate = true;
            }
        });

        // Update attempt line materials if they exist
        attemptLinesRef.current.children.forEach(line => {
            if ((line as any).material) {
                const material = (line as any).material;
                if (material instanceof THREE.LineBasicMaterial || material instanceof THREE.MeshBasicMaterial) {
                    material.opacity = settings.attemptOpacity;
                    material.needsUpdate = true;
                }
            }
        });
    }, [settings]);

    useEffect(() => {
        const newEffectiveSettings = { ...initialSettings, ...(userSettings || {}) };
        
        // Check if this is the initial mount or if we don't have a visualization yet
        const isInitialMount = prevBuiltSettingsRef.current === null;
        const hasNoVisualization = ringsRef.current.children.length === 0;
        
        // Skip effect if settings haven't changed AND we already have a visualization
        if (!isInitialMount && !hasNoVisualization && deepEqual(userSettings, prevUserSettingsRef.current)) {
            return;
        }
        
        // Update the previous settings reference
        prevUserSettingsRef.current = userSettings;

        // Only log in development and reduce frequency
        if (process.env.NODE_ENV === 'development') {
            console.log('[useBoulderVisualizer] useEffect triggered with userSettings:', {
                dynamicsMultiplier: userSettings?.dynamicsMultiplier,
                combinedSize: userSettings?.combinedSize,
                ringCount: userSettings?.ringCount,
                opacity: userSettings?.opacity,
                centerFade: userSettings?.centerFade,
                isInitialMount,
                hasNoVisualization
            });
        }

        let needsRecreation = false;
        let needsMaterialUpdate = false;

        // Check if boulder data changed
        if (boulderData && boulderData !== prevBoulderDataRef.current) {
            console.log('[useBoulderVisualizer] Boulder data changed from', prevBoulderDataRef.current?.name, 'to', boulderData.name);
            needsRecreation = true;
            prevBoulderDataRef.current = boulderData;
        }
        
        // Check if threshold key changed (for threshold-based updates)
        if (boulderData && (boulderData as any)._thresholdKey && 
            prevBoulderDataRef.current && (prevBoulderDataRef.current as any)._thresholdKey !== (boulderData as any)._thresholdKey) {
            console.log('[useBoulderVisualizer] Threshold key changed:', (boulderData as any)._thresholdKey);
            needsRecreation = true;
            prevBoulderDataRef.current = boulderData;
        }

        // Check if move count changed (important for live data)
        const currentMoveCount = boulderData?.moves?.length || 0;
        if (currentMoveCount !== prevMoveCountRef.current) {
            console.log(`[useBoulderVisualizer] Move count changed from ${prevMoveCountRef.current} to ${currentMoveCount} - will rebuild circles`);
            needsRecreation = true;
            prevMoveCountRef.current = currentMoveCount;
        }

        // Define which settings require full recreation vs just material updates
        const structuralChangeKeys: (keyof VisualizerSettings)[] = [
            'ringCount', 'baseRadius', 'ringSpacing', 'curveResolution', 'combinedSize', 'liquidSize',
            'dynamicsMultiplier', 'organicNoise', 'depthEffect', 'cruxEmphasis', 'centerTextSize',
            'showAttemptLines', 'attemptCount', 'attemptZHeight', 'attemptWaveEffect', 'maxRadiusScale'
        ];

        const materialChangeKeys: (keyof VisualizerSettings)[] = [
            'opacity', 'centerFade', 'lineOpacity', 'segmentOpacity', 'attemptOpacity'
        ];

        // Check if settings actually changed (only if not initial mount)
        let hasSettingsChanged = false;
        if (!isInitialMount && userSettings && prevBuiltSettingsRef.current) {
            // Check for structural changes
            for (const key of structuralChangeKeys) {
                if (newEffectiveSettings[key] !== prevBuiltSettingsRef.current[key]) {
                    console.log(`[useBoulderVisualizer] Structural change detected: ${key} changed from ${prevBuiltSettingsRef.current[key]} to ${newEffectiveSettings[key]}`);
                    needsRecreation = true;
                    hasSettingsChanged = true;
                    break;
                }
            }

            // Check for material changes
            if (!needsRecreation) {
                for (const key of materialChangeKeys) {
                    if (newEffectiveSettings[key] !== prevBuiltSettingsRef.current[key]) {
                        console.log(`[useBoulderVisualizer] Material change detected: ${key} changed from ${prevBuiltSettingsRef.current[key]} to ${newEffectiveSettings[key]}`);
                        needsMaterialUpdate = true;
                        hasSettingsChanged = true;
                        break;
                    }
                }
            }
        } else if (isInitialMount) {
            // On initial mount, we need to create the visualization
            needsRecreation = true;
            hasSettingsChanged = true;
        }

        // Only update internal state if settings actually changed or it's initial mount
        if (hasSettingsChanged || isInitialMount) {
            console.log('[useBoulderVisualizer] Dispatching settings update');
            dispatch({ type: 'UPDATE_SETTINGS', payload: userSettings });
        }
        
        // Force recreation if we have boulder data and need to create/update visualization
        if (boulderData && (needsRecreation || needsMaterialUpdate || hasNoVisualization)) {
            const startTime = performance.now();
            
            if (needsRecreation || hasNoVisualization) {
                console.log('[useBoulderVisualizer] Creating/recreating visualization', { 
                    reason: hasNoVisualization ? 'no visualization' : 'changes detected',
                    isInitialMount,
                    needsRecreation 
                });
                createVisualization();
            } else {
                console.log('[useBoulderVisualizer] Updating materials only');
                updateMaterialsOnly();
            }
            
            const endTime = performance.now();
            console.log(`[useBoulderVisualizer] Update completed in ${(endTime - startTime).toFixed(2)}ms`);
            
            prevBuiltSettingsRef.current = newEffectiveSettings;
        } else if (hasSettingsChanged) {
            // Update prevBuiltSettingsRef even without boulder data to prevent infinite loop
            console.log('[useBoulderVisualizer] Updating prevBuiltSettingsRef without boulder data');
            prevBuiltSettingsRef.current = newEffectiveSettings;
        } else {
            console.log('[useBoulderVisualizer] No update needed - boulderData:', !!boulderData, 'needsRecreation:', needsRecreation, 'needsMaterialUpdate:', needsMaterialUpdate, 'hasSettingsChanged:', hasSettingsChanged);
        }

    }, [userSettings, boulderData, createVisualization, updateMaterialsOnly, dispatch]);

    useFrame((timeState, delta) => {
        if (!boulderData) return;

        const time = timeState.clock.getElapsedTime();

        if (!settings.animationEnabled) {
            if (settings.rotationSpeed !== 0) {
                ringsRef.current.rotation.y = 0;
                attemptLinesRef.current.rotation.y = 0;
                moveLinesRef.current.rotation.y = 0;
                moveSegmentsRef.current.rotation.y = 0;
                if (centerTextRef.current) centerTextRef.current.rotation.y = 0;
            }
            return;
        }

        if (settings.rotationSpeed > 0) {
            const rotationAmount = time * settings.rotationSpeed;
            ringsRef.current.rotation.y = rotationAmount;
            attemptLinesRef.current.rotation.y = rotationAmount;
            moveLinesRef.current.rotation.y = rotationAmount;
            moveSegmentsRef.current.rotation.y = rotationAmount;
            if (centerTextRef.current) centerTextRef.current.rotation.y = rotationAmount;
        } else {
            ringsRef.current.rotation.y = 0;
            attemptLinesRef.current.rotation.y = 0;
            moveLinesRef.current.rotation.y = 0;
            moveSegmentsRef.current.rotation.y = 0;
            if (centerTextRef.current) centerTextRef.current.rotation.y = 0;
        }

        if (settings.liquidEffect) {
            const waveTime = settings.liquidSpeed > 0 ? time * settings.liquidSpeed : 0;

            ringsRef.current.children.forEach((ring, ringIndex) => {
                if (ring instanceof THREE.LineLoop) {
                    const geometry = ring.geometry as THREE.BufferGeometry;
                    const positions = geometry.attributes.position.array as Float32Array;
                    let originalPositions = geometry.userData.originalPositions as Float32Array;

                    if (!originalPositions) {
                        geometry.userData.originalPositions = positions.slice();
                        originalPositions = geometry.userData.originalPositions;
                    }
                    
                    const pointCount = positions.length / 3;
                    const ringProgress = ringIndex / settings.ringCount;

                    for (let i = 0; i < pointCount; i++) {
                        const angle = (i / pointCount) * Math.PI * 2;
                        const baseRadiusForPoint = Math.sqrt(
                            originalPositions[i * 3] * originalPositions[i * 3] +
                            originalPositions[i * 3 + 1] * originalPositions[i * 3 + 1]
                        );
                        const baseZForPoint = originalPositions[i * 3 + 2];

                        let currentRadius = baseRadiusForPoint;
                        
                        const dynamicWave = Math.sin(angle * 1.0 * 5 + waveTime * 2) *
                                       settings.organicNoise * ringProgress * 0.5;
                        currentRadius += dynamicWave;
                        
                        const dynamicZOffset = Math.sin(angle * 1.0 * 2 + waveTime) *
                                          settings.depthEffect * ringProgress * 0.5;

                        positions[i * 3] = Math.cos(angle) * currentRadius;
                        positions[i * 3 + 1] = Math.sin(angle) * currentRadius;
                        positions[i * 3 + 2] = baseZForPoint + dynamicZOffset;
                    }
                    geometry.attributes.position.needsUpdate = true;
                }
            });
        }
    });

    return { 
        settings, 
        colors, 
        ringsRef, 
        centerTextRef, 
        attemptLinesRef,
        moveLinesRef,
        moveSegmentsRef
    };
} 