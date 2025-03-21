class PlayerTool extends Tool {
    constructor(scene) {
        super(scene);
    }
    
    onPointerDown(pointer) {
        if (!this.active) return;
        
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        // Remove existing player if there is one
        if (this.scene.player) {
            this.scene.player.destroy();
        }
        
        // Create new player
        this.scene.player = new Player(this.scene, worldPoint.x, worldPoint.y);
        
        // Switch to selector tool after placing player
        this.scene.setTool('selector');
    }
}
