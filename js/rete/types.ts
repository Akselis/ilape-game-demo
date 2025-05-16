import { ClassicPreset, GetSchemes } from 'rete';

// Define the scheme for the Rete.js NodeEditor
export type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;

// Player interface
export interface Player {
  x: number;
  y: number;
  moveSpeed: number;
  jumpSpeed: number;
  body: {
    velocity: {
      x: number;
      y: number;
    };
    touching: {
      down: boolean;
      up: boolean;
      left: boolean;
      right: boolean;
    };
    blocked: {
      down: boolean;
      up: boolean;
      left: boolean;
      right: boolean;
    };
    setVelocityX: (value: number) => void;
    setVelocityY: (value: number) => void;
  };
  setPosition: (x: number, y: number) => void;
  keyboardState?: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  };
  inputState?: {
    left: boolean;
    right: boolean;
    jump: boolean;
  };
}

// Player state interface
export interface PlayerState {
  position: {
    x: number;
    y: number;
  };
  velocity: {
    x: number;
    y: number;
  };
}

// Context for node execution
export interface NodeExecutionContext {
  player: Player;
  deltaTime?: number;
  time?: number;
  previousState?: PlayerState;
  isOnGround?: boolean;
  gravity?: number;
  inputState?: {
    left: boolean;
    right: boolean;
    jump: boolean;
  };
}

// Node input type
export type NodeInputs = Record<string, any[]>;

// Node result type
export type NodeResult = Record<string, any>;

// Editor scope returned by createEditor
export interface EditorScope {
  editor: any;
  area: any;
  engine: any;
  render: any;
  menu: any;
}
