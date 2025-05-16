import { NodeEditor } from 'rete';
import { BaseAreaPlugin } from 'rete-area-plugin';
import { Item } from '../../types';
import { BSchemes, ItemDefinition } from './types';
export declare function createItem<S extends BSchemes>([label, factory]: ItemDefinition<S>, key: string | number, context: {
    editor: NodeEditor<S>;
    area: BaseAreaPlugin<S, any>;
}): Item;
//# sourceMappingURL=factory.d.ts.map