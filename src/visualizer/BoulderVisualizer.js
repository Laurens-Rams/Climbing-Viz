import * as THREE from 'three';

export class BoulderVisualizer {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.rings = [];
        this.moveSegments = [];
        this.moveLines = [];
        this.startLabel = null;
        this.boulder = null;
        this.centerText = null;
        this.attemptLines = [];
        
        // Performance monitoring
        this.performanceStats = {
            frameCount: 0,
            lastFrameTime: performance.now(),
            averageFPS: 60,
            renderTime: 0
        };
        
        // Animation control
        this.isAnimating = false;
        
        // Update throttling and debouncing
        this.updateTimeout = null;
        this.liveDataUpdateTimeout = null;
        this.lastLiveDataUpdate = 0;
        this.lastAppliedSettings = null;
        
        // Color variables that can be changed
        this.colors = {
            cruxMove: 0xDE501B,      // Magenta/purple for crux moves
            normalMove: 0x0CFFDB,    // Purple for normal moves
            gradeColors: {
                'V1': 0x60e2e8,     // Light blue (3)
                'V2': 0x60e2e8,     // Light blue (3)
                'V3': 0x60e2e8,     // Light blue (3)
                'V4': 0xfddf59,     // Green (4-5)
                'V5': 0x004aac,     // Green (4-5)
                'V6': 0xff914f,     // Yellow (5A-6A)
                'V7': 0xff3333,     // Blue (6A-6B)
                'V8': 0x1a1a1a,     // Orange (6B-6C)
                'V9': 0x1a1a1a      // Dark grey (>6C) - more visible than pure black
            }
        };
        
        // Settings
        this.settings = {
            baseRadius: 2.5,         // Inner radius where all rings start
            maxRadius: 12.0,         // Maximum radius for highest dynamics
            ringCount: 28,           // Number of concentric circles (was 45, now 28 as shown)
            ringSpacing: 0.0,        // Spacing between rings (was 0.005, now 0 as shown)
            opacity: 1.0,            // Line opacity (matches current)
            curveResolution: 240,    // Reduced from 480 to 240 for better performance
            dynamicsMultiplier: 4.9, // How much dynamics affect radius (was 4.4, now 4.9 as shown)
            centerTextSize: 1.0,     // Size of center grade text
            showMoveNumbers: true,   // Show move sequence numbers
            liquidEffect: true,      // Enable liquid wave effect
            organicNoise: 0.1,       // Amount of organic noise (was 0.05, now 0.1 as shown)
            cruxEmphasis: 3.0,       // How much to emphasize crux moves (matches current)
            moveEmphasis: 0.0,       // How much to emphasize all moves equally (matches current)
            waveComplexity: 1.0,     // Complexity of wave patterns
            depthEffect: 2.0,        // 3D depth effect strength (was 0.6, now 2.0 as shown)
            centerFade: 1.0,         // How much lines fade near center (was 0.95, now 1.0 as shown)
            showMoveSegments: false,  // Show background move segments (changed from true)
            segmentOpacity: 0.25,    // Opacity of move segments (increased from 0.15)
            segmentGap: 0.06,        // Gap between segments (0.0-0.2)
            showMoveLines: false,     // Show radial lines at move peaks (changed from true)
            lineLength: 4,           // Length of radial lines
            lineOpacity: 1,          // Opacity of move lines (matches current)
            dotSize: 0.07,           // Size of dots at line ends
            dotOpacity: 1,           // Opacity of dots
            radiusMultiplier: 1.2,   // Overall radius multiplier (was 1.0, now 1.2 as shown)
            showAttempts: true,      // Show attempt visualization layer
            attemptOpacity: 0.55,    // Opacity of attempt lines (updated to match screenshot)
            attemptWaviness: 0.124,  // How wavy the attempt lines are (updated to match screenshot)
            attemptFadeStrength: 1.8, // How strong the fade effect is (updated to match screenshot)
            attemptThickness: 0.3,   // Base thickness of attempt lines (updated to match screenshot)
            attemptIntensity: 0.6,   // Visual intensity multiplier (updated to match screenshot)
            maxAttempts: 65,         // Maximum number of attempts to show (updated to match screenshot)
            attemptRadius: 2.55,     // Multiplier for attempt end radius (updated to match screenshot)
            moveDetectionThreshold: 15.0, // Added for live data detection
            magnitudeThreshold: 1.5,   // Lowered for live accelerometer data (was 15)
            minMoveDuration: 0.2,    // Reduced minimum duration for more responsive detection (was 0.3)
            maxTimeBetweenMoves: 1.5,  // Reduced max time between moves for live data (was 2.0)
            lineWidth: 0.02,           // Added for line width setting
            attemptDotZOffsetMax: 0.85, // Max Z offset for dots (updated to match screenshot)
            attemptDotZEffectStrength: 1.6 // Strength of Z offset effect (updated to match screenshot)
        };
        
