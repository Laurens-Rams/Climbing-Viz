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
            curveResolution: 180,    // Smoothness of curves - now 180 points for better graphics
            dynamicsMultiplier: 2.0, // How much dynamics affect radius (reduced from 8.0 for less skew)
            centerTextSize: 1.0,     // Size of center grade text
            showMoveNumbers: true,   // Show move sequence numbers
            liquidEffect: true,      // Enable liquid wave effect
            organicNoise: 0.5,       // Amount of organic noise (reduced from 1.0)
            cruxEmphasis: 1.5,       // How much to emphasize crux moves (reduced from 3.0)
            moveEmphasis: 0.0,       // How much to emphasize all moves equally
            waveComplexity: 0.5,     // Complexity of wave patterns (reduced from 1.0)
            depthEffect: 0.3,        // 3D depth effect strength (reduced from 0.6)
            centerFade: 0.8,         // How much lines fade near center (reduced from 0.95)
            showMoveSegments: false, // Show background move segments
            segmentOpacity: 0.15,    // Opacity of move segments
            segmentGap: 0.06,        // Gap between segments (0.0-0.2)
            showMoveLines: true,     // Show radial lines at move peaks
            lineLength: 4,           // Length of radial lines
            lineOpacity: 1,          // Opacity of move lines
            dotSize: 0.1,            // Size of dots at line ends (increased from 0.07)
            dotOpacity: 1,           // Opacity of dots
            radiusMultiplier: 1.0,   // Overall radius multiplier for the entire visualization
            showAttempts: true,      // Show attempt visualization layer
            attemptOpacity: 1,       // Opacity of attempt lines
            attemptWaviness: 0.058,  // How wavy the attempt lines are
            attemptFadeStrength: 1.3, // How strong the fade effect is for multiple attempts
            attemptThickness: 0.3,   // Base thickness of attempt lines
            attemptIntensity: 2,     // Visual intensity multiplier
            maxAttempts: 45,         // Maximum number of attempts to show
            attemptRadius: 1.3,      // Multiplier for attempt end radius (relative to max radius)
            timelineSubdivision: 50  // Subdivision strength (0-100%) - controls smoothness between moves
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
        this.container.appendChild(this.renderer.domElement);
        
        // Setup camera for front view
        this.camera.position.set(0, 0, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Setup scene
        this.setupLighting();
        this.setupControls();
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
        
        // Try to get acceleration data from DataViz integration
        this.updateDynamicsFromAcceleration();
        
        this.createVisualization();
        
        console.log('BoulderVisualizer.createVisualization completed');
    }
    
    updateDynamicsFromAcceleration() {
        // Try to get acceleration data from the DataViz integration
        if (window.app && window.app.dataVizIntegration) {
            const moveAverages = window.app.dataVizIntegration.getCurrentMoveAverages();
            const heatmapData = window.app.dataVizIntegration.getCurrentHeatmapData();
            
            console.log('=== ACCELERATION DATA DEBUG ===');
            console.log('DataViz integration found:', !!window.app.dataVizIntegration);
            console.log('Move averages:', moveAverages);
            console.log('Move averages length:', moveAverages?.length);
            console.log('Heatmap data:', heatmapData);
            console.log('Current boulder moves:', this.boulder?.moves?.length);
            
            if (moveAverages && moveAverages.length > 0) {
                console.log('Using acceleration data for circle radius:', moveAverages);
                
                // Update boulder moves with real acceleration data
                this.boulder.moves.forEach((move, index) => {
                    if (moveAverages[index]) {
                        // Scale acceleration average to dynamics range
                        const accelAvg = moveAverages[index].average;
                        const maxAccel = heatmapData ? heatmapData.maxAcceleration : 1.0;
                        
                        console.log(`Processing move ${index + 1}: accelAvg=${accelAvg}, maxAccel=${maxAccel}`);
                        
                        // Validate acceleration values to prevent NaN
                        if (!isFinite(accelAvg) || !isFinite(maxAccel) || maxAccel <= 0) {
                            console.warn(`Invalid acceleration data for move ${index + 1}, using default dynamics`);
                            return; // Keep original dynamics
                        }
                        
                        // Use a much wider range (0.2 to 3.0) for more dramatic effect
                        // Apply exponential scaling to make high acceleration moves much more prominent
                        const normalizedAccel = Math.max(0, Math.min(1, accelAvg / maxAccel));
                        const exponentialScaling = Math.pow(normalizedAccel, 0.7); // Less aggressive curve
                        const dramaticDynamics = 0.2 + exponentialScaling * 2.8; // Range: 0.2 to 3.0
                        
                        console.log(`Move ${index + 1} scaling: normalized=${normalizedAccel.toFixed(3)}, exponential=${exponentialScaling.toFixed(3)}, final=${dramaticDynamics.toFixed(3)}`);
                        
                        // Final validation to ensure no NaN values
                        if (isFinite(dramaticDynamics)) {
                            const oldDynamics = move.dynamics;
                            move.dynamics = dramaticDynamics;
                            console.log(`Move ${index + 1}: accel=${accelAvg.toFixed(3)}, normalized=${normalizedAccel.toFixed(3)}, dynamics=${dramaticDynamics.toFixed(3)} (was ${oldDynamics.toFixed(3)})`);
                        } else {
                            console.warn(`Computed NaN dynamics for move ${index + 1}, keeping original value`);
                        }
                    } else {
                        console.log(`No acceleration data for move ${index + 1}`);
                    }
                });
                
                console.log('Final dynamics values:');
                this.boulder.moves.forEach((move, index) => {
                    console.log(`  Move ${index + 1}: dynamics=${move.dynamics.toFixed(3)}`);
                });
            } else {
                console.log('No acceleration data available, using default dynamics');
                console.log('Reason: moveAverages =', moveAverages, 'length =', moveAverages?.length);
            }
            console.log('=== END ACCELERATION DATA DEBUG ===');
        } else {
            console.log('No DataViz integration found');
        }
    }
    
    createVisualization() {
        // Clear existing visualization
        this.clearScene();
        
        if (!this.boulder) return;
        
        // Debug: Log current dynamics values
        console.log('Creating visualization with dynamics values:');
        this.boulder.moves.forEach((move, index) => {
            console.log(`  Move ${index + 1}: dynamics=${move.dynamics.toFixed(3)}, isCrux=${move.isCrux}`);
        });
        
        // Create background move segments (pizza slices)
        this.createMoveSegments();
        
        // Create radial move lines
        this.createMoveLines();
        
        // Create center grade display
        this.createCenterGrade();
        
        // Create concentric rings with liquid effect
        this.createLiquidRings();
        
        // Create attempt visualization layer
        this.createAttemptVisualization();
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
        // Create a colored circle in the center with the grade
        const gradeColor = this.colors.gradeColors[this.boulder.grade] || 0xffffff;
        
        // Create center circle that fills the base radius completely
        const centerGeometry = new THREE.CircleGeometry(this.settings.baseRadius * this.settings.radiusMultiplier, 64);
        const centerMaterial = new THREE.MeshBasicMaterial({ 
            color: gradeColor,
            transparent: true,
            opacity: 0.8
        });
        this.centerCircle = new THREE.Mesh(centerGeometry, centerMaterial);
        this.scene.add(this.centerCircle);
        
        // Create grade text using canvas texture
        this.createGradeText(this.boulder.grade, gradeColor);
    }
    
    createGradeText(grade, gradeColor) {
        // Create high-resolution canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;  // Higher resolution
        canvas.height = 512;
        
        // Set font and text properties with higher resolution
        context.font = 'bold 320px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Fill text with white color
        context.fillStyle = '#ffffff';
        // Extract just the number from the grade (V1 -> 1, V7 -> 7, etc.)
        const gradeNumber = grade.replace('V', '');
        context.fillText(gradeNumber, canvas.width / 2, canvas.height / 2 + 20);
        
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
        
        // Calculate angle per move using the new timeline mapping
        const anglePerMove = (Math.PI * 2) / moveCount;
        const gapAngle = Math.min(anglePerMove * this.settings.segmentGap, anglePerMove * 0.8); // Cap gap at 80% of segment
        const segmentAngle = Math.max(anglePerMove - gapAngle, 0.01); // Minimum segment angle
        
        for (let i = 0; i < moveCount; i++) {
            // Use the new timeline mapping: start at top (0°) and distribute evenly
            const normalizedPosition = i / moveCount;
            const startAngle = normalizedPosition * Math.PI * 2 - Math.PI / 2 + gapAngle / 2; // -PI/2 puts 0° at top
            
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
        if (!this.settings.showMoveLines) {
            console.log('Move lines disabled in settings');
            return;
        }
        
        const moveCount = this.boulder.moves.length;
        if (moveCount <= 0) {
            console.log('No moves to create lines for');
            return;
        }
        
        console.log(`Creating move lines and dots for ${moveCount} moves`);
        console.log('Line settings:', {
            showMoveLines: this.settings.showMoveLines,
            lineLength: this.settings.lineLength,
            lineOpacity: this.settings.lineOpacity,
            dotSize: this.settings.dotSize,
            dotOpacity: this.settings.dotOpacity
        });
        
        this.moveLines = [];
        
        // Calculate the base radius where lines start (from center/inner circle)
        const startRadius = this.settings.baseRadius * this.settings.radiusMultiplier;
        const lineEndRadius = startRadius + (this.settings.lineLength * this.settings.radiusMultiplier);
        
        console.log(`Line radius: ${startRadius} to ${lineEndRadius}`);
        
        for (let i = 0; i < moveCount; i++) {
            const move = this.boulder.moves[i];
            
            // Calculate angle for this move using the new timeline mapping
            // Map moves evenly around the full 360° circle, starting at top (0°)
            const normalizedPosition = i / moveCount; // 0 to 1 for this move
            const moveAngle = normalizedPosition * Math.PI * 2 - Math.PI / 2; // -PI/2 puts 0° at top
            
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
            
            console.log(`Created line ${i + 1} at angle ${(moveAngle * 180 / Math.PI).toFixed(1)}°`);
            
            // Create dot/arrow at the end of the line
            if (i === 0) {
                // First move gets a bigger, brighter dot (START marker)
                const dotGeometry = new THREE.SphereGeometry(this.settings.dotSize * 2, 32, 16);
                const dotMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00ff00, // Green for start
                    transparent: true,
                    opacity: 1.0 // Full opacity for start dot
                });
                
                const dot = new THREE.Mesh(dotGeometry, dotMaterial);
                dot.position.set(endX, endY, 0);
                
                this.moveLines.push(dot);
                this.scene.add(dot);
                
                console.log(`Created START DOT at position (${endX.toFixed(2)}, ${endY.toFixed(2)}) with size ${this.settings.dotSize * 2}`);
            } else {
                // Other moves get arrows pointing in the direction of movement
                const nextMoveIndex = (i + 1) % moveCount;
                const nextNormalizedPosition = nextMoveIndex / moveCount;
                const nextAngle = nextNormalizedPosition * Math.PI * 2 - Math.PI / 2;
                
                // Calculate direction vector for arrow
                const directionAngle = nextAngle - moveAngle;
                
                const arrow = this.createArrow(endX, endY, directionAngle, lineColor);
                this.moveLines.push(arrow);
                this.scene.add(arrow);
                
                console.log(`Created ARROW ${i + 1} at position (${endX.toFixed(2)}, ${endY.toFixed(2)})`);
            }
        }
        
        console.log(`Total move line objects created: ${this.moveLines.length}`);
        
        // No need for start label - first dot will be bigger and green
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
        // Convert boulder ID to a consistent numeric seed (handle both string and numeric IDs)
        let boulderSeed;
        if (typeof this.boulder.id === 'string') {
            // Convert string ID to a hash number
            boulderSeed = 0;
            for (let i = 0; i < this.boulder.id.length; i++) {
                boulderSeed = ((boulderSeed << 5) - boulderSeed + this.boulder.id.charCodeAt(i)) & 0xffffffff;
            }
            boulderSeed = Math.abs(boulderSeed) * 0.001; // Scale to reasonable range
        } else {
            boulderSeed = this.boulder.id * 789.123;
        }
        
        // Generate random number of people based on maxAttempts setting
        const basePeople = Math.floor(this.settings.maxAttempts / 3.0); // Base number of people
        const randomVariation = this.seededRandom(boulderSeed + 999) * 0.6 - 0.3; // ±30% variation
        const numPeople = Math.max(1, Math.floor(basePeople * (1 + randomVariation)));
        
        for (let i = 0; i < numPeople; i++) {
            // Deterministic angle around the circle for this person using new timeline mapping
            // Distribute people evenly around the full 360° circle, starting at top (0°)
            const normalizedPosition = this.seededRandom(boulderSeed + i * 100);
            const baseAngle = normalizedPosition * Math.PI * 2 - Math.PI / 2; // -PI/2 puts 0° at top
            
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
        
        // Validate boulder moves to prevent NaN issues
        if (!this.boulder || !this.boulder.moves || this.boulder.moves.length === 0) {
            console.warn('No valid boulder moves found, creating default ring');
            // Create a simple circular ring as fallback
            for (let i = 0; i < 32; i++) {
                const angle = (i / 32) * Math.PI * 2;
                const x = Math.cos(angle) * baseRadius;
                const y = Math.sin(angle) * baseRadius;
                points.push(new THREE.Vector3(x, y, 0));
            }
        } else {
            // Validate and fix any invalid dynamics values
            this.boulder.moves.forEach((move, index) => {
                if (!isFinite(move.dynamics) || move.dynamics < 0) {
                    console.warn(`Invalid dynamics value for move ${index + 1}: ${move.dynamics}, setting to 0.5`);
                    move.dynamics = 0.5;
                }
                // Clamp dynamics to valid range
                move.dynamics = Math.max(0.1, Math.min(1.0, move.dynamics));
            });
            
            this.createRingPoints(points, baseRadius, ringIndex, moveCount);
        }
        
        // Validate that we have valid points
        if (points.length === 0) {
            console.error('No valid points created for ring, creating fallback');
            for (let i = 0; i < 32; i++) {
                const angle = (i / 32) * Math.PI * 2;
                const x = Math.cos(angle) * baseRadius;
                const y = Math.sin(angle) * baseRadius;
                points.push(new THREE.Vector3(x, y, 0));
            }
        }
        
        return this.createRingGeometry(points, ringIndex);
    }
    
    createRingPoints(points, baseRadius, ringIndex, moveCount) {
        // Create 180 points around the circumference for smooth graphics
        const detailLevel = 180; // Fixed at 180 points for optimal smoothness
        
        console.log(`Creating ring points for ${moveCount} moves`);
        
        for (let i = 0; i < detailLevel; i++) {
            // Map the entire 360-degree circle to the data timeline
            // 0° (top) = start of data, 360° = end of data
            const normalizedPosition = i / detailLevel; // 0 to 1 representing full timeline
            
            // Start at 12 o'clock (top) - this is now the START of our data timeline
            const angle = normalizedPosition * Math.PI * 2 - Math.PI / 2; // -PI/2 puts 0° at top
            
            // Find which move this position corresponds to
            const exactMovePosition = normalizedPosition * moveCount; // 0 to moveCount
            const moveIndex = Math.floor(exactMovePosition) % moveCount;
            const nextMoveIndex = (moveIndex + 1) % moveCount;
            
            // Calculate how far we are between this move and the next
            const positionInMove = exactMovePosition - Math.floor(exactMovePosition);
            
            const currentMove = this.boulder.moves[moveIndex];
            const nextMove = this.boulder.moves[nextMoveIndex];
            
            // Get dynamics values
            let dynamics;
            
            // Apply timeline subdivision for smoother transitions
            const subdivisionStrength = this.settings.timelineSubdivision / 100.0; // Convert 0-100 to 0-1
            
            if (subdivisionStrength > 0) {
                // Smooth interpolation between moves
                dynamics = currentMove.dynamics * (1 - positionInMove) + nextMove.dynamics * positionInMove;
                
                // Add some smoothing
                const smoothingFactor = subdivisionStrength * 0.3;
                const avgDynamics = (currentMove.dynamics + nextMove.dynamics) / 2;
                dynamics = dynamics * (1 - smoothingFactor) + avgDynamics * smoothingFactor;
            } else {
                // Sharp transitions - use the current move's dynamics
                dynamics = currentMove.dynamics;
            }
            
            // Validate dynamics value to prevent NaN propagation
            if (!isFinite(dynamics) || dynamics < 0) {
                console.warn(`Invalid dynamics value: ${dynamics}, using fallback`);
                dynamics = 0.5; // Safe fallback
            }
            
            // Calculate radius based on dynamics
            let radius = baseRadius;
            
            // Add dynamics effect
            const ringProgress = ringIndex / this.settings.ringCount;
            const effectMultiplier = 0.3 + Math.pow(ringProgress, 0.4) * 0.7; // Range: 0.3 to 1.0
            const dynamicsEffect = dynamics * this.settings.dynamicsMultiplier * effectMultiplier;
            
            radius += dynamicsEffect;
            
            // Add crux emphasis at exact move positions
            let cruxBoost = 0;
            if (currentMove.isCrux) {
                // Check if we're close to the exact move position
                const distanceToMoveCenter = Math.abs(positionInMove - 0.5); // Distance from center of move
                if (distanceToMoveCenter < 0.3) { // Within 30% of move center
                    const cruxStrength = 1 - (distanceToMoveCenter / 0.3);
                    cruxBoost = currentMove.dynamics * this.settings.cruxEmphasis * 0.5 * cruxStrength;
                }
            }
            radius += cruxBoost * ringProgress;
            
            // Add organic noise for natural look
            const noiseFreq = normalizedPosition * Math.PI * 8;
            const noise = Math.sin(noiseFreq) * 0.1 * dynamics * this.settings.organicNoise;
            radius += noise;
            
            // Final validation
            if (!isFinite(radius) || radius <= 0) {
                radius = baseRadius;
            }
            
            // Calculate position
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const z = 0; // Keep it simple for now
            
            // Validate all position values
            if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
                const fallbackX = Math.cos(angle) * baseRadius;
                const fallbackY = Math.sin(angle) * baseRadius;
                points.push(new THREE.Vector3(fallbackX, fallbackY, 0));
            } else {
                points.push(new THREE.Vector3(x, y, z));
            }
        }
        
        console.log(`Created ${points.length} points for ring ${ringIndex}`);
    }
    
    createRingGeometry(points, ringIndex) {
        // Create smooth curve with higher tension for more dramatic curves
        const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.3);
        const smoothPoints = curve.getPoints(this.settings.curveResolution);
        smoothPoints.pop(); // Remove duplicate point
        
        // Create geometry with vertex colors
        const geometry = new THREE.BufferGeometry().setFromPoints(smoothPoints);
        const colors = [];
        const pointsPerMove = this.settings.curveResolution / this.boulder.moves.length;
        
        for (let i = 0; i < smoothPoints.length; i++) {
            const normalizedPosition = i / smoothPoints.length;
            
            // Find the closest moves for color interpolation
            const movePosition = normalizedPosition * this.boulder.moves.length;
            const moveIndex1 = Math.floor(movePosition) % this.boulder.moves.length;
            const moveIndex2 = (moveIndex1 + 1) % this.boulder.moves.length;
            const lerpFactor = movePosition - Math.floor(movePosition);
            
            const move1 = this.boulder.moves[moveIndex1];
            const move2 = this.boulder.moves[moveIndex2];
            
            // Calculate crux influence with smooth fade
            let cruxInfluence = 0;
            
            // Check distance to nearest crux moves
            for (let j = 0; j < this.boulder.moves.length; j++) {
                if (this.boulder.moves[j].isCrux) {
                    const cruxPosition = j / this.boulder.moves.length;
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
            // Only recreate if necessary - check what actually changed
            const needsFullRecreation = (
                oldSettings.ringCount !== this.settings.ringCount ||
                oldSettings.baseRadius !== this.settings.baseRadius ||
                oldSettings.ringSpacing !== this.settings.ringSpacing ||
                oldSettings.radiusMultiplier !== this.settings.radiusMultiplier ||
                oldSettings.showMoveSegments !== this.settings.showMoveSegments ||
                oldSettings.showMoveLines !== this.settings.showMoveLines ||
                oldSettings.showAttempts !== this.settings.showAttempts ||
                oldSettings.maxAttempts !== this.settings.maxAttempts ||
                oldSettings.attemptWaviness !== this.settings.attemptWaviness ||
                oldSettings.attemptFadeStrength !== this.settings.attemptFadeStrength ||
                oldSettings.attemptThickness !== this.settings.attemptThickness ||
                oldSettings.attemptIntensity !== this.settings.attemptIntensity ||
                oldSettings.attemptRadius !== this.settings.attemptRadius ||
                oldSettings.cruxEmphasis !== this.settings.cruxEmphasis ||
                oldSettings.moveEmphasis !== this.settings.moveEmphasis
            );
            
            if (needsFullRecreation) {
                this.createVisualization();
            } else {
                // Only update materials/opacity for performance
                this.updateMaterialsOnly();
            }
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
} 