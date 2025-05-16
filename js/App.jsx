import React, { useState, useEffect } from 'react';
import ReteEditorComponent from './rete-ts/ReteEditorComponent'; // Import the Rete component

function App() {
  console.log('Rendering App component...');
  
  // State for active tool
  const [activeTool, setActiveTool] = useState('selector');
  // State for preview mode
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Function to handle tool selection
  const handleToolSelect = (toolName) => {
    if (!isPreviewMode) {
      setActiveTool(toolName);
      // Call the scene's setTool method if available
      if (window.phaserGame && window.phaserGame.scene.getScene('EditorScene')) {
        window.phaserGame.scene.getScene('EditorScene').setTool(toolName);
      }
    }
  };

  // Function to toggle preview mode
  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
    // Call the scene's togglePreview method if available
    if (window.phaserGame && window.phaserGame.scene.getScene('EditorScene')) {
      window.phaserGame.scene.getScene('EditorScene').togglePreview();
    }
  };

  // Style for tool buttons
  const toolButtonStyle = (tool) => ({
    padding: '8px 12px',
    margin: '0 5px',
    backgroundColor: activeTool === tool ? '#4a4a4a' : '#333',
    border: '1px solid #555',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    opacity: isPreviewMode ? 0.5 : 1,
    pointerEvents: isPreviewMode ? 'none' : 'auto'
  });

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh', 
      width: '100vw',
      backgroundColor: '#1e1e1e', 
      color: 'white',
      overflow: 'auto', // Allow scrolling
      padding: '20px 0',
      gap: '20px' // Add spacing between elements
    }}>
      
      {/* Game Container */}
      <div style={{
        width: '800px',
        height: '500px', // Reduced height to fit better
        border: '1px solid #444',
        backgroundColor: '#2a2a2a',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}>
        <div id="game-container" style={{ width: '100%', height: '100%' }}></div>
      </div>

      {/* Tool Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        width: '800px',
        flexWrap: 'wrap', // Allow buttons to wrap on smaller screens
        gap: '5px' // Space between buttons
      }}>
        <button 
          id="selector-tool"
          style={toolButtonStyle('selector')} 
          onClick={() => handleToolSelect('selector')}
        >
          Select
        </button>
        {/* Mover tool removed as requested */}
        <button 
          id="block-tool"
          style={toolButtonStyle('block')} 
          onClick={() => handleToolSelect('block')}
        >
          Block
        </button>
        <button 
          id="trigger-tool"
          style={toolButtonStyle('trigger')} 
          onClick={() => handleToolSelect('trigger')}
        >
          Trigger
        </button>
        <button 
          id="player-tool"
          style={toolButtonStyle('player')} 
          onClick={() => handleToolSelect('player')}
        >
          Player
        </button>
        <button 
          id="preview-button"
          style={{
            padding: '8px 12px',
            margin: '0 5px',
            backgroundColor: isPreviewMode ? '#4a8a4a' : '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer'
          }} 
          onClick={togglePreview}
        >
          {isPreviewMode ? 'Stop Preview' : 'Preview'}
        </button>
      </div>
      
      {/* Rete Editor Area */}
      <div style={{ 
        width: '800px', // Match game container width
        height: '400px', // Reduced height to fit better
        border: '1px solid #444', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ 
          padding: '10px', 
          margin: 0, 
          flexShrink: 0, 
          fontSize: '18px', 
          borderBottom: '1px solid #444',
          backgroundColor: '#2a2a2a'
        }}>Visual Scripting Editor</h2>
        <div style={{ 
          flexGrow: 1, 
          position: 'relative',
          overflow: 'hidden'
        }}> 
          <ReteEditorComponent /> 
        </div>
      </div>
    </div>
  );
}

export default App;
