import * as THREE from 'three';

export class BoulderVisualizer {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.rings = [];
        this.moveSegments = [];
        this.boulder = null;
        this.centerText = null;
        
        // Color variables that can be changed
        this.colors = {
            cruxMove: 0x00ffcc,      // Turquoise for crux moves
            normalMove: 0xffffff,    // White for normal moves
            gradeColors: {
                'V1': 0x00ff00,     // Green
                'V2': 0x66ff00,     // Light green
                'V3': 0xccff00,     // Yellow-green
                'V4': 0xffff00,     // Yellow
                'V5': 0xffcc00,     // Orange
                'V6': 0xff6600,     // Dark orange
                'V7': 0xff0000,     // Red
                'V8': 0xff0066,     // Pink-red
                'V9': 0xff00ff      // Magenta
            }
        };
        
        // Settings
        this.settings = {
            baseRadius: 1.9,         // Inner radius where all rings start
            maxRadius: 12.0,         // Maximum radius for highest dynamics
            ringCount: 35,           // Number of concentric circles (10-70)
            ringSpacing: 0.02,       // Spacing between rings
            opacity: 1.0,            // Line opacity
            curveResolution: 240,    // Smoothness of curves (always maximum)
            dynamicsMultiplier: 4.4, // How much dynamics affect radius
            centerTextSize: 1.0,     // Size of center grade text
            showMoveNumbers: true,   // Show move sequence numbers
            liquidEffect: true,      // Enable liquid wave effect
            organicNoise: 1.0,       // Amount of organic noise
            cruxEmphasis: 2.2,       // How much to emphasize crux moves
            waveComplexity: 1.0,     // Complexity of wave patterns
            depthEffect: 0.6,        // 3D depth effect strength
            centerFade: 0.75,        // How much lines fade near center (slab effect)
            showMoveSegments: true,  // Show background move segments
            segmentOpacity: 0.15,    // Opacity of move segments
            segmentGap: 0.05         // Gap between segments (0.0-0.2)
        };
        
        this.init();
        this.setupEventListeners();
    }
    
    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x0a0a0a, 1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Setup camera for front view
        this.camera.position.set(0, 0, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Setup scene
        this.setupLighting();
        this.setupControls();
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);
        
        // Accent light
        const accentLight = new THREE.PointLight(0x00ffcc, 0.3, 30);
        accentLight.position.set(-5, 5, 5);
        this.scene.add(accentLight);
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
        });
    }
    
    loadBoulder(boulder) {
        this.boulder = boulder;
        this.createVisualization();
    }
    
    createVisualization() {
        // Clear existing visualization
        this.clearScene();
        
        if (!this.boulder) return;
        
        // Create background move segments (pizza slices)
        this.createMoveSegments();
        
        // Create center grade display
        this.createCenterGrade();
        
        // Create concentric rings with liquid effect
        this.createLiquidRings();
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
    }
    
    createCenterGrade() {
        // Create a colored circle in the center with the grade
        const gradeColor = this.colors.gradeColors[this.boulder.grade] || 0xffffff;
        
        // Create center circle that updates with base radius
        const centerGeometry = new THREE.CircleGeometry(this.settings.baseRadius * 0.7, 32);
        const centerMaterial = new THREE.MeshBasicMaterial({ 
            color: gradeColor,
            transparent: true,
            opacity: 0.4
        });
        this.centerCircle = new THREE.Mesh(centerGeometry, centerMaterial);
        this.scene.add(this.centerCircle);
        
        // Create grade text (simplified - in real implementation would use TextGeometry)
        const textGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.centerText = new THREE.Mesh(textGeometry, textMaterial);
        this.scene.add(this.centerText);
    }
    
    createMoveSegments() {
        if (!this.settings.showMoveSegments) return;
        
        const moveCount = this.boulder.moves.length;
        this.moveSegments = [];
        
        // Calculate the maximum radius for the background segments
        const maxRadius = this.settings.baseRadius + (this.settings.ringCount * this.settings.ringSpacing) + 2;
        const innerRadius = this.settings.baseRadius * 0.8; // Start slightly inside the center circle
        
        // Calculate angle per move
        const anglePerMove = (Math.PI * 2) / moveCount;
        const gapAngle = anglePerMove * this.settings.segmentGap; // Configurable gap between segments
        const segmentAngle = anglePerMove - gapAngle;
        
        for (let i = 0; i < moveCount; i++) {
            const startAngle = i * anglePerMove + gapAngle / 2;
            const endAngle = startAngle + segmentAngle;
            
            // Create ring segment geometry
            const segmentGeometry = new THREE.RingGeometry(
                innerRadius, 
                maxRadius, 
                startAngle, 
                segmentAngle
            );
            
            // Set the number of segments for smooth curves
            segmentGeometry.parameters.thetaSegments = 32;
            segmentGeometry.parameters.phiSegments = 8;
            
            // Create material - grey background with slightly stronger outer ring
            const segmentMaterial = new THREE.MeshBasicMaterial({
                color: 0x404040, // Dark grey
                transparent: true,
                opacity: this.settings.segmentOpacity,
                side: THREE.DoubleSide
            });
            
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            segment.position.z = -0.1; // Place slightly behind other elements
            
            this.moveSegments.push(segment);
            this.scene.add(segment);
            
            // Create outer ring for stronger color
            const outerRingGeometry = new THREE.RingGeometry(
                maxRadius - 0.3, 
                maxRadius, 
                startAngle, 
                segmentAngle
            );
            
            const outerRingMaterial = new THREE.MeshBasicMaterial({
                color: 0x606060, // Slightly lighter grey for outer ring
                transparent: true,
                opacity: this.settings.segmentOpacity * 1.7, // Stronger outer ring
                side: THREE.DoubleSide
            });
            
            const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
            outerRing.position.z = -0.05; // Place slightly in front of main segment
            
            this.moveSegments.push(outerRing);
            this.scene.add(outerRing);
        }
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
        const baseRadius = this.settings.baseRadius + (ringIndex * this.settings.ringSpacing);
        const points = [];
        
        // Create much more detailed points for dramatic effect
        const detailLevel = moveCount * 8; // Much higher resolution for organic curves
        
        for (let i = 0; i < detailLevel; i++) {
            const normalizedPosition = i / detailLevel;
            const angle = normalizedPosition * Math.PI * 2;
            
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
            const dynamicsEffect = Math.pow(dynamics, 1.8) * this.settings.dynamicsMultiplier;
            
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
            
            // Add crux emphasis - only at the actual move positions
            const isCruxArea = move1.isCrux || move2.isCrux;
            if (isCruxArea) {
                // Only boost radius at the actual move spike, not everywhere
                const cruxBoost = dynamics * this.settings.cruxEmphasis * 0.5;
                radius += cruxBoost * ringProgress;
            }
            
            // Add turbulence for more dramatic effect
            const turbulence1 = Math.sin(normalizedPosition * Math.PI * 20 + ringIndex * 0.5) * 0.05;
            const turbulence2 = Math.cos(normalizedPosition * Math.PI * 15 + ringIndex * 0.3) * 0.03;
            radius += (turbulence1 + turbulence2) * waveAmplitude;
            
            // Add subtle randomness for organic feel (but consistent per ring)
            const seedValue = Math.sin(normalizedPosition * 1000 + ringIndex * 100);
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
                    const fadeRange = 0.08; // How far the crux color fades
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
        Object.assign(this.settings, newSettings);
        if (this.boulder) {
            this.createVisualization();
        }
    }
    
    updateColors(newColors) {
        Object.assign(this.colors, newColors);
        if (this.boulder) {
            this.createVisualization();
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