import { ClassicPreset } from 'rete';

const execSocket = new ClassicPreset.Socket("exec");

export class OnUpdateNode extends ClassicPreset.Node {
    constructor() {
        super('On Update');

        this.addOutput('execOut', new ClassicPreset.Output(execSocket));
    }

    data() {
        return { execOut: null };
    }
}
