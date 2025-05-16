import { NodeEditor } from 'rete';
import { Schemes } from './types';
import { Player, PlayerState, NodeExecutionContext, NodeInputs, NodeResult } from './types';

/**
 * PlayerLogicProcessor handles the execution of the Rete node graph
 * and translates it into player logic.
 * 
 * This class serves as the bridge between the visual scripting system
 * and the actual game logic, ensuring that nodes in the editor
 * properly affect the player's behavior in the game.
 */
export class PlayerLogicProcessor {
  private editor: NodeEditor<Schemes>;
  private player: Player;
  private updateEntryPoints: any[] = [];
  private readyEntryPoints: any[] = [];
  private nodeResultCache: Map<string, NodeResult> = new Map();
  private debugMode: boolean = true;
  private lastExecutionTime: number = 0;
  private previousPlayerState: PlayerState;
  private _noUpdateNodesLogged: boolean = false;
  private _isPlayerOnGround: boolean = true; // Track player ground state

  /**
   * @param editor - The Rete editor instance
   * @param player - The player game object (from Phaser)
   */
  constructor(editor: NodeEditor<Schemes>, player: Player) {
    this.editor = editor;
    this.player = player;
    
    // Store the player's previous state for delta calculations
    this.previousPlayerState = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 }
    };
    
    // Find entry points and initialize
    this.findEntryPoints();
    this.processReadyNodes();
    
    console.log('PlayerLogicProcessor initialized with', 
      this.updateEntryPoints.length, 'update entry points and',
      this.readyEntryPoints.length, 'ready entry points');
  }
  
  /**
   * Find all entry point nodes (OnUpdate and OnReady nodes) in the editor
   */
  findEntryPoints(): void {
    this.updateEntryPoints = [];
    this.readyEntryPoints = [];
    
    try {
      // Get all nodes from the editor
      const nodes = this.editor.getNodes();
      
      if (!nodes || nodes.length === 0) {
        console.log('No nodes found in the editor');
        return;
      }
      
      // Find OnUpdate and OnReady nodes
      for (const node of nodes) {
        if (!node || !node.constructor) continue;
        
        if (node.constructor.name === 'OnUpdateNode') {
          this.updateEntryPoints.push(node);
          console.log('Found OnUpdate entry point node:', node.id);
        } else if (node.constructor.name === 'OnReadyNode') {
          this.readyEntryPoints.push(node);
          console.log('Found OnReady entry point node:', node.id);
        }
      }
      
      if (this.updateEntryPoints.length === 0) {
        console.log('No OnUpdate nodes found in the graph');
      }
      
      if (this.readyEntryPoints.length === 0) {
        console.log('No OnReady nodes found in the graph');
      }
    } catch (error) {
      console.error('Error finding entry points:', error);
    }
  }
  
  /**
   * Process OnReady nodes - called once during initialization
   */
  async processReadyNodes(): Promise<void> {
    try {
      // Create context with player reference
      const context: NodeExecutionContext = { player: this.player };
      
      // Process each OnReady entry point
      if (this.readyEntryPoints.length === 0) {
        console.log('No OnReady entry points found in the graph');
        return;
      }
      
      console.log(`Processing ${this.readyEntryPoints.length} OnReady nodes...`);
      for (const readyNode of this.readyEntryPoints) {
        if (readyNode) {
          console.log(`Executing OnReady node: ${readyNode.id}`);
          await this.processNodeDirectly(readyNode, context);
        }
      }
      console.log('OnReady processing complete');
    } catch (error) {
      console.error('Error in processReadyNodes:', error);
    }
  }
  
  /**
   * Process the node graph starting from OnUpdate entry points
   * This should be called in the game's update loop
   * @param deltaTime - Time elapsed since last update (in seconds)
   */
  async processLogic(deltaTime: number = 0.016): Promise<void> {
    try {
      const startTime = performance.now();
      
      // Clear result cache at the start of each frame
      this.nodeResultCache.clear();
      
      // Update ground state - check if player is on ground
      // We need a more robust check than just velocity
      // In Phaser, body.touching.down or body.blocked.down indicates collision with ground
      this._isPlayerOnGround = this.player.body.touching.down || this.player.body.blocked.down;
      
      // Store current player state for delta calculations
      this.updatePlayerState();
      
      // Create context with player reference and delta time
      const context: NodeExecutionContext = { 
        player: this.player,
        deltaTime: deltaTime,
        time: Date.now(),
        previousState: this.previousPlayerState,
        isOnGround: this._isPlayerOnGround
      };
      
      // Process each OnUpdate entry point
      if (this.updateEntryPoints.length === 0) {
        // Only log this once to avoid console spam
        if (!this._noUpdateNodesLogged) {
          console.log('No OnUpdate entry points found in the graph');
          this._noUpdateNodesLogged = true;
        }
        return;
      }
      
      // Process all update nodes
      for (const updateNode of this.updateEntryPoints) {
        if (updateNode) {
          await this.processNodeDirectly(updateNode, context);
        }
      }
      
      // Track execution time for performance monitoring
      this.lastExecutionTime = performance.now() - startTime;
      if (this.debugMode && this.lastExecutionTime > 5) {
        console.log(`Node graph execution took ${this.lastExecutionTime.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('Error in processLogic:', error);
    }
  }
  
  /**
   * Process a node directly by calling its data method
   * @param node - The node to process
   * @param context - The execution context
   */
  async processNodeDirectly(node: any, context: NodeExecutionContext): Promise<NodeResult | null> {
    try {
      if (!node) {
        console.warn('Attempted to process undefined node');
        return null;
      }
      
      // Check if the node is properly initialized
      if (!node.id) {
        console.warn('Node is not properly initialized (missing id):', node);
        return null;
      }
      
      // Check if we already processed this node in the current frame
      if (this.nodeResultCache.has(node.id)) {
        return this.nodeResultCache.get(node.id) || null;
      }
      
      if (this.debugMode) {
        console.log(`Processing node: ${node.constructor.name} (${node.id})`);
      }
      
      // Get input values for this node
      const inputs = await this.getNodeInputs(node);
      
      // Call the node's data method directly
      if (typeof node.data === 'function') {
        // Special handling for TransformNode to enforce ground state check
        if (node.constructor.name === 'TransformNode') {
          // Pass isOnGround to the context
          context.isOnGround = this._isPlayerOnGround;
          
          if (this.debugMode) {
            console.log(`TransformNode: Player is ${this._isPlayerOnGround ? 'on ground' : 'in air'}`);
          }
        }
        
        const result = node.data(inputs, context);
        
        // Cache the result for this frame
        this.nodeResultCache.set(node.id, result);
        
        if (this.debugMode) {
          console.log(`Node ${node.id} result:`, result);
        }
        
        // Special handling for execution flow
        if (node.constructor.name === 'OnUpdateNode') {
          // Follow execution flow through connected nodes
          await this.followExecutionFlow(node, 'execOut', context);
        }
        
        return result;
      } else {
        console.warn(`Node ${node.id} does not have a data method`);
        return null;
      }
    } catch (error) {
      console.error(`Error processing node ${node?.id}:`, error);
      return null;
    }
  }
  
  /**
   * Follow execution flow from a node's output to connected nodes
   * @param node - The source node
   * @param outputName - The output socket name
   * @param context - The execution context
   */
  async followExecutionFlow(node: any, outputName: string, context: NodeExecutionContext): Promise<void> {
    try {
      // Get all connections from the editor
      const connections = this.editor.getConnections();
      
      // Find connections from this output
      const connectionsFromOutput = connections.filter(conn => 
        conn.source === node.id && conn.sourceOutput === outputName
      );
      
      // Process each connected node
      for (const conn of connectionsFromOutput) {
        const targetNode = this.editor.getNode(conn.target);
        
        if (targetNode) {
          // Process the target node
          await this.processNodeDirectly(targetNode, context);
          
          // If this is a TransformNode, we've applied movement and can stop
          if (targetNode.constructor.name === 'TransformNode') {
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Error following execution flow from node ${node?.id}:`, error);
    }
  }
  
  /**
   * Get all input values for a node by processing connected nodes
   * @param node - The node to get inputs for
   * @returns The inputs object with values from connected nodes
   */
  async getNodeInputs(node: any): Promise<NodeInputs> {
    try {
      const inputs: NodeInputs = {};
      
      // Get all connections from the editor
      const connections = this.editor.getConnections();
      
      // For each input on the node
      for (const [inputName, input] of Object.entries(node.inputs)) {
        if (!input) continue;
        
        // Find connections to this input
        const connectionsToInput = connections.filter(conn => 
          conn.target === node.id && conn.targetInput === inputName
        );
        
        if (connectionsToInput.length > 0) {
          // Initialize array for this input
          inputs[inputName] = [];
          
          // Process each connected node
          for (const conn of connectionsToInput) {
            const sourceNode = this.editor.getNode(conn.source);
            
            if (sourceNode) {
              // Process the source node to get its output
              const sourceOutput = await this.processNodeDirectly(sourceNode, { player: this.player });
              
              if (sourceOutput && sourceOutput.value !== undefined) {
                inputs[inputName].push(sourceOutput.value);
              } else if (sourceOutput && sourceOutput[conn.sourceOutput] !== undefined) {
                inputs[inputName].push(sourceOutput[conn.sourceOutput]);
              }
            }
          }
        }
      }
      
      return inputs;
    } catch (error) {
      console.error(`Error getting inputs for node ${node?.id}:`, error);
      return {};
    }
  }
  
  /**
   * Update the stored player state for delta calculations
   */
  updatePlayerState(): void {
    this.previousPlayerState = {
      position: { x: this.player.x, y: this.player.y },
      velocity: { x: this.player.body.velocity.x, y: this.player.body.velocity.y }
    };
  }
  
  /**
   * Called when the graph structure changes
   */
  onGraphChanged(): void {
    console.log('Graph structure changed, finding entry points...');
    this.findEntryPoints();
  }
  
  /**
   * Get the last execution time in milliseconds
   */
  getLastExecutionTime(): number {
    return this.lastExecutionTime;
  }
  
  /**
   * Check if the player is currently on the ground
   */
  isPlayerOnGround(): boolean {
    return this._isPlayerOnGround;
  }
}
