import { PlayerLogicProcessor } from '../../rete-ts/PlayerLogicProcessor';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Create circular body
        this.setCircle(15);
        this.setCollideWorldBounds(true);
        
        // Player properties
        this.moveSpeed = 160;
        this.jumpSpeed = -330;
        this.body.setGravityY(300); // Example gravity
        
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
        
        // Keyboard input setup (still needed for direct control when not using nodes)
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = {
            left: scene.input.keyboard.addKey('A'),
            right: scene.input.keyboard.addKey('D'),
            up: scene.input.keyboard.addKey('W')
        };

        // Rete.js integration properties
        this.reteEditor = null;
        this.logicProcessor = null; // Will hold our PlayerLogicProcessor instance
        this.lastUpdateTime = 0; // Track time for delta calculations
        this.useNodeLogic = false; // Flag to determine if we should use node logic
        this.lastNodeCount = 0; // Store the current state of nodes for change detection
        this.lastConnectionCount = 0; // Store the current state of connections for change detection
    }
    
    // Method to receive Rete instances from game.js
    setReteEngine(editor, engine) {
        this.reteEditor = editor;
        this.reteEngine = engine;
        console.log('Rete engine set for Player.');

        // Create the PlayerLogicProcessor if we have a valid editor
        if (editor) {
            console.log('Creating PlayerLogicProcessor for player');
            this.logicProcessor = new PlayerLogicProcessor(editor, this);
            
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
        if (!this.reteEditor || !this.logicProcessor) return;
        
        // Get all connections from the editor
        const connections = this.reteEditor.getConnections();
        
        // Check if we have any connections
        if (connections && connections.length > 0) {
            // Check if we have at least one connection to a TransformNode
            // This ensures we only use node logic when it's properly set up
            const hasTransformConnection = connections.some(conn => {
                const targetNode = this.reteEditor.getNode(conn.target);
                return targetNode && targetNode.constructor.name === 'TransformNode';
            });
            
            this.useNodeLogic = hasTransformConnection;
            console.log(`Node logic is now ${this.useNodeLogic ? 'enabled' : 'disabled'}`);
        } else {
            this.useNodeLogic = false;
            console.log('No connections found, disabling node logic');
        }
    }
    
    update(time, delta) {
        if (!this.scene.isPreviewMode) return; // Only move in preview mode
        
        // Calculate delta time in seconds
        const deltaTime = (time - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = time;
        
        // --- Rete Graph Processing --- 
        if (this.logicProcessor && this.useNodeLogic && this.scene.isPreviewMode) {
            // Use the PlayerLogicProcessor to execute the node graph
            this.logicProcessor.processLogic(deltaTime);
        } else if (this.reteEngine && this.reteEditor && this.onUpdateNodeId && this.scene.isPreviewMode) {
            // Legacy processing method (fallback)
            try {
                this.reteEngine.process(this.reteEditor.toJSON(), null, { scene: this.scene, player: this });
            } catch (error) {
                console.error("Error processing Rete graph with legacy method:", error);
                // Stop the player if node processing fails
                this.setVelocityX(0);
                this.setVelocityY(0);
            }
        } else {           
            if (this.reteEditor) {
                // Only log once to avoid console spam
                if (!this._noConnectionsLogged) {
                    console.log('Player not moving: Node graph not properly connected');
                    this._noConnectionsLogged = true;
                }
            }
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
                // Reset the log flag when connections change
                this._noConnectionsLogged = false;
            }
        }
    }
    
    // Separate method for direct keyboard controls
    useDirectControls(deltaTime) {
        // Horizontal movement
        if (this.cursors.left.isDown || this.keys.left.isDown) {
            this.setVelocityX(-this.moveSpeed);
        } else if (this.cursors.right.isDown || this.keys.right.isDown) {
            this.setVelocityX(this.moveSpeed);
        } else {
            this.setVelocityX(0);
        }
        
        // Jumping
        if ((this.cursors.up.isDown || this.keys.up.isDown) && this.body.touching.down) {
            this.setVelocityY(this.jumpSpeed);
        }
    }
}
