import { ClassicPreset } from 'rete';

const numberSocket = new ClassicPreset.Socket("number");

export class MultiplyNode extends ClassicPreset.Node {
    constructor() {
        super('Multiply');
        
        this.addInput('a', new ClassicPreset.Input(numberSocket, 'A'));
        this.addInput('b', new ClassicPreset.Input(numberSocket, 'B'));
        
        this.addOutput('result', new ClassicPreset.Output(numberSocket, 'A×B'));
    }

    data(inputs: { a?: number[]; b?: number[] }): { value: number } {
        // Get values from input arrays, defaulting to 0 if not provided
        const aValue = inputs.a && inputs.a.length > 0 ? inputs.a[0] : 0;
        const bValue = inputs.b && inputs.b.length > 0 ? inputs.b[0] : 0;
        
        // Multiply the values
        const result = aValue * bValue;
        
        console.log(`MultiplyNode: ${aValue} × ${bValue} = ${result}`);
        
        return { value: result };
    }
}
