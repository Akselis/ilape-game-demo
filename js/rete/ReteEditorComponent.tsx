import { useRef, useEffect, useState } from 'react';
import { createEditor } from './editor';
import { saveScriptStateToStorage, loadScriptStateFromStorage } from '../utils/cookieManager';
import { ClassicPreset } from 'rete';

// Define a type for our custom Rete nodes that includes the properties we need
// Define a type for node constructor that includes our TYPE field
interface NodeConstructor {
  new (...args: any[]): any;
  TYPE?: string;
  name: string;
}

type ReteNode = ClassicPreset.Node & {
  id: string;
  name: string;
  serialize: () => any;
  constructor: NodeConstructor;
};

interface ReteEditorComponentProps {
  // Optional props can be added here
}

export function ReteEditorComponent({ }: ReteEditorComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [editorCreated, setEditorCreated] = useState<boolean>(false);
  const initializingRef = useRef<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  
  // Function to check if the component is visible
  const checkVisibility = () => {
    if (!containerRef.current) return false;
    
    const rect = containerRef.current.getBoundingClientRect();
    const isVisible = (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      window.getComputedStyle(containerRef.current).display !== 'none' &&
      window.getComputedStyle(containerRef.current).visibility !== 'hidden'
    );
    
    return isVisible;
  };
  
  // Set up visibility observer and handle resize events
  useEffect(() => {
    const checkAndUpdateVisibility = () => {
      const visible = checkVisibility();
      setIsVisible(visible);
      console.log('Rete editor visibility:', visible);
    };
    
    // Function to handle resize events
    const handleResize = () => {
      if (editorRef.current && editorRef.current.area && containerRef.current) {
        // Get the current container dimensions
        const rect = containerRef.current.getBoundingClientRect();
        console.log('Resizing Rete editor to:', rect.width, rect.height);
        
        // Trigger a resize event on the area plugin
        if (editorRef.current.area.update) {
          editorRef.current.area.update();
        }
      }
      
      // Also check visibility on resize
      checkAndUpdateVisibility();
    };
    
    // Check visibility initially
    checkAndUpdateVisibility();
    
    // Set up mutation observer to detect style/attribute changes
    const observer = new MutationObserver(() => {
      checkAndUpdateVisibility();
      handleResize(); // Also handle resize when attributes change
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      // Also observe parent elements up to 3 levels
      let parent = containerRef.current.parentElement;
      for (let i = 0; i < 3 && parent; i++) {
        observer.observe(parent, {
          attributes: true,
          attributeFilter: ['style', 'class']
        });
        parent = parent.parentElement;
      }
    }
    
    // Check visibility and handle resize on window resize and scroll
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', checkAndUpdateVisibility);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', checkAndUpdateVisibility);
    };
  }, []);

  // Initialize or reinitialize the editor when visibility changes
  useEffect(() => {
    // Don't do anything if not visible
    if (!isVisible) {
      console.log('Rete editor container not visible, skipping initialization');
      return;
    }
    
    console.log('Rete editor container is visible, checking if editor needs initialization');
    
    // Cleanup function to destroy the editor when component unmounts
    let cleanup = () => {};
    
    // If editor already exists, don't reinitialize
    if (editorRef.current) {
      console.log('Editor already exists, no need to reinitialize');
      return cleanup;
    }
    
    // Use a ref to track initialization state to prevent concurrent initializations
    if (containerRef.current && !initializingRef.current) {
      // Set initializing flag to prevent concurrent initializations
      initializingRef.current = true;
      
      console.log('Container ref is ready and visible, creating editor...');
      
      // Try to load saved state
      const savedState = loadScriptStateFromStorage();
      
      // Use a more robust approach with retries for mobile
      const initializeEditor = (retryCount = 0) => {
        if (retryCount > 3) {
          console.error('Failed to initialize Rete editor after multiple attempts');
          initializingRef.current = false;
          return;
        }
        
        try {
          // Create editor
          if (containerRef.current) {
            createEditor(containerRef.current, savedState)
              .then(editorScope => {
                console.log('Rete editor created successfully');
                // Store the editor instance in the ref
                editorRef.current = editorScope;
                setEditorCreated(true);
                
                // Make the editor available globally for the Phaser game
                // @ts-ignore - Adding custom property to window
                window.reteEditor = editorScope.editor;
                // @ts-ignore - Adding custom property to window
                window.reteEngine = null; // Set to null as we're using the new PlayerLogicProcessor
                
                console.log('Rete editor exposed to window object for Phaser integration');
                
                // Set up auto-save for the editor state
            const autoSaveInterval = setInterval(() => {
              if (editorRef.current && editorRef.current.editor) {
                // Get the node type using the static TYPE property that survives minification
                const getNodeTypeName = (node: any): string => {
                  // First check for our static TYPE property
                  if (node.constructor && node.constructor.TYPE) {
                    return node.constructor.name; // Still return name for display purposes
                  }
                  // Fallback to constructor name
                  if (node.constructor && node.constructor.name) {
                    return node.constructor.name;
                  }
                  // Final fallback to node.name 
                  return node.name || 'UnknownNode';
                };
                
                const state = {
                  nodes: editorRef.current.editor.getNodes().map((node: ReteNode) => {
                    const nodeName = getNodeTypeName(node);
                    // Get the static TYPE property from the constructor if available (minification-safe)
                    const nodeTypeEnum = (node.constructor as NodeConstructor)?.TYPE;
                    console.log(`Saving node ${node.id} of type: ${nodeName}, enum type: ${nodeTypeEnum || 'unknown'}`);
                    
                    return {
                      id: node.id,
                      name: nodeName,
                      position: editorRef.current.area.nodeViews.get(node.id)?.position,
                      data: node.serialize()
                    };
                  }),
                  connections: Array.from(editorRef.current.editor.getConnections() as Iterable<ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>>).map(conn => ({
                    source: conn.source,
                    sourceOutput: conn.sourceOutput,
                    target: conn.target,
                    targetInput: conn.targetInput
                  }))
                };
                
                console.log('Saving state with node types:', state.nodes.map((n: ReteNode) => n.name));
                
                saveScriptStateToStorage(state);
              }
            }, 10000); // Auto-save every 10 seconds
            
            // Function to add select-all behavior to all number inputs in the editor
            const addSelectAllBehaviorToInputs = () => {
              if (!containerRef.current) return;
              
              // Find all number inputs within the editor
              const inputs = containerRef.current.querySelectorAll('input[type="number"]');
              
              inputs.forEach(input => {
                // Add focus handler to select all text
                input.addEventListener('focus', () => {
                  (input as HTMLInputElement).select();
                });
                
                // Also select when clicked
                input.addEventListener('click', () => {
                  (input as HTMLInputElement).select();
                });
              });
              
              console.log(`Added select-all behavior to ${inputs.length} number inputs`);
            };

            // Set up cleanup function
            cleanup = () => {
              console.log('Cleaning up Rete editor...');
              // Remove from window object
              // @ts-ignore
              window.reteEditor = null;
              // @ts-ignore
              window.reteEngine = null;
              
              // Clear auto-save interval
              clearInterval(autoSaveInterval);
              
                // Destroy the editor
                if (editorScope && editorScope.destroy) {
                  editorScope.destroy();
                }
                // Clear the ref
                editorRef.current = null;
                // Reset initializing flag
                initializingRef.current = false;
                setEditorCreated(false);
              };
              
              // Initialize once and set state
              setEditorCreated(true);
              initializingRef.current = false;
              
              // Add select-all behavior to inputs after a short delay to ensure they're rendered
              setTimeout(addSelectAllBehaviorToInputs, 500);
            })
            .catch(error => {
              console.error('Error creating Rete editor:', error);
              // Retry with exponential backoff
              setTimeout(() => {
                console.log(`Retrying Rete editor initialization (attempt ${retryCount + 1})`);
                initializeEditor(retryCount + 1);
              }, 500 * Math.pow(2, retryCount));
            });
        }
      } catch (error) {
        console.error('Exception during Rete editor initialization:', error);
        // Retry with exponential backoff
        setTimeout(() => {
          console.log(`Retrying Rete editor initialization after exception (attempt ${retryCount + 1})`);
          initializeEditor(retryCount + 1);
        }, 500 * Math.pow(2, retryCount));
      }
    };
    
    // Start initialization
    initializeEditor();
    
    // Also try initialization when visibility changes (e.g., tab becomes active)
    const visibilityChangeHandler = () => {
      if (document.visibilityState === 'visible' && !editorRef.current && !initializingRef.current) {
        console.log('Document became visible, trying Rete initialization again');
        initializeEditor();
      }
    };
    
    document.addEventListener('visibilitychange', visibilityChangeHandler);
    
    // Cleanup function
    cleanup = () => {
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
    };
  }
  
  // Return cleanup function
  return cleanup;
}, [isVisible]); // Reinitialize when visibility changes

  // Function to restore the editor view to the center of the node cluster
  const restoreEditorPosition = () => {
    if (editorRef.current && editorRef.current.area) {
      // Get all nodes and center the view on them
      const nodes = editorRef.current.editor.getNodes();
      if (nodes.length > 0) {
        // Use the built-in zoomAt function to center the view
        const AreaExtensions = (window as any).ReteAreaExtensions;
        if (AreaExtensions && AreaExtensions.zoomAt) {
          AreaExtensions.zoomAt(editorRef.current.area, nodes);
        } else {
          console.warn('AreaExtensions not available for restoring position');
        }
      }
    }
  };

  return (
    <>
      {/* Main editor container - this needs to be the primary container for Rete to initialize properly */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'relative',
          overflow: 'hidden' // Prevent scrollbars within the editor
        }}
        className="rete-editor-responsive"
      />
      
      {/* Restore Position Button - rendered as a sibling, not a parent */}
      {editorCreated && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000, // High z-index to appear above the editor
          pointerEvents: 'auto' // Ensure the button can be clicked
        }}>
          <button 
            onClick={restoreEditorPosition}
            style={{
              padding: '8px 12px',
              backgroundColor: '#555',
              border: '1px solid #777',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)' // Add shadow for better visibility
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L12 22M2 12L22 12M4 4L20 20M20 4L4 20" />
            </svg>
            <span style={{ marginLeft: '6px' }}>Grįžti į pradinę padėtį</span>
          </button>
        </div>
      )}
    </>
  );
}

export default ReteEditorComponent;