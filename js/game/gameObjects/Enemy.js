export class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy');
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Make enemy interactive for selection
        this.setInteractive({ useHandCursor: true });
        
        // Create enemy graphics
        this.createEnemyTexture(scene);
        
        // Set physics properties
        this.body.setSize(30, 30);
        this.body.setBounce(0);
        this.body.setFriction(0, 0);
        this.body.setGravityY(600);
        
        // Movement properties
        this.moveSpeed = 100;
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.body.velocity.x = this.moveSpeed * this.direction;
        
        // Track if enemy is alive
        this.isAlive = true;
        
        // Add to enemies group in the scene
        if (scene.enemies) {
            scene.enemies.add(this);
        }
        
        // Create editor controls for selection
        this.createEditorControls();
        
        // Edge detection properties
        this.lastX = x;
        this.lastY = y;
        this.lastOnGround = false;
        this.edgeDetectionEnabled = true;
        this.edgeDetectionTimer = 0;
        this.edgeDetectionDelay = 500; // ms
    }
    
    /**
     * Create the enemy texture
     */
    createEnemyTexture(scene) {
        // Create a graphics object for the enemy texture
        const graphics = scene.add.graphics();
        
        // Draw the enemy body (brown circle)
        graphics.fillStyle(0x8B4513); // Brown color
        graphics.fillCircle(16, 16, 15);
        
        // Draw the enemy eyes (white with black pupils)
        graphics.fillStyle(0xFFFFFF); // White color
        graphics.fillCircle(10, 10, 4); // Left eye
        graphics.fillCircle(22, 10, 4); // Right eye
        
        // Draw the pupils
        graphics.fillStyle(0x000000); // Black color
        graphics.fillCircle(10, 10, 2); // Left pupil
        graphics.fillCircle(22, 10, 2); // Right pupil
        
        // Draw angry eyebrows
        graphics.lineStyle(2, 0x000000);
        graphics.beginPath();
        graphics.moveTo(12, 7);
        graphics.lineTo(3, 5);
        graphics.moveTo(20, 7);
        graphics.lineTo(29, 5);
        graphics.stroke();
        
        // Generate texture from graphics
        const texture = graphics.generateTexture('enemy', 32, 32);
        graphics.destroy();
        
        // Set the texture
        this.setTexture('enemy');
    }
    
    /**
     * Create editor controls for the enemy (delete button and resize handles)
     */
    createEditorControls() {
        // Create a simple delete button - red X on black background
        this.deleteButton = this.scene.add.container(this.x, this.y - 25);
        
        // Background circle
        const bg = this.scene.add.circle(0, 0, 12, 0x000000, 0.7);
        
        // X text
        const xText = this.scene.add.text(0, 0, 'X', {
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ff0000'
        }).setOrigin(0.5);
        
        // Add both to container
        this.deleteButton.add([bg, xText]);
        this.deleteButton.setDepth(1000);
        
        // Make the container interactive
        bg.setInteractive(new Phaser.Geom.Circle(0, 0, 15), Phaser.Geom.Circle.Contains);
        
        // Add direct click handler to the background circle
        bg.on('pointerdown', (pointer) => {
            // Prevent event propagation
            pointer.event.stopPropagation();
            
            console.log('Enemy delete button clicked');
            
            // Direct removal from scene
            if (this.scene && this.scene.enemies) {
                this.scene.enemies.remove(this);
            }
            
            // Force destroy
            this.destroy();
        });
        
        // Add hover effects
        bg.on('pointerover', () => {
            xText.setStyle({ color: '#ffffff' });
        });
        
        bg.on('pointerout', () => {
            xText.setStyle({ color: '#ff0000' });
        });
        
        // Create empty array for resize handles to match Block/Trigger API
        // Enemy doesn't need resize handles, but SelectorTool expects this property
        this.resizeHandles = [];
        
        // Hide controls by default
        this.deleteButton.visible = false;
    }
    
    /**
     * Set the selected state of the enemy
     * @param {boolean} selected - Whether the enemy is selected
     */
    setSelected(selected) {
        // Show/hide delete button
        if (this.deleteButton) {
            this.deleteButton.visible = selected;
            
            // Update position of controls
            if (selected) {
                this.deleteButton.setPosition(this.x, this.y - 25);
            }
        }
    }
    
    /**
     * Update the position of editor controls when the enemy moves
     */
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        
        // Update position of editor controls
        if (this.deleteButton) {
            this.deleteButton.setPosition(this.x, this.y - 25);
        }
        
        if (this.deleteButtonBg) {
            this.deleteButtonBg.setPosition(this.x, this.y - 25);
        }
        
        // Skip movement logic if in editor mode or enemy is dead
        if (!this.scene.isPreviewMode || !this.isAlive) {
            return;
        }
        
        // Move in current direction
        this.body.velocity.x = this.moveSpeed * this.direction;
        
        // Flip sprite based on direction
        this.flipX = this.direction > 0;
        
        // Edge detection logic
        if (this.edgeDetectionEnabled) {
            // Check if enemy is on ground
            const onGround = this.body.touching.down || this.body.blocked.down;
            
            // If enemy was on ground and now at an edge
            if (onGround && this.lastOnGround) {
                // Create a point to check if there's ground ahead
                const rayStartX = this.x + (this.direction * 16); // Check ahead of the enemy
                const rayStartY = this.y + 16; // Start from bottom of enemy
                const rayEndY = rayStartY + 10; // Check 10px below
                
                // Check if there's no ground ahead (edge detection)
                // Use overlap circle instead of overlapRect
                let hasGroundAhead = false;
                
                // Check blocks for ground ahead
                this.scene.blocks.getChildren().forEach(block => {
                    if (!block.body) return;
                    
                    // Get block bounds
                    const blockBounds = {
                        left: block.x - block.rectangle.width / 2,
                        right: block.x + block.rectangle.width / 2,
                        top: block.y - block.rectangle.height / 2,
                        bottom: block.y + block.rectangle.height / 2
                    };
                    
                    // Check if the point ahead is above a block
                    if (rayStartX >= blockBounds.left && rayStartX <= blockBounds.right && 
                        rayEndY >= blockBounds.top && rayEndY <= blockBounds.bottom) {
                        hasGroundAhead = true;
                    }
                });
                
                // If no ground ahead, change direction
                if (!hasGroundAhead && time > this.edgeDetectionTimer) {
                    this.direction *= -1;
                    this.edgeDetectionTimer = time + this.edgeDetectionDelay;
                }
            }
            
            // Store last position and ground state
            this.lastX = this.x;
            this.lastY = this.y;
            this.lastOnGround = onGround;
        }
    }
    
    /**
     * Handle collision with walls or other obstacles
     */
    handleCollision() {
        // Change direction when hitting a wall
        this.direction *= -1;
    }
    
    /**
     * Reverse the enemy's direction (used when colliding with spikes or blocks)
     */
    reverseDirection() {
        // Change direction
        this.direction *= -1;
        
        // Apply the new direction immediately
        if (this.body) {
            this.body.velocity.x = this.moveSpeed * this.direction;
        }
    }
    
    /**
     * Kill the enemy (when player jumps on it)
     */
    die() {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        
        // Play squish animation
        this.setScale(1, 0.5);
        
        // Disable collision
        this.body.enable = false;
        
        // Fade out and destroy
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.destroy();
            }
        });
    }
    
    /**
     * Override destroy method to also destroy editor controls
     */
    destroy() {
        console.log('Enemy destroy method called');
        
        // Remove from physics world if it has a body
        if (this.body && this.scene && this.scene.physics) {
            this.scene.physics.world.remove(this.body);
        }
        
        // Remove from enemies group
        if (this.scene && this.scene.enemies) {
            this.scene.enemies.remove(this);
        }
        
        // Destroy editor controls
        if (this.deleteButton) {
            this.deleteButton.destroy();
            this.deleteButton = null;
        }
        
        if (this.deleteButtonBg) {
            this.deleteButtonBg.destroy();
            this.deleteButtonBg = null;
        }
        
        // Call parent destroy method
        super.destroy();
        
        console.log('Enemy destroyed completely');
    }
}
