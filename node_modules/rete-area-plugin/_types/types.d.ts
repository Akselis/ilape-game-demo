export declare type Position = {
    x: number;
    y: number;
};
export declare type Size = {
    width: number;
    height: number;
};
export declare type GetRenderTypes<Signals> = Extract<Signals, {
    type: 'render';
    data: any;
}> extends {
    type: 'render';
    data: {
        type: infer G;
    };
} ? (G extends string ? G : string) : string;
export declare type RenderMeta = {
    filled?: boolean;
};
export declare type RenderSignal<Type extends string, Data> = {
    type: 'render';
    data: {
        element: HTMLElement;
        type: Type;
    } & RenderMeta & Data;
} | {
    type: 'rendered';
    data: {
        element: HTMLElement;
        type: Type;
    } & Data;
};
//# sourceMappingURL=types.d.ts.map