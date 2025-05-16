import { NodeEditor, ClassicPreset, GetSchemes } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { ReactPlugin, ReactArea2D, Presets as ReactPresets } from 'rete-react-plugin';
import { createRoot } from "react-dom/client";
import { addCustomBackground } from "./background";

/* Import CSS for connection z-index styles */
import "./connection-styles.css";
/* Import CSS for background grid */
import "./background.css";

/* socket styles */
import { ExecSocket } from './nodes/styles/sockets/ExecSocket';
import { NumberSocket } from './nodes/styles/sockets/NumberSocket';
import { FloatSocket } from './nodes/styles/sockets/FloatSocket';

/* node styles */
import { ExecNode } from './nodes/styles/nodes/ExecNode';
import { NumberNode } from './nodes/styles/nodes/NumberNode';
import { MultiplyNode as MultiplyNodeStyle } from './nodes/styles/nodes/MultiplyNode';
import { HorizontalAxisNode as HorizontalAxisNodeStyle } from './nodes/styles/nodes/HorizontalAxisNode';
import { VerticalAxisNode as VerticalAxisNodeStyle } from './nodes/styles/nodes/VerticalAxisNode';
import { TransformNode as TransformNodeStyle } from './nodes/styles/nodes/TransformNode';

/* nodes */
import { OnUpdateNode } from './nodes/OnUpdateNode';
import { FloatNode } from './nodes/FloatNode';
import { GetHorizontalAxisNode } from './nodes/GetAxisNode';
import { GetVerticalAxisNode } from './nodes/GetAxisNode';
import { MultiplyNode } from './nodes/MultiplyNode';
import { TransformNode } from './nodes/TransformNode';
import { NodeType } from './nodes/NodeTypes';


type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;
type AreaExtra = ReactArea2D<Schemes>;

// Make AreaExtensions available globally for the restore position button
declare global {
  interface Window {
    ReteAreaExtensions: typeof AreaExtensions;
  }
}

// Expose AreaExtensions to window for the restore position button
if (typeof window !== 'undefined') {
  window.ReteAreaExtensions = AreaExtensions;
}

// Define script state interface
interface ScriptNodeState {
  id: string;
  name: string;
  position: { x: number; y: number };
  data: any;
}

interface ScriptConnectionState {
  source: string;
  sourceOutput: string;
  target: string;
  targetInput: string;
}

interface ScriptState {
  nodes: ScriptNodeState[];
  connections: ScriptConnectionState[];
}

