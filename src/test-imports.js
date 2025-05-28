// Test file to check if all imports are working
console.log('Testing imports...');

try {
    console.log('Testing Three.js import...');
    import('three').then(THREE => {
        console.log('Three.js loaded successfully:', THREE);
    }).catch(error => {
        console.error('Three.js import failed:', error);
    });
} catch (error) {
    console.error('Three.js import error:', error);
}

try {
    console.log('Testing BoulderVisualizer import...');
    import('./visualizer/BoulderVisualizer.js').then(module => {
        console.log('BoulderVisualizer loaded successfully:', module);
    }).catch(error => {
        console.error('BoulderVisualizer import failed:', error);
    });
} catch (error) {
    console.error('BoulderVisualizer import error:', error);
}

try {
    console.log('Testing DataVizIntegration import...');
    import('./visualizer/DataVizIntegration.js').then(module => {
        console.log('DataVizIntegration loaded successfully:', module);
    }).catch(error => {
        console.error('DataVizIntegration import failed:', error);
    });
} catch (error) {
    console.error('DataVizIntegration import error:', error);
}

try {
    console.log('Testing BoulderControlPanel import...');
    import('./controls/BoulderControlPanel.js').then(module => {
        console.log('BoulderControlPanel loaded successfully:', module);
    }).catch(error => {
        console.error('BoulderControlPanel import failed:', error);
    });
} catch (error) {
    console.error('BoulderControlPanel import error:', error);
}

try {
    console.log('Testing boulderData import...');
    import('./data/boulderData.js').then(module => {
        console.log('boulderData loaded successfully:', module);
    }).catch(error => {
        console.error('boulderData import failed:', error);
    });
} catch (error) {
    console.error('boulderData import error:', error);
}

console.log('Import tests initiated...'); 