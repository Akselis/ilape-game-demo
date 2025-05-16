// Custom load testing functions for Artillery
module.exports = {
  // Setup function that runs once per virtual user
  setupFn: function(context, events, done) {
    // Initialize metrics for this virtual user
    context.vars.metrics = {
      assetLoadTimes: [],
      interactionTimes: [],
      errors: 0
    };
    return done();
  },
  // Simulate a player interaction with the game
  simulateGameInteraction: function(context, events, done) {
    // Log the interaction for debugging
    console.log('Simulating player interaction');
    
    // Store interaction start time for metrics
    context.vars.interactionStartTime = Date.now();
    
    // Define possible player interactions in a Phaser game
    const possibleInteractions = [
      'movement',      // Player moving around
      'jump',          // Player jumping
      'collision',     // Collision detection
      'tool_use',      // Using a tool (like TriggerTool)
      'block_place',   // Placing a block
      'block_remove',  // Removing a block
      'scene_change',  // Changing scenes
      'camera_pan',    // Panning the camera
      'ui_interaction' // Interacting with UI elements
    ];
    
    // Randomly select 2-4 interactions to simulate
    const numInteractions = Math.floor(Math.random() * 3) + 2;
    const interactions = [];
    
    // Select random interactions
    for (let i = 0; i < numInteractions; i++) {
      const randomIndex = Math.floor(Math.random() * possibleInteractions.length);
      interactions.push(possibleInteractions[randomIndex]);
    }
    
    // Log the selected interactions
    console.log(`Simulating ${numInteractions} game interactions: ${interactions.join(', ')}`);
    
    // Simulate game state changes based on interactions
    context.vars.gameState = {
      playerPosition: { x: Math.random() * 800, y: Math.random() * 500 },
      blocksPlaced: Math.floor(Math.random() * 10),
      toolsUsed: Math.floor(Math.random() * 3),
      interactionCount: numInteractions,
      interactionTypes: interactions
    };
    
    // Simulate variable interaction processing time
    const processingTime = Math.floor(Math.random() * 150) + 50; // 50-200ms
    
    // Simulate the time it takes to process these interactions
    setTimeout(() => {
      // Record completion time and duration
      context.vars.interactionEndTime = Date.now();
      context.vars.interactionDuration = context.vars.interactionEndTime - context.vars.interactionStartTime;
      
      // Store metrics for reporting
      if (!context.vars.metrics) context.vars.metrics = { interactionTimes: [] };
      context.vars.metrics.interactionTimes.push({
        count: numInteractions,
        types: interactions,
        duration: context.vars.interactionDuration
      });
      
      // Report custom metric to Artillery
      events.emit('counter', 'game_interactions', numInteractions);
      events.emit('histogram', 'interaction_time', context.vars.interactionDuration);
      
      console.log(`Completed ${numInteractions} game interactions in ${context.vars.interactionDuration}ms`);
      
      // Simulate successful completion
      return done();
    }, processingTime);
  },
  
  // Simulate loading game assets
  simulateAssetLoading: function(context, events, done) {
    // Log the asset loading simulation
    console.log('Simulating asset loading');
    
    // Define common game assets to load
    const gameAssets = [
      // Game JavaScript files
      '/js/game/game.js',
      '/js/game/scenes/EditorScene.js',
      // Game objects
      '/js/game/gameObjects/Block.js',
      '/js/game/gameObjects/Player.js',
      // Game tools
      '/js/game/tools/TriggerTool.js',
      // Images and sprites (simulated paths)
      '/assets/sprites/player.png',
      '/assets/sprites/blocks.png',
      '/assets/sprites/background.png',
      // Audio files (simulated paths)
      '/assets/audio/music.mp3',
      '/assets/audio/effects.mp3'
    ];
    
    // Track loading times for analysis
    context.vars.assetLoadingStartTime = Date.now();
    context.vars.loadedAssets = [];
    
    // Randomly select 3-7 assets to load (simulating different user behaviors)
    const assetsToLoad = Math.floor(Math.random() * 5) + 3;
    const selectedAssets = [];
    
    // Select random assets without duplicates
    while (selectedAssets.length < assetsToLoad) {
      const randomIndex = Math.floor(Math.random() * gameAssets.length);
      const asset = gameAssets[randomIndex];
      if (!selectedAssets.includes(asset)) {
        selectedAssets.push(asset);
      }
    }
    
    // Log selected assets
    console.log(`Loading ${assetsToLoad} random game assets`);
    
    // Simulate asset loading with HTTP requests
    // In a real scenario, these would be actual HTTP requests to your server
    // For this simulation, we're just tracking what would be loaded
    context.vars.selectedAssets = selectedAssets;
    
    // Simulate variable loading times
    const loadingDelay = Math.floor(Math.random() * 200) + 50; // 50-250ms delay
    setTimeout(() => {
      // Record loading completion
      context.vars.assetLoadingEndTime = Date.now();
      context.vars.assetLoadingDuration = context.vars.assetLoadingEndTime - context.vars.assetLoadingStartTime;
      
      // Store metrics for reporting
      if (!context.vars.metrics) context.vars.metrics = { assetLoadTimes: [] };
      context.vars.metrics.assetLoadTimes.push({
        count: assetsToLoad,
        assets: selectedAssets,
        duration: context.vars.assetLoadingDuration
      });
      
      // Report custom metric to Artillery
      events.emit('counter', 'assets_loaded', assetsToLoad);
      events.emit('histogram', 'asset_loading_time', context.vars.assetLoadingDuration);
      
      console.log(`Completed loading ${assetsToLoad} assets in ${context.vars.assetLoadingDuration}ms`);
      
      // Simulate successful completion
      return done();
    }, loadingDelay);
  },
  
  // Function to report metrics at the end of a virtual user's session
  reportMetrics: function(context, events, done) {
    // Calculate aggregate metrics
    if (context.vars.metrics) {
      const metrics = context.vars.metrics;
      
      // Calculate average asset loading time
      if (metrics.assetLoadTimes && metrics.assetLoadTimes.length > 0) {
        const totalAssetTime = metrics.assetLoadTimes.reduce((sum, item) => sum + item.duration, 0);
        const avgAssetTime = totalAssetTime / metrics.assetLoadTimes.length;
        events.emit('histogram', 'avg_asset_loading_time', avgAssetTime);
      }
      
      // Calculate average interaction time
      if (metrics.interactionTimes && metrics.interactionTimes.length > 0) {
        const totalInteractionTime = metrics.interactionTimes.reduce((sum, item) => sum + item.duration, 0);
        const avgInteractionTime = totalInteractionTime / metrics.interactionTimes.length;
        events.emit('histogram', 'avg_interaction_time', avgInteractionTime);
      }
      
      // Report total session metrics
      events.emit('counter', 'completed_user_session', 1);
    }
    
    return done();
  }
};
