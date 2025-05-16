import { ClassicPreset } from 'rete';
import { NodeType } from './NodeTypes';

const floatSocket = new ClassicPreset.Socket("float");

export class FloatNode extends ClassicPreset.Node {
    // Static property that won't be minified
    static readonly TYPE = NodeType.FLOAT;
    
    // Keep track of whether this node has been processed for select-all behavior
    private selectAllHandlersAdded = false;
    
    constructor() {
        super('Skaičius');
        
        // Add an output socket for the float value
        this.addOutput('value', new ClassicPreset.Output(floatSocket));
    
        // Add a standard input control
        this.addControl('value', new ClassicPreset.InputControl('number', { 
            readonly: false
        }));
    }
    
    // Custom method to add select-all functionality to this node's inputs
    // This will be called after the node is added to the editor and rendered
    public addSelectAllBehavior(): void {
        if (this.selectAllHandlersAdded) return;
        
        // Find this node in the DOM by its id
        setTimeout(() => {
            try {
                // Use the node's id to find its element in the DOM
                const nodeElements = document.querySelectorAll(`[data-id="${this.id}"]`);
                
                if (nodeElements.length > 0) {
                    // Find all number inputs within this node
                    const inputs = Array.from(nodeElements[0].querySelectorAll('input[type="number"]'));
                    
                    inputs.forEach(input => {
                        // Add focus handler to select all text
                        input.addEventListener('focus', () => {
                            (input as HTMLInputElement).select();
                        });
                        
                        // Also select when clicked
                        input.addEventListener('click', () => {
                            (input as HTMLInputElement).select();
                        });
                    });
                    
                    this.selectAllHandlersAdded = true;
                }
            } catch (error) {
                console.error('Error adding select-all behavior:', error);
            }
        }, 100); // Short delay to ensure the DOM has been updated
    }

    data(): { value: number } {
        // Access the control value directly from the node's controls
        const control = this.controls['value'] as ClassicPreset.InputControl<'number'>;
        const float = typeof control.value === 'number' ? control.value : 0;
        
        return { value: float };
    }
    
    serialize() {
        // Save the current value of the float control
        const control = this.controls['value'] as ClassicPreset.InputControl<'number'>;
        return {
            value: control.value,
            // Include type information in serialized data
            nodeType: NodeType.FLOAT
        };
    }
}
