import { Block } from '../gameObjects/Block.js';
import { Player } from '../gameObjects/Player.js';
import { LevelEndTrigger } from '../gameObjects/LevelEndTrigger.js';
import { Spike } from '../gameObjects/Spike.js';
import { Enemy } from '../gameObjects/Enemy.js';
import { DeathScreen } from '../gameObjects/DeathScreen.js';
import { SelectorTool } from '../tools/SelectorTool.js';
// MoverTool removed as requested
import { BlockTool } from '../tools/BlockTool.js';
import { TriggerTool } from '../tools/TriggerTool.js';
import { PlayerTool } from '../tools/PlayerTool.js';
import { SpikeTool } from '../tools/SpikeTool.js';
import { EnemyTool } from '../tools/EnemyTool.js';
import { saveStateToStorage, loadStateFromStorage } from '../../utils/cookieManager.js';

export class EditorScene extends Phaser.Scene {
    // Helper method to detect mobile devices more accurately using user agent
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    preload() {
        // Load player texture
        this.load.image('ilape-icon', 'js/img/ilape-icon.png');
    }
    
    constructor() {
        super({ key: 'EditorScene' });
        this.isPreviewMode = false;
        this.savedState = null;
        this.boundaryWalls = null; // Will hold boundary walls group
        this.minimap = null; // Will hold minimap container
        this.minimapCamera = null; // Visual representation of camera in minimap
        this.isDraggingMinimap = false; // Track if user is dragging the minimap
        this.twoFingerScrolling = false; // Track if user is using two-finger scrolling
        this.twoFingerStartX = 0; // Starting X position for two-finger scrolling
        this.isVictoryPopupShown = false; // Track if victory popup is currently shown
        this.isDeathPopupShown = false; // Track if death popup is currently shown
        this.deathScreen = null; // Will hold the death screen
    }
    
    create() {
        // Set up world bounds
        this.levelWidth = 6400; // Increased from 3200 to allow for larger levels
        // Use the camera's height (game config height) instead of the window height
        this.levelHeight = this.cameras.main.height;
        this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);
        
        // Create a gradient sky background
        this.createSkyBackground();
        
        // Create groups for blocks, triggers, spikes and enemies
        this.blocks = this.add.group();
        this.triggers = this.add.group();
        this.spikes = this.add.group();
        this.enemies = this.add.group();
        
        // Create the minimap for level navigation
        this.createMinimap();
        
        // Create boundary walls to prevent player from going out of bounds
        this.createBoundaryWalls();
        
        // Detect touch devices using modern standards
        this.isTouchDevice = false;
        
        // Check if the device supports touch
        if ('ontouchstart' in window || 
            navigator.maxTouchPoints > 0 || 
            navigator.msMaxTouchPoints > 0) {
            
            // Additional check using media query for touch-specific pointing devices
            if (window.matchMedia('(hover: none), (pointer: coarse)').matches) {
                this.isTouchDevice = true;
            }
        }
        
        console.log('Touch controls will only be available on touch devices');
        console.log('Touch device detected in EditorScene:', this.isTouchDevice);
        
        // Create touch controls but they will only be visible in preview mode
        this.createTouchControls();
        
        // Register resize handler with the scale manager
        this.scale.on('resize', this.handleResize, this);
        console.log('Resize handler registered');
        
        // Create ground - position it near the bottom but fully visible
        const ground = new Block(this, this.levelWidth/2, this.levelHeight - 80, this.levelWidth, 40);
        ground.setInteractive(false);
        ground.resizeHandles.forEach(handle => handle.destroy());
        ground.deleteButton.destroy();
        ground.isGround = true;
        
        // Make the ground visually green
        ground.rectangle.setFillStyle(0x00aa00); // Darker green for better visibility
        ground.rectangle.setAlpha(1); // Ensure it's fully visible
        
        this.blocks.add(ground);
        
        // This resize event is from Phaser's scene events, but we'll use the scale manager's resize event instead
        // Keeping this for backward compatibility
        this.events.on('resize', (width, height) => {
            console.log('Scene resize event triggered');
            // We'll handle this in the handleResize method
        });
        
        // Set up tools (removed mover tool as requested)
        this.tools = {
            selector: new SelectorTool(this),
            block: new BlockTool(this),
            trigger: new TriggerTool(this),
            player: new PlayerTool(this),
            spike: new SpikeTool(this),
            enemy: new EnemyTool(this)
        };
        
        // Set up input handlers
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
        
        // Add touch-specific input handlers
        if (this.isTouchDevice) {
            // Add a small delay to distinguish between tap and drag on touch devices
            this.touchDelay = 150; // ms
            this.touchStartTime = 0;
            this.touchStartPosition = { x: 0, y: 0 };
            
            // Track multi-touch for pinch-to-zoom
            this.input.on('pointermove', this.handleTouchMove, this);
        }
        
        // Load saved state from cookies/localStorage if available
        const savedState = loadStateFromStorage();
        if (savedState) {
            console.log('Loading saved state from storage');
            this.restoreState(savedState);
            
            // Ensure the selector tool is active after loading
            this.setTool('selector');
        }
        
        // Set up auto-save timer (save every 10 seconds)
        this.time.addEvent({
            delay: 10000,
            callback: this.autoSaveState,
            callbackScope: this,
            loop: true
        });
        
