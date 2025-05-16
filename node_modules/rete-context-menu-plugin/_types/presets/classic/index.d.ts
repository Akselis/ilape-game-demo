import { Item } from '../../types';
import { BSchemes, ItemDefinition } from './types';
/**
 * Classic context menu preset.
 * Configures nodes/actions items for root and Delete/Clone items for nodes
 * @param nodes List of items
 * @example Presets.classic.setup([
 *  ["Math", [
 *    ["Number", () => new NumberNode()],
 *  ]]
 *])
 */
export declare function setup<Schemes extends BSchemes>(nodes: ItemDefinition<Schemes>[]): (context: "root" | Schemes["Node"], plugin: import("../..").ContextMenuPlugin<Schemes>) => {
    searchBar: true;
    list: Item[];
} | {
    searchBar: false;
    list: Item[];
};
//# sourceMappingURL=index.d.ts.map