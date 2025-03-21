class SelectorTool extends Tool {
    constructor(scene) {
        super(scene);
        this.selectedObject = null;
        this.isDraggingHandle = false;
        this.dragStartPos = null;
    }
    
    onPointerDown(pointer) {
        if (!this.active) return;
        
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        // Check if we clicked a resize handle of the selected object
        if (this.selectedObject) {
            const handle = this.selectedObject.resizeHandles.find(h => h.getBounds().contains(worldPoint.x, worldPoint.y));
            if (handle) {
                this.isDraggingHandle = true;
                this.dragStartPos = { x: worldPoint.x, y: worldPoint.y };
                this.draggingHandle = handle;
                return;
            }
        }
        
        // Check if we clicked an object
        const objects = [...this.scene.blocks.getChildren(), ...this.scene.triggers.getChildren()];
        const clickedObject = objects.find(obj => {
            const bounds = obj.getBounds();
            return bounds.contains(worldPoint.x, worldPoint.y) && !obj.isGround; // Ignore ground block
        });
        
        if (clickedObject) {
            this.selectedObject = clickedObject;
            this.dragStartPos = { x: worldPoint.x, y: worldPoint.y };
            this.objectStartPos = { x: clickedObject.x, y: clickedObject.y };
        } else {
            this.selectedObject = null;
        }
    }
    
    onPointerMove(pointer) {
        if (!this.active || !this.dragStartPos) return;
        
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const deltaX = worldPoint.x - this.dragStartPos.x;
        const deltaY = worldPoint.y - this.dragStartPos.y;
        
        if (this.isDraggingHandle && this.selectedObject) {
            this.selectedObject.resize(this.draggingHandle.cornerIndex, deltaX, deltaY);
            this.dragStartPos = { x: worldPoint.x, y: worldPoint.y };
        } else if (this.selectedObject) {
            this.selectedObject.x = this.objectStartPos.x + deltaX;
            this.selectedObject.y = this.objectStartPos.y + deltaY;
        }
    }
    
    onPointerUp() {
        this.isDraggingHandle = false;
        this.dragStartPos = null;
        this.draggingHandle = null;
    }
    
    deactivate() {
        super.deactivate();
        this.selectedObject = null;
        this.isDraggingHandle = false;
        this.dragStartPos = null;
    }
}
