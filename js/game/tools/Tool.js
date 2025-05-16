export class Tool {
    constructor(scene) {
        this.scene = scene;
        this.active = false;
    }
    
    activate() {
        this.active = true;
    }
    
    deactivate() {
        this.active = false;
    }
    
    onPointerDown(pointer) {}
    onPointerMove(pointer) {}
    onPointerUp(pointer) {}
}
