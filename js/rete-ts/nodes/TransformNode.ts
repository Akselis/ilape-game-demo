import { ClassicPreset } from 'rete';
import { NodeExecutionContext } from '../types';

const numberSocket = new ClassicPreset.Socket("number");
const execSocket = new ClassicPreset.Socket("exec");

export class TransformNode extends ClassicPreset.Node {
    constructor() {
        super('Transform');
        
        this.addInput('exec', new ClassicPreset.Input(execSocket));
        
        this.addInput('x', new ClassicPreset.Input(numberSocket, 'X'));
        this.addInput('y', new ClassicPreset.Input(numberSocket, 'Y'));
    }

    data(inputs: { exec?: any[]; x?: number[]; y?: number[] }, context?: NodeExecutionContext): { result: boolean } {
        // Default result
        const result = { result: false };
        
        // Skip if no context or player is provided
        if (!context || !context.player) {
            console.warn('Transform node: Missing context or player');
            return result;
        }
        
        try {
            // Check if the exec input is connected - this ensures the node is part of an execution flow
            const isExecConnected = inputs.exec && inputs.exec.length > 0;
            
            // Check if at least one of x or y inputs is connected
            const hasMovementInput = (inputs.x && inputs.x.length > 0) || (inputs.y && inputs.y.length > 0);
            
            // Only process movement if properly connected
            if (!isExecConnected || !hasMovementInput) {
                console.log('Transform node: Not properly connected, skipping movement');
                return result;
            }
            
            const player = context.player;
            
            // Get X movement value (horizontal)
            const xValue = inputs.x && inputs.x.length > 0 ? inputs.x[0] : 0;
            
            // Get Y movement value (vertical)
            const yValue = inputs.y && inputs.y.length > 0 ? inputs.y[0] : 0;
            
            // Apply horizontal movement - always set velocity, even when zero
            // This ensures the player stops immediately when input is zero
            player.body.setVelocityX(xValue);
            
            if (xValue !== 0) {
                console.log(`Player moving horizontally with velocity: ${xValue}`);
            }
            
            // Check if player is on the ground using the context property
            const isOnGround = context.isOnGround !== undefined ? context.isOnGround : false;
            
            // Apply vertical movement based on ground state and input
            if (isOnGround && yValue < 0) {
                // JUMPING: Player is on ground and pressing up (negative Y value)
                // For jumping, we use a stronger impulse (multiplied by 300)
                // Negative values move upward in most physics engines
                player.body.setVelocityY(yValue);
                
                console.log(`Player jumped with velocity: ${yValue}`);
            } else if (!isOnGround && yValue > 0) {
                // FAST FALLING: Player is in the air and pressing down (positive Y value)
                // Apply a downward acceleration to fall faster
                // Get current Y velocity and add to it (making it more positive/downward)
                const currentYVelocity = player.body.velocity.y;
                const fastFallVelocity = currentYVelocity + 20;
                
                player.body.setVelocityY(fastFallVelocity);
                console.log(`Fast falling with velocity: ${fastFallVelocity}`);
            }
            // In all other cases, we don't modify Y velocity to let physics handle it
            // This includes:
            // - When on ground and not jumping
            // - When in air and not pressing down
            
            // IMPORTANT: We intentionally don't reset Y velocity when in the air
            // This allows the physics engine's gravity to take effect
            // Make sure your game's update loop is NOT resetting the player's velocity each frame
            
            result.result = true;
        } catch (error) {
            console.error('Error in Transform node:', error);
        }
        
        return result;
    }
}
