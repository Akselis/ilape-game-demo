import { ClassicPreset } from 'rete';

const floatSocket = new ClassicPreset.Socket("float");

export class FloatNode extends ClassicPreset.Node {
    constructor() {
        super('Float');
        
        // Add an output socket for the float value
        this.addOutput('value', new ClassicPreset.Output(floatSocket));
    
        // Add a control for entering the float value
        this.addControl('value', new ClassicPreset.InputControl('number', { 
            initial: 0.0,
            readonly: false
        }));
    }

    data(): { value: number } {
        // Access the control value directly from the node's controls
        const control = this.controls['value'] as ClassicPreset.InputControl<'number'>;
        const float = typeof control.value === 'number' ? control.value : 0;

        console.log(`Float node (${this.id}): value = ${float}`);
        
        return { value: float };
    }
}
