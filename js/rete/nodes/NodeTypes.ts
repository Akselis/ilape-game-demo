// Define the node types as an enum to ensure they won't be minified
export enum NodeType {
  FLOAT = 'FLOAT',
  GET_HORIZONTAL_AXIS = 'GET_HORIZONTAL_AXIS',
  GET_VERTICAL_AXIS = 'GET_VERTICAL_AXIS',
  MULTIPLY = 'MULTIPLY',
  ON_UPDATE = 'ON_UPDATE',
  TRANSFORM = 'TRANSFORM'
}
