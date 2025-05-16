import { ClassicPreset } from 'rete';

// Basic socket types with TypeScript typing
export const numberSocket = new ClassicPreset.Socket('number');
export const booleanSocket = new ClassicPreset.Socket('boolean');
export const execSocket = new ClassicPreset.Socket('exec');
export const vector2Socket = new ClassicPreset.Socket('vector2');

// Type definitions for socket types
export type SocketType = 'number' | 'boolean' | 'exec' | 'vector2';
