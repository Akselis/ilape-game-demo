import { PlayerLogicProcessor } from '../../rete/PlayerLogicProcessor';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Create circular body
        this.setCircle(15);
        
        // We no longer need to use setCollideWorldBounds since we're using boundary walls
        this.setCollideWorldBounds(false);
        this.body.setCollideWorldBounds(false);
        
        // Add collision with boundary walls if they exist
        if (scene.boundaryWalls) {
            scene.physics.add.collider(this, scene.boundaryWalls);
            console.log('Player collision with boundary walls set up');
        }
        
        // Player properties
        this.moveSpeed = 160;
        this.jumpSpeed = -330;
        this.body.setGravityY(600); // Example gravity
        
        // Set up direct keyboard state tracking
        this.keyboardState = {
            left: false,
            right: false,
            up: false,
            down: false
        };
        
        // Set up keyboard listeners if we're in a browser environment
        if (typeof window !== 'undefined') {
            console.log('Setting up direct keyboard listeners');
            
            // Down handler
            window.addEventListener('keydown', (event) => {
                switch(event.key) {
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        this.keyboardState.left = true;
                        break;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        this.keyboardState.right = true;
                        break;
                    case 'ArrowUp':
                    case 'w':
                    case 'W':
                    case ' ':
                        this.keyboardState.up = true;
                        break;
                    case 'ArrowDown':
                    case 's':
                    case 'S':
                        this.keyboardState.down = true;
                        break;
                }
            });
            
            // Up handler
            window.addEventListener('keyup', (event) => {
                switch(event.key) {
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        this.keyboardState.left = false;
                        break;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        this.keyboardState.right = false;
                        break;
                    case 'ArrowUp':
                    case 'w':
                    case 'W':
                    case ' ':
                        this.keyboardState.up = false;
                        break;
                    case 'ArrowDown':
                    case 's':
                    case 'S':
                        this.keyboardState.down = false;
                        break;
                }
            });
        }
        
        // Create editor controls for selection
        this.createEditorControls();
        
        // Create a red circle for the player
        const graphics = scene.add.graphics();
        graphics.lineStyle(2, 0x000000);
        graphics.fillStyle(0xff0000);
        graphics.beginPath();
        graphics.arc(16, 16, 15, 0, Math.PI * 2);
        graphics.closePath();
        graphics.fill();
        graphics.stroke();
        
        // Create texture from graphics
        const texture = graphics.generateTexture('player', 32, 32);
        graphics.destroy();
        
        this.setTexture('player');
        
        // Rete.js integration properties
        this.reteEditor = null;
        this.logicProcessor = null; // Will hold our PlayerLogicProcessor instance
        this.lastUpdateTime = 0; // Track time for delta calculations
        this.useNodeLogic = false; // Flag to determine if we should use node logic
        this.lastNodeCount = 0; // Store the current state of nodes for change detection
        this.lastConnectionCount = 0; // Store the current state of connections for change detection
        
        // Input state for use with node logic
        this.inputState = {
            left: false,
            right: false,
            jump: false
        };
    }
    
    // Method to receive Rete instances from game.js
    setReteEngine(editor, engine) {
        if (editor) {
            this.reteEditor = editor;
            
            // Create a new logic processor
            console.log('Creating PlayerLogicProcessor with editor');
            this.logicProcessor = new PlayerLogicProcessor(editor, this);
            
            // CRITICAL FIX: Manually ensure the entry points are found
            // This fixes an issue where entry points may not be correctly identified
            if (this.logicProcessor) {
                console.log('FORCING entry point detection in PlayerLogicProcessor');
                // Call findEntryPoints explicitly to ensure OnUpdate nodes are found
                this.logicProcessor.findEntryPoints();
                
                // Log what we found
                const nodes = editor.getNodes();
                console.log(`Total nodes: ${nodes.length}`);
                
                // For each node, log its details to help debug
                nodes.forEach(node => {
                    console.log(`Node ID: ${node.id}, Label: ${node.label || 'Unlabeled'}, Has outputs: ${!!node.outputs?.execOut}`);
                    
                    // If it seems like an OnUpdate node, mark it specifically
                    if (node.outputs && node.outputs.execOut && !node.inputs?.execIn) {
                        console.log(`---> This appears to be an OnUpdate node: ${node.id}`);
                        
                        // Force it into the entry points array if needed
                        if (!this.logicProcessor.updateEntryPoints.some(n => n.id === node.id)) {
                            console.log(`---> ADDING node ${node.id} to update entry points!`);
                            this.logicProcessor.updateEntryPoints.push(node);
                        }
                    }
                });
            }
            
            // Manual event handling since NodeEditor doesn't have direct event methods
            // We'll check for changes in the update loop instead
            console.log('Setting up change detection for Rete editor');
            
            // Store the current state of nodes and connections for change detection
            this.lastNodeCount = editor.getNodes().length;
            this.lastConnectionCount = editor.getConnections().length;
            
            // Check if we have valid connections to use node logic
            this.checkNodeConnections();
        }
    }
    
    // Handle editor changes
    onEditorChanged() {
        console.log('Graph changed, updating PlayerLogicProcessor');
        if (this.logicProcessor) {
            this.logicProcessor.onGraphChanged();
            this.checkNodeConnections();
        }
    }
    
    // Check if we have valid connections to use node logic
    checkNodeConnections() {
        if (!this.reteEditor || !this.logicProcessor) {
            console.warn('Cannot check node connections - editor or processor missing');
            return;
        }
        
        // Always enable node logic in preview mode, regardless of connections
        if (this.scene.isPreviewMode) {
            this.useNodeLogic = true;
            console.log('Node logic enabled for preview mode');
            
            // Debug information for production
            try {
                const nodes = this.reteEditor.getNodes();
                const connections = this.reteEditor.getConnections();
                console.log(`Preview mode active with ${nodes.length} nodes and ${connections.length} connections`);
                
                // Log node types for debugging
                const nodeTypes = nodes.map(n => n.constructor.name).join(', ');
                console.log('Node types in editor:', nodeTypes);
                
                // Structure-based type detection that works even with minified code
                // Detect nodes by examining their type signatures and static properties
                const hasUpdateNode = nodes.some(n => {
                    // Check for static TYPE property matching 'ON_UPDATE' enum value
                    const hasTypeMarker = n.constructor && n.constructor.TYPE === 'ON_UPDATE';
                    // Check for exec output which is unique to OnUpdateNode
                    const hasExecOutput = n.outputs && n.outputs.execOut;
                    // Check for serialized data type
                    const hasNodeType = n.data && (n.data.nodeType === 'ON_UPDATE');
                    
                    return hasTypeMarker || hasExecOutput || hasNodeType;
                });
                
                const hasTransformNode = nodes.some(n => {
                    // Check for static TYPE property matching 'TRANSFORM' enum value
                    const hasTypeMarker = n.constructor && n.constructor.TYPE === 'TRANSFORM';
                    // Check for transform node's signature inputs (exec + x + y)
                    const hasTransformSignature = n.inputs && n.inputs.execIn && n.inputs.x && n.inputs.y;
                    // Check for serialized data type
                    const hasNodeType = n.data && (n.data.nodeType === 'TRANSFORM');
                    
                    return hasTypeMarker || hasTransformSignature || hasNodeType;
                });
                
                console.log(`Essential nodes using type matching: UpdateNode=${hasUpdateNode}, TransformNode=${hasTransformNode}`);
                
                // Log node structure for debugging
                if (nodes.length > 0) {
                    const sampleNode = nodes[0];
                    console.log('Sample node structure:', 
                        Object.keys(sampleNode).slice(0, 5).join(', '),
                        'constructor.TYPE:', sampleNode.constructor && sampleNode.constructor.TYPE);
                }
            } catch (err) {
                console.error('Error analyzing node graph:', err);
            }
            return;
        }
        
        // For editor mode, check connections
        try {
            // Get all connections from the editor
            const connections = this.reteEditor.getConnections();
            console.log(`Found ${connections.length} connections in editor mode`);
            
            // Check if we have any connections
            if (connections && connections.length > 0) {
                // Check if we have at least one connection to a TransformNode
                // This ensures we only use node logic when it's properly set up
                const hasTransformConnection = connections.some(conn => {
                    const targetNode = this.reteEditor.getNode(conn.target);
                    const isTransform = targetNode && 
                        (targetNode.constructor.name === 'TransformNode' || 
                         (targetNode.data && targetNode.data.nodeType === 'transform'));
                    
                    if (isTransform) console.log('Found transform node:', targetNode.id);
                    return isTransform;
                });
                
                this.useNodeLogic = hasTransformConnection;
                console.log(`Node logic is now ${this.useNodeLogic ? 'enabled' : 'disabled'}`);
            } else {
                this.useNodeLogic = false;
                console.log('Node logic disabled: No connections in graph');
            }
        } catch (error) {
            console.error('Error checking node connections:', error);
            // Default to using node logic in case of error
            this.useNodeLogic = this.scene.isPreviewMode;
        }
    }
    
    update(time, delta) {
        // Only process input in preview mode and when victory/death popup is not shown
        if (this.scene.isPreviewMode && !this.scene.isVictoryPopupShown && !this.scene.isDeathPopupShown) {
            // Update input state from touch controls if available
            if (this.scene.touchControls) {
                this.inputState.left = this.scene.touchControls.left || false;
                this.inputState.right = this.scene.touchControls.right || false;
                this.inputState.jump = this.scene.touchControls.jump || false;
                this.keyboardState.down = this.scene.touchControls.down || false;
            } 
            // Otherwise use keyboard as input state
            else {
                this.inputState.left = this.keyboardState.left || false;
                this.inputState.right = this.keyboardState.right || false;
                this.inputState.jump = this.keyboardState.up || false;
            }
        } else {
            // Reset input state when not in preview mode or when victory/death popup is shown
            this.inputState = {
                left: false,
                right: false,
                jump: false
            };
            
            // If victory or death popup is shown, also stop all movement
            if ((this.scene.isVictoryPopupShown || this.scene.isDeathPopupShown) && this.body) {
                this.body.velocity.x = 0;
                this.body.velocity.y = 0;
            }
        }
        
        // FORCE DEBUG: Log the state of the player and logic processor
        console.log('PLAYER UPDATE STATE:', {
            isPreviewMode: this.scene.isPreviewMode,
            hasLogicProcessor: !!this.logicProcessor,
            useNodeLogic: this.useNodeLogic,
            nodeCount: this.reteEditor ? this.reteEditor.getNodes().length : 0,
            connectionCount: this.reteEditor ? this.reteEditor.getConnections().length : 0,
            isPlayerOnGround: this.body.touching.down
        });

        // If victory or death popup is shown, freeze the player completely
        if ((this.scene.isVictoryPopupShown || this.scene.isDeathPopupShown) && this.body) {
            // Set velocity to zero to stop all movement
            this.body.velocity.x = 0;
            this.body.velocity.y = 0;
            
            // Also disable gravity temporarily to prevent any falling
            this.body.setGravityY(0);
            
            // Set immovable to true to prevent any physics interactions from moving the player
            this.body.immovable = true;
            
            console.log('Player frozen due to victory popup');
        }
        // Otherwise, process movement normally
        else if (this.logicProcessor) {
            // Re-enable gravity if it was disabled
            if (this.body && this.body.gravity.y === 0) {
                this.body.setGravityY(600);
                this.body.immovable = false;
            }
            
            // Calculate delta time in seconds
            const deltaTime = delta / 1000;
            
            console.log('About to process logic with delta:', deltaTime);
            // Process node graph logic
            this.logicProcessor.processLogic(deltaTime);
            console.log('Finished processing logic');
        } 
        // Minimal fallback if processor doesn't exist (should not happen in typical usage)
        else {
            console.warn('No logic processor available for player - this is unexpected');
            // Apply air resistance
            this.body.velocity.y *= 0.95;
            // Reset horizontal velocity
            this.body.velocity.x = 0;
        }
        
        // Manual event handling since NodeEditor doesn't have direct event methods
        // We'll check for changes in the update loop instead
        if (this.reteEditor) {
            const currentNodeCount = this.reteEditor.getNodes().length;
            const currentConnectionCount = this.reteEditor.getConnections().length;
            
            if (currentNodeCount !== this.lastNodeCount || currentConnectionCount !== this.lastConnectionCount) {
                this.onEditorChanged();
                this.lastNodeCount = currentNodeCount;
                this.lastConnectionCount = currentConnectionCount;
            }
        }
    }
    
    /**
     * Create editor controls for the player (delete button and resize handles)
     */
    createEditorControls() {
        // Create delete button
        this.deleteButton = this.scene.add.text(0, -20, 'X', {
            fontSize: '16px',
            color: '#ff0000'
        }).setOrigin(0.5);
        this.deleteButton.setPosition(this.x, this.y - 20);
        this.deleteButton.setDepth(1000); // Make sure it's on top
        
        // Make delete button interactive
        this.deleteButton.setInteractive();
        this.deleteButton.on('pointerdown', () => {
            this.destroy();
        });
        
        // Create empty array for resize handles to match Block/Trigger API
        // Player doesn't need resize handles, but SelectorTool expects this property
        this.resizeHandles = [];
        
        // Hide controls by default
        this.deleteButton.visible = false;
    }
    
    /**
     * Set the selected state of the player
     * @param {boolean} selected - Whether the player is selected
     */
    setSelected(selected) {
        // Show/hide delete button
        if (this.deleteButton) {
            this.deleteButton.visible = selected;
            // Update position to follow the player
            this.deleteButton.setPosition(this.x, this.y - 20);
        }
    }
    
    /**
     * Override destroy method to also destroy editor controls
     */
    destroy() {
        // Destroy delete button if it exists
        if (this.deleteButton) {
            this.deleteButton.destroy();
        }
        
        // Call parent destroy method
        super.destroy();
    }
    
    /**
     * Update the position of editor controls when the player moves
     */
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        
        // Update position of editor controls
        if (this.deleteButton) {
            this.deleteButton.setPosition(this.x, this.y - 20);
        }
    }
    
    /**
     * Called when the player is added to the scene
     */
    addedToScene() {
        super.addedToScene();
        
        // Set up collisions with blocks
        if (this.scene.blocks) {
            this.scene.physics.add.collider(this, this.scene.blocks);
        }
        
        // Set up collisions with boundary walls
        if (this.scene.boundaryWalls) {
            this.scene.physics.add.collider(this, this.scene.boundaryWalls);
            console.log('Player collision with boundary walls set up in addedToScene');
        }
    }
}
