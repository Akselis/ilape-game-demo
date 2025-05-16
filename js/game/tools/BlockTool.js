import { Tool } from './Tool.js';
import { Block } from '../gameObjects/Block.js';

export class BlockTool extends Tool {
    constructor(scene) {
        super(scene);
    }
    
    onPointerDown(pointer) {
        if (!this.active) return;
        
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const block = new Block(this.scene, worldPoint.x, worldPoint.y);
        this.scene.blocks.add(block);
        
        // Switch to selector tool after placing a block
        this.scene.setTool('selector');
    }
}
