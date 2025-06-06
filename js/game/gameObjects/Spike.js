export class Spike extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width = 33, height = 33) {
        super(scene, x, y);
        
        this.scene = scene;
        this.isSpike = true; // Flag to identify this as a spike
        
        // Create the visual elements
        // Make the container rectangle completely transparent
        this.rectangle = scene.add.rectangle(0, 0, width, height, 0x000000, 0);
        this.rectangle.setOrigin(0.5);
        
        // Create the spike triangle directly as a graphics object
        this.spikeGraphics = scene.add.graphics();
        this.drawSpikeTriangle(width, height);
        
        // Add the graphics to the container
        this.add(this.rectangle);
        this.add(this.spikeGraphics);
        
        // Create delete button
        this.deleteButton = scene.add.text(0, -height/2 - 15, 'X', {
            fontSize: '20px',
            color: '#ff0000',
            fontStyle: 'bold',
            backgroundColor: '#ffffff',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5);
        
        // Create rotate button
        this.rotateButton = scene.add.text(0, height/2 + 15, '↻', {
            fontSize: '20px',
            color: '#00aaff',
            fontStyle: 'bold',
            backgroundColor: '#ffffff',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5);
        
        // Add buttons to container
        this.add([this.deleteButton, this.rotateButton]);
        
        // Register this container with the scene
        scene.add.existing(this);
        
        // Set up interactivity
        this.setSize(width, height);
        this.setInteractive(new Phaser.Geom.Rectangle(-width/2, -height/2, width, height), Phaser.Geom.Rectangle.Contains);
        
        // Make the spike draggable with the selector tool
        scene.input.setDraggable(this);
        
        // Handle drag events
        this.on('drag', (pointer, dragX, dragY) => {
            // Check if selector tool is active by checking the tools object
            const isSelectorActive = scene.tools && scene.tools.selector && scene.tools.selector.active;
            if (isSelectorActive && !scene.isPreviewMode) {
                this.x = dragX;
                this.y = dragY;
            }
        });
        
        // Set up delete button
        this.deleteButton.setInteractive({ useHandCursor: true });
        this.deleteButton.on('pointerdown', (pointer) => {
            this.destroy();
            
            // Stop event propagation to prevent deselection
            if (pointer.event) {
                pointer.event.stopPropagation();
            }
        });
        
        // Set up rotate button
        this.rotateButton.setInteractive({ useHandCursor: true });
        this.rotateButton.on('pointerdown', (pointer) => {
            // Rotate by 90 degrees clockwise
            this.angle = (this.angle + 90) % 360;
            
            // Stop event propagation to prevent deselection
            if (pointer.event) {
                pointer.event.stopPropagation();
            }
        });
        
        // No resize handles for spikes - they should be fixed size
        this.resizeHandles = [];
        
        // Hide editor controls by default
        this.setSelected(false);
    }
    
    /**
     * Draw the spike triangle
     */
    drawSpikeTriangle(width, height) {
        // Clear any existing graphics
        this.spikeGraphics.clear();
        
        // Set the fill and stroke style
        this.spikeGraphics.fillStyle(0xcc0000); // Red color for spikes
        this.spikeGraphics.lineStyle(2, 0x880000); // Dark red outline
        
        // Calculate dimensions
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // Draw the triangle
        this.spikeGraphics.beginPath();
        this.spikeGraphics.moveTo(0, -halfHeight);         // Top center
        this.spikeGraphics.lineTo(-halfWidth, halfHeight); // Bottom left
        this.spikeGraphics.lineTo(halfWidth, halfHeight);  // Bottom right
        this.spikeGraphics.closePath();
        this.spikeGraphics.fillPath();
        this.spikeGraphics.strokePath();
    }
    
    /**
     * Set the selected state of the spike
     * @param {boolean} selected - Whether the spike is selected
     */
    setSelected(selected) {
        // Show/hide delete and rotate buttons
        this.deleteButton.visible = selected;
        this.rotateButton.visible = selected;
    }
}
