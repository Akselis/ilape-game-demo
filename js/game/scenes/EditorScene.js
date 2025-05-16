import { Block } from '../gameObjects/Block.js';
import { Player } from '../gameObjects/Player.js';
import { LevelEndTrigger } from '../gameObjects/LevelEndTrigger.js';
import { SelectorTool } from '../tools/SelectorTool.js';
// MoverTool removed as requested
import { BlockTool } from '../tools/BlockTool.js';
import { TriggerTool } from '../tools/TriggerTool.js';
import { PlayerTool } from '../tools/PlayerTool.js';
import { saveStateToStorage, loadStateFromStorage } from '../../utils/cookieManager.js';

export class EditorScene extends Phaser.Scene {
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
    }
    
    create() {
        // Set up world bounds
        this.levelWidth = 6400; // Increased from 3200 to allow for larger levels
        // Use the camera's height (game config height) instead of the window height
        this.levelHeight = this.cameras.main.height;
        this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);
        
        // Create a gradient sky background
        this.createSkyBackground();
        
        // Create groups for blocks and triggers
        this.blocks = this.add.group();
        this.triggers = this.add.group();
        
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
        const ground = new Block(this, this.levelWidth/2, this.levelHeight + 50, this.levelWidth, 50);
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
            player: new PlayerTool(this)
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
        
        // Remove player
        if (this.player) {
            this.player.destroy();
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
            this.savedState = this.saveState();
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
                        block.body.setSize(this.levelWidth, 50);
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
                
                // Add collision with level end triggers
                this.triggers.getChildren().forEach(trigger => {
                    // Enable physics for trigger
                    if (trigger.body) {
                        trigger.body.enable = true;
                        // Update the body position to match the trigger's current position
                        trigger.body.position.x = trigger.x - trigger.body.width / 2;
                        trigger.body.position.y = trigger.y - trigger.body.height / 2;
                    } else {
                        this.physics.add.existing(trigger);
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
            
            // Restore saved state
            if (this.savedState) {
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
    
    update(time, delta) {
        if (this.player && this.isPreviewMode) {
            // Pass time and delta to the player update method
            this.player.update(time, delta);
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
        // Skip resize handling during view transitions or when scene is not active
        // This prevents issues when switching between game and editor views
        if (!this.scene.isActive() || document.getElementById('phaser-game').offsetWidth === 0) {
            console.log('Skipping resize for inactive or hidden EditorScene');
            return;
        }
        
        // Skip resize handling when switching between views
        // This is a critical fix to prevent the ground collider from moving
        if (this._lastResizeTime && Date.now() - this._lastResizeTime < 500) {
            console.log('Skipping resize - too soon after last resize');
            return;
        }
        this._lastResizeTime = Date.now();
        
        console.log('Resize handler called', { 
            width: displaySize.width, 
            height: displaySize.height,
            active: this.scene.isActive(),
            visible: document.getElementById('phaser-game').offsetWidth > 0
        });
        
        // Update camera bounds to match new height while maintaining level width
        this.levelHeight = displaySize.height;
        this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);
        
        // Find and reposition the ground
        const ground = this.blocks.getChildren().find(block => block.isGround);
        if (ground) {
            // Position ground below the bottom of the screen as per your new position
            ground.y = this.levelHeight - 100; // 100px below the bottom of the screen
            
            // For containers like Block, we need to update the rectangle inside
            if (ground.rectangle) {
                ground.rectangle.width = this.levelWidth; // Ensure ground covers entire level width
            }
            
            // Only update the physics body if it exists and we're not in a view transition
            if (ground.body) {
                // Store the original position before updating
                const originalY = ground.y;
                
                // Manually update the physics body with fixed dimensions
                // Use the actual height of the ground block (100px)
                ground.body.setSize(this.levelWidth, 50);
                
                // Ensure the ground position hasn't changed
                ground.y = originalY;
                
                console.log('Ground repositioned to:', ground.y);
            }
        }
        
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
        if (this.isTouchDevice && this.touchControlsContainer) {
            // Adjust touch control positions based on new screen size
            this.leftButton.style.bottom = `${displaySize.height * 0.2}px`;
            this.rightButton.style.bottom = `${displaySize.height * 0.2}px`;
            this.jumpButton.style.bottom = `${displaySize.height * 0.2}px`;
            this.jumpButton.style.right = `${displaySize.width * 0.1}px`;
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
            jump: false
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
        this.minimap.setDepth(100); // Ensure it's on top of everything
        
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
        this.minimapHitArea.setInteractive({ cursor: 'pointer' }); // Set cursor to pointer when hovering
        this.minimapHitArea.setDepth(101); // Above the minimap for interaction
        
        // Make the camera indicator draggable as well
        this.minimapCamera.setInteractive({ cursor: 'pointer' });
        this.minimapCamera.setDepth(102); // Above everything for interaction
        
        // Store reference to existing event listeners so we can remove them when recreating the minimap
        if (this.minimapPointerDownListener) {
            if (this.minimapHitArea) {
                this.minimapHitArea.off('pointerdown', this.minimapPointerDownListener);
            }
        }
        
        // Create new listener and store reference
        this.minimapPointerDownListener = (pointer) => {
            if (this.isPreviewMode) return;
            
            this.isDraggingMinimap = true;
            this.updateMinimapCameraPosition(pointer.x);
        };
        
        // Add drag functionality to minimap hit area
        this.minimapHitArea.on('pointerdown', this.minimapPointerDownListener);
        
        // Add drag functionality to camera indicator
        if (this.minimapCameraPointerDownListener) {
            this.minimapCamera.off('pointerdown', this.minimapCameraPointerDownListener);
        }
        
        this.minimapCameraPointerDownListener = (pointer) => {
            if (this.isPreviewMode) return;
            
            // Start dragging the camera indicator
            this.isDraggingMinimapCamera = true;
            this.dragStartX = pointer.x;
            this.dragStartScrollX = this.cameras.main.scrollX;
            
            // Prevent event from bubbling to the hit area
            pointer.event.stopPropagation();
        };
        
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
                // Dragging the camera indicator - calculate the drag distance
                const deltaX = pointer.x - this.dragStartX;
                
                // Convert screen delta to world delta (based on minimap scale)
                const minimapScale = this.minimapHitArea.width / this.levelWidth;
                const worldDeltaX = deltaX / minimapScale;
                
                // Calculate new scroll position
                const newScrollX = Phaser.Math.Clamp(
                    this.dragStartScrollX + worldDeltaX,
                    0,
                    this.levelWidth - this.cameras.main.width
                );
                
                // Update camera position
                this.cameras.main.scrollX = newScrollX;
                
                // Update minimap camera indicator
                this.updateMinimapCamera();
            }
        };
        
        this.minimapUpListener = () => {
            this.isDraggingMinimap = false;
            this.isDraggingMinimapCamera = false;
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
