class MoverTool extends Tool {
    constructor(scene) {
        super(scene);
        this.isDragging = false;
        this.lastPointerPosition = null;
    }
    
    onPointerDown(pointer) {
        if (!this.active) return;
        
        this.isDragging = true;
        this.lastPointerPosition = { x: pointer.x, y: pointer.y };
    }
    
    onPointerMove(pointer) {
        if (!this.active || !this.isDragging) return;
        
        const deltaX = pointer.x - this.lastPointerPosition.x;
        const camera = this.scene.cameras.main;
        
        camera.scrollX -= deltaX / camera.zoom;
        
        this.lastPointerPosition = { x: pointer.x, y: pointer.y };
    }
    
    onPointerUp() {
        this.isDragging = false;
        this.lastPointerPosition = null;
    }
}
