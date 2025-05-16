import { ClassicPreset } from 'rete';

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

export class GetHorizontalAxisNode extends ClassicPreset.Node {
    constructor() {
        super('Get Horizontal Axis');
        
        this.addOutput('value', new ClassicPreset.Output(numberSocket));
    }
    
    getAxisValue(): number {
        return (keyStates.ArrowLeft ? -1 : 0) + (keyStates.ArrowRight ? 1 : 0);
    }

    data(): { value: number } {
        const value = this.getAxisValue();
        return { value };
    }
}

export class GetVerticalAxisNode extends ClassicPreset.Node {  
    constructor() {
        super('Get Vertical Axis');
        
        this.addOutput('value', new ClassicPreset.Output(numberSocket));
    }
    
    getAxisValue(): number {
        return (keyStates.ArrowUp ? -1 : 0) + (keyStates.ArrowDown ? 1 : 0);
    }

    data(): { value: number } {
        const value = this.getAxisValue();
        return { value };
    }
}