        // Disable physics simulation initially
        this.physics.world.pause();
    }
    
    saveState() {
        const state = {
            blocks: [],
            triggers: [],
            spikes: [],
            enemies: [],
            player: null,
            camera: {
                scrollX: this.cameras.main.scrollX,
                scrollY: this.cameras.main.scrollY
            },
            timestamp: Date.now() // Add timestamp for versioning
        };
        
        // Save blocks state
        this.blocks.getChildren().forEach(block => {
            if (!block.isGround) {
                state.blocks.push({
                    x: block.x,
                    y: block.y,
                    width: block.rectangle.width,
                    height: block.rectangle.height
                });
            }
        });
        
        // Save triggers state
        this.triggers.getChildren().forEach(trigger => {
            state.triggers.push({
                x: trigger.x,
                y: trigger.y,
                width: trigger.rectangle.width,
                height: trigger.rectangle.height
            });
        });
        
        // Save spikes state
        this.spikes.getChildren().forEach(spike => {
            state.spikes.push({
                x: spike.x,
                y: spike.y,
                width: spike.rectangle.width,
                height: spike.rectangle.height,
                rotation: spike.angle // Save the rotation angle
            });
        });
        
        // Save enemies state
        this.enemies.getChildren().forEach(enemy => {
            state.enemies.push({
                x: enemy.x,
                y: enemy.y
            });
        });
        
        // Save player state
        if (this.player) {
            state.player = {
                x: this.player.x,
                y: this.player.y
            };
        }
        
        return state;
    }
    
    restoreState(state) {
        // Remove all non-ground blocks
        this.blocks.getChildren().forEach(block => {
            if (!block.isGround) {
                block.destroy();
            }
        });
        
        // Remove all triggers
        this.triggers.getChildren().forEach(trigger => trigger.destroy());
        
        // Remove all spikes
        this.spikes.getChildren().forEach(spike => spike.destroy());
        
        // Remove all enemies
        this.enemies.getChildren().forEach(enemy => enemy.destroy());
        
        // Remove player
        if (this.player) {
            this.player.destroy();
        }
        
        // Close death screen if it exists
        if (this.deathScreen) {
            this.deathScreen.close();
        }
        
        // Restore blocks
        state.blocks.forEach(blockData => {
            const block = new Block(this, blockData.x, blockData.y, blockData.width, blockData.height);
            // Make sure the block is interactive
            block.setInteractive(new Phaser.Geom.Rectangle(-blockData.width/2, -blockData.height/2, blockData.width, blockData.height), Phaser.Geom.Rectangle.Contains);
            this.blocks.add(block);
            
            // Ensure block is properly initialized for selection
            if (block.setSelected) {
                block.setSelected(false);
            }
        });
        
        // Restore triggers
        state.triggers.forEach(triggerData => {
            const trigger = new LevelEndTrigger(this, triggerData.x, triggerData.y, triggerData.width, triggerData.height);
            // Make sure the trigger is interactive
            trigger.setInteractive(new Phaser.Geom.Rectangle(-triggerData.width/2, -triggerData.height/2, triggerData.width, triggerData.height), Phaser.Geom.Rectangle.Contains);
            this.triggers.add(trigger);
            
            // Ensure trigger is properly initialized for selection
            if (trigger.setSelected) {
                trigger.setSelected(false);
            }
        });
        
        // Restore spikes
        if (state.spikes) {
            console.log(`Restoring ${state.spikes.length} spikes from saved state`);
            state.spikes.forEach(spikeData => {
                // Create spike with the saved dimensions
                const spike = new Spike(this, spikeData.x, spikeData.y, spikeData.width, spikeData.height);
                
                // Apply saved rotation if available
                if (spikeData.rotation !== undefined) {
                    spike.setAngle(spikeData.rotation);
                }
                
                // Make sure the spike is interactive with the correct dimensions
                spike.setInteractive(new Phaser.Geom.Rectangle(-spikeData.width/2, -spikeData.height/2, spikeData.width, spikeData.height), Phaser.Geom.Rectangle.Contains);
                
                // Add to spikes group
                this.spikes.add(spike);
            });
        }
        
        // Restore enemies
        if (state.enemies) {
            state.enemies.forEach(enemyData => {
                const enemy = new Enemy(this, enemyData.x, enemyData.y);
                this.enemies.add(enemy);
            });
        }
        
        // Restore player
        if (state.player) {
            this.player = new Player(this, state.player.x, state.player.y);
            
            // Ensure player is properly initialized for selection
            if (this.player.setSelected) {
                this.player.setSelected(false);
            }
        }
        
        // Restore camera position
        this.cameras.main.setScroll(state.camera.scrollX, state.camera.scrollY);
        
        // Reset selector tool state to ensure it's ready for new selections
        if (this.tools && this.tools.selector) {
            this.tools.selector.selectedObject = null;
            this.tools.selector.isDraggingHandle = false;
            this.tools.selector.dragStartPos = null;
            this.tools.selector.draggingHandle = null;
        }
        
        console.log('State restored - objects should now be selectable');
    }
    
    setTool(toolName) {
        if (this.isPreviewMode) return;
        
        // Deactivate all tools
        Object.values(this.tools).forEach(tool => tool.deactivate());
        
        // Activate the selected tool
        this.tools[toolName].activate();
        
        // Update button states
        Object.entries(this.tools).forEach(([name, tool]) => {
            const button = document.getElementById(`${name}-tool`);
            if (button) {
                button.classList.toggle('active', tool.active);
            }
        });
        
        // Dispatch a custom event to notify React components about the tool change
        window.dispatchEvent(new CustomEvent('toolchange', {
            detail: { tool: toolName }
        }));
    }
    
    // Auto-save state to cookies/localStorage
    autoSaveState() {
        if (!this.isPreviewMode) {
            const state = this.saveState();
            saveStateToStorage(state);
            console.log('Auto-saved game state', new Date().toLocaleTimeString());
        }
    }
    
    // Manual save state to cookies/localStorage
    saveStateToStorage() {
        const state = this.saveState();
        const success = saveStateToStorage(state);
        if (success) {
            console.log('Game state saved successfully');
        } else {
            console.error('Failed to save game state');
        }
        return success;
    }
    
    togglePreview() {
        this.isPreviewMode = !this.isPreviewMode;
        
        // Update preview button state (React now handles this)
        // const previewButton = document.getElementById('preview-button');
        // previewButton.classList.toggle('active', this.isPreviewMode);
        
        console.log(`Preview mode ${this.isPreviewMode ? 'enabled' : 'disabled'}`);
        
        if (this.isPreviewMode) {
            // Save current state to both memory and storage
            // Deep clone the state to prevent reference issues
            this.savedState = JSON.parse(JSON.stringify(this.saveState()));
            saveStateToStorage(this.savedState);
            
            // Show touch controls in preview mode
            if (this.touchControlsContainer) {
                this.touchControlsContainer.classList.add('preview-active');
            }
            
            // Hide minimap in preview mode - with enhanced mobile support
            if (this.minimap) {
                // Completely destroy and remove the minimap in preview mode
                // This is the most reliable way to ensure it's gone on mobile
                this.minimap.destroy();
                this.minimap = null;
            }
            if (this.minimapHitArea) {
                // Also destroy the hit area
                this.minimapHitArea.destroy();
                this.minimapHitArea = null;
            }
            
            // Store a flag to recreate the minimap when exiting preview mode
            this.minimapDestroyedForPreview = true;
            
            // Enable physics world
            this.physics.world.resume();
            
            // Disable all tools and deselect all objects
            Object.values(this.tools).forEach(tool => tool.deactivate());
            
            // Ensure all objects are deselected
            this.deselectAllObjects();
            
            // Create invisible boundary walls
            this.createBoundaryWalls();
            
            // Enable physics for all blocks
            this.blocks.getChildren().forEach(block => {
                if (!block.body) {
                    this.physics.add.existing(block, true);
                    
                    // Special handling for ground block to ensure its collider is positioned correctly
                    if (block.isGround) {
                        // Set the size and offset manually to match the block's dimensions
                        // Use the actual height of the ground block (100px as per your change)
                        block.body.setSize(this.levelWidth, 40);
                        // Adjust offset to match the new position (levelHeight + 100)
                        // For containers, the offset is relative to the container's center
                        console.log('Ground physics body configured with fixed dimensions');
                    }
                }
            });
            
            // Follow player with camera if it exists
            if (this.player) {
                // Make sure player physics are enabled
                if (!this.player.body) {
                    this.physics.add.existing(this.player);
                }
                
                // Ensure player body is enabled and has gravity
                if (this.player.body) {
                    this.player.body.enable = true;
                    this.player.body.gravity.y = 300;
                    console.log('Player physics enabled with gravity:', this.player.body.gravity.y);
                }
                
                // Make sure camera bounds match the full level width
                this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);
                
                // Follow player with smooth camera
                this.cameras.main.startFollow(this.player, true);
                this.cameras.main.setLerp(0.1);
                
                // Add collision with blocks
                this.physics.add.collider(this.player, this.blocks);
                
                // Create death screen instance
                this.deathScreen = new DeathScreen(this);
                
                // Add collision with spikes that kills the player
                if (this.spikes && this.spikes.getChildren().length > 0) {
                    // Enable physics for all spikes
                    this.spikes.getChildren().forEach(spike => {
                        if (!spike.body) {
                            this.physics.add.existing(spike, true); // Static body
                            spike.body.setSize(spike.rectangle.width, spike.rectangle.height);
                        }
                    });
                    
                    // Add overlap with player that triggers death
                    this.physics.add.overlap(this.player, this.spikes, () => {
                        // Only show death screen if not already shown and victory popup is not shown
                        if (!this.isDeathPopupShown && !this.isVictoryPopupShown) {
                            // Show death screen
                            this.deathScreen.show();
                        }
                    });
                }
                
                // Check if player is inside any block and move them to a safe position
                this.checkAndFixPlayerPosition();
                
                // Set up enemy collisions and behavior in preview mode
                this.setupEnemyCollisions();
                
                // Add collision with level end triggers
                this.triggers.getChildren().forEach(trigger => {
                    // Enable physics for trigger as a sensor (no solid collision)
                    if (trigger.body) {
                        trigger.body.enable = true;
                        // Make the body a sensor so it doesn't block the player
                        trigger.body.isSensor = true;
                        // Update the body position to match the trigger's current position
                        trigger.body.position.x = trigger.x - trigger.body.width / 2;
                        trigger.body.position.y = trigger.y - trigger.body.height / 2;
                    } else {
                        this.physics.add.existing(trigger);
                        // Make the body a sensor so it doesn't block the player
                        trigger.body.isSensor = true;
                    }
                    
                    // Add overlap detection
                    this.physics.add.overlap(this.player, trigger, () => {
                        // Show level complete when player reaches the trigger
                        trigger.showLevelComplete();
                    });
                });
                
                // Connect the Rete editor to the player if available
                if (window.reteEditor) {
                    console.log('Connecting Rete editor to player...');
                    this.player.setReteEngine(window.reteEditor, window.reteEngine);
                    
                    // Only enable node logic if we have nodes set up
                    const connections = window.reteEditor.getConnections();
                    const hasConnections = connections && connections.length > 0;
                    
                    // Allow direct controls to work when no connections exist
                    this.player.useNodeLogic = hasConnections;
                    console.log(`Node logic ${hasConnections ? 'enabled' : 'disabled'} for preview mode based on connections`);
                } else {
                    console.warn('Rete editor not available to connect to player');
                    // Let the player decide which control method to use instead of forcing direct controls
                    console.log('Using available control method as fallback');
                }
            } else {
                console.warn('No player found in the scene for preview mode');
            }
        } else {
            // Disable physics world
            this.physics.world.pause();
            
            // Reset camera follow
            this.cameras.main.stopFollow();
            
            // Close any level complete overlays
            this.triggers.getChildren().forEach(trigger => {
                if (trigger.closeLevelComplete) {
                    trigger.closeLevelComplete();
                }
                
                // Disable trigger physics body
                if (trigger.body) {
                    trigger.body.enable = false;
                }
            });
            
            // Remove boundary walls if they exist
            if (this.boundaryWalls) {
                this.boundaryWalls.clear(true, true);
                this.boundaryWalls = null;
            }
            
            // Clean up any physics bodies to prevent duplication issues
            this.blocks.getChildren().forEach(block => {
                if (block.body) {
                    // Destroy the physics body but keep the game object
                    this.physics.world.remove(block.body);
                    block.body = null;
                }
            });
            
            this.triggers.getChildren().forEach(trigger => {
                if (trigger.body) {
                    // Destroy the physics body but keep the game object
                    this.physics.world.remove(trigger.body);
                    trigger.body = null;
                }
            });
            
            // Clean up enemy physics bodies
            if (this.enemies) {
                this.enemies.getChildren().forEach(enemy => {
                    if (enemy.body) {
                        // Destroy the physics body but keep the game object
                        this.physics.world.remove(enemy.body);
                        enemy.body = null;
                    }
                });
            }
            
            if (this.player && this.player.body) {
                this.physics.world.remove(this.player.body);
                this.player.body = null;
            }
            
            // Restore saved state
            if (this.savedState) {
                // Clear all existing objects first to prevent duplication
                this.cleanupAllObjects();
                
                // Now restore from saved state
                this.restoreState(this.savedState);
                this.savedState = null;
            }
            
            // Re-enable selector tool
            this.setTool('selector');
            
            // Hide touch controls when exiting preview mode
            if (this.touchControlsContainer) {
                this.touchControlsContainer.classList.remove('preview-active');
            }
            
            // Recreate minimap when returning to editor mode if it was destroyed
            if (this.minimapDestroyedForPreview) {
                // Recreate the minimap from scratch
                this.createMinimap();
                
                // Reset the flag
                this.minimapDestroyedForPreview = false;
            } else {
                // If minimap exists but was just hidden (fallback)
                if (this.minimap) {
                    // Get the game width to properly position the minimap
                    const gameWidth = this.cameras.main.width;
                    
                    // Restore position
                    this.minimap.x = gameWidth / 2;
                    
                    // Make visible
                    this.minimap.setVisible(true);
                    this.minimap.setAlpha(1);
                }
                if (this.minimapHitArea) {
                    // Get the game width to properly position the hit area
                    const gameWidth = this.cameras.main.width;
                    
                    // Restore position
                    this.minimapHitArea.x = gameWidth / 2;
                    
                    // Make visible and interactive
                    this.minimapHitArea.setVisible(true);
                    this.minimapHitArea.setAlpha(1);
                    this.minimapHitArea.setInteractive({ cursor: 'pointer' });
                }
            }
        }
        
        // Update tool button states
        Object.entries(this.tools).forEach(([name]) => {
            const button = document.getElementById(`${name}-tool`);
            button.disabled = this.isPreviewMode;
        });
    }
    
    // Set up enemy collisions and behavior for preview mode
    setupEnemyCollisions() {
        // Only proceed if we have enemies and player
        if (!this.enemies || !this.player) return;
        
        // Enable physics for all enemies
        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.body) {
                this.physics.add.existing(enemy);
            }
            
            // Make sure enemy physics are enabled
            if (enemy.body) {
                enemy.body.enable = true;
                enemy.body.gravity.y = 300; // Same gravity as player
            }
            
            // Add collision between enemy and blocks
            this.physics.add.collider(enemy, this.blocks, (enemy, block) => {
                // Check if the collision is from the side (horizontal)
                if (enemy.body.touching.left || enemy.body.touching.right) {
                    // Reverse enemy direction when hitting blocks from the sides
                    enemy.reverseDirection();
                }
            });
            
            // Add collision between enemy and spikes
            if (this.spikes && this.spikes.getChildren().length > 0) {
                this.physics.add.overlap(enemy, this.spikes, (enemy, spike) => {
                    // Enemy changes direction when hitting spikes
                    enemy.reverseDirection();
                });
            }
            
            // Add collision between enemy and player
            this.physics.add.overlap(this.player, enemy, (player, enemy) => {
                // Get the relative positions to determine collision direction
                const playerBottom = player.y + player.body.height / 2;
                const enemyTop = enemy.y - enemy.body.height / 2;
                
                // If player is above enemy (stomping on head)
                if (playerBottom < enemyTop + 10 && player.body.velocity.y > 0) {
                    // Player defeated the enemy
                    enemy.die();
                    
                    // Make player bounce up slightly
                    player.body.velocity.y = -200;
                } else {
                    // Player dies if hitting enemy from sides or below
                    if (!this.isDeathPopupShown && !this.isVictoryPopupShown) {
                        // Show death screen
                        this.deathScreen.show();
                        this.isDeathPopupShown = true;
                    }
                }
            });
        });
    }
    
    update(time, delta) {
        if (this.player && this.isPreviewMode) {
            // Only update player if death popup is not shown
            if (!this.isDeathPopupShown) {
                // Pass time and delta to the player update method
                this.player.update(time, delta);
                
                // Check if player is outside level boundaries and teleport them back inside
                this.checkAndFixPlayerBoundaries();
            } else {
                // If death popup is shown, freeze the player
                if (this.player.body) {
                    this.player.body.velocity.x = 0;
                    this.player.body.velocity.y = 0;
                }
            }
        }
        
        // Update enemies in preview mode
        if (this.isPreviewMode && this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                if (enemy.active && enemy.body) {
                    enemy.update();
                }
            });
        }
        
        // Update moving clouds
        this.updateClouds(delta);
    }
    
    // Update cloud positions and manage cloud lifecycle
    updateClouds(delta) {
        if (!this.clouds || this.clouds.length === 0) return;
        
        // Keep track of clouds to remove
        const cloudsToRemove = [];
        
        // Get camera view boundaries
        const camera = this.cameras.main;
        const cameraLeft = camera.scrollX;
        const cameraRight = camera.scrollX + camera.width;
        
        // Count clouds in view
        let cloudsInView = 0;
        
        // Update each cloud position
        this.clouds.forEach(cloud => {
            // Move cloud to the right
            cloud.x += cloud.speed * (delta / 16); // Normalize by frame time
            
            // Check if cloud is in camera view
            if (cloud.x + cloud.cloudWidth > cameraLeft && cloud.x < cameraRight) {
                cloudsInView++;
            }
            
            // Check if cloud has moved off-screen to the right
            if (cloud.x > this.levelWidth + cloud.cloudWidth) {
                cloudsToRemove.push(cloud);
            }
        });
        
        // Remove clouds that have gone off-screen
        cloudsToRemove.forEach(cloud => {
            const index = this.clouds.indexOf(cloud);
            if (index !== -1) {
                this.clouds.splice(index, 1);
                cloud.destroy();
            }
        });
        
        // Add new clouds if we're below the minimum
        while (this.clouds.length < this.minClouds) {
            this.createCloud();
        }
        
        // Ensure there are always clouds in the player's view
        // If fewer than 3 clouds are visible, add a new one just off the left side of the camera
        if (cloudsInView < 3 && Math.random() < 0.05) {
            const newCloudX = cameraLeft - Phaser.Math.Between(50, 200);
            // Only create if it's within the level bounds
            if (newCloudX > 0) {
                this.createCloudAtPosition(newCloudX);
            }
        }
        
        // Randomly add a new cloud if we're below the maximum (increased chance)
        if (this.clouds.length < this.maxClouds && Math.random() < 0.003) {
            this.createCloud();
        }
    }
    
    onPointerDown(pointer) {
        if (!this.isPreviewMode) {
            // Check if the pointer is over the minimap or minimap camera
            if (this.minimapHitArea && this.minimapHitArea.getBounds().contains(pointer.x, pointer.y)) {
                // Set a flag to indicate minimap interaction is in progress
                this.minimapInteractionInProgress = true;
                // Don't process any other pointer events for this click
                return;
            }
            
            // Direct access to active tool for faster response
            const activeTool = Object.values(this.tools).find(tool => tool.active);
            if (activeTool) {
                activeTool.onPointerDown(pointer);
            }
        }
    }
    
    onPointerMove(pointer) {
        if (!this.isPreviewMode) {
            // Direct access to active tool for faster response
            const activeTool = Object.values(this.tools).find(tool => tool.active);
            if (activeTool) {
                // Set world coordinates directly on the pointer for faster access
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                pointer.worldX = worldPoint.x;
                pointer.worldY = worldPoint.y;
                
                // Call the tool's pointer move handler directly
                activeTool.onPointerMove(pointer);
                
                // No need to force render update - Phaser handles this automatically
            }
        }
    }
    
    onPointerUp(pointer) {
        if (!this.isPreviewMode) {
            // Direct access to active tool for faster response
            const activeTool = Object.values(this.tools).find(tool => tool.active);
            if (activeTool) {
                activeTool.onPointerUp(pointer);
            }
        }
    }
    
    /**
     * Deselect all objects in the scene
     */
    deselectAllObjects() {
        // Deselect all blocks
        this.blocks.getChildren().forEach(block => {
            if (block.setSelected) {
                block.setSelected(false);
            }
        });
        
        // Deselect all triggers
        this.triggers.getChildren().forEach(trigger => {
            if (trigger.setSelected) {
                trigger.setSelected(false);
            }
        });
    }
    
    /**
     * Create invisible walls for level boundaries in preview mode
     */
    createBoundaryWalls() {
        // Create a physics group for the boundary walls
        this.boundaryWalls = this.physics.add.staticGroup();
        
        // Wall thickness
        const wallThickness = 50;
        
        // Create left wall
        const leftWall = this.add.rectangle(0 - wallThickness/2, this.levelHeight/2, wallThickness, this.levelHeight, 0x000000, 0);
        this.boundaryWalls.add(leftWall);
        
        // Create right wall
        const rightWall = this.add.rectangle(this.levelWidth + wallThickness/2, this.levelHeight/2, wallThickness, this.levelHeight, 0x000000, 0);
        this.boundaryWalls.add(rightWall);
        
        // Create top wall (optional, can be removed if you want the player to be able to jump above the screen)
        const topWall = this.add.rectangle(this.levelWidth/2, 0 - wallThickness/2, this.levelWidth, wallThickness, 0x000000, 0);
        this.boundaryWalls.add(topWall);
        
        // Create bottom wall (optional, usually there's already a ground block)
        const bottomWall = this.add.rectangle(this.levelWidth/2, this.levelHeight + wallThickness/2, this.levelWidth, wallThickness, 0x000000, 0);
        this.boundaryWalls.add(bottomWall);
        
        // Add collision between player and boundary walls if player exists
        if (this.player) {
            this.physics.add.collider(this.player, this.boundaryWalls);
        }
    }
    
    // Create a gradient sky background with moving clouds and sun
    createSkyBackground() {
        // Remove any existing sky elements
        if (this.skyBackground) {
            this.skyBackground.destroy();
        }
        
        if (this.clouds) {
            this.clouds.forEach(cloud => cloud.destroy());
        }
        
        if (this.sun) {
            this.sun.destroy();
        }
        
        // Create a gradient sky background
        this.skyBackground = this.add.graphics();
        this.drawSkyGradient();
        
        // Create the sun (fixed to camera)
        this.createSun();
        
        // Create moving clouds
        this.clouds = [];
        this.minClouds = 4; // Minimum number of clouds
        this.maxClouds = 8; // Maximum number of clouds
        this.createInitialClouds();
    }
    
    // Draw the sky gradient
    drawSkyGradient() {
        if (!this.skyBackground) return;
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const levelWidth = Math.max(width, this.levelWidth);
        
        this.skyBackground.clear();
        
        // Create a gradient from light blue to white
        const topColor = 0x87CEEB;    // Sky blue
        const bottomColor = 0xE0F7FF;  // Very light blue/white
        
        // Draw the gradient in 10 steps
        const steps = 10;
        for (let i = 0; i < steps; i++) {
            const ratio = i / steps;
            
            // Interpolate between colors
            const r1 = (topColor >> 16) & 0xFF;
            const g1 = (topColor >> 8) & 0xFF;
            const b1 = topColor & 0xFF;
            
            const r2 = (bottomColor >> 16) & 0xFF;
            const g2 = (bottomColor >> 8) & 0xFF;
            const b2 = bottomColor & 0xFF;
            
            const r = Math.floor(r1 + (r2 - r1) * ratio);
            const g = Math.floor(g1 + (g2 - g1) * ratio);
            const b = Math.floor(b1 + (b2 - b1) * ratio);
            
            const color = (r << 16) | (g << 8) | b;
            
            const y1 = Math.floor(height * (i / steps));
            const y2 = Math.floor(height * ((i + 1) / steps));
            
            this.skyBackground.fillStyle(color, 1);
            this.skyBackground.fillRect(0, y1, levelWidth, y2 - y1);
        }
        
        // Make sure the sky is behind everything else
        this.skyBackground.setDepth(-100);
    }
    
    // Create the sun (fixed to camera)
    createSun() {
        const sunSize = 80;
        const sunX = 100;
        const sunY = 80;
        
        // Create sun graphics
        this.sun = this.add.graphics();
        this.sun.fillStyle(0xFFD700, 1); // Golden yellow
        this.sun.fillCircle(0, 0, sunSize / 2);
        
        // Add a glow effect
        this.sun.fillStyle(0xFFD700, 0.3);
        this.sun.fillCircle(0, 0, sunSize * 0.6);
        
        // Position the sun relative to the camera
        this.sun.setScrollFactor(0); // Fixed to camera
        this.sun.setPosition(sunX, sunY);
        this.sun.setDepth(-99); // Above sky but below other elements
    }
    
    // Create initial set of clouds
    createInitialClouds() {
        // Clear existing clouds
        if (this.clouds) {
            this.clouds.forEach(cloud => cloud.destroy());
            this.clouds = [];
        }
        
        // Increase the number of clouds to ensure coverage across the entire level
        this.minClouds = 12; // Increased minimum
        this.maxClouds = 20; // Increased maximum
        
        // Calculate how many clouds we need based on level width
        const cloudsNeeded = Math.max(
            this.minClouds,
            Math.floor(this.levelWidth / 400) // Roughly one cloud every 400px
        );
        
        // Create initial clouds spread across the level
        for (let i = 0; i < cloudsNeeded; i++) {
            this.createCloud(true);
        }
    }
    
    // Create a single cloud with uniform transparency
    createCloud(isInitial = false) {
        const height = this.cameras.main.height;
        
        // Cloud properties
        const cloudWidth = Phaser.Math.Between(150, 300);
        const cloudHeight = Phaser.Math.Between(50, 80);
        const cloudY = Phaser.Math.Between(height * 0.05, height * 0.3);
        
        // For initial clouds, spread them across the level
        // For new clouds, start them just off-screen to the left
        const cloudX = isInitial 
            ? Phaser.Math.Between(0, this.levelWidth)
            : -cloudWidth - Phaser.Math.Between(0, 100);
        
        return this.createCloudAtPosition(cloudX, cloudY, cloudWidth, cloudHeight);
    }
    
    // Create a cloud at a specific position
    createCloudAtPosition(x, y = null, width = null, height = null) {
        const cameraHeight = this.cameras.main.height;
        
        // Use provided values or generate random ones
        const cloudWidth = width || Phaser.Math.Between(150, 300);
        const cloudHeight = height || Phaser.Math.Between(50, 80);
        const cloudY = y || Phaser.Math.Between(cameraHeight * 0.05, cameraHeight * 0.3);
        
        // Create a container to hold all cloud parts
        const cloudContainer = this.add.container(x, cloudY);
        cloudContainer.setDepth(-98); // Above sky and sun but below game elements
        
        // Create a single graphics object for the entire cloud
        const cloudGraphics = this.add.graphics();
        cloudGraphics.fillStyle(0xFFFFFF, 0.7); // Set opacity for the entire cloud
        
        // Draw a more complex cloud shape (multiple overlapping circles)
        const centerX = cloudWidth / 2;
        const centerY = cloudHeight / 2;
        const radiusX = cloudWidth / 4;
        const radiusY = cloudHeight / 2;
        
        // Draw the cloud shape
        cloudGraphics.fillCircle(centerX, centerY, radiusX);
        cloudGraphics.fillCircle(centerX - radiusX, centerY, radiusX);
        cloudGraphics.fillCircle(centerX + radiusX, centerY, radiusX);
        cloudGraphics.fillCircle(centerX, centerY - radiusY/2, radiusX);
        
        // Add the graphics to the container
        cloudContainer.add(cloudGraphics);
        
        // Add custom properties for movement
        cloudContainer.speed = Phaser.Math.FloatBetween(0.2, 0.5); // Different speeds for each cloud
        cloudContainer.cloudWidth = cloudWidth;
        cloudContainer.cloudHeight = cloudHeight;
        
        // Add to clouds array
        this.clouds.push(cloudContainer);
        
        return cloudContainer;
    }
    
    // Update the sky background (for resize events)
    updateSkyBackground() {
        if (!this.skyBackground) return;
        
        // Redraw the sky gradient
        this.drawSkyGradient();
        
        // Recreate clouds if needed
        if (!this.clouds || this.clouds.length === 0) {
            this.createInitialClouds();
        }
        
        // Recreate sun if needed
        if (!this.sun) {
            this.createSun();
        }
    }
    
    /**
     * Create invisible boundary walls to prevent the player from going out of bounds
     * These walls are positioned at the edges of the level
     */
    createBoundaryWalls() {
        // Create or clear the boundary walls group
        if (!this.boundaryWalls) {
            this.boundaryWalls = this.physics.add.staticGroup();
        } else {
            this.boundaryWalls.clear(true, true); // Remove existing walls
        }
        
        // Wall thickness
        const wallThickness = 50;
        
        // Create left boundary wall (at x=0)
        const leftWall = this.add.rectangle(0, this.levelHeight / 2, wallThickness, this.levelHeight, 0x000000, 0);
        this.physics.add.existing(leftWall, true); // true = static body
        this.boundaryWalls.add(leftWall);
        
        // Create right boundary wall (at x=levelWidth)
        const rightWall = this.add.rectangle(this.levelWidth, this.levelHeight / 2, wallThickness, this.levelHeight, 0x000000, 0);
        this.physics.add.existing(rightWall, true);
        this.boundaryWalls.add(rightWall);
        
        // Create top boundary wall (at y=0)
        const topWall = this.add.rectangle(this.levelWidth / 2, 0, this.levelWidth, wallThickness, 0x000000, 0);
        this.physics.add.existing(topWall, true);
        this.boundaryWalls.add(topWall);
        
        console.log('Boundary walls created at level edges');
        
        // Add collision between player and boundary walls if player exists
        if (this.player) {
            this.physics.add.collider(this.player, this.boundaryWalls);
        }
    }
    
    /**
     * Handle resize events from the scale manager
     * This adjusts camera bounds, ground position, and other elements to fit the new size
     * @param {Phaser.Structs.Size} gameSize - The new game size
     * @param {Phaser.Structs.Size} baseSize - The base game size
     * @param {Phaser.Structs.Size} displaySize - The new display size
     * @param {number} resolution - The resolution
     */
    handleResize(gameSize, baseSize, displaySize, resolution) {
        // Get the game container element
        const gameContainer = document.getElementById('phaser-game');
        
        // Skip resize handling during view transitions or when scene is not active
        // This prevents issues when switching between game and editor views
        if (!this.scene.isActive() || (gameContainer && gameContainer.offsetWidth === 0)) {
            console.log('Skipping resize for inactive or hidden EditorScene');
            return;
        }
        
        // Reduce debounce time for mobile to be more responsive
        const debounceTime = 300; // Reduced from 500ms to 300ms
        
        // Skip resize handling when switching between views
        // This is a critical fix to prevent the ground collider from moving
        if (this._lastResizeTime && Date.now() - this._lastResizeTime < debounceTime) {
            console.log('Skipping resize - too soon after last resize');
            return;
        }
        this._lastResizeTime = Date.now();
        
        // Get actual dimensions from the container rather than relying solely on the passed parameters
        // This helps with mobile browsers that might report incorrect dimensions during transitions
        const containerWidth = gameContainer ? gameContainer.clientWidth : displaySize.width;
        const containerHeight = gameContainer ? gameContainer.clientHeight : displaySize.height;
        
        // Use the most reliable dimensions available
        const width = Math.max(containerWidth, displaySize.width);
        const height = Math.max(containerHeight, displaySize.height);
        
        console.log('Resize handler called', { 
            displayWidth: displaySize.width, 
            displayHeight: displaySize.height,
            containerWidth: containerWidth,
            containerHeight: containerHeight,
            finalWidth: width,
            finalHeight: height,
            active: this.scene.isActive()
        });
        
        // Update camera bounds to match new height while maintaining level width
        this.levelHeight = height;
        this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);
        
        // Find and reposition the ground
        const ground = this.blocks.getChildren().find(block => block.isGround);
        if (ground) {
            // Position ground exactly at the bottom of the screen on mobile
            // The constant offset might be causing the gap on mobile devices
            // Use our more accurate mobile detection helper method
            const isMobile = this.isMobileDevice();
            ground.y = this.levelHeight - (isMobile ? 40 : 80); // Less offset on mobile devices
            
            // For containers like Block, we need to update the rectangle inside
            if (ground.rectangle) {
                ground.rectangle.width = this.levelWidth; // Ensure ground covers entire level width
            }
            
            // Only update the physics body if it exists and we're not in a view transition
            if (ground.body) {
                // Store the original position before updating
                const originalY = ground.y;
                
                // Manually update the physics body with fixed dimensions
                ground.body.setSize(this.levelWidth, 50);
                
                // Ensure the ground position hasn't changed
                ground.y = originalY;
                
                console.log('Ground repositioned to:', ground.y);
            }
        }
        
        // Schedule a second resize check after a short delay to catch any dimension changes
        // that might have happened during the resize operation (especially on mobile)
        setTimeout(() => {
            if (this.scene && this.scene.isActive()) {
                const newContainerWidth = gameContainer ? gameContainer.clientWidth : displaySize.width;
                const newContainerHeight = gameContainer ? gameContainer.clientHeight : displaySize.height;
                
                // Only perform the second resize if dimensions have changed
                if (newContainerWidth !== containerWidth || newContainerHeight !== containerHeight) {
                    console.log('Secondary resize check - dimensions changed:', {
                        width: newContainerWidth,
                        height: newContainerHeight
                    });
                    
                    // Update camera and level height
                    this.levelHeight = newContainerHeight;
                    this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);
                    
                    // Reposition ground again if needed
                    if (ground) {
                        // Use our more accurate mobile detection helper method
                        const isMobile = this.isMobileDevice();
                        ground.y = this.levelHeight - (isMobile ? 40 : 80); // Less offset on mobile devices
                        if (ground.rectangle) {
                            ground.rectangle.width = this.levelWidth;
                        }
                        if (ground.body) {
                            ground.body.setSize(this.levelWidth, 50);
                        }
                    }
                }
            }
        }, 100);
        
        // Update boundary walls if they exist
        if (this.boundaryWalls) {
            this.boundaryWalls.clear(true, true); // Remove existing walls
        }
        this.createBoundaryWalls(); // Recreate walls with new dimensions
        
        // Update sky background to match new dimensions
        this.updateSkyBackground();
        
        // Only recreate the minimap if not in preview mode
        if (!this.isPreviewMode) {
            // Recreate the minimap with new dimensions while preserving camera position
            this.createMinimap(true);
        } else {
            // In preview mode, ensure the minimap remains destroyed
            if (this.minimap) {
                this.minimap.destroy();
                this.minimap = null;
            }
            if (this.minimapHitArea) {
                this.minimapHitArea.destroy();
                this.minimapHitArea = null;
            }
            // Keep the flag set so we know to recreate the minimap when exiting preview mode
            this.minimapDestroyedForPreview = true;
        }
        
        // Reposition touch controls if they exist
        if (this.touchControlsContainer) {
            // Adjust touch control positions based on new screen size
            this.leftButton.style.bottom = `${displaySize.height * 0.2}px`;
            this.rightButton.style.bottom = `${displaySize.height * 0.2}px`;
            this.jumpButton.style.bottom = `${displaySize.height * 0.2}px`;
            this.jumpButton.style.right = `${displaySize.width * 0.2}px`;
            // Include the down button in repositioning
            this.downButton.style.bottom = `${displaySize.height * 0.2}px`;
            this.downButton.style.right = `${displaySize.width * 0.1}px`;
        }
    }
    
    // Create touch controls for mobile devices only
    createTouchControls() {
        // Create touch controls that will only be visible during preview mode
        // and will stay within the game container
        
        // Find the game container instead of attaching to body
        const gameContainer = document.getElementById('game-container');
        
        // Create a DOM container for touch controls
        this.touchControlsContainer = document.createElement('div');
        this.touchControlsContainer.className = 'touch-controls-container';
        
        // Append to game container instead of body so it stays within the game view
        if (gameContainer) {
            gameContainer.appendChild(this.touchControlsContainer);
        } else {
            // Fallback to body if game container not found
            document.body.appendChild(this.touchControlsContainer);
            console.warn('Game container not found, touch controls attached to body');
        }
        
        // Create left button
        this.leftButton = document.createElement('div');
        this.leftButton.className = 'touch-button touch-left';
        this.leftButton.innerHTML = '←';
        this.touchControlsContainer.appendChild(this.leftButton);
        
        // Create right button
        this.rightButton = document.createElement('div');
        this.rightButton.className = 'touch-button touch-right';
        this.rightButton.innerHTML = '→';
        this.touchControlsContainer.appendChild(this.rightButton);
        
        // Create jump button
        this.jumpButton = document.createElement('div');
        this.jumpButton.className = 'touch-button touch-jump';
        this.jumpButton.innerHTML = '↑';
        this.touchControlsContainer.appendChild(this.jumpButton);
        
        // Create down button
        this.downButton = document.createElement('div');
        this.downButton.className = 'touch-button touch-down';
        this.downButton.innerHTML = '↓';
        this.touchControlsContainer.appendChild(this.downButton);
        
        // Set up touch event listeners
        this.setupTouchListeners();
    }
    
    // Set up touch event listeners for the touch controls
    setupTouchListeners() {
        // Initialize touch controls for all devices (for debugging)
        
        // Track button states
        this.touchControls = {
            left: false,
            right: false,
            jump: false,
            down: false
        };
        
        // Left button - touch events
        this.leftButton.addEventListener('touchstart', () => {
            this.touchControls.left = true;
        });
        this.leftButton.addEventListener('touchend', () => {
            this.touchControls.left = false;
        });
        
        // Add mouse events for desktop debugging
        this.leftButton.addEventListener('mousedown', () => {
            this.touchControls.left = true;
        });
        this.leftButton.addEventListener('mouseup', () => {
            this.touchControls.left = false;
        });
        this.leftButton.addEventListener('mouseleave', () => {
            this.touchControls.left = false;
        });
        
        // Right button - touch events
        this.rightButton.addEventListener('touchstart', () => {
            this.touchControls.right = true;
        });
        this.rightButton.addEventListener('touchend', () => {
            this.touchControls.right = false;
        });
        
        // Add mouse events for desktop debugging
        this.rightButton.addEventListener('mousedown', () => {
            this.touchControls.right = true;
        });
        this.rightButton.addEventListener('mouseup', () => {
            this.touchControls.right = false;
        });
        this.rightButton.addEventListener('mouseleave', () => {
            this.touchControls.right = false;
        });
        
        // Jump button - touch events
        this.jumpButton.addEventListener('touchstart', () => {
            this.touchControls.jump = true;
        });
        this.jumpButton.addEventListener('touchend', () => {
            this.touchControls.jump = false;
        });
        
        // Add mouse events for desktop debugging
        this.jumpButton.addEventListener('mousedown', () => {
            this.touchControls.jump = true;
        });
        this.jumpButton.addEventListener('mouseup', () => {
            this.touchControls.jump = false;
        });
        this.jumpButton.addEventListener('mouseleave', () => {
            this.touchControls.jump = false;
        });
        
        // Down button - touch events
        this.downButton.addEventListener('touchstart', () => {
            this.touchControls.down = true;
        });
        this.downButton.addEventListener('touchend', () => {
            this.touchControls.down = false;
        });
        
        // Add mouse events for desktop debugging
        this.downButton.addEventListener('mousedown', () => {
            this.touchControls.down = true;
        });
        this.downButton.addEventListener('mouseup', () => {
            this.touchControls.down = false;
        });
        this.downButton.addEventListener('mouseleave', () => {
            this.touchControls.down = false;
        });
        
        console.log('Touch controls are now enabled for desktop debugging');
    }
    
    /**
     * Creates a minimap for navigating the level
     * The minimap shows a simplified view of the level with the current camera position
     * @param {boolean} preservePosition - Whether to preserve the current camera position
     */
    createMinimap(preservePosition = false) {
        // Store current camera position for restoration if needed
        const currentRelativeX = this.cameras.main.scrollX / (this.levelWidth - this.cameras.main.width);
        // Remove existing minimap if it exists
        if (this.minimap) {
            this.minimap.destroy();
        }
        
        // Remove existing hitArea if it exists
        if (this.minimapHitArea) {
            this.minimapHitArea.destroy();
        }
        
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        const minimapHeight = 40; // Height of minimap
        const minimapWidth = gameWidth * 0.8; // Width of minimap (80% of game width)
        const minimapScale = minimapWidth / this.levelWidth; // Scale factor for minimap
        
        // Create container for minimap elements
        this.minimap = this.add.container(gameWidth / 2, 30);
        this.minimap.setScrollFactor(0); // Fix to camera
        this.minimap.setDepth(1000); // Ensure it's on top of everything with a very high depth value
        
        // Create background for minimap
        const background = this.add.rectangle(0, 0, minimapWidth, minimapHeight, 0x333333, 0.7);
        background.setOrigin(0.5);
        this.minimap.add(background);
        
        // Create border for minimap
        const border = this.add.rectangle(0, 0, minimapWidth, minimapHeight, 0xffffff, 0);
        border.setOrigin(0.5);
        border.setStrokeStyle(1, 0xffffff, 0.5);
        this.minimap.add(border);
        
        // Create line representing the ground
        const groundLine = this.add.rectangle(0, minimapHeight / 4, minimapWidth, 2, 0xaaaaaa, 0.8);
        groundLine.setOrigin(0.5);
        this.minimap.add(groundLine);
        
        // Create camera view indicator
        const cameraWidth = Math.min(minimapWidth, gameWidth * minimapScale);
        this.minimapCamera = this.add.rectangle(0, 0, cameraWidth, minimapHeight - 4, 0xffffff, 0.3);
        this.minimapCamera.setOrigin(0.5);
        this.minimapCamera.setStrokeStyle(1, 0xffffff, 0.8);
        this.minimap.add(this.minimapCamera);
        
        // Create a separate interactive area that will stay aligned with the minimap
        // This is a transparent rectangle that will serve as our hit area
        this.minimapHitArea = this.add.rectangle(
            gameWidth / 2, // Same x as minimap container
            30, // Same y as minimap container
            minimapWidth,
            minimapHeight,
            0xffffff, // Color doesn't matter as it's transparent
            0 // Fully transparent
        );
        this.minimapHitArea.setScrollFactor(0); // Fix to camera like the minimap
        this.minimapHitArea.setInteractive({ cursor: 'pointer', useHandCursor: true }); // Set cursor to pointer when hovering
        this.minimapHitArea.setDepth(1001); // Above the minimap for interaction with very high depth value
        
        // Make the camera indicator draggable as well
        // Use a slightly larger hit area to make it easier to grab
        this.minimapCamera.setInteractive({ cursor: 'pointer', useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-this.minimapCamera.width/2 - 5, -this.minimapCamera.height/2 - 5, this.minimapCamera.width + 10, this.minimapCamera.height + 10), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
        this.minimapCamera.setDepth(1002); // Above everything for interaction with very high depth value
        
        // First set up the camera indicator drag functionality (should take precedence)
        if (this.minimapCameraPointerDownListener) {
            this.minimapCamera.off('pointerdown', this.minimapCameraPointerDownListener);
        }
        
        this.minimapCameraPointerDownListener = (pointer) => {
            if (this.isPreviewMode) return;
            
            // Stop event propagation to prevent it from reaching the minimap hit area
            if (pointer.event) {
                pointer.event.stopPropagation();
            }
            
            // Completely deselect any selected object when using the minimap camera
            if (this.tools.selector && this.tools.selector.selectedObject) {
                this.tools.selector.selectedObject.setSelected(false);
                this.tools.selector.selectedObject = null;
                this.tools.selector.dragStartPos = null;
            }
            
            // Start dragging the camera indicator
            this.isDraggingMinimapCamera = true;
            
            // Calculate the relative position of the pointer within the camera indicator
            // This is used to maintain the same relative position when dragging
            const minimapCameraBounds = this.minimapCamera.getBounds();
            this.dragOffsetX = pointer.x - minimapCameraBounds.centerX;
            this.dragStartScrollX = this.cameras.main.scrollX;
            
            // Prevent any other objects from being selected during this click
            this.minimapInteractionInProgress = true;
            
            // Prevent the minimap background click handler from running
            pointer.handled = true;
        };
        
        // Add the camera indicator drag handler first (higher priority)
        this.minimapCamera.on('pointerdown', this.minimapCameraPointerDownListener);
        
        // Then set up the minimap background click handler
        if (this.minimapPointerDownListener) {
            if (this.minimapHitArea) {
                this.minimapHitArea.off('pointerdown', this.minimapPointerDownListener);
            }
        }
        
        // Create new listener and store reference
        this.minimapPointerDownListener = (pointer) => {
            // Skip if this event was already handled by the camera indicator
            if (pointer.handled || this.isPreviewMode) return;
            
            // Stop event propagation to prevent it from reaching objects behind the minimap
            if (pointer.event) {
                pointer.event.stopPropagation();
            }
            
            // Deselect any selected object when using the minimap
            if (this.tools.selector && this.tools.selector.selectedObject) {
                this.tools.selector.selectedObject.setSelected(false);
                this.tools.selector.selectedObject = null;
                this.tools.selector.dragStartPos = null;
            }
            
            // Prevent any other objects from being selected during this click
            this.minimapInteractionInProgress = true;
            
            // When clicking on the minimap background, immediately teleport the camera indicator to that position
            this.isDraggingMinimap = true;
            this.updateMinimapCameraPosition(pointer.x);
        };
        
        // Add drag functionality to minimap hit area (lower priority)
        this.minimapHitArea.on('pointerdown', this.minimapPointerDownListener);
        
        this.minimapCamera.on('pointerdown', this.minimapCameraPointerDownListener);
        
        // Remove any existing global listeners to avoid duplicates
        if (this.minimapMoveListener) {
            this.input.off('pointermove', this.minimapMoveListener);
        }
        if (this.minimapUpListener) {
            this.input.off('pointerup', this.minimapUpListener);
            this.input.off('pointerupoutside', this.minimapUpListener);
        }
        
        // Create and store new listeners
        this.minimapMoveListener = (pointer) => {
            if (this.isDraggingMinimap && !this.isPreviewMode) {
                // Dragging the background - update camera position directly
                this.updateMinimapCameraPosition(pointer.x);
            } else if (this.isDraggingMinimapCamera && !this.isPreviewMode) {
                // When dragging the camera indicator, account for the offset to maintain
                // the same relative position of the pointer within the indicator
                const adjustedPointerX = pointer.x - this.dragOffsetX;
                
                // Get minimap hit area bounds
                const minimapWidth = this.minimapHitArea.width;
                const minimapLeft = this.minimapHitArea.x - minimapWidth / 2;
                
                // Calculate relative position within minimap (0 to 1)
                const relativeX = Phaser.Math.Clamp((adjustedPointerX - minimapLeft) / minimapWidth, 0, 1);
                
                // Convert to level position and scroll camera
                const targetScrollX = relativeX * (this.levelWidth - this.cameras.main.width);
                this.cameras.main.scrollX = targetScrollX;
                
                // Update minimap camera indicator
                this.updateMinimapCamera();
            }
        };
        
        this.minimapUpListener = () => {
            this.isDraggingMinimap = false;
            this.isDraggingMinimapCamera = false;
            
            // Reset the minimap interaction flag after a short delay
            // This ensures that any click events that might still be processing won't select objects
            setTimeout(() => {
                this.minimapInteractionInProgress = false;
            }, 50);
        };
        
        // Add global listeners
        this.input.on('pointermove', this.minimapMoveListener);
        this.input.on('pointerup', this.minimapUpListener);
        this.input.on('pointerupoutside', this.minimapUpListener);
        
        // Update minimap camera position initially
        if (preservePosition) {
            // Restore the camera position based on the stored relative position
            const targetScrollX = currentRelativeX * (this.levelWidth - this.cameras.main.width);
            this.cameras.main.scrollX = targetScrollX;
        }
        this.updateMinimapCamera();
    }
    
    /**
     * Updates the camera position based on minimap interaction
     * @param {number} pointerX - The x position of the pointer in screen coordinates
     */
    updateMinimapCameraPosition(pointerX) {
        if (!this.minimap || !this.minimapCamera || !this.minimapHitArea) return;
        
        // Get minimap hit area bounds
        const minimapWidth = this.minimapHitArea.width;
        const minimapLeft = this.minimapHitArea.x - minimapWidth / 2;
        
        // Calculate relative position within minimap (0 to 1)
        const relativeX = Phaser.Math.Clamp((pointerX - minimapLeft) / minimapWidth, 0, 1);
        
        // Convert to level position and scroll camera
        const targetScrollX = relativeX * (this.levelWidth - this.cameras.main.width);
        this.cameras.main.scrollX = targetScrollX;
        
        // Update minimap camera indicator
        this.updateMinimapCamera();
        
        // Debug info
        console.log('Minimap interaction:', {
            pointerX,
            minimapLeft,
            minimapWidth,
            relativeX,
            targetScrollX
        });
    }
    
    /**
     * Updates the minimap camera indicator position based on current camera scroll
     */
    updateMinimapCamera() {
        if (!this.minimap || !this.minimapCamera) return;
        
        // Get minimap dimensions
        const minimapWidth = this.minimapCamera.parentContainer.list[0].width;
        
        // Calculate relative position of camera in level (0 to 1)
        const relativeX = this.cameras.main.scrollX / (this.levelWidth - this.cameras.main.width);
        
        // Calculate position within minimap
        const minimapX = (relativeX - 0.5) * (minimapWidth - this.minimapCamera.width);
        this.minimapCamera.x = minimapX;
    }
    
    /**
     * Check if the player is inside any block and move them to a safe position
     * This prevents the player from getting stuck inside blocks when preview mode starts
     */
    checkAndFixPlayerPosition() {
        if (!this.player || !this.player.body) return;
        
        // Store the player's current position
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRadius = this.player.body.radius;
        
        // Flag to track if player is inside any block
        let isInsideBlock = false;
        let overlappingBlock = null;
        
        // Check collision with all blocks
        this.blocks.getChildren().forEach(block => {
            if (!block.body) return;
            
            // Get block bounds
            const blockBounds = {
                left: block.x - block.rectangle.width / 2,
                right: block.x + block.rectangle.width / 2,
                top: block.y - block.rectangle.height / 2,
                bottom: block.y + block.rectangle.height / 2
            };
            
            // Check if player is inside this block
            if (playerX + playerRadius > blockBounds.left && 
                playerX - playerRadius < blockBounds.right && 
                playerY + playerRadius > blockBounds.top && 
                playerY - playerRadius < blockBounds.bottom) {
                
                isInsideBlock = true;
                overlappingBlock = block;
                console.log('Player is inside a block!', blockBounds);
            }
        });
        
        // If player is inside a block, move them to the nearest edge
        if (isInsideBlock && overlappingBlock) {
            console.log('Moving player out of block...');
            
            // Calculate distances to each edge of the block
            const blockBounds = {
                left: overlappingBlock.x - overlappingBlock.rectangle.width / 2,
                right: overlappingBlock.x + overlappingBlock.rectangle.width / 2,
                top: overlappingBlock.y - overlappingBlock.rectangle.height / 2,
                bottom: overlappingBlock.y + overlappingBlock.rectangle.height / 2
            };
            
            // Calculate distance to each edge (accounting for player radius)
            const distToLeft = Math.abs(playerX - blockBounds.left) + playerRadius;
            const distToRight = Math.abs(playerX - blockBounds.right) + playerRadius;
            const distToTop = Math.abs(playerY - blockBounds.top) + playerRadius;
            const distToBottom = Math.abs(playerY - blockBounds.bottom) + playerRadius;
            
            // Find the shortest distance
            const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
            
            // Move player to the nearest edge with a small buffer
            const buffer = 2; // Small buffer to ensure player is fully outside
            
            if (minDist === distToLeft) {
                this.player.x = blockBounds.left - playerRadius - buffer;
            } else if (minDist === distToRight) {
                this.player.x = blockBounds.right + playerRadius + buffer;
            } else if (minDist === distToTop) {
                this.player.y = blockBounds.top - playerRadius - buffer;
            } else { // Bottom
                this.player.y = blockBounds.bottom + playerRadius + buffer;
            }
            
            // Reset velocity to prevent bouncing
            this.player.body.velocity.x = 0;
            this.player.body.velocity.y = 0;
            
            // Check if the new position is also inside another block
            // If so, try to find a completely free position
            this.findSafePosition();
        }
    }
    
    /**
     * Check if the player is outside level boundaries and teleport them back inside
     * This prevents the player from falling out of the world
     */
    checkAndFixPlayerBoundaries() {
        if (!this.player || !this.player.body) return;
        
        // Get player position and radius
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRadius = this.player.body.radius;
        
        // Find the ground block to handle the bottom boundary specially
        let groundBlock = null;
        this.blocks.getChildren().forEach(block => {
            if (block.isGround) {
                groundBlock = block;
            }
        });
        
        // Define level boundaries with a small buffer
        const buffer = 5;
        const levelBounds = {
            left: 0 + playerRadius + buffer,
            right: this.levelWidth - playerRadius - buffer,
            top: 0 + playerRadius + buffer,
            // For the bottom boundary, we'll use the level height plus a large buffer
            // This allows the player to stand on and jump from the ground block
            // but still catches them if they fall far below the level
            bottom: this.levelHeight + 100 // Allow falling a bit below before teleporting back
        };
        
        // If we have a ground block, we'll use a more sophisticated check for the bottom boundary
        let groundY = groundBlock ? groundBlock.y + groundBlock.rectangle.height/2 : this.levelHeight;
        
        let needsRepositioning = false;
        let newX = playerX;
        let newY = playerY;
        
        // Check if player is outside horizontal boundaries
        if (playerX < levelBounds.left) {
            newX = levelBounds.left;
            needsRepositioning = true;
            console.log('Player outside left boundary, teleporting back');
        } else if (playerX > levelBounds.right) {
            newX = levelBounds.right;
            needsRepositioning = true;
            console.log('Player outside right boundary, teleporting back');
        }
        
        // Check if player is outside vertical boundaries
        if (playerY < levelBounds.top) {
            newY = levelBounds.top;
            needsRepositioning = true;
            console.log('Player outside top boundary, teleporting back');
        } else if (playerY > levelBounds.bottom) {
            // For bottom boundary, place player above the ground
            // We place them at a safe position above the ground block
            if (groundBlock) {
                newY = groundBlock.y - groundBlock.rectangle.height/2 - playerRadius - buffer;
            } else {
                newY = this.levelHeight - playerRadius - buffer;
            }
            needsRepositioning = true;
            console.log('Player fell below level, teleporting above ground');
        }
        
        // If player is outside boundaries, teleport them back inside
        if (needsRepositioning) {
            // Set new position
            this.player.x = newX;
            this.player.y = newY;
            
            // Reset velocity to prevent bouncing or continued momentum
            this.player.body.velocity.x = 0;
            this.player.body.velocity.y = 0;
        }
    }
    
    /**
     * Clean up all objects in the scene to prevent duplication
     * This is used before restoring state when exiting preview mode
     */
    cleanupAllObjects() {
        console.log('Cleaning up all objects to prevent duplication');
        
        // Remove all blocks except the ground
        const blocksToRemove = [];
        this.blocks.getChildren().forEach(block => {
            if (!block.isGround) {
                blocksToRemove.push(block);
            }
        });
        
        // Remove blocks outside the loop to avoid modifying the array while iterating
        blocksToRemove.forEach(block => block.destroy());
        
        // Remove all triggers
        this.triggers.getChildren().forEach(trigger => trigger.destroy());
        
        // Remove all spikes
        if (this.spikes) {
            console.log(`Cleaning up ${this.spikes.getChildren().length} spikes`);
            this.spikes.getChildren().forEach(spike => spike.destroy());
        }
        
        // Remove all enemies
        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => enemy.destroy());
        }
        
        // Remove player if it exists
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
    }
    
    /**
     * Find a completely safe position for the player if they're still inside blocks
     * This handles cases where multiple blocks overlap
     */
    findSafePosition() {
        if (!this.player || !this.player.body) return;
        
        // Check if player is still inside any block after the first fix
        let stillInsideBlock = false;
        
        // Store the player's current position
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRadius = this.player.body.radius;
        
        this.blocks.getChildren().forEach(block => {
            if (!block.body) return;
            
            // Get block bounds
            const blockBounds = {
                left: block.x - block.rectangle.width / 2,
                right: block.x + block.rectangle.width / 2,
                top: block.y - block.rectangle.height / 2,
                bottom: block.y + block.rectangle.height / 2
            };
            
            // Check if player is inside this block
            if (playerX + playerRadius > blockBounds.left && 
                playerX - playerRadius < blockBounds.right && 
                playerY + playerRadius > blockBounds.top && 
                playerY - playerRadius < blockBounds.bottom) {
                
                stillInsideBlock = true;
            }
        });
        
        // If player is still inside a block, find a completely free position
        if (stillInsideBlock) {
            console.log('Player is still inside blocks, finding completely free position...');
            
            // Try to find a free position by scanning outward from the player's original position
            const scanRadius = 200; // How far to scan for a free position
            const scanStep = 20; // Step size for scanning
            
            // Try positions in a spiral pattern
            let foundSafePosition = false;
            let spiralX = 0;
            let spiralY = 0;
            let spiralRadius = scanStep;
            let spiralAngle = 0;
            
            while (!foundSafePosition && spiralRadius <= scanRadius) {
                // Calculate position in spiral
                spiralX = playerX + spiralRadius * Math.cos(spiralAngle);
                spiralY = playerY + spiralRadius * Math.sin(spiralAngle);
                
                // Check if this position is free
                let positionIsFree = true;
                
                this.blocks.getChildren().forEach(block => {
                    if (!block.body) return;
                    
                    // Get block bounds
                    const blockBounds = {
                        left: block.x - block.rectangle.width / 2,
                        right: block.x + block.rectangle.width / 2,
                        top: block.y - block.rectangle.height / 2,
                        bottom: block.y + block.rectangle.height / 2
                    };
                    
                    // Check if test position is inside this block
                    if (spiralX + playerRadius > blockBounds.left && 
                        spiralX - playerRadius < blockBounds.right && 
                        spiralY + playerRadius > blockBounds.top && 
                        spiralY - playerRadius < blockBounds.bottom) {
                        
                        positionIsFree = false;
                    }
                });
                
                // If position is free, move player there
                if (positionIsFree) {
                    foundSafePosition = true;
                    this.player.x = spiralX;
                    this.player.y = spiralY;
                    console.log('Found safe position at', spiralX, spiralY);
                    
                    // Reset velocity
                    this.player.body.velocity.x = 0;
                    this.player.body.velocity.y = 0;
                    break;
                }
                
                // Increment spiral
                spiralAngle += Math.PI / 8; // 22.5 degrees
                if (spiralAngle >= Math.PI * 2) { // Full circle
                    spiralAngle = 0;
                    spiralRadius += scanStep;
                }
            }
            
            // If no safe position found, place player at the top center of the level
            if (!foundSafePosition) {
                console.log('No safe position found, placing player at top center');
                this.player.x = this.levelWidth / 2;
                this.player.y = 100; // Near the top of the level
                
                // Reset velocity
                this.player.body.velocity.x = 0;
                this.player.body.velocity.y = 0;
            }
        }
    }
    
    // Handle touch move events for pinch-to-zoom and two-finger scrolling
    handleTouchMove(pointer) {
        if (!this.isTouchDevice) return;
        
        // Handle two pointers (pinch-to-zoom or two-finger scrolling)
        if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
            // Calculate the distance between the two pointers
            const distance = Phaser.Math.Distance.Between(
                this.input.pointer1.x, this.input.pointer1.y,
                this.input.pointer2.x, this.input.pointer2.y
            );
            
            // Calculate the midpoint between the two touches
            const midX = (this.input.pointer1.x + this.input.pointer2.x) / 2;
            
            // Detect if this is a horizontal scrolling gesture or a pinch gesture
            // If the pointers are roughly at the same Y position (within 100px), it's likely a horizontal scroll
            const yDiff = Math.abs(this.input.pointer1.y - this.input.pointer2.y);
            const xDiff = Math.abs(this.input.pointer1.x - this.input.pointer2.x);
            
            // If the fingers are more horizontal than vertical, treat as scrolling
            if (yDiff < 100 && xDiff > yDiff && !this.isPreviewMode) {
                // If we weren't already scrolling, start scrolling and record the position
                if (!this.twoFingerScrolling) {
                    this.twoFingerScrolling = true;
                    this.twoFingerStartX = midX;
                    this.twoFingerStartScrollX = this.cameras.main.scrollX;
                } else {
                    // Calculate how far we've moved and scroll the camera accordingly
                    // Use a multiplier to make the scrolling more responsive
                    const deltaX = (this.twoFingerStartX - midX) * 2;
                    const newScrollX = Phaser.Math.Clamp(
                        this.twoFingerStartScrollX + deltaX,
                        0,
                        this.levelWidth - this.cameras.main.width
                    );
                    
                    this.cameras.main.scrollX = newScrollX;
                    
                    // Update the minimap camera indicator
                    this.updateMinimapCamera();
                }
                return; // Skip pinch-to-zoom if we're scrolling
            }
            
            // If we have a previous distance, calculate the difference for pinch-to-zoom
            if (this.previousPinchDistance) {
                const deltaDistance = distance - this.previousPinchDistance;
                
                // Zoom the camera based on the pinch gesture
                const zoomChange = deltaDistance * 0.001;
                const newZoom = Phaser.Math.Clamp(
                    this.cameras.main.zoom + zoomChange,
                    0.5, // Min zoom
                    2    // Max zoom
                );
                
                // Zoom toward the midpoint
                this.cameras.main.zoomTo(newZoom, 100, 'Linear', true, midX, midY);
            }
            
            // Store the current distance for the next frame
            this.previousPinchDistance = distance;
        } else {
            // Reset tracking when not using two fingers
            this.previousPinchDistance = null;
            this.twoFingerScrolling = false;
        }
    }
}
