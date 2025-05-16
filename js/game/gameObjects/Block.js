export class Block extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width = 100, height = 100) {
        super(scene, x, y);
        
        this.rectangle = scene.add.rectangle(0, 0, width, height, 0x00ff00);
        this.rectangle.setOrigin(0.5);
        
        this.deleteButton = scene.add.text(0, 0, 'X', {
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
        
        this.add([this.rectangle, this.deleteButton, ...this.resizeHandles]);
        scene.add.existing(this);
        
        this.setSize(width, height);
        this.setInteractive(new Phaser.Geom.Rectangle(-width/2, -height/2, width, height), Phaser.Geom.Rectangle.Contains);
        
        this.deleteButton.setInteractive();
        this.deleteButton.on('pointerdown', () => {
            this.destroy();
        });
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
    }
}
