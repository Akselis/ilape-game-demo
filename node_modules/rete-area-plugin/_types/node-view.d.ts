import { Drag } from './drag';
import { Position, Size } from './types';
export declare type NodeTranslateEventParams = {
    position: Position;
    previous: Position;
};
export declare type NodeResizeEventParams = {
    size: Size;
};
declare type Events = {
    picked: () => void;
    translated: (params: NodeTranslateEventParams) => Promise<unknown | boolean>;
    dragged: () => void;
    contextmenu: (event: MouseEvent) => void;
    resized: (params: NodeResizeEventParams) => Promise<unknown | boolean>;
};
declare type Guards = {
    resize: (params: NodeResizeEventParams) => Promise<unknown | boolean>;
    translate: (params: NodeTranslateEventParams) => Promise<unknown | boolean>;
};
export declare class NodeView {
    private getZoom;
    private events;
    private guards;
    element: HTMLElement;
    position: Position;
    dragHandler: Drag;
    constructor(getZoom: () => number, events: Events, guards: Guards);
    translate: (x: number, y: number) => Promise<boolean>;
    resize: (width: number, height: number) => Promise<boolean>;
    destroy(): void;
}
export {};
//# sourceMappingURL=node-view.d.ts.map