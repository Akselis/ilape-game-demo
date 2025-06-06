import { Enemy } from '../gameObjects/Enemy.js';

export class EnemyTool {
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
    
    onPointerDown(pointer) {
        if (!this.active || this.scene.isPreviewMode) return;
        
        // Convert screen coordinates to world coordinates
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        // Create a new enemy at the pointer position
        const enemy = new Enemy(this.scene, worldPoint.x, worldPoint.y);
        
        // Add to enemies group
        if (!this.scene.enemies) {
            this.scene.enemies = this.scene.add.group();
        }
        this.scene.enemies.add(enemy);
        
        console.log('Enemy created at', worldPoint.x, worldPoint.y);
    }
    
    onPointerMove() {
        // No action needed on pointer move for this tool
    }
    
    onPointerUp() {
        // No action needed on pointer up for this tool
    }
}
