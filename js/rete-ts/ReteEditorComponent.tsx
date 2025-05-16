import { useRef, useEffect, useState } from 'react';
import { createEditor } from './editor';
import { Player, PlayerState } from './types';

interface ReteEditorComponentProps {
  // Optional props can be added here
}

export function ReteEditorComponent({ }: ReteEditorComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [editorCreated, setEditorCreated] = useState<boolean>(false);
  const initializingRef = useRef<boolean>(false);
  const [mockPlayer, setMockPlayer] = useState<Player>({
    x: 0,
    y: 0,
    body: {
      velocity: { x: 0, y: 0 },
      touching: { down: false, up: false, left: false, right: false },
      blocked: { down: false, up: false, left: false, right: false },
      setVelocityX: (value: number) => {
        mockPlayer.body.velocity.x = value;
        console.log(`Player velocity X set to ${value}`);
      },
      setVelocityY: (value: number) => {
        mockPlayer.body.velocity.y = value;
        console.log(`Player velocity Y set to ${value}`);
      }
    },
    setPosition: (x: number, y: number) => {
      mockPlayer.x = x;
      mockPlayer.y = y;
      console.log(`Player position set to (${x}, ${y})`);
    }
  });
  const [playerState, setPlayerState] = useState<PlayerState>({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 }
  });

  // Initialize the editor only once when the component mounts
  useEffect(() => {
    // Cleanup function to destroy the editor when component unmounts
    let cleanup = () => {};
    
    // Use a ref to track initialization state to prevent double initialization in strict mode
    if (containerRef.current && !editorCreated && !editorRef.current && !initializingRef.current) {
      // Set initializing flag to prevent concurrent initializations
      initializingRef.current = true;
      
      console.log('Container ref is ready, creating editor...');
      
      // Create editor only once
      createEditor(containerRef.current)
        .then(editorScope => {
          console.log('Rete editor created successfully');
          // Store the editor instance in the ref
          editorRef.current = editorScope;
          
          // Make the editor available globally for the Phaser game
          // @ts-ignore - Adding custom property to window
          window.reteEditor = editorScope.editor;
          // @ts-ignore - Adding custom property to window
          window.reteEngine = null; // Set to null as we're using the new PlayerLogicProcessor
          
          console.log('Rete editor exposed to window object for Phaser integration');
          
          // Set up cleanup function
          cleanup = () => {
            console.log('Cleaning up Rete editor...');
            // Remove from window object
            // @ts-ignore
            window.reteEditor = null;
            // @ts-ignore
            window.reteEngine = null;
            
            // Destroy the editor
            if (editorScope && editorScope.destroy) {
              editorScope.destroy();
            }
            // Clear the ref
            editorRef.current = null;
            // Reset initializing flag
            initializingRef.current = false;
          };
          
          setEditorCreated(true);
        })
        .catch(error => {
          console.error('Failed to create Rete editor:', error);
          // Reset initializing flag on error
          initializingRef.current = false;
        });
    }
    
    // Return cleanup function
    return cleanup;
  }, []); // Empty dependency array ensures this only runs once

  // Update player state for display
  useEffect(() => {
    if (editorCreated) {
      const interval = setInterval(() => {
        setPlayerState({
          position: { x: mockPlayer.x, y: mockPlayer.y },
          velocity: { x: mockPlayer.body.velocity.x, y: mockPlayer.body.velocity.y }
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [editorCreated, mockPlayer]);

  // Reset the mock player
  const resetPlayer = () => {
    const updatedPlayer = {
      ...mockPlayer,
      x: 0,
      y: 0,
      body: {
        ...mockPlayer.body,
        velocity: { x: 0, y: 0 }
      }
    };
    setMockPlayer(updatedPlayer);
    console.log('Player reset to initial state');
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controls for the player logic */}
      <div style={{ 
        padding: '5px', 
        backgroundColor: '#222', 
        borderBottom: '1px solid #444',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '5px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          <button 
            onClick={resetPlayer}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            Reset Player
          </button>
        </div>
        <div style={{ 
          color: '#ddd', 
          fontSize: '12px',
          display: 'flex',
          gap: '10px'
        }}>
          <div>
            <strong>Position:</strong> ({playerState.position.x.toFixed(2)}, {playerState.position.y.toFixed(2)})
          </div>
          <div>
            <strong>Velocity:</strong> ({playerState.velocity.x.toFixed(2)}, {playerState.velocity.y.toFixed(2)})
          </div>
        </div>
      </div>
      
      {/* Rete editor container */}
      <div 
        ref={containerRef} 
        style={{ 
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#1e1e1e'
        }}
      />
    </div>
  );
}

export default ReteEditorComponent;