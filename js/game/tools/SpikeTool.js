import { Tool } from './Tool.js';
import { Spike } from '../gameObjects/Spike.js';

export class SpikeTool extends Tool {
    constructor(scene) {
        super(scene);
        this.name = 'spike';
    }
    
    onPointerDown(pointer) {
        if (!this.active || this.scene.isPreviewMode) return;
        
        // Get world position
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        
        // Create a new spike at the pointer position
        const spike = new Spike(this.scene, worldX, worldY);
        
        // Add to a spikes group if it exists, otherwise create one
        if (!this.scene.spikes) {
            this.scene.spikes = this.scene.add.group();
        }
        this.scene.spikes.add(spike);
    }
}
