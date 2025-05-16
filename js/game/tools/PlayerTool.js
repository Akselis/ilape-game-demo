import { Tool } from './Tool.js';
import { Player } from '../gameObjects/Player.js';

export class PlayerTool extends Tool {
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
        
        // Select the newly created player
        if (this.scene.tools.selector && this.scene.player.setSelected) {
            // Deselect any previously selected object
            if (this.scene.tools.selector.selectedObject) {
                this.scene.tools.selector.selectedObject.setSelected(false);
            }
            
            // Select the new player
            this.scene.tools.selector.selectedObject = this.scene.player;
            this.scene.player.setSelected(true);
        }
    }
}
