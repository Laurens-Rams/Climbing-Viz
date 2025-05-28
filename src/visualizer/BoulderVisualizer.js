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
        
        // Color variables that can be changed
        this.colors = {
            cruxMove: 0xd624ab,      // Magenta/purple for crux moves
            normalMove: 0x39accc,    // Purple for normal moves
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
            ringCount: 45,           // Number of concentric circles (10-70)
            ringSpacing: 0.005,      // Spacing between rings
            opacity: 1.0,            // Line opacity
            curveResolution: 480,    // Smoothness of curves (always maximum)
            dynamicsMultiplier: 4.4, // How much dynamics affect radius
            centerTextSize: 1.0,     // Size of center grade text
            showMoveNumbers: true,   // Show move sequence numbers
            liquidEffect: true,      // Enable liquid wave effect
            organicNoise: 0.05,      // Amount of organic noise (reduced for subtle filter effect)
            cruxEmphasis: 3.0,       // How much to emphasize crux moves
            moveEmphasis: 0.0,       // How much to emphasize all moves equally
            waveComplexity: 1.0,     // Complexity of wave patterns
            depthEffect: 0.6,        // 3D depth effect strength
            centerFade: 0.95,        // How much lines fade near center (slab effect)
            showMoveSegments: true,  // Show background move segments (changed from false)
            segmentOpacity: 0.25,    // Opacity of move segments (increased from 0.15)
            segmentGap: 0.06,        // Gap between segments (0.0-0.2)
            showMoveLines: true,     // Show radial lines at move peaks
            lineLength: 4,           // Length of radial lines
            lineOpacity: 1,          // Opacity of move lines
            dotSize: 0.07,           // Size of dots at line ends
            dotOpacity: 1,           // Opacity of dots
            radiusMultiplier: 1.0,   // Overall radius multiplier for the entire visualization
            showAttempts: true,      // Show attempt visualization layer
            attemptOpacity: 1,       // Opacity of attempt lines
            attemptWaviness: 0.058,  // How wavy the attempt lines are
            attemptFadeStrength: 1.3, // How strong the fade effect is for multiple attempts
            attemptThickness: 0.3,   // Base thickness of attempt lines
            attemptIntensity: 2,     // Visual intensity multiplier
            maxAttempts: 45,         // Maximum number of attempts to show
            attemptRadius: 1.3,       // Multiplier for attempt end radius (relative to max radius)
            moveDetectionThreshold: 15.0 // Added for live data detection
        };
        
        this.init();
        this.setupEventListeners();
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
        
        console.log('BoulderVisualizer initialized - Canvas added to container');
        console.log('Canvas dimensions:', this.renderer.domElement.width, 'x', this.renderer.domElement.height);
        console.log('Container:', this.container);
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
        let targetRotationX = 0;
        let targetRotationY = 0;
        let currentRotationX = 0;
        let currentRotationY = 0;
        
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            isMouseDown = true;
            mouseX = event.clientX;
            mouseY = event.clientY;
        });
        
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (isMouseDown) {
                const deltaX = event.clientX - mouseX;
                const deltaY = event.clientY - mouseY;
                
                targetRotationY += deltaX * 0.01;
                targetRotationX += deltaY * 0.01;
                targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, targetRotationX));
                
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
        
        // Smooth camera rotation
        const updateCamera = () => {
            currentRotationX += (targetRotationX - currentRotationX) * 0.1;
            currentRotationY += (targetRotationY - currentRotationY) * 0.1;
            
            const radius = this.camera.position.length();
            this.camera.position.x = radius * Math.sin(currentRotationY) * Math.cos(currentRotationX);
            this.camera.position.y = radius * Math.sin(currentRotationX);
            this.camera.position.z = radius * Math.cos(currentRotationY) * Math.cos(currentRotationX);
            this.camera.lookAt(0, 0, 0);
            
            requestAnimationFrame(updateCamera);
        };
        updateCamera();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Maintain high DPI on resize
        });
    }
    
    loadBoulder(boulder) {
        console.log('BoulderVisualizer.loadBoulder called with:', boulder);
        console.log('Boulder moves:', boulder.moves);
        console.log('Number of moves:', boulder.moves?.length);
        
        this.boulder = boulder;
        this.createVisualization();
        
        console.log('BoulderVisualizer.createVisualization completed');
    }
    
    createVisualization() {
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
        
        // Create center grade display
        this.createCenterGrade();
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
        // Remove all rings
        this.rings.forEach(ring => {
            this.scene.remove(ring);
        });
        this.rings = [];
        
        // Remove move segments
        if (this.moveSegments) {
            this.moveSegments.forEach(segment => {
                this.scene.remove(segment);
            });
            this.moveSegments = [];
        }
        
        // Remove move lines
        if (this.moveLines) {
            this.moveLines.forEach(line => {
                this.scene.remove(line);
            });
            this.moveLines = [];
        }
        
        // Remove center circle
        if (this.centerCircle) {
            this.scene.remove(this.centerCircle);
            this.centerCircle = null;
        }
        
        // Remove center text
        if (this.centerText) {
            this.scene.remove(this.centerText);
            this.centerText = null;
        }
        
        // Remove attempt lines
        if (this.attemptLines) {
            this.attemptLines.forEach(line => {
                this.scene.remove(line);
            });
            this.attemptLines = [];
        }
    }
    
    createCenterGrade() {
        // Create a colored circle in the center with the CSV name or move count
        // Since we no longer have grades, we'll use a default color or base it on move count
        const moveCount = this.boulder.moves?.length || 0;
        const gradeColor = this.getColorForMoveCount(moveCount);
        
        // Create center circle that fills the base radius completely
        const centerGeometry = new THREE.CircleGeometry(this.settings.baseRadius * this.settings.radiusMultiplier, 64);
        const centerMaterial = new THREE.MeshBasicMaterial({ 
            color: gradeColor,
            transparent: true,
            opacity: 0.8
        });
        this.centerCircle = new THREE.Mesh(centerGeometry, centerMaterial);
        this.scene.add(this.centerCircle);
        
        // Create text using move count or CSV name
        this.createCenterText(moveCount, gradeColor);
    }
    
    getColorForMoveCount(moveCount) {
        // Color based on move count (difficulty estimation)
        if (moveCount <= 5) return 0x4CAF50;      // Green - Easy
        if (moveCount <= 8) return 0xFFC107;      // Yellow - Moderate  
        if (moveCount <= 12) return 0xFF9800;     // Orange - Hard
        if (moveCount <= 16) return 0xF44336;     // Red - Very Hard
        return 0x9C27B0;                          // Purple - Extreme
    }
    
    createCenterText(moveCount, gradeColor) {
        // Create high-resolution canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;  // Higher resolution
        canvas.height = 512;
        
        // Set font and text properties with higher resolution
        context.font = 'bold 280px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Fill text with white color
        context.fillStyle = '#ffffff';
        
        // Display move count in the center
        const displayText = moveCount.toString();
        context.fillText(displayText, canvas.width / 2, canvas.height / 2);
        
        // Add small label below the number
        context.font = 'bold 80px Arial';
        context.fillText('moves', canvas.width / 2, canvas.height / 2 + 120);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create plane geometry for the text
        const textGeometry = new THREE.PlaneGeometry(3.2, 3.2);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9
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
        const lineEndRadius = startRadius + (this.settings.lineLength * this.settings.radiusMultiplier);
        
        for (let i = 0; i < moveCount; i++) {
            const move = this.boulder.moves[i];
            
            // Calculate angle for this move (center of the move segment)
            // Start at 12 o'clock (top) - when i=0, angle should be -PI/2 + PI/2 = 0 (which is 3 o'clock)
            // But we want i=0 to be at top, so we need to add PI/2 to get to 12 o'clock
            const anglePerMove = (Math.PI * 2) / moveCount;
            const moveAngle = i * anglePerMove + Math.PI / 2;
            
            // Calculate line start and end positions (now starting from center going outward)
            const startX = Math.cos(moveAngle) * startRadius;
            const startY = Math.sin(moveAngle) * startRadius;
            const endX = Math.cos(moveAngle) * lineEndRadius;
            const endY = Math.sin(moveAngle) * lineEndRadius;
            
            // Create line geometry
            const lineGeometry = new THREE.BufferGeometry();
            const lineVertices = new Float32Array([
                startX, startY, 0,
                endX, endY, 0
            ]);
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(lineVertices, 3));
            
            // Line color based on move type (crux vs normal)
            const lineColor = move.isCrux ? this.colors.cruxMove : this.colors.normalMove;
            
            // Create line material
            const lineMaterial = new THREE.LineBasicMaterial({
                color: lineColor,
                transparent: true,
                opacity: this.settings.lineOpacity,
                linewidth: 2
            });
            
            // Create line mesh
            const line = new THREE.Line(lineGeometry, lineMaterial);
            this.moveLines.push(line);
            this.scene.add(line);
            
            // Create dot/arrow at the end of the line
            if (i === 0) {
                // First move gets a bigger, brighter dot
                const dotGeometry = new THREE.SphereGeometry(this.settings.dotSize * 2, 32, 16);
                const dotMaterial = new THREE.MeshBasicMaterial({
                    color: lineColor,
                    transparent: true,
                    opacity: 1.0 // Full opacity for first dot
                });
                
                const dot = new THREE.Mesh(dotGeometry, dotMaterial);
                dot.position.set(endX, endY, 0);
                
                this.moveLines.push(dot);
                this.scene.add(dot);
            } else {
                // Other moves get arrows pointing in the direction of movement
                const nextMoveIndex = (i + 1) % moveCount;
                const nextAngle = nextMoveIndex * anglePerMove + Math.PI / 2;
                
                // Calculate direction vector for arrow
                const directionAngle = nextAngle - moveAngle;
                
                const arrow = this.createArrow(endX, endY, directionAngle, lineColor);
                this.moveLines.push(arrow);
                this.scene.add(arrow);
            }
        }
        
        // No need for start label - first dot will be bigger and brighter
    }
    
    createArrow(x, y, directionAngle, color) {
        // Create arrow geometry pointing in the direction of movement
        const arrowGroup = new THREE.Group();
        
        // Arrow head (triangle)
        const arrowHeadGeometry = new THREE.ConeGeometry(this.settings.dotSize * 0.8, this.settings.dotSize * 1.5, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: this.settings.dotOpacity
        });
        
        const arrowHead = new THREE.Mesh(arrowHeadGeometry, arrowMaterial);
        
        // Rotate arrow to point in the correct direction
        // The cone points up by default, so we need to rotate it
        arrowHead.rotation.z = -directionAngle + Math.PI / 2;
        
        arrowGroup.add(arrowHead);
        arrowGroup.position.set(x, y, 0);
        
        return arrowGroup;
    }
    
    generateAttemptData() {
        // Generate realistic attempt data for the boulder
        const attempts = [];
        const moveCount = this.boulder.moves.length;
        
        // Use boulder ID as seed for consistent attempt positioning
        const boulderSeed = this.boulder.id * 789.123;
        
        // Generate random number of people based on maxAttempts setting
        const basePeople = Math.floor(this.settings.maxAttempts / 3.0); // Base number of people
        const randomVariation = this.seededRandom(boulderSeed + 999) * 0.6 - 0.3; // ±30% variation
        const numPeople = Math.max(1, Math.floor(basePeople * (1 + randomVariation)));
        
        for (let i = 0; i < numPeople; i++) {
            // Deterministic angle around the circle for this person
            // Add PI/2 to align with 12 o'clock start like other elements
            const baseAngle = this.seededRandom(boulderSeed + i * 100) * Math.PI * 2 + Math.PI / 2;
            
            // Number of attempts for this person - random but scales with maxAttempts setting
            const baseAttemptsPerPerson = Math.max(1, Math.floor(this.settings.maxAttempts / numPeople));
            
            // Create realistic distribution: some people try many times, others just a few
            const personType = this.seededRandom(boulderSeed + i * 200);
            let numAttempts;
            
            if (personType < 0.3) {
                // 30% are casual climbers (1-2 attempts)
                numAttempts = Math.floor(1 + this.seededRandom(boulderSeed + i * 201) * 1);
            } else if (personType < 0.7) {
                // 40% are regular climbers (2-4 attempts)
                numAttempts = Math.floor(2 + this.seededRandom(boulderSeed + i * 202) * 2);
            } else {
                // 30% are persistent climbers (3-6 attempts)
                numAttempts = Math.floor(3 + this.seededRandom(boulderSeed + i * 203) * 3);
            }
            
            // Scale with the controller setting
            const scaleFactor = this.settings.maxAttempts / 45; // 45 is the default maxAttempts
            numAttempts = Math.max(1, Math.floor(numAttempts * scaleFactor));
            
            // Generate multiple attempts for this person
            const personAttempts = [];
            let bestCompletion = 0;
            
            for (let attemptIndex = 0; attemptIndex < numAttempts; attemptIndex++) {
                // Each attempt has different completion percentage
                let completionPercent;
                
                if (attemptIndex === 0) {
                    // First attempt - usually lower
                    completionPercent = 0.1 + this.seededRandom(boulderSeed + i * 300 + attemptIndex) * 0.4;
                } else {
                    // Subsequent attempts - can improve or stay similar
                    const improvement = this.seededRandom(boulderSeed + i * 400 + attemptIndex) * 0.3; // Possible improvement
                    const consistency = this.seededRandom(boulderSeed + i * 500 + attemptIndex) * 0.2; // Some randomness
                    completionPercent = Math.min(1.0, bestCompletion + improvement - consistency + this.seededRandom(boulderSeed + i * 600 + attemptIndex) * 0.2);
                    completionPercent = Math.max(0.1, completionPercent); // Minimum 10%
                }
                
                bestCompletion = Math.max(bestCompletion, completionPercent);
                
                personAttempts.push({
                    angle: baseAngle, // Same angle for all attempts from this person
                    completionPercent: completionPercent,
                    attemptIndex: attemptIndex,
                    totalAttempts: numAttempts,
                    personId: i
                });
            }
            
            attempts.push(...personAttempts);
        }
        
        return attempts;
    }
    
    createAttemptVisualization() {
        if (!this.settings.showAttempts) return;
        
        this.attemptLines = [];
        const attempts = this.generateAttemptData();
        
        // Calculate the maximum radius for attempt lines
        const maxRadius = (this.settings.baseRadius + (this.settings.ringCount * this.settings.ringSpacing) + 0.5) * this.settings.radiusMultiplier;
        
        attempts.forEach(attempt => {
            this.createAttemptLine(attempt, maxRadius);
        });
    }
    
    createAttemptLine(attempt, maxRadius) {
        const { angle, completionPercent, attemptIndex, totalAttempts, personId } = attempt;
        
        // Create a single line for this specific attempt
        this.createSingleAttemptLine(attempt, maxRadius);
    }
    
    createSingleAttemptLine(attempt, maxRadius) {
        const { angle, completionPercent, attemptIndex, totalAttempts, personId } = attempt;
        
        // Start from outside the inner circle, not from center
        const startRadius = this.settings.baseRadius * this.settings.radiusMultiplier * 1.1; // Fixed start just outside inner circle
        const adjustedMaxRadius = maxRadius * this.settings.attemptRadius; // Configurable max radius for attempts
        const endRadius = startRadius + (adjustedMaxRadius - startRadius) * completionPercent;
        
        // Position attempts exactly on top of each other at the same degree
        // No offset - all attempts from same person at exact same angle
        const lineAngle = angle;
        
        // Calculate the wave offset at the completion point for dot positioning
        const completionWave1 = Math.sin(completionPercent * Math.PI * 2 + attemptIndex) * this.settings.attemptWaviness * completionPercent * 0.6;
        const completionWave2 = Math.sin(completionPercent * Math.PI * 4 + attemptIndex * 2) * this.settings.attemptWaviness * completionPercent * 0.3;
        const completionWave3 = Math.sin(completionPercent * Math.PI * 6 + attemptIndex * 3) * this.settings.attemptWaviness * completionPercent * 0.1;
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
            
            // Enhanced wavy effect with longer wavelengths and multiple frequencies
            const wave1 = Math.sin(t * Math.PI * 2 + attemptIndex) * this.settings.attemptWaviness * t * 0.6;
            const wave2 = Math.sin(t * Math.PI * 4 + attemptIndex * 2) * this.settings.attemptWaviness * t * 0.3;
            const wave3 = Math.sin(t * Math.PI * 6 + attemptIndex * 3) * this.settings.attemptWaviness * t * 0.1;
            const waveOffset = wave1 + wave2 + wave3;
            const waveAngle = lineAngle + waveOffset;
            
            const x = Math.cos(waveAngle) * currentRadius;
            const y = Math.sin(waveAngle) * currentRadius;
            const z = 0.15 + attemptIndex * 0.002; // Higher above other elements
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        // Create line geometry
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create gradient colors - bright at completion point, fade toward start
        const colors = [];
        const baseColor = new THREE.Color(0xffffff); // White base
        const fadeColor = new THREE.Color(0x666666); // Darker for fade
        
        // Calculate intensity based on number of attempts and attempt index with more dramatic fade
        const attemptIntensity = Math.min(totalAttempts / 4, 1.0) * this.settings.attemptIntensity;
        const lineIntensity = 1.0 - (attemptIndex / totalAttempts) * 0.8 * this.settings.attemptFadeStrength; // Much more dramatic fade
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            
            // Fade from completion point back toward start
            const fadeFromCompletion = t; // Brighter at completion (t=1), dimmer at start (t=0)
            const finalIntensity = attemptIntensity * lineIntensity * (0.2 + 0.8 * fadeFromCompletion);
            
            const color = fadeColor.clone().lerp(baseColor, finalIntensity);
            colors.push(color.r, color.g, color.b);
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Calculate line thickness based on attempts and settings
        const thicknessMultiplier = this.settings.attemptThickness;
        const lineOpacity = this.settings.attemptOpacity * (0.3 + 0.7 * completionPercent) * lineIntensity;
        
        // Create thick line using TubeGeometry for proper thickness control
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, points.length - 1, 0.02 * thicknessMultiplier, 8, false);
        
        // Apply colors to tube geometry
        const tubeColors = [];
        const positionAttribute = tubeGeometry.attributes.position;
        const vertexCount = positionAttribute.count;
        
        for (let i = 0; i < vertexCount; i++) {
            const segmentIndex = Math.floor(i / 16); // 8 radial segments * 2 for tube
            const t = Math.min(segmentIndex / (points.length - 1), 1);
            
            // Fade from completion point back toward start
            const fadeFromCompletion = t;
            const finalIntensity = attemptIntensity * lineIntensity * (0.2 + 0.8 * fadeFromCompletion);
            
            const color = fadeColor.clone().lerp(baseColor, finalIntensity);
            tubeColors.push(color.r, color.g, color.b);
        }
        
        tubeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tubeColors, 3));
        
        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: lineOpacity
        });
        
        // Create tube mesh
        const line = new THREE.Mesh(tubeGeometry, material);
        this.attemptLines.push(line);
        this.scene.add(line);
        
        // Add completion point dot for each line (showing where they fell)
        // Use the actual last point from the wavy line for perfect positioning
        const lastPoint = points[points.length - 1];
        const dotSize = 0.03 + (totalAttempts / 15) * 0.04; // Bigger dots for more attempts
        const dotGeometry = new THREE.SphereGeometry(dotSize, 12, 8);
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: this.settings.attemptOpacity * lineIntensity * 0.9
        });
        
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.copy(lastPoint);
        
        this.attemptLines.push(dot);
        this.scene.add(dot);
        
        // Create fade effect from completion point back to center (overlay effect)
        if (attemptIndex === 0) { // Only for first attempt to avoid too much overlap
            this.createFadeOverlay(lastPoint.x, lastPoint.y, startRadius, lineAngle, totalAttempts);
        }
    }
    
    createFadeOverlay(completionX, completionY, startRadius, angle, numAttempts) {
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
            opacity: this.settings.attemptOpacity * 0.3 * Math.min(numAttempts / 5, 1.0) * this.settings.attemptFadeStrength, // Controlled by attemptFadeStrength
            linewidth: 3
        });
        
        const fadeLine = new THREE.Line(fadeGeometry, fadeMaterial);
        this.attemptLines.push(fadeLine);
        this.scene.add(fadeLine);
    }

    createLiquidRings() {
        const moveCount = this.boulder.moves.length;
        
        // Create multiple concentric rings for liquid effect
        for (let ringIndex = 0; ringIndex < this.settings.ringCount; ringIndex++) {
            const ring = this.createSingleRing(ringIndex, moveCount);
            this.rings.push(ring);
            this.scene.add(ring);
        }
    }
    
    createSingleRing(ringIndex, moveCount) {
        const baseRadius = (this.settings.baseRadius + (ringIndex * this.settings.ringSpacing)) * this.settings.radiusMultiplier;
        const points = [];
        
        // Create much more detailed points for dramatic effect
        const detailLevel = moveCount * 8; // Much higher resolution for organic curves
        
        for (let i = 0; i < detailLevel; i++) {
            const normalizedPosition = i / detailLevel;
            // Start at 12 o'clock (top) by adding PI/2 to the angle
            const angle = normalizedPosition * Math.PI * 2 + Math.PI / 2;
            
            // Find the closest moves for interpolation
            const movePosition = normalizedPosition * moveCount;
            const moveIndex1 = Math.floor(movePosition) % moveCount;
            const moveIndex2 = (moveIndex1 + 1) % moveCount;
            const lerpFactor = movePosition - Math.floor(movePosition);
            
            const move1 = this.boulder.moves[moveIndex1];
            const move2 = this.boulder.moves[moveIndex2];
            
            // Interpolate dynamics between moves
            const dynamics = move1.dynamics * (1 - lerpFactor) + move2.dynamics * lerpFactor;
            
            // Calculate base radius for this ring
            let radius = baseRadius;
            
            // Add dramatic dynamics effect with exponential scaling
            const ringProgress = ringIndex / this.settings.ringCount;
            
            // Enhanced dynamics scaling: lower values stay lower, but outer values spike more dramatically
            // Use a more aggressive power curve that preserves low values but amplifies high values
            const enhancedDynamics = dynamics < 0.3 ? 
                dynamics * 0.8 : // Keep low values even lower
                Math.pow(dynamics, 1.2) * (1 + ringProgress * 2); // Amplify higher values more on outer rings
            
            const dynamicsEffect = enhancedDynamics * this.settings.dynamicsMultiplier;
            
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
                if (this.boulder.moves[j].isCrux) {
                    const cruxPosition = j / moveCount;
                    let distance = Math.abs(normalizedPosition - cruxPosition);
                    
                    // Handle wrap-around distance
                    distance = Math.min(distance, 1 - distance);
                    
                    // Very tight range for crux emphasis - only affects the exact move
                    const cruxRange = 0.02; // Much smaller range than color fade
                    if (distance < cruxRange) {
                        const cruxStrength = 1 - (distance / cruxRange);
                        const moveBoost = this.boulder.moves[j].dynamics * this.settings.cruxEmphasis * 0.3 * cruxStrength;
                        cruxBoost = Math.max(cruxBoost, moveBoost);
                    }
                }
            }
            radius += cruxBoost * ringProgress;
            
            // Add move emphasis - applies to all moves equally
            let moveBoost = 0;
            if (this.settings.moveEmphasis > 0) {
                for (let j = 0; j < moveCount; j++) {
                    const movePosition = j / moveCount;
                    let distance = Math.abs(normalizedPosition - movePosition);
                    
                    // Handle wrap-around distance
                    distance = Math.min(distance, 1 - distance);
                    
                    // Same range as crux emphasis for consistency
                    const moveRange = 0.02;
                    if (distance < moveRange) {
                        const moveStrength = 1 - (distance / moveRange);
                        const boost = this.boulder.moves[j].dynamics * this.settings.moveEmphasis * 0.3 * moveStrength;
                        moveBoost = Math.max(moveBoost, boost);
                    }
                }
            }
            radius += moveBoost * ringProgress;
            
            // Add turbulence for more dramatic effect
            const turbulence1 = Math.sin(normalizedPosition * Math.PI * 20 + ringIndex * 0.5) * 0.05;
            const turbulence2 = Math.cos(normalizedPosition * Math.PI * 15 + ringIndex * 0.3) * 0.03;
            radius += (turbulence1 + turbulence2) * waveAmplitude;
            
            // Add subtle randomness for organic feel (but consistent per ring and boulder)
            const boulderSeed = this.boulder.id * 123.456; // Use boulder ID as seed for consistency
            const seedValue = Math.sin(normalizedPosition * 1000 + ringIndex * 100 + boulderSeed);
            const randomness = seedValue * 0.08 * waveAmplitude;
            radius += randomness;
            
            // Calculate position with enhanced Z variation for 3D effect
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const zWave1 = Math.sin(angle * 4 + ringIndex * 0.2) * ringProgress;
            const zWave2 = Math.cos(angle * 6 + ringIndex * 0.15) * ringProgress * 0.5;
            const z = (zWave1 + zWave2) * this.settings.depthEffect;
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        // Create smooth curve with higher tension for more dramatic curves
        const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.3);
        const smoothPoints = curve.getPoints(this.settings.curveResolution);
        smoothPoints.pop(); // Remove duplicate point
        
        // Create geometry with vertex colors
        const geometry = new THREE.BufferGeometry().setFromPoints(smoothPoints);
        const colors = [];
        const pointsPerMove = this.settings.curveResolution / moveCount;
        
        for (let i = 0; i < smoothPoints.length; i++) {
            const normalizedPosition = i / smoothPoints.length;
            
            // Find the closest moves for color interpolation
            const movePosition = normalizedPosition * moveCount;
            const moveIndex1 = Math.floor(movePosition) % moveCount;
            const moveIndex2 = (moveIndex1 + 1) % moveCount;
            const lerpFactor = movePosition - Math.floor(movePosition);
            
            const move1 = this.boulder.moves[moveIndex1];
            const move2 = this.boulder.moves[moveIndex2];
            
            // Calculate crux influence with smooth fade
            let cruxInfluence = 0;
            
            // Check distance to nearest crux moves
            for (let j = 0; j < moveCount; j++) {
                if (this.boulder.moves[j].isCrux) {
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
        const centerFadeEffect = 1 - (this.settings.centerFade * (1 - centerDistance));
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
    }
    
    updateSettings(newSettings) {
        const oldSettings = { ...this.settings };
        Object.assign(this.settings, newSettings);
        
        if (this.boulder) {
            // Always do full recreation for immediate visual feedback
            // This ensures all changes are immediately visible
            console.log('Auto-reloading visualization due to settings change');
            this.createVisualization();
        }
    }
    
    updateColors(newColors) {
        Object.assign(this.colors, newColors);
        if (this.boulder) {
            // Color changes always need full recreation for proper vertex colors
            this.createVisualization();
        }
    }
    
    updateMaterialsOnly() {
        // Update ring materials without recreating geometry
        this.rings.forEach((ring, ringIndex) => {
            if (ring.material) {
                let ringOpacity = this.settings.opacity * (1 - ringIndex / this.settings.ringCount * 0.3);
                const centerDistance = ringIndex / this.settings.ringCount;
                const centerFadeEffect = 1 - (this.settings.centerFade * (1 - centerDistance));
                ringOpacity *= centerFadeEffect;
                ring.material.opacity = Math.max(0.1, ringOpacity);
            }
        });
        
        // Update move line materials
        this.moveLines.forEach(line => {
            if (line.material) {
                if (line.material.type === 'LineBasicMaterial') {
                    line.material.opacity = this.settings.lineOpacity;
                } else if (line.material.type === 'MeshBasicMaterial') {
                    line.material.opacity = this.settings.dotOpacity;
                }
            }
        });
        
        // Update move segment materials
        this.moveSegments.forEach(segment => {
            if (segment.material) {
                segment.material.opacity = this.settings.segmentOpacity;
            }
        });
        
        // Update attempt line materials
        this.attemptLines.forEach(line => {
            if (line.material && line.material.type === 'LineBasicMaterial') {
                // For attempt lines, maintain the original opacity calculation
                line.material.opacity = this.settings.attemptOpacity;
            } else if (line.material && line.material.type === 'MeshBasicMaterial') {
                // For attempt dots
                line.material.opacity = this.settings.attemptOpacity;
            }
        });
        
        // Update center circle if it exists
        if (this.centerCircle && this.centerCircle.material) {
            // Center circle opacity doesn't change with settings, keep at 0.8
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
    
    start() {
        this.animate();
    }

    // Live data support for remote streaming
    updateWithLiveData(dataBuffer) {
        if (!dataBuffer || !dataBuffer.time || dataBuffer.time.length === 0) {
            return;
        }

        // Create a temporary boulder object from live data
        const liveBoulder = this.createLiveBoulder(dataBuffer);
        
        // Update the visualization with live data
        this.loadBoulder(liveBoulder);
    }

    createLiveBoulder(dataBuffer) {
        // Convert live acceleration data to boulder format
        const rawData = [];
        for (let i = 0; i < dataBuffer.time.length; i++) {
            rawData.push({
                time: dataBuffer.time[i],
                accX: dataBuffer.accX[i],
                accY: dataBuffer.accY[i],
                accZ: dataBuffer.accZ[i]
            });
        }

        // Detect moves from live data using the same algorithm as CSV processing
        const moves = this.detectMovesFromLiveData(rawData);

        return {
            id: 'live',
            name: 'Live Data Stream',
            type: 'live',
            grade: 'V?',
            moves: moves,
            rawData: rawData,
            isLive: true
        };
    }

    detectMovesFromLiveData(rawData) {
        if (!rawData || rawData.length < 10) {
            return [];
        }

        // Use the same move detection algorithm as in boulderData.js
        const threshold = this.settings.moveDetectionThreshold || 15.0;
        const moves = [];
        let moveIndex = 0;

        // Add starting position at time 0
        if (rawData.length > 0) {
            moves.push({
                id: moveIndex++,
                time: 0,
                type: 'start',
                dynamics: 0.5,
                isCrux: false,
                accX: rawData[0].accX,
                accY: rawData[0].accY,
                accZ: rawData[0].accZ
            });
        }

        // Calculate acceleration magnitude for each point
        const accelerationMagnitudes = rawData.map(point => {
            return Math.sqrt(point.accX * point.accX + point.accY * point.accY + point.accZ * point.accZ);
        });

        // Find peaks above threshold
        for (let i = 1; i < accelerationMagnitudes.length - 1; i++) {
            const current = accelerationMagnitudes[i];
            const prev = accelerationMagnitudes[i - 1];
            const next = accelerationMagnitudes[i + 1];

            // Check if this is a peak above threshold
            if (current > threshold && current > prev && current > next) {
                // Avoid moves too close together (minimum 0.5 seconds apart)
                const lastMoveTime = moves.length > 0 ? moves[moves.length - 1].time : -1;
                if (rawData[i].time - lastMoveTime > 0.5) {
                    const dynamics = Math.min((current - 10) / 20, 1.0); // Normalize to 0-1
                    
                    moves.push({
                        id: moveIndex++,
                        time: rawData[i].time,
                        type: 'move',
                        dynamics: Math.max(0.1, dynamics),
                        isCrux: current > threshold * 1.5,
                        accX: rawData[i].accX,
                        accY: rawData[i].accY,
                        accZ: rawData[i].accZ
                    });
                }
            }
        }

        console.log(`Detected ${moves.length} moves from live data (${rawData.length} data points)`);
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
} 