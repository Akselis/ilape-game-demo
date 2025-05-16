import { ClassicPreset } from 'rete';
import { NodeType } from './NodeTypes';

const execSocket = new ClassicPreset.Socket("exec");

export class OnUpdateNode extends ClassicPreset.Node {
    // Static property that won't be minified
    static readonly TYPE = NodeType.ON_UPDATE;
    constructor() {
        super('Atnaujinti');

        this.addOutput('execOut', new ClassicPreset.Output(execSocket));
    }

    data() {
        return { execOut: null };
    }
    
    serialize() {
        // Include type information in serialized data
        return {
            nodeType: NodeType.ON_UPDATE
        };
    }
}