export async function createEditor(container: HTMLElement, savedState?: ScriptState | null) {
  const editor = new NodeEditor<Schemes>();
  
  // Create area plugin with container
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  
  // Enable panning and zooming for better user experience
  // This allows users to navigate the node graph more easily
  AreaExtensions.restrictor(area, {
    // Enable scaling (zooming)
    scaling: {
      min: 0.25,
      max: 3
    },
    // Enable translation (panning)
    translation: false
  });
  
  // Add touch-specific interaction handling
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  console.log('Touch device detected:', isTouchDevice);
  
  if (isTouchDevice) {
    // Disable default panning since we'll implement our own touch-specific version
    // This prevents single-finger panning which is often confused with node dragging
    AreaExtensions.restrictor(area, {
      scaling: {
        min: 0.25,
        max: 3
      },
      // Completely disable default translation
      translation: false
    });
    
    // Enhance touch interactions for better precision of node connections
    area.addPipe(context => {
      // Improve touch handling for connections by increasing touch target area
      if (context.type === 'pointerdown' || context.type === 'pointerup') {
        if (context.data.event instanceof TouchEvent) {
          // Increase touch target size for better accuracy on small targets
          const touchRadius = 24; // px (increased from 20px)
          (context.data as any).touchRadius = touchRadius;
        }
      }
      return context;
    });
    
    // State tracking for touch gestures
    let activeTouchGesture = false;  // Tracks if we're in an active gesture (2+ finger)
    let isPinching = false;          // Specifically tracking pinch gestures
    let isPanning = false;           // Specifically tracking pan gestures
    let initialDistance = 0;         // For pinch calculation
    let initialScale = 1;            // Starting scale for pinch
    let lastScale = 1;               // Current scale with smoothing
    let initialTouchCenter = { x: 0, y: 0 }; // Starting point of the gesture
    let lastTouchCenter = { x: 0, y: 0 };    // Last touch center point
    let animationFrameId: number | null = null;
    
    // Touch distance calculation (for pinch detection)
    const getTouchDistance = (t1: Touch, t2: Touch) => {
      return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    };
    
    // Calculate center between two touch points
    const getTouchCenter = (t1: Touch, t2: Touch) => {
      return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
    };
    
    // Convert page coordinates to editor-local coordinates
    const getLocalCoordinates = (pageX: number, pageY: number) => {
      const rect = container.getBoundingClientRect();
      return {
        x: pageX - rect.left,
        y: pageY - rect.top
      };
    };
    
    // Check if the gesture is more of a pinch or a pan
    const detectGestureType = (initialDist: number, currentDist: number) => {
      // How much has the distance between fingers changed?
      const distanceChange = Math.abs(currentDist - initialDist) / initialDist;
      
      // If distance changed significantly, it's a pinch, otherwise a pan
      return distanceChange > 0.1 ? 'pinch' : 'pan';
    };
    
    // Handle two-finger touchstart event
    container.addEventListener('touchstart', (e) => {
      // Only handle multi-touch gestures (2+ fingers)
      if (e.touches.length >= 2) {
        // Prevent any default browser behavior (e.g., page zoom)
        e.preventDefault();
        
        // Start tracking this gesture
        activeTouchGesture = true;
        isPinching = false;
        isPanning = false;
        
        // Store initial touch values
        initialDistance = getTouchDistance(e.touches[0], e.touches[1]);
        initialScale = area.area.transform.k;
        lastScale = initialScale;
        
        // Store the center point of the touch
        initialTouchCenter = getTouchCenter(e.touches[0], e.touches[1]);
        lastTouchCenter = { ...initialTouchCenter };
        
        // Cancel any existing animation frame
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      }
    }, { passive: false });
    
    // Handle touchmove for both pinch-to-zoom and two-finger panning
    container.addEventListener('touchmove', (e) => {
      // Only process if we have an active multi-finger gesture
      if (activeTouchGesture && e.touches.length >= 2) {
        // Prevent default browser behaviors
        e.preventDefault();
        
        // Get current touch information
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const currentTouchCenter = getTouchCenter(e.touches[0], e.touches[1]);
        
        // Convert to local coordinates
        const localCenter = getLocalCoordinates(
          currentTouchCenter.x, 
          currentTouchCenter.y
        );
        
        // On the first move event, determine if this is more of a pinch or pan
        if (!isPinching && !isPanning) {
          const gestureType = detectGestureType(initialDistance, currentDistance);
          isPinching = gestureType === 'pinch';
          isPanning = gestureType === 'pan';
        }
        
        // Apply appropriate transformations
        if (animationFrameId === null) {
          animationFrameId = requestAnimationFrame(() => {
            // For a pinch gesture, update the scale
            if (isPinching) {
              // Calculate new scale based on finger distance change
              const targetScale = initialScale * (currentDistance / initialDistance);
              const clampedScale = Math.min(Math.max(targetScale, 0.25), 3);
              
              // Apply smoothing for scale changes
              lastScale = lastScale + (clampedScale - lastScale) * 0.3;
              
              // Apply zoom centered at touch point
              area.area.zoom(lastScale, localCenter.x, localCenter.y);
            }
            
            // Always apply panning based on touch center movement
            // This creates a natural feel where you can pan while pinching
            const dx = currentTouchCenter.x - lastTouchCenter.x;
            const dy = currentTouchCenter.y - lastTouchCenter.y;
            
            // Apply the pan using the editor's translate method
            const transform = area.area.transform;
            area.area.translate(transform.x + dx, transform.y + dy);
            
            // Instead of forcing a redraw that affects camera position,
            // we'll just ensure the transform is applied correctly
            // This will trigger a redraw without changing the camera position
            
            // Update last touch center for next frame
            lastTouchCenter = { ...currentTouchCenter };
            
            animationFrameId = null;
          });
        }
      }
    }, { passive: false });
    
    // Handle touch end event
    container.addEventListener('touchend', (e) => {
      // If we were in a gesture and now have fewer than 2 fingers
      if (activeTouchGesture && e.touches.length < 2) {
        // End the current gesture
        activeTouchGesture = false;
        isPinching = false;
        isPanning = false;
        
        // Clean up any pending animation frame
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        
        // Instead of forcing a redraw that affects camera position,
        // we'll trigger a minimal transform update that doesn't change the view
        requestAnimationFrame(() => {
          // Get current transform
          const transform = area.area.transform;
          // Apply the same transform (no change) to trigger a redraw
          area.area.translate(transform.x, transform.y);
        });
      }
    }, { passive: false });
    
    // Handle touch cancel events (e.g., alert dialogs)
    container.addEventListener('touchcancel', () => {
      activeTouchGesture = false;
      isPinching = false;
      isPanning = false;
      
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }, { passive: false });
  }
  
  
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });


  render.addPreset(
    ReactPresets.classic.setup({
      customize: {
        node(context) {
          if (context.payload.label === "Atnaujinti") {
            return ExecNode;
          }
          if (context.payload.label === "Skaičius") {
            return NumberNode;
          }
          if (context.payload.label === "Daugyba") {
            return MultiplyNodeStyle;
          }
          if (context.payload.label === "X ąšies kryptis") {
            return HorizontalAxisNodeStyle;
          }
          if (context.payload.label === "Y ąšies kryptis") {
            return VerticalAxisNodeStyle;
          }
          if (context.payload.label === "Judėti") {
            return TransformNodeStyle;
          }
          return ReactPresets.classic.Node;
        },
        socket(context) {
          if (context.payload.name === "number") {
            return NumberSocket;
          }
          if (context.payload.name === "exec") {
            return ExecSocket;
          }
          if (context.payload.name === "float") {
            return FloatSocket;
          }
          return ReactPresets.classic.Socket;
        },
        connection() {
          // Using default connection component - z-index is controlled via CSS
          return ReactPresets.classic.Connection;
        },
      },
    })
  );

  // Set up connection validation to restrict exec sockets to only connect with other exec sockets
  connection.addPreset(ConnectionPresets.classic.setup());
  
  // We'll use a more gentle approach to refresh the canvas without affecting camera position
  if (isTouchDevice) {
    // Instead of using a periodic refresh that affects camera position,
    // we'll rely on CSS and touch event handling to ensure proper rendering
    
    // Clean up interval when editor is destroyed
    const originalDestroy = area.destroy.bind(area);
    area.destroy = () => {
      // No need to clear interval here, as we're not setting one up
      originalDestroy();
    };
  }
  addCustomBackground(area);
  
  
  // Add custom connection validation
  editor.addPipe(context => {
    // Only intercept connection creation
    if (context.type === 'connectioncreate') {
      try {
        // Access the source and target nodes and their sockets
        const sourceOutput = editor.getNode(context.data.source)?.outputs[context.data.sourceOutput];
        const targetInput = editor.getNode(context.data.target)?.inputs[context.data.targetInput];
        
        // If either the source or target doesn't exist, allow the connection to proceed
        // (it will fail naturally if the nodes/ports don't exist)
        if (!sourceOutput || !targetInput) return context;
        
        // Check if the target input is an exec socket
        if (targetInput.socket.name === 'exec') {
          // Only allow connection if source is also an exec socket
          if (sourceOutput.socket.name !== 'exec') {
            console.log('Blocked connection: Cannot connect non-exec output to exec input');
            return undefined; // Block the connection
          }
        }
      } catch (error) {
        console.error('Error in connection validation:', error);
      }
    }
    
    // Pass through all other events
    return context;
  });

  editor.use(area);
  area.use(connection);
  area.use(render);

  // We don't need to set up custom node ordering for this use case

  // We've moved the node creation code above
  
  // Check if we should restore from saved state or create default nodes
  if (savedState && savedState.nodes && savedState.connections && savedState.nodes.length > 0) {
    console.log('Restoring saved editor state instead of creating default nodes');
    console.log('Saved state contains:', savedState.nodes.length, 'nodes and', savedState.connections.length, 'connections');
    console.log('Node types:', savedState.nodes.map(node => node.name));
    // We'll restore the saved state below
  } else {
    console.log('No valid saved state found, creating default nodes');
    
    // Create default nodes
    const exec = new OnUpdateNode();
    const xSpeed = new FloatNode();
    const ySpeed = new FloatNode();
    const xMultiply = new MultiplyNode();
    const yMultiply = new MultiplyNode();
    const xAxis = new GetHorizontalAxisNode();
    const yAxis = new GetVerticalAxisNode();
    const transform = new TransformNode();

    // Add nodes to the editor
    await editor.addNode(exec);
    await editor.addNode(xSpeed);
    await editor.addNode(ySpeed);
    await editor.addNode(xMultiply);
    await editor.addNode(yMultiply);
    await editor.addNode(xAxis);
    await editor.addNode(yAxis);
    await editor.addNode(transform);
    
    // Position nodes
    await area.translate(exec.id, { x: 350, y: 0 });
    await area.translate(xSpeed.id, { x: 30, y: 100 });
    await area.translate(xAxis.id, { x: 30, y: 200 });
    await area.translate(xMultiply.id, { x: 300, y: 150 });
    await area.translate(ySpeed.id, { x: 30, y: 350 });
    await area.translate(yAxis.id, { x: 30, y: 450 });
    await area.translate(yMultiply.id, { x: 300, y: 400 });
    await area.translate(transform.id, { x: 700, y: 100 });
  }
  
  // Restore saved state if available
  if (savedState && savedState.nodes && savedState.connections) {
    console.log('Restoring saved editor state:', savedState);
    
    // First, clear all existing nodes if we're restoring from saved state
    // This prevents duplicates and ensures a clean slate
    const existingNodes = editor.getNodes();
    for (const node of existingNodes) {
      await editor.removeNode(node.id);
    }
    console.log('Cleared existing nodes for restoration');
    
    // Create and restore nodes from saved state
    for (const nodeState of savedState.nodes) {
      let node;
      
      // Try to get the node type from the serialized data
      const nodeType = nodeState.data?.nodeType;
      console.log(`Creating node with ID ${nodeState.id} - Type from data:`, nodeType);
      
      // Extract any saved values we might need for node initialization
      let savedValue = 0;
      if (nodeState.data && typeof nodeState.data.value === 'number') {
        savedValue = nodeState.data.value;
        console.log(`Found saved value for node ${nodeState.id}: ${savedValue}`);
      }
      
      // Determine the node type using the nodeType enum from serialized data first,
      // with fallback to name-based identification for backward compatibility
      if (nodeType) {
        // Use the safe nodeType identifier that survives minification
        switch (nodeType) {
          case NodeType.FLOAT:
            node = new FloatNode();
            // Special handling for FloatNode's value control
            if (typeof savedValue === 'number') {
              try {
                const customControl = new ClassicPreset.InputControl('number', { initial: savedValue });
                delete node.controls['value'];
                node.addControl('value', customControl);
                console.log(`Initialized FloatNode with value: ${savedValue}`);
              } catch (err) {
                console.error(`Error initializing FloatNode value:`, err);
              }
            }
            break;
          case NodeType.GET_HORIZONTAL_AXIS:
            node = new GetHorizontalAxisNode();
            break;
          case NodeType.GET_VERTICAL_AXIS:
            node = new GetVerticalAxisNode();
            break;
          case NodeType.MULTIPLY:
            node = new MultiplyNode();
            break;
          case NodeType.TRANSFORM:
            node = new TransformNode();
            break;
          case NodeType.ON_UPDATE:
            node = new OnUpdateNode();
            break;
          default:
            console.error(`Unknown node type enum value: ${nodeType}`);
            continue;
        }
      } else {
        // Fallback to legacy string-based identification for backward compatibility
        console.warn(`No nodeType found in data for node ${nodeState.id}, falling back to name-based identification: ${nodeState.name}`);
        
        switch (nodeState.name) {
          case 'Float':
          case 'Skaičius': // Lithuanian name
          case 'FloatNode': // Class name directly
            node = new FloatNode();
            // Special handling for FloatNode - we'll replace its control directly after creation
            if (typeof savedValue === 'number') {
              try {
                const customControl = new ClassicPreset.InputControl('number', { initial: savedValue });
                delete node.controls['value'];
                node.addControl('value', customControl);
                console.log(`Successfully initialized FloatNode with value: ${savedValue}`);
              } catch (err) {
                console.error(`Error initializing FloatNode value:`, err);
              }
            }
            break;
          case 'GetHorizontalAxis':
          case 'X ąšies kryptis': // Lithuanian name
          case 'GetHorizontalAxisNode': // Class name directly
            node = new GetHorizontalAxisNode();
            break;
          case 'GetVerticalAxis':
          case 'Y ąšies kryptis': // Lithuanian name
          case 'GetVerticalAxisNode': // Class name directly
            node = new GetVerticalAxisNode();
            break;
          case 'Multiply':
          case 'Daugyba': // Lithuanian name
          case 'MultiplyNode': // Class name directly
            node = new MultiplyNode();
            break;
          case 'Transform':
          case 'Judėti': // Lithuanian name
          case 'TransformNode': // Class name directly
            node = new TransformNode();
            break;
          case 'OnUpdate':
          case 'Atnaujinti': // Lithuanian name
          case 'OnUpdateNode': // Class name directly
            node = new OnUpdateNode();
            break;
          default:
            console.warn(`Trying fallback character-based matching for node type: ${nodeState.name}`);
            // Final fallback attempt using single/double character keys from minified names
            let created = false;
            
            // Create a map of possible minified node names to their corresponding classes
            const minifiedNameMap = {
              // Common minified prefixes
              'fl': FloatNode,
              'ho': GetHorizontalAxisNode,
              've': GetVerticalAxisNode,
              'mu': MultiplyNode,
              'tr': TransformNode,
              'on': OnUpdateNode,
              // Single character codes that might be used in minification
              'f': FloatNode,
              'h': GetHorizontalAxisNode,
              'v': GetVerticalAxisNode,
              'm': MultiplyNode,
              't': TransformNode,
              'o': OnUpdateNode,
              // More possible variations
              'x': GetHorizontalAxisNode,
              'y': GetVerticalAxisNode,
              'g': GetHorizontalAxisNode, // 'get'
              'a': OnUpdateNode, // 'atnaujinti'
              'u': OnUpdateNode, // 'update'
              'j': TransformNode, // 'judeti'
              'd': MultiplyNode, // 'daugyba'
              'n': FloatNode, // 'number'
              's': FloatNode // 'skaicius'
            };
            
            // Try to match by prefix
            for (const [prefix, NodeClass] of Object.entries(minifiedNameMap)) {
              if (nodeState.name.toLowerCase().startsWith(prefix)) {
                console.log(`Matched minified node name ${nodeState.name} to ${NodeClass.name} by prefix ${prefix}`);
                node = new NodeClass();
                created = true;
                break;
              }
            }
            
            if (!created) {
              console.error(`Could not create node of unknown type: ${nodeState.name}`);
              continue;
            }
        }
      }
      
      // Make sure node was created successfully
      if (!node) {
        console.error(`Failed to create node for ${nodeState.name} with ID ${nodeState.id}`);
        continue;
      }
      
      // Override the node ID to match the saved state
      node.id = nodeState.id;
      
      // Add the node to the editor
      await editor.addNode(node);
      console.log(`Created node ${nodeState.id} (${nodeState.name})`);
      
      // Restore node position
      if (nodeState.position) {
        await area.translate(node.id, nodeState.position);
      }
      
      // Restore node data if available
      if (nodeState.data) {
        console.log(`Restoring data for node ${nodeState.id}:`, nodeState.data);
        
        // For nodes with controls and data to restore
        if (node.controls) {
          console.log(`Attempting to restore controls for ${nodeState.name} node`);
          
          // We now handle FloatNode value initialization during node creation
          // This section intentionally left empty as it's handled above
          
          // Handle MultiplyNode
          if ((nodeState.name === 'Multiply' || nodeState.name === 'Daugyba') && nodeState.data) {
            try {
              // Restore any controls the MultiplyNode has
              Object.entries(nodeState.data).forEach(([key, value]) => {
                if (node.controls && node.controls[key]) {
                  console.log(`Setting ${nodeState.name} ${key} to`, value);
                  (node.controls[key] as any).value = value;
                }
              });
            } catch (err) {
              console.error(`Error restoring MultiplyNode data:`, err);
            }
          }
          
          // Handle TransformNode
          if ((nodeState.name === 'Transform' || nodeState.name === 'Judėti') && nodeState.data) {
            try {
              // Restore any controls the TransformNode has
              Object.entries(nodeState.data).forEach(([key, value]) => {
                if (node.controls && node.controls[key]) {
                  console.log(`Setting ${nodeState.name} ${key} to`, value);
                  (node.controls[key] as any).value = value;
                }
              });
            } catch (err) {
              console.error(`Error restoring TransformNode data:`, err);
            }
          }
          
          // Handle GetHorizontalAxisNode and GetVerticalAxisNode
          if ((nodeState.name === 'HorizontalAxis' || nodeState.name === 'X ąšies kryptis' ||
               nodeState.name === 'VerticalAxis' || nodeState.name === 'Y ąšies kryptis') && 
              nodeState.data) {
            try {
              // Restore any controls the axis nodes have
              Object.entries(nodeState.data).forEach(([key, value]) => {
                if (node.controls && node.controls[key]) {
                  console.log(`Setting ${nodeState.name} ${key} to`, value);
                  (node.controls[key] as any).value = value;
                }
              });
            } catch (err) {
              console.error(`Error restoring Axis node data:`, err);
            }
          }
        }
      }
    }
    
    // Ensure all nodes are created before restoring connections
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Nodes created, now restoring connections...');
    
    // Verify all saved nodes were created
    const allNodesPresent = savedState.nodes.every(nodeState => {
      const exists = !!editor.getNode(nodeState.id);
      if (!exists) {
        console.warn(`Node ${nodeState.id} (${nodeState.name}) was not created successfully`);
      }
      return exists;
    });
    
    if (!allNodesPresent) {
      console.warn('Not all nodes were created successfully, connections may not restore correctly');
    }
    
    let restoredConnections = 0;
    
    // Restore connections
    for (const connState of savedState.connections) {
      try {
        // Find the source and target nodes first
        const sourceNode = editor.getNode(connState.source);
        const targetNode = editor.getNode(connState.target);
        
        if (!sourceNode || !targetNode) {
          console.warn('Could not restore connection - missing node:', 
            !sourceNode ? `source (${connState.source})` : `target (${connState.target})`);
          continue;
        }
        
        // Verify that the output and input exist on the nodes
        if (!sourceNode.outputs[connState.sourceOutput]) {
          console.warn(`Source output ${connState.sourceOutput} does not exist on node ${connState.source}`);
          continue;
        }
        
        if (!targetNode.inputs[connState.targetInput]) {
          console.warn(`Target input ${connState.targetInput} does not exist on node ${connState.target}`);
          continue;
        }
        
        // Create connection between the nodes using the correct type
        const connection = new ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>(
          sourceNode,
          connState.sourceOutput,
          targetNode,
          connState.targetInput
        );
        
        await editor.addConnection(connection);
        restoredConnections++;
        console.log(`Restored connection from ${connState.source} to ${connState.target}`);
      } catch (err) {
        console.error('Failed to restore connection:', connState, err);
      }
    }
    
    console.log(`Restored ${restoredConnections} out of ${savedState.connections.length} connections`);
    
    // Add a final delay to ensure everything is properly rendered
    await new Promise(resolve => setTimeout(resolve, 100));
  } else {
    console.log('No saved state found, using default layout');
  }

   // Disable node dragging by adding a custom pipe handler
   area.addPipe(context => {
    // If this is a node translation/dragging event, block it by returning undefined
    if (['nodepicked', 'nodetranslate', 'nodetranslated'].includes(context.type as string)) {
      return undefined;
    }
    // Otherwise, pass the context through
    return context;
  });
  
  setTimeout(() => {
    AreaExtensions.zoomAt(area, editor.getNodes());
  }, 70);
  
  return {
    editor,
    area,
    destroy: () => area.destroy(),
  };
}

// Note: We've moved the createDefaultNodes functionality directly into the createEditor function
// to simplify the initialization process and ensure the editor renders properly