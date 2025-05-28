console.log('Simple main.js started');

// Test basic DOM loading
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded in simple main.js');
    
    const container = document.getElementById('container');
    const loading = document.getElementById('loading');
    
    console.log('Container:', container);
    console.log('Loading:', loading);
    
    if (loading) {
        loading.textContent = 'Simple test loaded successfully!';
        loading.style.color = '#00ff00';
    }
    
    // Test basic import
    import('./data/boulderData.js').then(module => {
        console.log('boulderData imported successfully:', module);
        
        // Test basic function call
        module.getBoulderList().then(boulders => {
            console.log('Boulder list loaded:', boulders);
            
            if (loading) {
                loading.textContent = `Found ${boulders.length} CSV files!`;
            }
        }).catch(error => {
            console.error('Error loading boulder list:', error);
            if (loading) {
                loading.textContent = 'Error loading boulder data';
                loading.style.color = '#ff0000';
            }
        });
        
    }).catch(error => {
        console.error('Error importing boulderData:', error);
        if (loading) {
            loading.textContent = 'Error importing boulder data';
            loading.style.color = '#ff0000';
        }
    });
});

console.log('Simple main.js setup complete'); 