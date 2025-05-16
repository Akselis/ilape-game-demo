import Phaser from 'phaser';

export class LevelEndTrigger extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width = 50, height = 100) {
        super(scene, x, y);
        
        this.scene = scene;
        this.isTriggered = false;
        this.levelCompleteOverlay = null;
        
        // Create the visual elements
        this.rectangle = scene.add.rectangle(0, 0, width, height, 0xff0000, 0.5);
        this.rectangle.setOrigin(0.5);
        
        this.text = scene.add.text(0, 0, 'END', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        this.deleteButton = scene.add.text(0, -height/2, 'X', {
            fontSize: '16px',
            color: '#ff0000'
        }).setOrigin(0.5);
        
        this.resizeHandles = [];
        const handlePositions = [
            [-0.5, -0.5], [0.5, -0.5],
            [-0.5, 0.5], [0.5, 0.5]
        ];
        
        handlePositions.forEach((pos, index) => {
            const handle = scene.add.rectangle(
                pos[0] * width,
                pos[1] * height,
                10, 10,
                0xffff00
            );
            handle.setOrigin(0.5);
            handle.setInteractive({ draggable: true });
            handle.cornerIndex = index;
            this.resizeHandles.push(handle);
        });
        
        this.add([this.rectangle, this.text, this.deleteButton, ...this.resizeHandles]);
        scene.add.existing(this);
        
        this.setSize(width, height);
        this.setInteractive(new Phaser.Geom.Rectangle(-width/2, -height/2, width, height), Phaser.Geom.Rectangle.Contains);
        
        this.deleteButton.setInteractive();
        this.deleteButton.on('pointerdown', () => {
            this.destroy();
        });
        
        // Create physics body for collision detection in preview mode
        scene.physics.world.enable(this, Phaser.Physics.Arcade.STATIC_BODY);
        this.body.setSize(width, height);
    }
    
    resize(cornerIndex, deltaX, deltaY) {
        const width = this.rectangle.width;
        const height = this.rectangle.height;
        
        let newWidth = width;
        let newHeight = height;
        let offsetX = 0;
        let offsetY = 0;
        
        switch(cornerIndex) {
            case 0: // Top-left
                newWidth = width - deltaX;
                newHeight = height - deltaY;
                offsetX = deltaX / 2;
                offsetY = deltaY / 2;
                break;
            case 1: // Top-right
                newWidth = width + deltaX;
                newHeight = height - deltaY;
                offsetX = deltaX / 2;
                offsetY = deltaY / 2;
                break;
            case 2: // Bottom-left
                newWidth = width - deltaX;
                newHeight = height + deltaY;
                offsetX = deltaX / 2;
                offsetY = deltaY / 2;
                break;
            case 3: // Bottom-right
                newWidth = width + deltaX;
                newHeight = height + deltaY;
                offsetX = deltaX / 2;
                offsetY = deltaY / 2;
                break;
        }
        
        if (newWidth >= 20 && newHeight >= 20) {
            this.rectangle.setSize(newWidth, newHeight);
            this.setSize(newWidth, newHeight);
            this.x += offsetX;
            this.y += offsetY;
            
            this.updateHandlePositions();
        }
    }
    
    updateHandlePositions() {
        const width = this.rectangle.width;
        const height = this.rectangle.height;
        const positions = [
            [-width/2, -height/2], [width/2, -height/2],
            [-width/2, height/2], [width/2, height/2]
        ];
        
        this.resizeHandles.forEach((handle, index) => {
            handle.setPosition(positions[index][0], positions[index][1]);
        });
        
        this.deleteButton.setPosition(0, -height/2);
        
        // Update physics body size if it exists
        if (this.body) {
            this.body.setSize(width, height);
        }
    }
    
    /**
     * Show the level complete overlay with a return to editor button
     */
    showLevelComplete() {
        if (this.isTriggered) return; // Prevent multiple triggers
        this.isTriggered = true;
        
        // Create overlay container
        this.levelCompleteOverlay = this.scene.add.container(0, 0);
        
        // Get camera center position
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;
        
        // Add semi-transparent background
        const bg = this.scene.add.rectangle(
            centerX, centerY,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0x000000, 0.7
        );
        
        // Add level complete text
        const completeText = this.scene.add.text(centerX, centerY - 50, 'Level Complete!', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Add return to editor button
        const buttonBg = this.scene.add.rectangle(centerX, centerY + 50, 200, 50, 0x4a8a4a);
        buttonBg.setInteractive({ useHandCursor: true });
        
        const buttonText = this.scene.add.text(centerX, centerY + 50, 'Return to Editor', {
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Add click handler to return to editor
        buttonBg.on('pointerdown', () => {
            // Call togglePreview on the scene to exit preview mode
            if (this.scene.togglePreview) {
                this.scene.togglePreview();
            }
            
            // Remove the overlay
            this.levelCompleteOverlay.destroy();
            this.isTriggered = false;
        });
        
        // Add all elements to the container
        this.levelCompleteOverlay.add([bg, completeText, buttonBg, buttonText]);
        
        // Make sure the overlay stays fixed to the camera
        this.levelCompleteOverlay.setDepth(1000); // Ensure it's on top of everything
        this.scene.cameras.main.ignore(this.levelCompleteOverlay);
    }
}
