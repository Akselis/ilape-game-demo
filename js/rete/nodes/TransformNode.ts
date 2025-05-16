import { ClassicPreset } from 'rete';
import { NodeExecutionContext } from '../types';
import { NodeType } from './NodeTypes';

const numberSocket = new ClassicPreset.Socket("number");
const execSocket = new ClassicPreset.Socket("exec");

export class TransformNode extends ClassicPreset.Node {
    // Static property that won't be minified
    static readonly TYPE = NodeType.TRANSFORM;
    constructor() {
        super('Judėti');
        
        this.addInput('execIn', new ClassicPreset.Input(execSocket));
        
        this.addInput('x', new ClassicPreset.Input(numberSocket, 'X'));
        this.addInput('y', new ClassicPreset.Input(numberSocket, 'Y'));
    }

    data(inputs: { execIn?: any[]; x?: number[]; y?: number[] }, context?: NodeExecutionContext): { result: boolean } {
        // Default result
        const result = { result: false };
        
        // Skip if no context or player is provided
        if (!context || !context.player) {
            console.warn('Transform node: Missing context or player');
            return result;
        }
        
        try {
            // Check if the exec input is connected - this ensures the node is part of an execution flow
            const isExecConnected = inputs.execIn && inputs.execIn.length > 0;
            
            // Only process movement if exec is properly connected
            if (!isExecConnected) {
                return result;
            }
            
            const player = context.player;
            
            // Get X velocity from input - this should be a raw velocity value
            let xVelocity = 0;
            if (inputs.x && inputs.x.length > 0) {
                // Get the raw value from the input
                const rawXValue = inputs.x[0];
                
                // Scale the value to a usable velocity
                // Assuming the input is in range -1 to 1, scale to appropriate speed
                xVelocity = rawXValue;
            }
            
            // Get Y velocity from input - this should be a raw velocity value
            let yVelocity = 0;
            if (inputs.y && inputs.y.length > 0) {
                // Get the raw value from the input
                const rawYValue = inputs.y[0];
                
                // For Y velocity, we need to handle jumping differently
                // Only allow jumping if on ground and pressing up (negative Y value)
                const isOnGround = context.isOnGround !== undefined ? context.isOnGround : false;
                
                if (isOnGround && rawYValue < 0) {
                    // For jumping, use the player's jump speed directly
                    // This ensures consistent jump height
                    yVelocity = rawYValue;
                } else if (rawYValue > 0) {
                    // For downward movement, scale the input to a reasonable value
                    // This can be used for fast-falling
                    const gravity = context.gravity ?? 600; // Default gravity if undefined
                    yVelocity = gravity + (rawYValue * 0.5); // Add extra speed to gravity for fast falling
                }
            }
            
            // Apply horizontal velocity directly to the player
            player.body.setVelocityX(xVelocity);
            
            // Apply vertical velocity only when jumping or fast-falling
            // Otherwise let gravity handle it
            if (yVelocity !== 0) {
                player.body.setVelocityY(yVelocity);
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
    
    serialize() {
        // Include type information in serialized data
        return {
            nodeType: NodeType.TRANSFORM
        };
    }
}
