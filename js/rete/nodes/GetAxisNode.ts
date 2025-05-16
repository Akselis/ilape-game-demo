import { ClassicPreset } from 'rete';
import { NodeExecutionContext } from '../types';
import { NodeType } from './NodeTypes';

const numberSocket = new ClassicPreset.Socket("number");

// Define key state type
type KeyState = {
    ArrowLeft: boolean;
    ArrowRight: boolean;
    ArrowUp: boolean;
    ArrowDown: boolean;
};

// Track key states globally
const keyStates: KeyState = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false
};

// Set up key event listeners when the module loads
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (event) => {
        if (keyStates.hasOwnProperty(event.key)) {
            keyStates[event.key as keyof KeyState] = true;
        }
    });

    window.addEventListener('keyup', (event) => {
        if (keyStates.hasOwnProperty(event.key)) {
            keyStates[event.key as keyof KeyState] = false;
        }
    });
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export class GetHorizontalAxisNode extends ClassicPreset.Node {
    // Static property that won't be minified
    static readonly TYPE = NodeType.GET_HORIZONTAL_AXIS;
    constructor() {
        super('X ąšies kryptis');
        
        this.addOutput('value', new ClassicPreset.Output(numberSocket));
    }
    
    getAxisValue(context?: NodeExecutionContext): number {
        // Combine keyboard and touch inputs
        const keyboardValue = (keyStates.ArrowLeft ? -1 : 0) + (keyStates.ArrowRight ? 1 : 0);
        
        // Get touch input from the context when available
        let touchValue = 0;
        if (context?.inputState) {
            // Convert boolean left/right states into -1/1 values
            touchValue = (context.inputState.left ? -1 : 0) + (context.inputState.right ? 1 : 0);
        }
        
        return clamp(keyboardValue + touchValue, -1, 1);
    }

    data(_inputs: unknown, context?: NodeExecutionContext): { value: number } {
        const value = this.getAxisValue(context);
        return { value };     
    }
    
    serialize() {
        // Include type information in serialized data
        return {
            nodeType: NodeType.GET_HORIZONTAL_AXIS
        };
    }
}

export class GetVerticalAxisNode extends ClassicPreset.Node {
    // Static property that won't be minified
    static readonly TYPE = NodeType.GET_VERTICAL_AXIS;  
    constructor() {
        super('Y ąšies kryptis');
        
        this.addOutput('value', new ClassicPreset.Output(numberSocket));
    }
    
    getAxisValue(context?: NodeExecutionContext): number {
        // Combine keyboard and touch inputs
        const keyboardValue = (keyStates.ArrowUp ? -1 : 0) + (keyStates.ArrowDown ? 1 : 0);
        
        // Get jump and down state from context when available
        let touchValue = 0;
        if (context?.inputState) {
            // Jump button corresponds to upward movement (negative Y)
            touchValue = context.inputState.jump ? -1 : 0;
            
            // Check for down button from touch controls for fast falling
            // We need to access the player's keyboardState.down since that's where the touch down state is stored
            if (context.player && context.player.keyboardState && context.player.keyboardState.down) {
                touchValue = 1; // Positive value for downward movement (fast falling)
            }
        }
        
        return clamp(keyboardValue + touchValue, -1, 1);
    }

    data(_inputs: unknown, context?: NodeExecutionContext): { value: number } {
        const value = this.getAxisValue(context);
        return { value };
    }
    
    serialize() {
        // Include type information in serialized data
        return {
            nodeType: NodeType.GET_VERTICAL_AXIS
        };
    }
}