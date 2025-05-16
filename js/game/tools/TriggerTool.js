import { Tool } from './Tool.js';
import { LevelEndTrigger } from '../gameObjects/LevelEndTrigger.js';

export class TriggerTool extends Tool {
    constructor(scene) {
        super(scene);
    }
    
    onPointerDown(pointer) {
        if (!this.active) return;
        
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const trigger = new LevelEndTrigger(this.scene, worldPoint.x, worldPoint.y);
        this.scene.triggers.add(trigger);
        
        // Switch to selector tool after placing a trigger
        this.scene.setTool('selector');
    }
}
