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
        
        this.text = scene.add.text(0, 0, 'Pabaiga', {
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
        
        // Disable the body by default (will be enabled in preview mode)
        this.body.enable = false;
        
        // Hide editor controls by default
        this.setSelected(false);
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
     * Set the selected state of the trigger
     * @param {boolean} selected - Whether the trigger is selected
     */
    setSelected(selected) {
        // Show/hide resize handles
        this.resizeHandles.forEach(handle => {
            handle.visible = selected;
        });
        
        // Show/hide delete button
        this.deleteButton.visible = selected;
    }
    
    /**
     * Close the level complete overlay if it exists
     */
    closeLevelComplete() {
        if (this.levelCompleteOverlay) {
            this.levelCompleteOverlay.destroy();
            this.levelCompleteOverlay = null;
        }
        this.isTriggered = false;
    }
    
    /**
     * Show the level complete overlay
     */
    showLevelComplete() {
        if (this.isTriggered) return; // Prevent multiple triggers
        this.isTriggered = true;
        
        // Create overlay container that follows the camera
        this.levelCompleteOverlay = this.scene.add.container(0, 0);
        this.levelCompleteOverlay.setScrollFactor(0); // Fix to camera
        
        // Get camera dimensions
        const cameraWidth = this.scene.cameras.main.width;
        const cameraHeight = this.scene.cameras.main.height;
        
        // Add semi-transparent background
        const bg = this.scene.add.rectangle(
            cameraWidth / 2, cameraHeight / 2,
            cameraWidth,
            cameraHeight,
            0x000000, 0.7
        );
        
        // Create a victory panel - smaller for mobile devices
        const isMobile = cameraWidth < 768;
        const panelWidth = isMobile ? Math.min(300, cameraWidth * 0.7) : Math.min(400, cameraWidth * 0.8);
        const panelHeight = isMobile ? 180 : 200;
        const panel = this.scene.add.rectangle(
            cameraWidth / 2, 
            cameraHeight / 2,
            panelWidth, 
            panelHeight, 
            0x333333, 0.9
        );
        panel.setStrokeStyle(2, 0xffffff, 0.8);
        
        // Add victory text ("Pergalė!") - smaller font for mobile
        const fontSize = isMobile ? '36px' : '48px';
        const completeText = this.scene.add.text(cameraWidth / 2, cameraHeight / 2 - 30, 'Pergalė!', {
            fontSize: fontSize,
            color: '#ffffff',
            fontStyle: 'bold',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);
        
        // Add a star or trophy icon
        const iconSize = isMobile ? '32px' : '40px';
        const starIcon = this.scene.add.text(cameraWidth / 2, cameraHeight / 2 + 20, '🏆', {
            fontSize: iconSize
        }).setOrigin(0.5);
        
        // Add all elements to the container - no button anymore
        this.levelCompleteOverlay.add([bg, panel, completeText, starIcon]);
        
        // Make sure the overlay stays fixed to the camera and is on top of everything
        this.levelCompleteOverlay.setDepth(1000);
    }
}
