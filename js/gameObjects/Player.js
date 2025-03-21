class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Create circular body
        this.setCircle(15);
        this.setCollideWorldBounds(true);
        
        // Player properties
        this.moveSpeed = 300;
        this.jumpSpeed = -400;
        
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
        
        // Movement controls
        this.cursors = {
            left: scene.input.keyboard.addKey('A'),
            right: scene.input.keyboard.addKey('D'),
            up: scene.input.keyboard.addKey('W')
        };
    }
    
    update() {
        if (!this.scene.isPreviewMode) return;
        
        // Horizontal movement
        if (this.cursors.left.isDown) {
            this.setVelocityX(-this.moveSpeed);
        } else if (this.cursors.right.isDown) {
            this.setVelocityX(this.moveSpeed);
        } else {
            this.setVelocityX(0);
        }
        
        // Jumping
        if (this.cursors.up.isDown && this.body.touching.down) {
            this.setVelocityY(this.jumpSpeed);
        }
    }
}