        this.init();
        this.setupEventListeners();
        this.lastAppliedSettings = { ...this.settings }; // Initialize lastAppliedSettings
    }
    
    init() {
        // Setup high-quality renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // High DPI support
        this.renderer.setClearColor(0x0a0a0a, 1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Better color accuracy
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better tone mapping
        this.renderer.toneMappingExposure = 1.0;
        
        // Ensure canvas is visible
        this.renderer.domElement.style.display = 'block';
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '1';
        
        this.container.appendChild(this.renderer.domElement);
        
        // Setup camera for front view
        this.camera.position.set(0, 0, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Setup scene
        this.setupLighting();
        this.setupControls();
        this.setupEventListeners();
        
        // Start the animation loop
        this.start();
        
        console.log('BoulderVisualizer initialized - Canvas added to container');
        console.log('Canvas dimensions:', this.renderer.domElement.width, 'x', this.renderer.domElement.height);
        console.log('Container:', this.container);
        console.log('Animation loop started');
    }
    
    // Simple seeded random number generator for consistent results
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    setupLighting() {
        // Minimal ambient light since we're using MeshBasicMaterial (unaffected by lighting)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);
        
        // Reduced lighting since MeshBasicMaterial doesn't respond to lights anyway
        // Keeping minimal lighting for any future materials that might need it
    }
    
    setupControls() {
        // Simple mouse controls for rotation and zoom
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.currentRotationX = 0;
        this.currentRotationY = 0;
        
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            isMouseDown = true;
            mouseX = event.clientX;
            mouseY = event.clientY;
        });
        
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (isMouseDown) {
                const deltaX = event.clientX - mouseX;
                const deltaY = event.clientY - mouseY;
                
                this.targetRotationY += deltaX * 0.01;
                this.targetRotationX += deltaY * 0.01;
                this.targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.targetRotationX));
                
                mouseX = event.clientX;
                mouseY = event.clientY;
            }
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
        
        this.renderer.domElement.addEventListener('wheel', (event) => {
            const zoom = event.deltaY * 0.01;
            this.camera.position.multiplyScalar(1 + zoom);
            this.camera.position.clampLength(8, 50);
        });
    }
    
    updateCamera() {
        // Smooth camera rotation - called from main animation loop
        this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.1;
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.1;
        
        const radius = this.camera.position.length();
        this.camera.position.x = radius * Math.sin(this.currentRotationY) * Math.cos(this.currentRotationX);
        this.camera.position.y = radius * Math.sin(this.currentRotationX);
        this.camera.position.z = radius * Math.cos(this.currentRotationY) * Math.cos(this.currentRotationX);
        this.camera.lookAt(0, 0, 0);
    }
    
    setupEventListeners() {
        this.resizeHandler = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Maintain high DPI on resize
        };
        
        window.addEventListener('resize', this.resizeHandler);
    }
    
    loadBoulder(boulder) {
        console.log('BoulderVisualizer.loadBoulder called with:', boulder);
        console.log('Boulder moves:', boulder.moves);
        console.log('Number of moves:', boulder.moves?.length);
        
        this.boulder = boulder;
        this.createVisualization();
        
        console.log('BoulderVisualizer.createVisualization completed');
    }
    
    async createVisualization() {
        // Clear existing visualization
        this.clearScene();
        
        if (!this.boulder) {
            console.log('No boulder data available for visualization');
            return;
        }
        
        console.log(`Creating visualization for boulder: ${this.boulder.name} with ${this.boulder.moves?.length || 0} moves`);
        
        // Create background move segments (pizza slices)
        this.createMoveSegments();
        console.log(`Created ${this.moveSegments?.length || 0} move segments`);
        
        // Create radial move lines
        this.createMoveLines();
        console.log(`Created ${this.moveLines?.length || 0} move lines`);
        
        // Create center grade display (async for font loading)
        await this.createCenterGrade();
        console.log('Created center grade display');
        
        // Create concentric rings with liquid effect
        this.createLiquidRings();
        console.log(`Created ${this.rings?.length || 0} liquid rings`);
        
        // Create attempt visualization layer
        this.createAttemptVisualization();
        console.log(`Created ${this.attemptLines?.length || 0} attempt lines`);
        
        console.log(`Total scene objects: ${this.scene.children.length}`);
        
        // Debug: Check if renderer and scene are working
        console.log('Renderer size:', this.renderer.getSize(new THREE.Vector2()));
        console.log('Camera position:', this.camera.position);
        console.log('Scene children:', this.scene.children.map(child => child.type));
        
        // Force a render to ensure something is visible
        this.renderer.render(this.scene, this.camera);
    }
    
    clearScene() {
        const disposeMesh = (mesh) => {
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(material => material.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        };

        // Clear all visualization elements with proper disposal
        [...this.rings, ...this.moveSegments, ...this.moveLines, ...this.attemptLines].forEach(element => {
            if (element) {
                disposeMesh(element);
                this.scene.remove(element);
            }
        });

        // Clear center elements
        if (this.startLabel) {
            disposeMesh(this.startLabel);
            this.scene.remove(this.startLabel);
            this.startLabel = null;
        }

        if (this.centerText) {
            disposeMesh(this.centerText);
            this.scene.remove(this.centerText);
            this.centerText = null;
        }

        if (this.centerCircle) {
            disposeMesh(this.centerCircle);
            this.scene.remove(this.centerCircle);
            this.centerCircle = null;
        }

        // Clear arrays
        this.rings.length = 0;
        this.moveSegments.length = 0;
        this.moveLines.length = 0;
        this.attemptLines.length = 0;
        
        console.log(`[BoulderVisualizer] Scene cleared, remaining objects: ${this.scene.children.length}`);
    }
    
    async createCenterGrade() {
        // Create a colored circle in the center with the CSV name or move count
        // Since we no longer have grades, we'll use a default color or base it on move count
        const moveCount = this.boulder.moves?.length || 0;
        const gradeColor = this.getColorForMoveCount(moveCount);
        
        // Create center circle that fills the base radius completely - make it very transparent
        const centerGeometry = new THREE.CircleGeometry(this.settings.baseRadius * this.settings.radiusMultiplier, 64);
        const centerMaterial = new THREE.MeshBasicMaterial({ 
            color: gradeColor,
            transparent: true,
            opacity: 0.1 // Very low opacity to avoid dark square
        });
        this.centerCircle = new THREE.Mesh(centerGeometry, centerMaterial);
        this.scene.add(this.centerCircle);
        
        // Create text using move count or CSV name
        await this.createCenterText(moveCount, gradeColor);
    }
    
    getColorForMoveCount(moveCount) {
        // Color based on move count (difficulty estimation)
        if (moveCount <= 5) return 0x4CAF50;      // Green - Easy
        if (moveCount <= 8) return 0xFFC107;      // Yellow - Moderate  
        if (moveCount <= 12) return 0xFF9800;     // Orange - Hard
        if (moveCount <= 16) return 0xF44336;     // Red - Very Hard
        return 0x9C27B0;                          // Purple - Extreme
    }
    
    async loadCustomFont() {
        // Check if the font is already loaded
        if (document.fonts && document.fonts.check) {
            try {
                // Check if TT-Supermolot font is loaded
                const fontLoaded = document.fonts.check('bold 16px TT-Supermolot-Neue-Trial-Expanded-Bold');
                if (!fontLoaded) {
                    console.log('[BoulderVisualizer] Loading TT-Supermolot font...');
                    await document.fonts.load('bold 16px TT-Supermolot-Neue-Trial-Expanded-Bold');
                    console.log('[BoulderVisualizer] TT-Supermolot font loaded successfully');
                }
                return true;
            } catch (error) {
                console.warn('[BoulderVisualizer] Font loading failed:', error);
                return false;
            }
        }
        return false;
    }

    async createCenterText(moveCount, gradeColor) {
        // Ensure font is loaded
        await this.loadCustomFont();
        
        // Create high-resolution canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;  // Higher resolution
        canvas.height = 512;
        
        // Make canvas background transparent
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Load and use the TT-Supermolot font
        const fontFamily = 'TT-Supermolot-Neue-Trial-Expanded-Bold, Arial, sans-serif';
        
        // Set font and text properties with higher resolution
        context.font = `bold 220px ${fontFamily}`; // Smaller font size (was 280px)
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Fill text with white color
        context.fillStyle = '#ffffff';
        
        // Display move count centered in the middle, slightly down
        const displayText = moveCount.toString();
        context.fillText(displayText, canvas.width / 2, canvas.height / 2 + 15); // Moved down by 15px (was 20px)
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create plane geometry for the text
        const textGeometry = new THREE.PlaneGeometry(2.5 * this.settings.centerTextSize, 2.5 * this.settings.centerTextSize); // Smaller geometry (was 3.2)
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.95,
            alphaTest: 0.1 // This helps remove dark edges
        });
        
        this.centerText = new THREE.Mesh(textGeometry, textMaterial);
        this.centerText.position.z = 0.01; // Place slightly in front of center circle
        this.scene.add(this.centerText);
    }
    
    createMoveSegments() {
        if (!this.settings.showMoveSegments) return;
        
        const moveCount = this.boulder.moves.length;
        if (moveCount <= 0) return; // Safety check
        
        this.moveSegments = [];
        
        // Calculate the maximum radius for the background segments
        const maxRadius = (this.settings.baseRadius + (this.settings.ringCount * this.settings.ringSpacing) + 2) * this.settings.radiusMultiplier;
        const innerRadius = this.settings.baseRadius * this.settings.radiusMultiplier; // Start exactly at the center circle edge
        
        // Validate radii
        if (innerRadius >= maxRadius) return;
        
        // Calculate angle per move
        const anglePerMove = (Math.PI * 2) / moveCount;
        const gapAngle = Math.min(anglePerMove * this.settings.segmentGap, anglePerMove * 0.8); // Cap gap at 80% of segment
        const segmentAngle = Math.max(anglePerMove - gapAngle, 0.01); // Minimum segment angle
        
        for (let i = 0; i < moveCount; i++) {
            // Start at 12 o'clock (top) by adding PI/2 to the angle
            const startAngle = i * anglePerMove + gapAngle / 2 + Math.PI / 2;
            
            // Create segment using custom geometry to avoid RingGeometry issues
            const segmentGeometry = this.createSegmentGeometry(innerRadius, maxRadius, startAngle, segmentAngle);
            
            // Create material - grey background
            const segmentMaterial = new THREE.MeshBasicMaterial({
                color: 0x404040, // Dark grey
                transparent: true,
                opacity: this.settings.segmentOpacity,
                side: THREE.DoubleSide
            });
            
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            segment.position.z = -0.5; // Place further behind other elements
            
            this.moveSegments.push(segment);
            this.scene.add(segment);
            
            // Create outer ring for stronger color
            const outerRingGeometry = this.createSegmentGeometry(maxRadius - 0.3, maxRadius, startAngle, segmentAngle);
            
            const outerRingMaterial = new THREE.MeshBasicMaterial({
                color: 0x606060, // Slightly lighter grey for outer ring
                transparent: true,
                opacity: this.settings.segmentOpacity * 1.7, // Stronger outer ring
                side: THREE.DoubleSide
            });
            
            const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
            outerRing.position.z = -0.4; // Place slightly in front of main segment but still behind rings
            
            this.moveSegments.push(outerRing);
            this.scene.add(outerRing);
        }
    }
    
    createSegmentGeometry(innerRadius, outerRadius, startAngle, segmentAngle) {
        const geometry = new THREE.BufferGeometry();
        
        // Number of segments for smooth curves
        const segments = Math.max(8, Math.floor(segmentAngle / (Math.PI / 16))); // Adaptive segments based on angle
        
        const vertices = [];
        const indices = [];
        
        // Create vertices for the ring segment
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (i / segments) * segmentAngle;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            // Inner vertex
            vertices.push(innerRadius * cos, innerRadius * sin, 0);
            // Outer vertex
            vertices.push(outerRadius * cos, outerRadius * sin, 0);
        }
        
        // Create triangles
        for (let i = 0; i < segments; i++) {
            const base = i * 2;
            
            // First triangle
            indices.push(base, base + 1, base + 2);
            // Second triangle
            indices.push(base + 1, base + 3, base + 2);
        }
        
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    createMoveLines() {
        if (!this.settings.showMoveLines) return;
        
        const moveCount = this.boulder.moves.length;
        if (moveCount <= 0) return;
        
        this.moveLines = [];
        
        // Calculate the base radius where lines start (from center/inner circle)
        const startRadius = this.settings.baseRadius * this.settings.radiusMultiplier;
        
        for (let i = 0; i < moveCount; i++) {
            const move = this.boulder.moves[i];
            
            // Calculate angle for this move (center of the move segment)
            const anglePerMove = (Math.PI * 2) / moveCount;
            const moveAngle = i * anglePerMove + Math.PI / 2;
            
            // Calculate line length based on move characteristics
            const baseDynamics = isFinite(move.dynamics) ? move.dynamics : 0.5;
            
            // Enhanced dynamics scaling similar to the rings
            const enhancedDynamics = baseDynamics < 0.3 ? 
                baseDynamics * 0.8 : // Keep low values even lower
                Math.pow(baseDynamics, 1.2) * (1 + 0.5); // Amplify higher values
            
            // Add crux emphasis to line length
            let cruxMultiplier = 1.0;
            if (move.isCrux) {
                cruxMultiplier = 1.0 + (this.settings.cruxEmphasis * 0.3); // 30% of crux emphasis affects length
            }
            
            // Calculate variable line length based on move characteristics
            const baseLineLength = this.settings.lineLength;
            const dynamicsLengthMultiplier = 0.5 + (enhancedDynamics * 1.5); // Range from 0.5x to 2.0x base length
            const variableLineLength = baseLineLength * dynamicsLengthMultiplier * cruxMultiplier;
            
            const lineEndRadius = startRadius + (variableLineLength * this.settings.radiusMultiplier);
            
            // Calculate line start and end positions
            const startX = Math.cos(moveAngle) * startRadius;
            const startY = Math.sin(moveAngle) * startRadius;
            const endX = Math.cos(moveAngle) * lineEndRadius;
            const endY = Math.sin(moveAngle) * lineEndRadius;
            
            // Calculate line thickness based on move dynamics and global lineWidth setting
            const baseThickness = this.settings.lineWidth; // Use global line width setting
            const dynamicsThickness = baseThickness * (0.5 + enhancedDynamics * 2.0); // Variable thickness
            const cruxThickness = move.isCrux ? dynamicsThickness * 1.5 : dynamicsThickness; // Crux moves get thicker lines
            
            // Create thick line using TubeGeometry for proper radius control
            const linePoints = [
                new THREE.Vector3(startX, startY, 0),
                new THREE.Vector3(endX, endY, 0)
            ];
            
            const lineCurve = new THREE.CatmullRomCurve3(linePoints);
            const tubeGeometry = new THREE.TubeGeometry(lineCurve, 1, cruxThickness, 8, false);
            
            // Get base move color (crux vs normal)
            const baseMoveColor = move.isCrux ? this.colors.cruxMove : this.colors.normalMove;
            
            // Create line color: 90% white + 10% move color
            const whiteColor = new THREE.Color(0xffffff);
            const moveColor = new THREE.Color(baseMoveColor);
            const lineColor = whiteColor.clone().lerp(moveColor, 0.1); // 90% white, 10% move color
            
            // Create line material
            const lineMaterial = new THREE.MeshBasicMaterial({
                color: lineColor,
                transparent: true,
                opacity: this.settings.lineOpacity
            });
            
            // Create line mesh
            const line = new THREE.Mesh(tubeGeometry, lineMaterial);
            this.moveLines.push(line);
            this.scene.add(line);
        }
    }
    
    createAttemptVisualization() {
        if (!this.settings.showAttempts) return;
        
        // Skip attempt visualization for live data boulders
        if (this.boulder && this.boulder.isLiveData) {
            console.log('[BoulderVisualizer] Skipping attempt visualization for live data boulder');
            this.attemptLines = [];
            return;
        }
        
        this.attemptLines = [];
        const attempts = this.generateAttemptData();
        
        // Calculate the maximum radius for attempt lines
        const maxRadius = (this.settings.baseRadius + (this.settings.ringCount * this.settings.ringSpacing) + 0.5) * this.settings.radiusMultiplier;
        
        attempts.forEach(attempt => {
            this.createAttemptLine(attempt, maxRadius);
        });
    }
    
    createAttemptLine(attempt, maxRadius) {
        const { angle, completionPercent, attemptIndex, totalAttempts } = attempt;
        
        // Create a single line for this specific attempt
        this.createSingleAttemptLine(attempt, maxRadius);
    }
    
    createSingleAttemptLine(attempt, maxRadius) {
        const { angle, completionPercent, attemptIndex, totalAttempts } = attempt;
        
        // Start exactly at the edge of the center circle (same radius and Z position)
        const startRadius = this.settings.baseRadius * this.settings.radiusMultiplier; // Exact edge of center circle
        
        // Make completion percentage more dramatic - use exponential scaling
        // This ensures short attempts stay much closer to center
        const dramaticCompletion = Math.pow(completionPercent, 1.8); // Exponential curve makes low values much smaller
        
        const adjustedMaxRadius = maxRadius * this.settings.attemptRadius; // Configurable max radius for attempts
        const endRadius = startRadius + (adjustedMaxRadius - startRadius) * dramaticCompletion;
        
        // Debug logging for first few attempts
        if (attemptIndex < 3) {
            console.log(`Attempt ${attemptIndex}: completion=${completionPercent.toFixed(3)}, dramatic=${dramaticCompletion.toFixed(3)}, startRadius=${startRadius.toFixed(1)}, endRadius=${endRadius.toFixed(1)}`);
        }
        
        const lineAngle = angle; // Use the direct random angle for this attempt
        
        // Introduce a unique random seed for this specific attempt's wave pattern
        const attemptSpecificRandomPhase = this.seededRandom(this.boulder.id + attemptIndex * 12.345) * Math.PI * 2;

        // Calculate lineOpacity first as it's needed by the fade overlay
        let calculatedLineOpacity = this.settings.attemptOpacity; // Simplified: directly use attemptOpacity

        // Calculate the wave offset at the completion point for dot positioning
        const completionWave1 = Math.sin(completionPercent * Math.PI * 2 + attemptIndex + attemptSpecificRandomPhase) * this.settings.attemptWaviness * completionPercent * 0.6;
        const completionWave2 = Math.sin(completionPercent * Math.PI * 4 + attemptIndex * 2 + attemptSpecificRandomPhase) * this.settings.attemptWaviness * completionPercent * 0.3;
        const completionWave3 = Math.sin(completionPercent * Math.PI * 6 + attemptIndex * 3 + attemptSpecificRandomPhase) * this.settings.attemptWaviness * completionPercent * 0.1;
        const completionWaveOffset = completionWave1 + completionWave2 + completionWave3;
        const completionWaveAngle = lineAngle + completionWaveOffset;
        
        // Create the completion point (where the person fell/finished) - positioned at the wave
        const completionX = Math.cos(completionWaveAngle) * endRadius;
        const completionY = Math.sin(completionWaveAngle) * endRadius;
        
        // Create wavy line points from start to completion point
        const points = [];
        const segments = Math.max(20, Math.floor((endRadius - startRadius) * 4)); // More segments for smoother lines
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const currentRadius = startRadius + (endRadius - startRadius) * t;
            
            // Enhanced wavy effect with longer wavelengths and multiple frequencies, plus attempt-specific phase
            const wave1 = Math.sin(t * Math.PI * 2 + attemptIndex + attemptSpecificRandomPhase) * this.settings.attemptWaviness * t * 0.6;
            const wave2 = Math.sin(t * Math.PI * 4 + attemptIndex * 2 + attemptSpecificRandomPhase) * this.settings.attemptWaviness * t * 0.3;
            const wave3 = Math.sin(t * Math.PI * 6 + attemptIndex * 3 + attemptSpecificRandomPhase) * this.settings.attemptWaviness * t * 0.1;
            const waveOffset = wave1 + wave2 + wave3;
            const waveAngle = lineAngle + waveOffset;
            
            const x = Math.cos(waveAngle) * currentRadius;
            const y = Math.sin(waveAngle) * currentRadius;
            
            // Start at center circle Z position (0) and apply progressive Z-offset
            // Shorter attempts (lower completion) get more Z-offset as they progress
            const centerCircleZ = 0.0; // Same Z as center circle
            const progressiveZOffset = this.settings.attemptDotZOffsetMax * (1 - completionPercent) * this.settings.attemptDotZEffectStrength * t;
            const z = centerCircleZ + progressiveZOffset;
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        // Calculate line thickness based on attempts and settings
        const thicknessMultiplier = this.settings.attemptThickness;
        
        // Create thick line using TubeGeometry for proper thickness control (like move lines)
        const attemptCurve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(attemptCurve, points.length - 1, 0.03 * thicknessMultiplier, 8, false);
        
        // Use simple white color like the working move lines
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff, // Solid white like other working lines
            transparent: true,
            opacity: calculatedLineOpacity
        });
        
        // Create tube mesh
        const line = new THREE.Mesh(tubeGeometry, material);
        this.attemptLines.push(line);
        this.scene.add(line);
        
        // Add completion point dot for each line (showing where they fell)
        // Use the actual last point from the wavy line for perfect positioning
        const lastPoint = points[points.length - 1];
        // New dotSize calculation: smaller and more dependent on completionPercent
        const dotSize = 0.015 + 0.03 * completionPercent; 
        const dotGeometry = new THREE.SphereGeometry(dotSize, 10, 6); // Reduced segments for performance
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: calculatedLineOpacity * 0.9
        });
        
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        // Use the same Z calculation as the line end for perfect alignment
        dot.position.set(lastPoint.x, lastPoint.y, lastPoint.z);
        
        this.attemptLines.push(dot);
        this.scene.add(dot);
        
        // Create fade effect from completion point back to center (overlay effect)
        if (attemptIndex < 5) { // Only for first few attempts to avoid too much visual noise with fully random attempts
            this.createFadeOverlay(lastPoint.x, lastPoint.y, startRadius, lineAngle, calculatedLineOpacity); // Pass calculatedLineOpacity
        }
    }
    
    createFadeOverlay(completionX, completionY, startRadius, angle, baseLineOpacity) { // baseLineOpacity is now effectively settings.attemptOpacity
        // Create a fade effect from completion point back toward center
        const fadePoints = [];
        const fadeSegments = 15;
        
        const completionRadius = Math.sqrt(completionX * completionX + completionY * completionY);
        
        for (let i = 0; i <= fadeSegments; i++) {
            const t = i / fadeSegments;
            const currentRadius = completionRadius - (completionRadius - startRadius) * t;
            
            const x = Math.cos(angle) * currentRadius;
            const y = Math.sin(angle) * currentRadius;
            const z = 0.12; // Slightly below main lines
            
            fadePoints.push(new THREE.Vector3(x, y, z));
        }
        
        const fadeGeometry = new THREE.BufferGeometry().setFromPoints(fadePoints);
        
        // Create fade colors - bright at completion, transparent toward center
        const fadeColors = [];
        const brightColor = new THREE.Color(0xffffff);
        const transparentColor = new THREE.Color(0x333333);
        
        for (let i = 0; i <= fadeSegments; i++) {
            const t = i / fadeSegments;
            const fadeIntensity = 1 - t; // Bright at start (completion), fade toward center
            
            const color = transparentColor.clone().lerp(brightColor, fadeIntensity);
            fadeColors.push(color.r, color.g, color.b);
        }
        
        fadeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(fadeColors, 3));
        
        const fadeMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: baseLineOpacity * 0.15, // Make it even more subtle if lines are solid white
            linewidth: 3
        });
        
        const fadeLine = new THREE.Line(fadeGeometry, fadeMaterial);
        this.attemptLines.push(fadeLine);
        this.scene.add(fadeLine);
    }

    createLiquidRings() {
        if (!this.boulder || !this.boulder.moves || this.boulder.moves.length < 2) {
            console.warn('[BoulderVisualizer] Cannot create rings: insufficient boulder data');
            return;
        }
        
        console.log(`[BoulderVisualizer] Creating ${this.settings.ringCount} liquid rings for ${this.boulder.moves.length} moves`);
        
        const moveCount = this.boulder.moves.length;
        let successfulRings = 0;
        let failedRings = 0;
        
        for (let ringIndex = 0; ringIndex < this.settings.ringCount; ringIndex++) {
            try {
                const ring = this.createSingleRing(ringIndex, moveCount);
                if (ring) {
                    this.rings.push(ring);
                    this.scene.add(ring);
                    successfulRings++;
                } else {
                    failedRings++;
                    console.warn(`[BoulderVisualizer] Failed to create ring ${ringIndex}`);
                }
            } catch (error) {
                failedRings++;
                console.error(`[BoulderVisualizer] Error creating ring ${ringIndex}:`, error);
            }
        }
        
        console.log(`[BoulderVisualizer] Ring creation complete: ${successfulRings} successful, ${failedRings} failed`);
        
        if (successfulRings === 0) {
            console.error('[BoulderVisualizer] No rings were created successfully!');
        }
    }
    
    createSingleRing(ringIndex, moveCount) {
        // Safety checks for valid boulder and moves
        if (!this.boulder || !this.boulder.moves || this.boulder.moves.length === 0) {
            console.warn('[BoulderVisualizer] No boulder moves available for ring creation');
            return null;
        }

        // Ensure we have enough moves for meaningful visualization
        if (moveCount < 2) {
            console.warn('[BoulderVisualizer] Insufficient moves for ring creation, need at least 2 moves');
            return null;
        }

        // Find min and max dynamics for normalization
        const allDynamics = this.boulder.moves.map(move => isFinite(move.dynamics) ? move.dynamics : 0.5);
        const minDynamics = Math.min(...allDynamics);
        const maxDynamics = Math.max(...allDynamics);
        const dynamicsRange = maxDynamics - minDynamics;

        const baseRadius = (this.settings.baseRadius + (ringIndex * (this.settings.ringSpacing + 0.001))) * this.settings.radiusMultiplier;
        
        // Validate base radius
        if (!isFinite(baseRadius) || baseRadius <= 0) {
            console.warn('[BoulderVisualizer] Invalid base radius calculated:', baseRadius);
            return null;
        }
        
        const points = [];
        
        // Reduce detail level for performance - adaptive based on ring count
        const detailLevel = Math.min(Math.max(moveCount * 6, 12), 48); // Reduced max from moveCount * 8 to 6, capped at 48
        const ringProgress = ringIndex / this.settings.ringCount;
        
        for (let i = 0; i < detailLevel; i++) {
            const normalizedPosition = i / detailLevel;
            // Start at 12 o'clock (top) by adding PI/2 to the angle
            const angle = normalizedPosition * Math.PI * 2 + Math.PI / 2;
            
            // Find the closest moves for interpolation
            const movePosition = normalizedPosition * moveCount;
            const moveIndex1 = Math.floor(movePosition) % moveCount;
            const moveIndex2 = (moveIndex1 + 1) % moveCount;
            const lerpFactor = movePosition - Math.floor(movePosition);
            
            // Safety check for move existence
            const move1 = this.boulder.moves[moveIndex1];
            const move2 = this.boulder.moves[moveIndex2];
            
            if (!move1 || !move2) {
                console.warn(`[BoulderVisualizer] Missing move data at indices ${moveIndex1}, ${moveIndex2}`);
                continue;
            }
            
            // Interpolate dynamics between moves (with fallback values and validation)
            const dynamics1 = isFinite(move1.dynamics) ? move1.dynamics : 0.5;
            const dynamics2 = isFinite(move2.dynamics) ? move2.dynamics : 0.5;
            const rawDynamics = dynamics1 * (1 - lerpFactor) + dynamics2 * lerpFactor;
            
            // Normalize dynamics: map lowest move to 0, highest to 1
            const dynamics = dynamicsRange > 0 ? (rawDynamics - minDynamics) / dynamicsRange : 0;
            
            // Validate dynamics value
            if (!isFinite(dynamics)) {
                console.warn('[BoulderVisualizer] Invalid dynamics calculated, using fallback');
                continue;
            }
            
            // Calculate base radius for this ring
            let radius = baseRadius;
            
            // Add dramatic dynamics effect with exponential scaling
            // Correct approach: scale based on move dynamics - low dynamics = all rings close, high dynamics = all rings spike
            let enhancedDynamics;
            if (dynamics < 0.3) {
                // Low dynamics moves: ALL rings stay very close to base radius
                enhancedDynamics = dynamics * 0.1; // Minimal expansion for low dynamics moves
            } else if (dynamics < 0.6) {
                // Medium dynamics moves: moderate expansion for all rings
                enhancedDynamics = 0.03 + (dynamics - 0.3) * 1.5; // Gradual increase
            } else {
                // High dynamics moves: ALL rings create dramatic spikes
                enhancedDynamics = 0.48 + Math.pow(dynamics - 0.6, 2.5) * 8.0; // Dramatic spikes for high dynamics
            }
            
            // Apply ring progression multiplier for visual depth (but not extreme)
            const ringProgressMultiplier = 1 + ringProgress * 1.2; // Moderate progression for depth
            enhancedDynamics *= ringProgressMultiplier;
            
            const dynamicsEffect = enhancedDynamics * this.settings.dynamicsMultiplier;
            
            // Validate dynamics effect
            if (!isFinite(dynamicsEffect)) {
                console.warn('[BoulderVisualizer] Invalid dynamics effect, skipping');
                continue;
            }
            
            // Create liquid wave effect - outer rings get more dramatic
            const waveAmplitude = dynamicsEffect * Math.pow(ringProgress, 0.6);
            radius += waveAmplitude;
            
            // Add complex organic noise for more natural look
            const complexity = this.settings.waveComplexity;
            const noiseFreq1 = normalizedPosition * Math.PI * (8 * complexity);
            const noiseFreq2 = normalizedPosition * Math.PI * (12 * complexity);
            const noiseFreq3 = normalizedPosition * Math.PI * (16 * complexity);
            
            const noise = (
                Math.sin(noiseFreq1) * 0.15 + 
                Math.sin(noiseFreq2) * 0.08 + 
                Math.sin(noiseFreq3) * 0.04
            ) * waveAmplitude * this.settings.organicNoise;
            radius += noise;
            
            // Add crux emphasis - only at the exact crux move positions
            let cruxBoost = 0;
            for (let j = 0; j < moveCount; j++) {
                const move = this.boulder.moves[j];
                if (move && move.isCrux) {
                    const cruxPosition = j / moveCount;
                    let distance = Math.abs(normalizedPosition - cruxPosition);
                    
                    // Handle wrap-around distance
                    distance = Math.min(distance, 1 - distance);
                    
                    // Very tight range for crux emphasis - only affects the exact move
                    const cruxRange = 0.02; // Much smaller range than color fade
                    if (distance < cruxRange) {
                        const cruxStrength = 1 - (distance / cruxRange);
                        const moveDynamics = isFinite(move.dynamics) ? move.dynamics : 0.5;
                        const moveBoost = moveDynamics * this.settings.cruxEmphasis * 0.3 * cruxStrength;
                        cruxBoost = Math.max(cruxBoost, moveBoost);
                    }
                }
            }
            radius += cruxBoost * ringProgress;
            
            // Add move emphasis - applies to all moves equally
            let moveBoost = 0;
            if (this.settings.moveEmphasis > 0) {
                for (let j = 0; j < moveCount; j++) {
                    const move = this.boulder.moves[j];
                    if (move) {
                        const movePosition = j / moveCount;
                        let distance = Math.abs(normalizedPosition - movePosition);
                        
                        // Handle wrap-around distance
                        distance = Math.min(distance, 1 - distance);
                        
                        // Same range as crux emphasis for consistency
                        const moveRange = 0.02;
                        if (distance < moveRange) {
                            const moveStrength = 1 - (distance / moveRange);
                            const moveDynamics = isFinite(move.dynamics) ? move.dynamics : 0.5;
                            const boost = moveDynamics * this.settings.moveEmphasis * 0.3 * moveStrength;
                            moveBoost = Math.max(moveBoost, boost);
                        }
                    }
                }
            }
            radius += moveBoost * ringProgress;
            
            // Add turbulence for more dramatic effect
            const turbulence1 = Math.sin(normalizedPosition * Math.PI * 20 + ringIndex * 0.5) * 0.05;
            const turbulence2 = Math.cos(normalizedPosition * Math.PI * 15 + ringIndex * 0.3) * 0.03;
            radius += (turbulence1 + turbulence2) * waveAmplitude;
            
            // Add subtle randomness for organic feel (but consistent per ring and boulder)
            const boulderSeed = this.boulder.id ? (typeof this.boulder.id === 'string' ? this.boulder.id.length * 123.456 : this.boulder.id * 123.456) : 123.456;
            const seedValue = Math.sin(normalizedPosition * 1000 + ringIndex * 100 + boulderSeed);
            const randomness = seedValue * 0.08 * waveAmplitude;
            radius += randomness;
            
            // Final validation of radius
            if (!isFinite(radius) || radius <= 0) {
                console.warn('[BoulderVisualizer] Invalid radius calculated, using base radius');
                radius = baseRadius;
            }
            
            // Calculate position with enhanced Z variation for 3D effect
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const zWave1 = Math.sin(angle * 4 + ringIndex * 0.2) * ringProgress;
            const zWave2 = Math.cos(angle * 6 + ringIndex * 0.15) * ringProgress * 0.5;
            const z = (zWave1 + zWave2) * this.settings.depthEffect;
            
            // Validate all coordinates
            if (isFinite(x) && isFinite(y) && isFinite(z)) {
                points.push(new THREE.Vector3(x, y, z));
            } else {
                console.warn('[BoulderVisualizer] Invalid coordinates calculated, skipping point:', { x, y, z });
            }
        }
        
        // Ensure we have enough points for CatmullRomCurve3
        if (points.length < 4) {
            console.warn('[BoulderVisualizer] Insufficient valid points for curve creation:', points.length);
            return null;
        }
        
        try {
            // Create smooth curve with higher tension for more dramatic curves
            const ringCurve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.3);
            const smoothPoints = ringCurve.getPoints(this.settings.curveResolution);
            
            // Remove duplicate point if it exists
            if (smoothPoints.length > 1) {
                smoothPoints.pop();
            }
            
            // Validate smooth points
            const validSmoothPoints = smoothPoints.filter(point => 
                isFinite(point.x) && isFinite(point.y) && isFinite(point.z)
            );
            
            if (validSmoothPoints.length === 0) {
                console.warn('[BoulderVisualizer] No valid smooth points generated');
                return null;
            }
            
            // Create geometry with vertex colors
            const geometry = new THREE.BufferGeometry().setFromPoints(validSmoothPoints);
            const colors = [];
            
            for (let i = 0; i < validSmoothPoints.length; i++) {
                const normalizedPosition = i / validSmoothPoints.length;
                
                // Find the closest moves for color interpolation
                const movePosition = normalizedPosition * moveCount;
                const moveIndex1 = Math.floor(movePosition) % moveCount;
                const moveIndex2 = (moveIndex1 + 1) % moveCount;
                
                // Safety check for move existence
                const move1 = this.boulder.moves[moveIndex1];
                const move2 = this.boulder.moves[moveIndex2];
                
                // Calculate crux influence with smooth fade
                let cruxInfluence = 0;
                
                // Check distance to nearest crux moves
                for (let j = 0; j < moveCount; j++) {
                    const move = this.boulder.moves[j];
                    if (move && move.isCrux) {
                        const cruxPosition = j / moveCount;
                        let distance = Math.abs(normalizedPosition - cruxPosition);
                        
                        // Handle wrap-around distance
                        distance = Math.min(distance, 1 - distance);
                        
                        // Fade distance (adjust this to control fade range)
                        const fadeRange = 0.12; // Slightly wider fade for magenta color
                        if (distance < fadeRange) {
                            const fadeStrength = 1 - (distance / fadeRange);
                            cruxInfluence = Math.max(cruxInfluence, fadeStrength);
                        }
                    }
                }
                
                // Interpolate between normal and crux colors
                const normalColor = new THREE.Color(this.colors.normalMove);
                const cruxColor = new THREE.Color(this.colors.cruxMove);
                const finalColor = normalColor.lerp(cruxColor, cruxInfluence);
                
                colors.push(finalColor.r, finalColor.g, finalColor.b);
            }
            
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            
            // Create material with enhanced visual effects and center fade
            let ringOpacity = this.settings.opacity * (1 - ringIndex / this.settings.ringCount * 0.3);
            
            // Apply center fade for slab effect (closer to center = more transparent)
            const centerDistance = ringIndex / this.settings.ringCount;
            // Make center fade much stronger and more aggressive towards center
            const centerFadeEffect = 1 - (this.settings.centerFade * Math.pow(1 - centerDistance, 2.5));
            ringOpacity *= centerFadeEffect;
            
            const material = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: Math.max(0.1, ringOpacity), // Minimum opacity
                linewidth: 2, // Thicker lines for more impact
                blending: THREE.AdditiveBlending // Additive blending for glow effect
            });
            
            // Create line mesh
            const mesh = new THREE.LineLoop(geometry, material);
            
            return mesh;
            
        } catch (error) {
            console.error('[BoulderVisualizer] Error creating ring curve:', error);
            return null;
        }
    }
    
    updateSettings(newSettings) {
        const updateStart = performance.now();
        
        // Debounce rapid updates
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
            this._performSettingsUpdate(newSettings);
        }, 16); // ~60fps debouncing
    }
    
    _performSettingsUpdate(newSettings) {
        const updateStart = performance.now();
        
        console.log('[BoulderVisualizer] Updating settings:', Object.keys(newSettings));
        
        if (!this.lastAppliedSettings) {
            this.lastAppliedSettings = { ...this.settings };
        }
        
        // Update internal settings
        Object.assign(this.settings, newSettings);
        
        // Detect changes more precisely
        const changedSettings = {};
        Object.keys(newSettings).forEach(key => {
            if (this.lastAppliedSettings[key] !== this.settings[key]) {
                changedSettings[key] = this.settings[key];
            }
        });
        
        if (Object.keys(changedSettings).length > 0) {
            // Define settings categories
            const structuralSettings = [
                'baseRadius', 'maxRadius', 'ringCount', 'ringSpacing', 'curveResolution',
                'dynamicsMultiplier', 'liquidEffect', 'organicNoise', 'waveComplexity',
                'showMoveSegments', 'showMoveLines', 'showAttempts'
            ];
            
            const materialSettings = [
                'opacity', 'centerFade', 'depthEffect', 'segmentOpacity', 'lineOpacity',
                'dotOpacity', 'attemptOpacity'
            ];
            
            const immediateSettings = ['radiusMultiplier'];
            
            const hasStructuralChanges = structuralSettings.some(key => changedSettings.hasOwnProperty(key));
            const hasMaterialChanges = materialSettings.some(key => changedSettings.hasOwnProperty(key));
            const hasImmediateChanges = immediateSettings.some(key => changedSettings.hasOwnProperty(key));
            
            // Prevent unnecessary full recreations
            if (hasStructuralChanges) {
                console.log('Structural settings changed, recreating visualization:', Object.keys(changedSettings).filter(k => structuralSettings.includes(k)));
                this.createVisualization();
            } else if (hasMaterialChanges || hasImmediateChanges) {
                console.log('Material/immediate settings changed, updating materials only:', Object.keys(changedSettings).filter(k => materialSettings.includes(k) || immediateSettings.includes(k)));
                this.updateMaterialsOnly();
            }

            // Always render after changes
            this.renderer.render(this.scene, this.camera);
            this.lastAppliedSettings = { ...this.settings };
            
            const updateEnd = performance.now();
            const updateTime = updateEnd - updateStart;
            
            if (updateTime > 100) {
                console.warn(`[BoulderVisualizer] Slow settings update: ${updateTime.toFixed(2)}ms for ${Object.keys(changedSettings).join(', ')}`);
            }
        } else {
            // No changes detected, just render
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    getPerformanceStats() {
        return {
            fps: this.performanceStats.averageFPS,
            renderTime: this.performanceStats.renderTime,
            frameCount: this.performanceStats.frameCount,
            sceneObjects: this.scene.children.length
        };
    }
    
    updateColors(newColors) {
        Object.assign(this.colors, newColors);
        if (this.boulder) {
            // Color changes always need full recreation for proper vertex colors
            this.createVisualization();
        }
    }
    
    updateMaterialsOnly() {
        console.log('Updating materials only...');
        let updatedCount = 0;
        
        // Update ring materials without recreating geometry
        this.rings.forEach((ring, ringIndex) => {
            if (ring.material) {
                let ringOpacity = this.settings.opacity * (1 - ringIndex / this.settings.ringCount * 0.3);
                const centerDistance = ringIndex / this.settings.ringCount;
                const centerFadeEffect = 1 - (this.settings.centerFade * Math.pow(1 - centerDistance, 2.5));
                ringOpacity *= centerFadeEffect;
                ring.material.opacity = Math.max(0.1, ringOpacity);
                ring.material.needsUpdate = true;
                updatedCount++;
            }
        });
        
        // Update move line materials (only tube lines now, no dots or arrows)
        this.moveLines.forEach(line => {
            if (line.material && line.material.type === 'MeshBasicMaterial') {
                line.material.opacity = this.settings.lineOpacity;
                line.material.needsUpdate = true;
                updatedCount++;
            }
        });
        
        // Update move segment materials
        this.moveSegments.forEach(segment => {
            if (segment.material) {
                segment.material.opacity = this.settings.segmentOpacity;
                segment.material.needsUpdate = true;
                updatedCount++;
            }
        });
        
        // Update attempt line materials
        this.attemptLines.forEach(line => {
            if (line.material && line.material.type === 'LineBasicMaterial') {
                // For attempt lines, maintain the original opacity calculation
                line.material.opacity = this.settings.attemptOpacity;
                line.material.needsUpdate = true;
                updatedCount++;
            } else if (line.material && line.material.type === 'MeshBasicMaterial') {
                // For attempt dots
                line.material.opacity = this.settings.attemptOpacity;
                line.material.needsUpdate = true;
                updatedCount++;
            }
        });
        
        // Update center circle if it exists
        if (this.centerCircle && this.centerCircle.material) {
            // Center circle opacity doesn't change with settings, keep at 0.8
        }
        
        console.log(`Updated ${updatedCount} materials`);
    }
    
    animate() {
        if (!this.isAnimating) return; // Add flag to control animation
        
        const frameStart = performance.now();
        
        this.updateCamera(); // Update camera in main loop instead of separate loop
        
        const renderStart = performance.now();
        this.renderer.render(this.scene, this.camera);
        const renderEnd = performance.now();
        
        // Update performance stats
        this.performanceStats.renderTime = renderEnd - renderStart;
        this.performanceStats.frameCount++;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.performanceStats.lastFrameTime;
        
        // Calculate FPS every 60 frames
        if (this.performanceStats.frameCount % 60 === 0) {
            this.performanceStats.averageFPS = 1000 / (deltaTime / 60);
            
            // Log performance warning if FPS drops below 30
            if (this.performanceStats.averageFPS < 30) {
                console.warn(`[BoulderVisualizer] Low FPS detected: ${this.performanceStats.averageFPS.toFixed(1)} FPS, Render time: ${this.performanceStats.renderTime.toFixed(2)}ms`);
            }
        }
        
        this.performanceStats.lastFrameTime = currentTime;
        
        requestAnimationFrame(() => this.animate());
    }
    
    start() {
        this.isAnimating = true;
        this.animate();
    }
    
    stop() {
        this.isAnimating = false;
    }
    
    dispose() {
        // Stop animation
        this.stop();
        
        // Clear any pending timeouts
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
        
        if (this.liveDataUpdateTimeout) {
            clearTimeout(this.liveDataUpdateTimeout);
            this.liveDataUpdateTimeout = null;
        }
        
        // Dispose of all geometries and materials to prevent memory leaks
        this.clearScene();
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Remove event listeners
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        console.log('[BoulderVisualizer] Disposed successfully');
    }

    // Live data support for remote streaming
    updateWithLiveData(dataBuffer) {
        if (!dataBuffer || !dataBuffer.time || dataBuffer.time.length === 0) {
            console.warn('[BoulderVisualizer] Invalid or empty data buffer received');
            return;
        }

        // Throttle live data updates to prevent performance issues
        const now = performance.now();
        if (this.lastLiveDataUpdate && (now - this.lastLiveDataUpdate) < 200) { // 200ms throttle
            return;
        }
        this.lastLiveDataUpdate = now;

        console.log(`[BoulderVisualizer] Updating with live data: ${dataBuffer.time.length} points`);

        try {
            // Create a temporary boulder object from live data
            const liveBoulder = this.createLiveBoulder(dataBuffer);
            
            // Only update visualization if we have valid data
            if (liveBoulder) {
                console.log(`[BoulderVisualizer] Created live boulder with ${liveBoulder.moves.length} moves`);
                
                // Store the current boulder as live data
                this.boulder = liveBoulder;
                
                // Batch the visualization update to prevent conflicts
                if (this.liveDataUpdateTimeout) {
                    clearTimeout(this.liveDataUpdateTimeout);
                }
                
                this.liveDataUpdateTimeout = setTimeout(() => {
                    // Force a complete visualization update
                    this.createVisualization();
                    
                    // Ensure immediate render
                    if (this.renderer) {
                        this.renderer.render(this.scene, this.camera);
                    }
                    
                    console.log('[BoulderVisualizer] Live data visualization updated successfully');
                }, 50); // Small delay to batch updates
                
            } else {
                console.warn('[BoulderVisualizer] No valid boulder data created from live data');
            }
        } catch (error) {
            console.error('[BoulderVisualizer] Error updating with live data:', error);
        }
    }

    createLiveBoulder(dataBuffer) {
        if (!dataBuffer || !dataBuffer.time || dataBuffer.time.length === 0) {
            console.warn('[BoulderVisualizer] No valid data buffer provided');
            return null;
        }

        // Convert buffer data to raw data format
        const rawData = [];
        for (let i = 0; i < dataBuffer.time.length; i++) {
            // Validate each data point
            const time = dataBuffer.time[i];
            const accX = dataBuffer.accX[i];
            const accY = dataBuffer.accY[i];
            const accZ = dataBuffer.accZ[i];
            
            if (isNaN(time) || isNaN(accX) || isNaN(accY) || isNaN(accZ) ||
                !isFinite(time) || !isFinite(accX) || !isFinite(accY) || !isFinite(accZ)) {
                continue; // Skip invalid data points
            }
            
            rawData.push({
                time: time,
                accX: accX,
                accY: accY,
                accZ: accZ
            });
        }

        if (rawData.length < 10) {
            console.warn('[BoulderVisualizer] Insufficient valid data points for boulder creation:', rawData.length);
            return null;
        }

        // Calculate magnitudes
        const magnitudes = rawData.map(point => {
            const magnitude = Math.sqrt(point.accX * point.accX + point.accY * point.accY + point.accZ * point.accZ);
            return isFinite(magnitude) ? magnitude : 0;
        });

        // Detect moves using the improved algorithm
        const detectedMoves = this.detectMovesFromLiveData(rawData, magnitudes);
        
        // Convert detected moves to boulder format
        const moves = [];
        
        // Always add a starting position
        if (rawData.length > 0) {
            moves.push({
                id: 0,
                time: rawData[0].time,
                type: 'start',
                dynamics: 0, // Start move always has dynamics 0
                isCrux: false,
                x: 0,
                y: 0,
                z: 0,
                accX: rawData[0].accX,
                accY: rawData[0].accY,
                accZ: rawData[0].accZ
            });
        }
        
        // Add detected moves
        detectedMoves.forEach((move, index) => {
            // Validate and sanitize move coordinates
            const x = isFinite(move.x) ? move.x : Math.cos(index * 0.8) * (25 + index * 5);
            const y = isFinite(move.y) ? move.y : Math.sin(index * 0.8) * (25 + index * 5);
            const z = isFinite(move.z) ? move.z : Math.max(0, index * 2);
            
            moves.push({
                id: index + 1,
                time: move.time,
                type: 'move',
                dynamics: Math.max(0.1, Math.min(1.0, move.intensity || 0.5)),
                isCrux: move.magnitude > (this.settings.magnitudeThreshold * 1.5),
                x: x,
                y: y,
                z: z,
                magnitude: move.magnitude,
                duration: move.duration,
                accX: rawData[move.index]?.accX || 0,
                accY: rawData[move.index]?.accY || 0,
                accZ: rawData[move.index]?.accZ || 0
            });
        });

        // Ensure we have at least 2 moves for visualization
        if (moves.length < 2) {
            // Add a default end move if we don't have enough
            const lastDataPoint = rawData[rawData.length - 1];
            moves.push({
                id: moves.length,
                time: lastDataPoint.time,
                type: 'end',
                dynamics: 0.3,
                isCrux: false,
                x: 20,
                y: 20,
                z: 5,
                accX: lastDataPoint.accX,
                accY: lastDataPoint.accY,
                accZ: lastDataPoint.accZ
            });
        }

        // Calculate statistics
        const totalTime = rawData[rawData.length - 1].time - rawData[0].time;
        const avgMagnitude = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;
        const maxMagnitude = Math.max(...magnitudes);
        
        // Determine grade based on move count and intensity
        let grade = 'V1';
        if (moves.length >= 8 || maxMagnitude > 30) grade = 'V4';
        else if (moves.length >= 6 || maxMagnitude > 25) grade = 'V3';
        else if (moves.length >= 4 || maxMagnitude > 20) grade = 'V2';

        const liveBoulder = {
            id: 'live-data',
            name: `Live Boulder (${moves.length} moves)`,
            grade: grade,
            moves: moves,
            attempts: [], // No attempts for live data
            stats: {
                totalMoves: moves.length,
                totalTime: totalTime,
                avgMagnitude: avgMagnitude.toFixed(2),
                maxMagnitude: maxMagnitude.toFixed(2),
                dataPoints: rawData.length
            },
            isLiveData: true,
            timestamp: new Date().toISOString()
        };

        console.log('[BoulderVisualizer] Created live boulder:', {
            name: liveBoulder.name,
            grade: liveBoulder.grade,
            moves: liveBoulder.moves.length,
            stats: liveBoulder.stats
        });

        return liveBoulder;
    }

    detectMovesFromLiveData(rawData, magnitudes) {
        if (!rawData || !magnitudes || rawData.length < 10) {
            console.log('[BoulderVisualizer] Insufficient data for move detection:', rawData?.length || 0);
            return [];
        }

        const moves = [];
        
        // Get threshold from DataViz integration for consistency
        let threshold = 12.0; // Default fallback
        try {
            const dataVizContainer = document.querySelector('.data-viz-container');
            const thresholdInput = dataVizContainer?.querySelector('#threshold');
            if (thresholdInput && thresholdInput.value) {
                threshold = parseFloat(thresholdInput.value);
                console.log(`[BoulderVisualizer] Using threshold from DataViz: ${threshold}`);
            } else {
                console.log(`[BoulderVisualizer] Using default threshold: ${threshold}`);
            }
        } catch (error) {
            console.warn('[BoulderVisualizer] Could not get threshold from DataViz, using default:', threshold);
        }
        
        const minMoveDuration = 0.3; // Minimum duration for a valid move
        const maxTimeBetweenMoves = 2.0; // Maximum time between moves
        
        let lastMoveTime = -maxTimeBetweenMoves;
        
        console.log(`[BoulderVisualizer] Live move detection with threshold: ${threshold}, data points: ${rawData.length}`);
        console.log(`[BoulderVisualizer] Magnitude range: ${Math.min(...magnitudes).toFixed(2)} - ${Math.max(...magnitudes).toFixed(2)}`);
        
        // Look for peaks above threshold with improved detection
        for (let i = 2; i < magnitudes.length - 2; i++) {
            const currentTime = rawData[i].time;
            const currentMagnitude = magnitudes[i];
            
            // Validate data point
            if (!isFinite(currentTime) || !isFinite(currentMagnitude)) {
                continue;
            }
            
            // Check if this is a significant peak above threshold
            // Use a wider window for peak detection to be more robust
            const prevMag1 = magnitudes[i - 1];
            const prevMag2 = magnitudes[i - 2];
            const nextMag1 = magnitudes[i + 1];
            const nextMag2 = magnitudes[i + 2];
            
            const isPeak = currentMagnitude > threshold && 
                          currentMagnitude > prevMag1 && 
                          currentMagnitude > prevMag2 &&
                          currentMagnitude > nextMag1 && 
                          currentMagnitude > nextMag2 &&
                          (currentTime - lastMoveTime) > minMoveDuration;
            
            if (isPeak) {
                // Calculate move position based on time progression and magnitude
                const timeProgress = (currentTime - rawData[0].time) / (rawData[rawData.length - 1].time - rawData[0].time);
                const angle = timeProgress * Math.PI * 2; // Full circle progression
                const baseRadius = 25;
                const radiusVariation = Math.min(15, currentMagnitude - threshold); // Vary radius based on intensity
                const radius = baseRadius + radiusVariation + (moves.length * 3); // Increasing radius for each move
                
                const move = {
                    time: currentTime,
                    index: i,
                    magnitude: currentMagnitude,
                    intensity: Math.min(1.0, currentMagnitude / 30), // Normalize intensity
                    duration: minMoveDuration, // Simplified duration
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                    z: Math.max(0, moves.length * 2 + (currentMagnitude - threshold) * 0.5) // Height based on move count and intensity
                };
                
                moves.push(move);
                lastMoveTime = currentTime;
                
                console.log(`[BoulderVisualizer] Detected move ${moves.length}: time=${currentTime.toFixed(2)}s, magnitude=${currentMagnitude.toFixed(2)}, position=(${move.x.toFixed(1)}, ${move.y.toFixed(1)}, ${move.z.toFixed(1)})`);
            }
        }
        
        console.log(`[BoulderVisualizer] Detected ${moves.length} moves from live data`);
        return moves;
    }

    // Check if currently displaying live data
    isDisplayingLiveData() {
        return this.currentBoulder && this.currentBoulder.isLive;
    }

    // Get live data status
    getLiveDataStatus() {
        if (!this.isDisplayingLiveData()) {
            return { isLive: false };
        }

        return {
            isLive: true,
            dataPoints: this.currentBoulder.rawData?.length || 0,
            moves: this.currentBoulder.moves?.length || 0,
            lastUpdate: Date.now()
        };
    }

    // Clear live data and reset to neutral state
    clearLiveData() {
        if (this.isDisplayingLiveData()) {
            console.log('[BoulderVisualizer] Clearing live data');
            
            // Clear the current boulder if it's live data
            this.boulder = null;
            this.currentBoulder = null;
            
            // Clear the scene
            this.clearScene();
            
            console.log('[BoulderVisualizer] Live data cleared');
        }
    }

    generateAttemptData() {
        // Generate realistic attempt data for the boulder
        const attempts = [];
        // const moveCount = this.boulder.moves.length; // Not directly used for attempt generation anymore
        
        // Use boulder ID as seed for consistent attempt positioning
        const boulderSeed = (typeof this.boulder.id === 'string' ? this.boulder.id.length * 789.123 : this.boulder.id * 789.123) || 789.123;
        
        // Loop up to maxAttempts, creating fully independent attempts
        for (let i = 0; i < this.settings.maxAttempts; i++) {
            // Each attempt gets a completely random angle
            const angle = this.seededRandom(boulderSeed + i * 100.123) * Math.PI * 2;
            
            // Generate more shorter attempts - weighted towards early failure
            // Use exponential distribution to favor shorter attempts
            const randomValue = this.seededRandom(boulderSeed + i * 200.456);
            
            // Create exponential falloff for completion percentage
            // Most attempts should fail in the first 30-50% of the route
            let completionPercent;
            if (randomValue < 0.4) {
                // 40% of attempts fail very early (10-30%)
                completionPercent = 0.1 + randomValue * 0.5; // 10-30%
            } else if (randomValue < 0.7) {
                // 30% of attempts fail in middle section (30-60%)
                completionPercent = 0.3 + (randomValue - 0.4) * 1.0; // 30-60%
            } else if (randomValue < 0.9) {
                // 20% of attempts get further (60-85%)
                completionPercent = 0.6 + (randomValue - 0.7) * 1.25; // 60-85%
            } else {
                // Only 10% of attempts complete or nearly complete (85-100%)
                completionPercent = 0.85 + (randomValue - 0.9) * 1.5; // 85-100%
            }
            
            // Ensure completion percentage stays within bounds
            completionPercent = Math.min(1.0, Math.max(0.1, completionPercent));

            attempts.push({
                angle: angle,
                completionPercent: completionPercent,
                attemptIndex: i, // Index within all attempts
                totalAttempts: this.settings.maxAttempts, // Total attempts for context if needed by fade
                // personId: i // Each attempt is its own "person" effectively
            });
        }
        
        return attempts;
    }
} 