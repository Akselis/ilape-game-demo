import { Tool } from './Tool.js';

export class SelectorTool extends Tool {
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
            if (handle && handle.visible) {
                this.isDraggingHandle = true;
                this.dragStartPos = { x: worldPoint.x, y: worldPoint.y };
                this.draggingHandle = handle;
                return;
            }
        }
        
        // Check if we clicked an object
        const objects = [
            ...this.scene.blocks.getChildren(), 
            ...this.scene.triggers.getChildren(),
            ...this.scene.spikes.getChildren() // Add spikes to selectable objects
        ];
        // Add player to objects list if it exists
        if (this.scene.player) {
            objects.push(this.scene.player);
        }
        
        const clickedObject = objects.find(obj => {
            const bounds = obj.getBounds();
            return bounds.contains(worldPoint.x, worldPoint.y) && !obj.isGround; // Ignore ground block
        });
        
        // Deselect previous object if it exists and is different from the clicked object
        if (this.selectedObject && this.selectedObject !== clickedObject) {
            this.selectedObject.setSelected(false);
        }
        
        if (clickedObject) {
            this.selectedObject = clickedObject;
            this.selectedObject.setSelected(true);
            this.dragStartPos = { x: worldPoint.x, y: worldPoint.y };
            this.objectStartPos = { x: clickedObject.x, y: clickedObject.y };
        } else {
            // Deselect current object if clicking empty space
            if (this.selectedObject) {
                this.selectedObject.setSelected(false);
                this.selectedObject = null;
            }
        }
    }
    
    onPointerMove(pointer) {
        if (!this.active || !this.dragStartPos) return;
        
        // Skip any processing and directly set position to pointer location for maximum responsiveness
        if (this.isDraggingHandle && this.selectedObject) {
            // For handle dragging, calculate directly from pointer position
            const worldPoint = { x: pointer.worldX, y: pointer.worldY };
            const deltaX = worldPoint.x - this.dragStartPos.x;
            const deltaY = worldPoint.y - this.dragStartPos.y;
            
            // Apply resize directly
            this.selectedObject.resize(this.draggingHandle.cornerIndex, deltaX, deltaY);
            
            // Update the start position for next move
            this.dragStartPos = { x: worldPoint.x, y: worldPoint.y };
        } else if (this.selectedObject) {
            // For object dragging, directly follow the pointer with no smoothing
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            const deltaX = worldX - this.dragStartPos.x;
            const deltaY = worldY - this.dragStartPos.y;
            
            // Direct position update with no intermediary calculations
            this.selectedObject.x = this.objectStartPos.x + deltaX;
            this.selectedObject.y = this.objectStartPos.y + deltaY;
            
            // Force immediate update of all visual components
            if (this.selectedObject.update) {
                this.selectedObject.update();
            }
            
            // Force immediate physics update if applicable
            if (this.selectedObject.body) {
                this.selectedObject.body.reset(this.selectedObject.x, this.selectedObject.y);
            }
        }
        
        // Force an immediate render update
        if (this.scene.renderer && this.scene.renderer.snapshot) {
            this.scene.renderer.snapshot();
        }
    }
    
    onPointerUp() {
        this.isDraggingHandle = false;
        this.dragStartPos = null;
        this.draggingHandle = null;
    }
    
    deactivate() {
        super.deactivate();
        
        // Deselect current object if there is one
        if (this.selectedObject) {
            this.selectedObject.setSelected(false);
            this.selectedObject = null;
        }
        
        this.isDraggingHandle = false;
        this.dragStartPos = null;
    }
}
