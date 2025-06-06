import React, { useState, useEffect, useRef } from 'react';
import ReteEditorComponent from './rete/ReteEditorComponent'; // Import the Rete component
import { loadStateFromStorage, clearSavedState } from './utils/cookieManager';
import ilapeLogoImg from './img/ilape.png'; // Import the logo image

function App() {
  console.log('Rendering App component...');
  
  // State for active tool
  const [activeTool, setActiveTool] = useState('selector');
  // State for preview mode
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  // State for current view (game or editor)
  const [currentView, setCurrentView] = useState('game');
  // State for whether user progress has been loaded
  const [progressLoaded, setProgressLoaded] = useState(false);
  // State for last auto-save timestamp
  const [lastSaved, setLastSaved] = useState(null);
  // State for mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768 || window.innerHeight < 600);
  // State for touch mode detection
  const [touchMode, setTouchMode] = useState(false);
  // Track when the welcome message was last shown
  const [welcomeShown, setWelcomeShown] = useState(false);
  
  // Force the viewport height for mobile (to handle address bar issues)
  useEffect(() => {
    const setViewportHeight = () => {
      // Set a CSS variable with the viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Apply the height directly to root and container elements for more consistent sizing
      const rootElement = document.getElementById('root');
      if (rootElement) {
        rootElement.style.height = `${window.innerHeight}px`;
      }
      
      // Apply to container element if it exists
      if (containerRef.current) {
        // Subtract header height for more accurate calculation
        const headerHeight = isMobile ? 49 : 60;
        containerRef.current.style.height = `${window.innerHeight - headerHeight}px`;
      }
    };
    
    // Run it initially
    setViewportHeight();
    
    // Add event listeners with debounce for better performance
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setViewportHeight, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      // Delay slightly more after orientation change
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setViewportHeight, 200);
    });
    
    // Also run when visibility changes (tab becomes active again)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        setViewportHeight();
      }
    });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('visibilitychange', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [isMobile]); // Add isMobile as dependency to recalculate when it changes
  
  // References to container elements
  const containerRef = useRef(null);
  const gameContainerRef = useRef(null);
  const editorContainerRef = useRef(null);

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
  
  // Listen for tool changes from the EditorScene
  useEffect(() => {
    const handleToolChange = (event) => {
      if (event.detail && event.detail.tool) {
        setActiveTool(event.detail.tool);
      }
    };
    
    window.addEventListener('toolchange', handleToolChange);
    
    return () => {
      window.removeEventListener('toolchange', handleToolChange);
    };
  }, []);

  // Function to toggle preview mode
  const togglePreview = () => {
    const newPreviewState = !isPreviewMode;
    setIsPreviewMode(newPreviewState);
    // Call the scene's togglePreview method if available
    if (window.phaserGame && window.phaserGame.scene.getScene('EditorScene')) {
      const scene = window.phaserGame.scene.getScene('EditorScene');
      scene.togglePreview();
      
      // Force physics to activate on the player if in preview mode
      if (newPreviewState && scene.player && scene.player.body) {
        // Enable physics body
        scene.player.body.enable = true;
        // Apply gravity
        scene.player.body.gravity.y = 300;
        console.log('Player physics activated for preview mode');
      }
    }
  };
  
  // Function to update preview state directly (used by game objects)
  const updatePreviewState = (newState) => {
    // Only update if the state is actually changing
    if (isPreviewMode !== newState) {
      setIsPreviewMode(newState);
      console.log(`Preview state updated to: ${newState}`);
    }
  };
  
  // Make the updatePreviewState function globally available
  useEffect(() => {
    window.updatePreviewState = updatePreviewState;
    
    // Listen for custom events from the game
    const handlePreviewModeChanged = (event) => {
      if (event.detail && event.detail.isPreviewMode !== undefined) {
        updatePreviewState(event.detail.isPreviewMode);
      }
    };
    
    window.addEventListener('previewModeChanged', handlePreviewModeChanged);
    
    return () => {
      delete window.updatePreviewState;
      window.removeEventListener('previewModeChanged', handlePreviewModeChanged);
    };
  }, [isPreviewMode]);

  // Function to handle window resize and detect mobile devices
  useEffect(() => {
    const handleResize = () => {
      // Update transform when window is resized
      if (containerRef.current) {
        const viewportWidth = window.innerWidth;
        const translateX = currentView === 'game' ? 0 : -viewportWidth;
        containerRef.current.style.transform = `translateX(${translateX}px)`;
      }
      
      // Detect if device is mobile (width less than 768px)
      const mobileDetected = window.innerWidth < 768 || window.innerHeight < 600;
      setIsMobile(mobileDetected);
      
      // Detect touch capability
      const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setTouchMode(touchCapable || mobileDetected);
      
      if (touchCapable || mobileDetected) {
        document.body.classList.add('touch-mode');
      } else {
        document.body.classList.remove('touch-mode');
      }
      
      console.log('Device detection:', { 
        isMobile: mobileDetected, 
        touchCapable, 
        touchMode: touchCapable || mobileDetected 
      });
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentView]);
  
  // Load saved progress when the app first loads
  useEffect(() => {
    // We'll check for saved state, but the actual loading happens in EditorScene
    const savedState = loadStateFromStorage();
    if (savedState) {
      console.log('Found saved progress from:', new Date(savedState.timestamp).toLocaleString());
      setProgressLoaded(true);
      setLastSaved(new Date(savedState.timestamp));
    }
    
    // Set up interval to update the last saved timestamp
    const updateInterval = setInterval(() => {
      const state = loadStateFromStorage();
      if (state && state.timestamp) {
        setLastSaved(new Date(state.timestamp));
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(updateInterval);
  }, []);
  
  // Function to switch between game and editor views
  const switchView = (view) => {
    console.log(`Switching to ${view} view`);
    
    // Always make both views visible during transitions
    if (gameContainerRef.current) {
      gameContainerRef.current.style.display = 'flex';
    }
    
    if (editorContainerRef.current) {
      editorContainerRef.current.style.display = 'flex';
    }
    
    // Apply the appropriate transform based on the target view
    if (containerRef.current) {
      // For game view (swipe right), for editor view (swipe left)
      // Use exact pixel values instead of percentages for more precise control
      const viewportWidth = window.innerWidth;
      const translateX = view === 'game' ? 0 : -viewportWidth;
      containerRef.current.style.transform = `translateX(${translateX}px)`;
      console.log(`Setting transform to translateX(${translateX}px)`);
    }
    
    // Update state immediately to ensure proper rendering
    setCurrentView(view);
    
    // We no longer dispatch a resize event during view transitions
    // This prevents the EditorScene from repositioning elements unnecessarily
    setTimeout(() => {
      // IMPORTANT: We're no longer hiding the inactive view
      // This ensures both views remain visible and properly rendered
      // The transform property handles which view is visible to the user
    }, 300);
  };

  // Style for tool buttons
  const toolButtonStyle = (tool) => ({
    padding: isMobile ? '6px 8px' : '8px 10px',
    margin: isMobile ? '3px' : '5px',
    backgroundColor: activeTool === tool ? '#4a4a4a' : '#333',
    border: '1px solid #555',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    opacity: isPreviewMode ? 0.5 : 1,
    pointerEvents: isPreviewMode ? 'none' : 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    fontSize: isMobile ? '10px' : '12px'
  });

  // Style for navigation buttons
  const navButtonStyle = (view) => ({
    padding: '10px 20px',
    margin: '0 5px',
    backgroundColor: currentView === view ? '#4a4a4a' : '#333',
    border: '1px solid #555',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '120px',
    height: '40px'
  });

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#1e1e1e',
      color: 'white',
      position: 'relative'
    }}>
      {/* Top Navigation Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: isMobile ? '49px' : '60px', // Fixed height for header
        backgroundColor: '#333',
        padding: isMobile ? '8px 10px' : '10px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        boxSizing: 'border-box'
      }}>
        {/* Logo on the left */}
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          <img 
            src={ilapeLogoImg} 
            alt="iLape Logo" 
            style={{
              height: isMobile ? '24px' : '30px',
              marginRight: isMobile ? '5px' : '10px'
            }}
          />
        </div>
        
        {/* Centered Navigation Buttons */}
        <div style={{
          display: 'flex',
          gap: isMobile ? '8px' : '15px',
          alignItems: 'center',
          justifySelf: 'center'
        }}>
          {/* Game/Script Switch Button */}
          <button 
            onClick={() => {
              const newView = currentView === 'game' ? 'editor' : 'game';
              switchView(newView);
            }}
            style={{
              padding: isMobile ? '8px 12px' : '10px 20px',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '12px' : '14px'
            }}
          >
            {currentView === 'game' ? (
              // Code icon - </> symbol as text
              <span style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 'bold'
              }}>&lt;/&gt;</span>
            ) : (
              // Game icon - square
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4,4 L12,4 L12,12 L4,12 L4,4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            )}
            {!isMobile && (
              <span style={{ marginLeft: '8px' }}>
                {currentView === 'game' ? 'Skriptas' : 'Žaidimas'}
              </span>
            )}
          </button>
          
          {/* Play Button */}
          <button 
            onClick={togglePreview}
            style={{
              padding: isMobile ? '8px 12px' : '10px 20px',
              backgroundColor: isPreviewMode ? '#d9534f' : '#5cb85c', // Red for stop, green for play
              border: isPreviewMode ? '1px solid #d43f3a' : '1px solid #4cae4c',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              fontSize: isMobile ? '12px' : '14px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              {isPreviewMode ? (
                <path d="M3,3 L13,3 L13,13 L3,13 L3,3" stroke="currentColor" strokeWidth="1.5" fill="none" />
              ) : (
                <path d="M5,3 L13,8 L5,13 L5,3" stroke="currentColor" strokeWidth="1.5" fill="none" />
              )}
            </svg>
            {!isMobile && (
              <span style={{ marginLeft: '8px' }}>
                {isPreviewMode ? 'Stabdyti' : 'Žaisti'}
              </span>
            )}
          </button>
        </div>

        {/* Right side with Last Saved text and Reset button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: isMobile ? '8px' : '15px'
        }}>
          {/* Last Saved Indicator */}
          {lastSaved && (
            <div style={{ 
              color: '#aaa', 
              fontSize: isMobile ? '10px' : '12px',
              whiteSpace: 'nowrap'
            }}>
              Saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
          
          {/* Reset Progress Button */}
          <button 
            onClick={() => {
              if (window.confirm('Ar tikrai nori viską ištrinti? Tai pašalins visus lygio elementus nesugrąžinamai.')) {
                clearSavedState();
                window.location.reload();
              }
            }}
            style={{
              padding: isMobile ? '6px 8px' : '8px 12px',
              backgroundColor: '#d9534f',
              border: '1px solid #d43f3a',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '10px' : '12px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'rgba(0,0,0,0)'
            }}
          >
            <svg width={isMobile ? "12" : "14"} height={isMobile ? "12" : "14"} viewBox="0 0 16 16" fill="currentColor">
              <path d="M4,4 L12,12 M4,12 L12,4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
            <span style={{ marginLeft: '4px' }}>Ištrinti</span>
          </button>
        </div>
      </div>

      {/* Main Container with horizontal swipe effect */}
      <div 
        ref={containerRef}
        style={{
          position: 'relative',
          width: '200vw', // Double width to accommodate both views side by side
          height: `calc(100vh - ${isMobile ? '49px' : '60px'})`, // Use viewport height instead of percentage
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          transform: `translateX(${currentView === 'game' ? 0 : -window.innerWidth}px)`,
          transition: 'transform 0.5s ease-in-out',
          paddingTop: 0, // Remove padding as we're handling this with absolute positioning
          marginTop: isMobile ? '49px' : '60px', // Use margin instead of padding for better sizing
          boxSizing: 'border-box' // Ensure padding is included in height calculation
        }}
      >
        {/* Game View */}
        <div 
          ref={gameContainerRef}
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'row',
            flexShrink: 0,
            position: 'relative' // Add position relative for absolute positioning of children
          }}
        >
          {/* Tool Buttons Column */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            padding: isMobile ? '5px' : '10px',
            backgroundColor: '#2a2a2a',
            borderRight: '1px solid #444',
            gap: isMobile ? '5px' : '10px',
            justifyContent: 'space-between', // Space between tools and bottom elements
            height: isMobile ? 'calc(100vh - 40px)' : 'calc(100vh - 60px)', // Subtract the top padding to ensure it fits
            overflow: 'auto', // Add scrolling if needed
            width: isMobile ? '50px' : 'auto', // Narrower on mobile
            transition: 'transform 0.15s ease-in-out', // Faster transition for sidebar collapse/expand
            transform: isPreviewMode ? 'translateX(-100%)' : 'translateX(0)', // Collapse when in preview mode on any device
            position: 'absolute',
            zIndex: 10
          }}>
            
            {/* Show toolbar button - only visible when toolbar is collapsed */}
            {isPreviewMode && (
              <div 
                style={{
                  position: 'absolute',
                  right: '-30px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '0 4px 4px 0',
                  padding: '8px 5px',
                  cursor: 'pointer',
                  border: '1px solid #444',
                  borderLeft: 'none',
                  zIndex: 10,
                  boxShadow: '2px 0 5px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={(e) => {
                  // Prevent event from bubbling up
                  e.stopPropagation();
                  
                  // Toggle the toolbar visibility by temporarily overriding the style
                  const toolbar = e.currentTarget.parentElement;
                  if (toolbar) {
                    if (toolbar.style.transform === 'translateX(0px)') {
                      toolbar.style.transform = 'translateX(-100%)';
                    } else {
                      toolbar.style.transform = 'translateX(0px)';
                      
                      // Auto-hide after 5 seconds
                      setTimeout(() => {
                        if (toolbar && isPreviewMode) {
                          toolbar.style.transform = 'translateX(-100%)';
                        }
                      }, 5000);
                    }
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6,4 L11,8 L6,12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            )}
            {/* Top section with tools */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              width: '100%'
            }}>
              <button 
                id="selector-tool"
                style={toolButtonStyle('selector')} 
                onClick={() => handleToolSelect('selector')}
                title="Select Tool"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13,3 L17,7 L7,17 L3,17 L3,13 L13,3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
                {!isMobile && <span style={{ marginLeft: '8px' }}>Rinktis</span>}
              </button>
              
              <button 
                id="block-tool"
                style={toolButtonStyle('block')} 
                onClick={() => handleToolSelect('block')}
                title="Block Tool"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="4" y="4" width="12" height="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
                {!isMobile && <span style={{ marginLeft: '8px' }}>Blokas</span>}
              </button>
              
              <button 
                id="trigger-tool"
                style={toolButtonStyle('trigger')} 
                onClick={() => handleToolSelect('trigger')}
                title="Trigger Tool"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4,10 L16,10 M10,4 L10,16" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                {!isMobile && <span style={{ marginLeft: '8px' }}>Pabaiga</span>}
              </button>
              
              <button 
                id="player-tool"
                style={toolButtonStyle('player')} 
                onClick={() => handleToolSelect('player')}
                title="Player Tool"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <circle cx="10" cy="10" r="2" fill="currentColor" />
                </svg>
                {!isMobile && <span style={{ marginLeft: '8px' }}>Žaidėjas</span>}
              </button>
              
              <button 
                id="spike-tool"
                style={toolButtonStyle('spike')} 
                onClick={() => handleToolSelect('spike')}
                title="Spike Tool"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10,4 L16,16 L4,16 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
                {!isMobile && <span style={{ marginLeft: '8px' }}>Spygliai</span>}
              </button>
            </div>
            
            {/* Bottom section with save info and reset button */}
            {/* Empty div to replace the removed reset button and last saved text */}
            <div></div>
          </div>

          {/* Game Container */}
          <div id="phaser-game" style={{
            flex: 1,
            position: 'absolute',
            overflow: 'hidden',
            width: isPreviewMode ? '100%' : 'calc(100% - ' + (isMobile ? '50px' : '120px') + ')',
            height: '100%',
            left: isPreviewMode ? '0' : (isMobile ? '50px' : '120px'),
            transition: 'width 0.15s ease-in-out, left 0.15s ease-in-out', // Faster transition for resizing
            zIndex: 5
          }}>
            <div style={{ 
              backgroundRepeat: 'repeat',
              backgroundSize: '50px 50px',
              width: '100%',
              height: '100%', 
              overflowX: 'hidden',
              overflowY: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#2a2a2a',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                position: 'relative' // Ensure proper positioning for game container
              }}>
                <div id="game-container" style={{
                  width: '100%', 
                  height: '100%',
                  position: 'absolute', // Fix positioning issues
                  top: 0,
                  left: 0
                }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Script Editor View */}
        <div 
          ref={editorContainerRef}
          style={{
            width: '100vw',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 0,
            flexShrink: 0,
            overflow: 'hidden', // Prevent any overflow
            touchAction: 'manipulation' // Improve touch interaction on mobile
          }}
        >
          <div style={{ 
            width: '100%',
            height: '100%',
            border: '1px solid #444', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            backgroundColor: '#2a2a2a',
            position: 'relative' // Ensure proper positioning for absolute children
          }}>
            <div 
              className="rete-editor-container"
              style={{ 
                flexGrow: 1, 
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                height: '100%',
                display: 'flex' // Use flexbox for better child element sizing
              }}
              onResize={() => {
                // Dispatch a resize event to notify components
                window.dispatchEvent(new Event('resize'));
              }}
            > 
              {/* Always render the editor to prevent reinitialization */}
              <ReteEditorComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
