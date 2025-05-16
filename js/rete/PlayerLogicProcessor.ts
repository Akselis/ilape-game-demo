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
  private debugMode: boolean = false;
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
    
    // Initialize processor silently
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
        // No nodes found
        return;
      }
      
      // Find OnUpdate and OnReady nodes
      for (const node of nodes) {
        if (!node || !node.constructor) continue;
        
        if (node.constructor.name === 'OnUpdateNode') {
          this.updateEntryPoints.push(node);
          // Found OnUpdate node
        } else if (node.constructor.name === 'OnReadyNode') {
          this.readyEntryPoints.push(node);
          // Found OnReady node
        }
      }
      
      if (this.updateEntryPoints.length === 0) {
        // No OnUpdate nodes
      }
      
      if (this.readyEntryPoints.length === 0) {
        // No OnReady nodes
      }
    } catch (error) {
      // Error finding entry points
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
        // No OnReady nodes to process
        return;
      }
      
      // Process OnReady nodes
      for (const readyNode of this.readyEntryPoints) {
        if (readyNode) {
          // Execute OnReady node
          await this.processNodeDirectly(readyNode, context);
        }
      }
      // OnReady processing complete
    } catch (error) {
      // Error in processReadyNodes
    }
  }
  
  /**
   * Process the node graph starting from OnUpdate entry points
   * This should be called in the game's update loop
   * @param deltaTime - Time elapsed since last update (in seconds)
   */
  async processLogic(deltaTime: number = 0.016): Promise<void> {
    console.log('PROCESSOR: processLogic called with deltaTime:', deltaTime);
    try {
      console.log('PROCESSOR: Starting processLogic execution');
      const startTime = performance.now();
      
      // Clear result cache at the start of each frame
      this.nodeResultCache.clear();
      
      // Update ground state - check if player is on ground
      // We need a more robust check than just velocity
      // In Phaser, body.touching.down or body.blocked.down indicates collision with ground
      this._isPlayerOnGround = this.player.body.touching.down || this.player.body.blocked.down;
      
      // Store current player state for delta calculations
      this.updatePlayerState();
      
      // Create context with player reference, delta time, and input state
      const context: NodeExecutionContext = { 
        player: this.player,
        deltaTime: deltaTime,
        time: Date.now(),
        previousState: this.previousPlayerState,
        isOnGround: this._isPlayerOnGround,
        gravity: 600, // Default gravity value for the game
        inputState: this.player.inputState || { left: false, right: false, jump: false }
      };
      
      console.log('PROCESSOR: Ground state set to:', this._isPlayerOnGround);
      
      // Debug the entry points we have
      console.log('PROCESSOR: Update entry points:', this.updateEntryPoints.length, 
                 'Entry point IDs:', this.updateEntryPoints.map(n => n.id).join(', '));
      
      // No entry points
      if (this.updateEntryPoints.length === 0) {
        console.log('PROCESSOR: No OnUpdate nodes found in editor - this is likely the root issue!');
        if (!this._noUpdateNodesLogged) {
          console.warn('No OnUpdate nodes found in editor');
          this._noUpdateNodesLogged = true;
        }
        return;
      }
      
      // Process each OnUpdate entry point
      // Process all update nodes
      for (const updateNode of this.updateEntryPoints) {
        if (updateNode) {
          await this.processNodeDirectly(updateNode, context);
        }
      }
      
      // Track execution time for performance monitoring
      this.lastExecutionTime = performance.now() - startTime;
      if (this.debugMode && this.lastExecutionTime > 5) {
        // Track execution time silently
      }
    } catch (error) {
      // Error in processLogic
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
        // Attempted to process undefined node
        return null;
      }
      
      // Check if the node is properly initialized
      if (!node.id) {
        // Node is not properly initialized
        return null;
      }
      
      // Check if we already processed this node in the current frame
      if (this.nodeResultCache.has(node.id)) {
        return this.nodeResultCache.get(node.id) || null;
      }
      
      if (this.debugMode) {
        // Processing node
      }
      
      // Enhanced debugging for production: log detailed node structure
      const nodeStructure = {
        id: node.id,
        hasConstructor: !!node.constructor,
        constructorName: node.constructor?.name,
        staticType: node.constructor?.TYPE, 
        inputs: Object.keys(node.inputs || {}),
        outputs: Object.keys(node.outputs || {}),
        hasData: typeof node.data === 'function',
        prototype: Object.getPrototypeOf(node)?.constructor?.name,
        // Deep inspection of all properties
        allNodeProperties: Object.getOwnPropertyNames(node),
        allConstructorProps: Object.getOwnPropertyNames(node.constructor || {}),
        // Full recursive stringified node (be careful with circular references)
        fullNode: JSON.stringify(node, (key, value) => {
          // Skip complex objects that might cause circular references
          if (key === 'editor' || key === 'component' || key === 'parent') return '[Circular]';
          return value;
        }, 2)
      };
      
      console.log('FULL NODE STRUCTURE:', nodeStructure);
      
      // Get input values for this node
      const inputs = await this.getNodeInputs(node);
      
      // Call the node's data method directly
      if (typeof node.data === 'function') {
        // Special handling for TransformNode to enforce ground state check
        // Forced detection in production - the structure is what matters
        // If the node has x and y inputs and an execIn input, it's a transform node
        const hasXYInputs = !!(node.inputs?.x && node.inputs?.y);
        const hasExecIn = !!node.inputs?.execIn;
        const transformTypeMatches = (node.constructor?.TYPE === 'TRANSFORM');
        
        // For debug only
        console.log(`Node ${node.id} transform check:`, {
          hasXYInputs,
          hasExecIn,
          transformTypeMatches,
          constructorName: node.constructor?.name,
          inputKeys: Object.keys(node.inputs || {}),
        });
        
        // Very simple detection - if it has x, y, and execIn inputs, it's a TransformNode
        const isTransformNode = hasXYInputs && hasExecIn;
        
        if (isTransformNode) {
          // Pass isOnGround to the context
          context.isOnGround = this._isPlayerOnGround;
          console.log('TransformNode detected, applying ground state:', this._isPlayerOnGround);
        }
        
        const result = node.data(inputs, context);
        
        // Cache the result for this frame
        this.nodeResultCache.set(node.id, result);
        
        if (this.debugMode) {
          // Node result processed
        }
        
        // Special handling for execution flow
        // Simplified OnUpdateNode detection for production
        // OnUpdateNode has execOut output but NO execIn input (it's the start of execution flow)
        const hasExecOut = !!node.outputs?.execOut;
        const hasNoExecIn = !node.inputs?.execIn;
        const updateTypeMatches = (node.constructor?.TYPE === 'ON_UPDATE');
        
        // For debug only
        console.log(`Node ${node.id} OnUpdate check:`, {
          hasExecOut,
          hasNoExecIn,
          updateTypeMatches,
          constructorName: node.constructor?.name,
          outputKeys: Object.keys(node.outputs || {}),
        });
        
        // Very simple detection based on structure - if it has execOut but no execIn, it's an OnUpdateNode
        const isOnUpdateNode = hasExecOut && hasNoExecIn;
        
        if (isOnUpdateNode) {
          console.log('OnUpdateNode detected, following execution flow through connected nodes');
          // Follow execution flow through connected nodes
          await this.followExecutionFlow(node, 'execOut', context);
        }
        
        return result;
      } else {
        // Node does not have a data method
        return null;
      }
    } catch (error) {
      // Error processing node
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
      
      // Log all connections for debugging in production
      console.log('All connections:', JSON.stringify(connections));
      
      // Find connections from this output
      const connectionsFromOutput = connections.filter(conn => 
        conn.source === node.id && conn.sourceOutput === outputName
      );
      
      // Log matched connections
      console.log(`Found ${connectionsFromOutput.length} connections from node ${node.id} output ${outputName}`);
      
      // Process each connected node
      for (const conn of connectionsFromOutput) {
        const targetNode = this.editor.getNode(conn.target);
        
        if (targetNode) {
          console.log(`Processing connected node: ${conn.target}, type: ${targetNode.constructor.name}`);
          
          // Process the target node
          await this.processNodeDirectly(targetNode, context);
          
          // Continue execution flow through this node
          if (targetNode.outputs && targetNode.outputs.execOut) {
            await this.followExecutionFlow(targetNode, 'execOut', context);
          }
          
          // Use structural type checking to identify TransformNode regardless of minification
          const isTransformNode = (
            // Check for specific input structure (exec, x, y inputs) that's unique to TransformNode
            (targetNode.inputs && targetNode.inputs.execIn && targetNode.inputs.x && targetNode.inputs.y) ||
            // Check for static TYPE property if available
            (targetNode.constructor && (targetNode.constructor as any).TYPE === 'TRANSFORM') ||
            // Fallback to data property
            ((targetNode as any).data && ((targetNode as any).data.nodeType === 'TRANSFORM' || (targetNode as any).data.nodeType === 'transform'))
          );
          
          if (isTransformNode) {
            console.log('Found and processed TransformNode, movement applied');
          }
        }
      }
    } catch (error) {
      console.error('Error following execution flow:', error);
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
          
          // Special handling for exec inputs - they only need to know a connection exists
          if (inputName === 'execIn' || inputName === 'exec') {
            // For exec inputs, just push a dummy value to indicate connection exists
            inputs[inputName].push(true);
            console.log(`Found exec connection for node ${node.id} - Input Name: ${inputName}`);
            // Log the entire connection for debugging
            console.log('Connection details:', JSON.stringify(connectionsToInput[0]));
            continue; // Skip processing the source node for exec inputs
          }
          
          // Process each connected node for non-exec inputs
          for (const conn of connectionsToInput) {
            const sourceNode = this.editor.getNode(conn.source);
            
            if (sourceNode) {
              // Process the source node to get its output
              const sourceOutput = await this.processNodeDirectly(sourceNode, { 
                player: this.player,
                inputState: this.player.inputState,
                isOnGround: this._isPlayerOnGround,
                gravity: 600
              });
              
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
      console.error('Error getting inputs for node:', error);
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
    // Graph structure changed, finding entry points
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
