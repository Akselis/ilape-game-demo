import { BaseSchemes, GetSchemes } from 'rete';
export declare type NodeRef<Schemes extends BaseSchemes> = Schemes['Node'] | Schemes['Node']['id'];
export declare type SchemesWithSizes = GetSchemes<BaseSchemes['Node'] & {
    width?: number;
    height?: number;
}, BaseSchemes['Connection']>;
//# sourceMappingURL=types.d.ts.map