export class DeathScreen {
    constructor(scene) {
        this.scene = scene;
        this.isShown = false;
        this.overlay = null;
    }
    
    /**
     * Show the death screen overlay
     */
    show() {
        if (this.isShown) return; // Prevent multiple triggers
        this.isShown = true;
        
        // Notify the scene that the death popup is shown
        if (this.scene) {
            this.scene.isDeathPopupShown = true;
        }
        
        // Create overlay container that follows the camera
        this.overlay = this.scene.add.container(0, 0);
        this.overlay.setScrollFactor(0); // Fix to camera
        
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
        
        // Create a death panel with sufficient size for text
        const isMobile = cameraWidth < 768;
        const panelWidth = isMobile ? Math.min(300, cameraWidth * 0.8) : Math.min(400, cameraWidth * 0.8);
        const panelHeight = isMobile ? 160 : 180;
        const panel = this.scene.add.rectangle(
            cameraWidth / 2, 
            cameraHeight / 2,
            panelWidth, 
            panelHeight, 
            0x330000, 0.9 // Dark red background for death screen
        );
        panel.setStrokeStyle(2, 0xff0000, 0.8); // Red outline
        
        // Add death text and skull icon inline
        const fontSize = isMobile ? '32px' : '40px';
        const deathText = this.scene.add.text(cameraWidth / 2, cameraHeight / 2, 'Žaidimas baigtas! ☠️', {
            fontSize: fontSize,
            color: '#ff0000', // Red text for death
            fontStyle: 'bold',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);
        
        // Add restart button
        const buttonWidth = isMobile ? 100 : 120;
        const buttonHeight = isMobile ? 30 : 40;
        const buttonY = cameraHeight / 2 + panelHeight / 2 - buttonHeight / 2 - 10;
        
        const restartButton = this.scene.add.rectangle(
            cameraWidth / 2,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x222222
        );
        restartButton.setStrokeStyle(2, 0xffffff);
        
        const restartText = this.scene.add.text(
            cameraWidth / 2,
            buttonY,
            'Iš naujo',
            {
                fontSize: isMobile ? '14px' : '16px',
                color: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // Make restart button interactive
        restartButton.setInteractive({ useHandCursor: true });
        restartButton.on('pointerdown', () => {
            this.close();
            // Reset player position to starting position
            if (this.scene.player && this.scene.savedState && this.scene.savedState.player) {
                this.scene.player.x = this.scene.savedState.player.x;
                this.scene.player.y = this.scene.savedState.player.y;
                // Reset velocity
                if (this.scene.player.body) {
                    this.scene.player.body.velocity.x = 0;
                    this.scene.player.body.velocity.y = 0;
                }
            }
        });
        
        // Add all elements to the container
        this.overlay.add([bg, panel, deathText, restartButton, restartText]);
        
        // Make sure the overlay stays fixed to the camera and is on top of everything
        this.overlay.setDepth(1000);
    }
    
    /**
     * Close the death screen overlay
     */
    close() {
        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }
        this.isShown = false;
        
        // Notify the scene that the death popup is closed
        if (this.scene) {
            this.scene.isDeathPopupShown = false;
        }
    }
}
