class EditorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EditorScene' });
        this.isPreviewMode = false;
        this.savedState = null;
    }
    
    create() {
        // Set up world bounds
        this.levelWidth = 3200;
        this.levelHeight = window.innerHeight;
        this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);
        
        // Create groups for blocks and triggers
        this.blocks = this.add.group();
        this.triggers = this.add.group();
        
        // Create ground
        const ground = new Block(this, this.levelWidth/2, this.levelHeight - 25, this.levelWidth, 50);
        ground.setInteractive(false);
        ground.resizeHandles.forEach(handle => handle.destroy());
        ground.deleteButton.destroy();
        ground.isGround = true;
        this.blocks.add(ground);
        
        // Set up tools
        this.tools = {
            selector: new SelectorTool(this),
            mover: new MoverTool(this),
            block: new BlockTool(this),
            trigger: new TriggerTool(this),
            player: new PlayerTool(this)
        };
        
        // Set up input handlers
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
        
        // Set up tool buttons
        const buttons = {
            'selector-tool': 'selector',
            'mover-tool': 'mover',
            'block-tool': 'block',
            'trigger-tool': 'trigger',
            'player-tool': 'player'
        };
        
        Object.entries(buttons).forEach(([buttonId, toolName]) => {
            const button = document.getElementById(buttonId);
            button.addEventListener('click', () => this.setTool(toolName));
        });
        
        // Set up preview button
        const previewButton = document.getElementById('preview-button');
        previewButton.addEventListener('click', () => this.togglePreview());
        
        // Start with selector tool
        this.setTool('selector');
        
        // Disable physics simulation initially
        this.physics.world.pause();
    }
    
    saveState() {
        const state = {
            blocks: [],
            triggers: [],
            player: null,
            camera: {
                scrollX: this.cameras.main.scrollX,
                scrollY: this.cameras.main.scrollY
            }
        };
        
        // Save blocks state
        this.blocks.getChildren().forEach(block => {
            if (!block.isGround) {
                state.blocks.push({
                    x: block.x,
                    y: block.y,
                    width: block.rectangle.width,
                    height: block.rectangle.height
                });
            }
        });
        
        // Save triggers state
        this.triggers.getChildren().forEach(trigger => {
            state.triggers.push({
                x: trigger.x,
                y: trigger.y,
                width: trigger.rectangle.width,
                height: trigger.rectangle.height
            });
        });
        
        // Save player state
        if (this.player) {
            state.player = {
                x: this.player.x,
                y: this.player.y
            };
        }
        
        return state;
    }
    
    restoreState(state) {
        // Remove all non-ground blocks
        this.blocks.getChildren().forEach(block => {
            if (!block.isGround) {
                block.destroy();
            }
        });
        
        // Remove all triggers
        this.triggers.getChildren().forEach(trigger => trigger.destroy());
        
        // Remove player
        if (this.player) {
            this.player.destroy();
        }
        
        // Restore blocks
        state.blocks.forEach(blockData => {
            const block = new Block(this, blockData.x, blockData.y, blockData.width, blockData.height);
            this.blocks.add(block);
        });
        
        // Restore triggers
        state.triggers.forEach(triggerData => {
            const trigger = new LevelEndTrigger(this, triggerData.x, triggerData.y, triggerData.width, triggerData.height);
            this.triggers.add(trigger);
        });
        
        // Restore player
        if (state.player) {
            this.player = new Player(this, state.player.x, state.player.y);
        }
        
        // Restore camera position
        this.cameras.main.setScroll(state.camera.scrollX, state.camera.scrollY);
    }
    
    setTool(toolName) {
        if (this.isPreviewMode) return;
        
        // Deactivate all tools
        Object.values(this.tools).forEach(tool => tool.deactivate());
        
        // Activate the selected tool
        this.tools[toolName].activate();
        
        // Update button states
        Object.entries(this.tools).forEach(([name, tool]) => {
            const button = document.getElementById(`${name}-tool`);
            if (button) {
                button.classList.toggle('active', tool.active);
            }
        });
    }
    
    togglePreview() {
        this.isPreviewMode = !this.isPreviewMode;
        
        // Update preview button state
        const previewButton = document.getElementById('preview-button');
        previewButton.classList.toggle('active', this.isPreviewMode);
        
        if (this.isPreviewMode) {
            // Save current state
            this.savedState = this.saveState();
            
            // Enable physics world
            this.physics.world.resume();
            
            // Disable all tools
            Object.values(this.tools).forEach(tool => tool.deactivate());
            
            // Enable physics for all blocks
            this.blocks.getChildren().forEach(block => {
                if (!block.body) {
                    this.physics.add.existing(block, true);
                }
            });
            
            // Follow player with camera if it exists
            if (this.player) {
                this.cameras.main.startFollow(this.player, true);
                this.cameras.main.setLerp(0.1);
                this.physics.add.collider(this.player, this.blocks);
            }
        } else {
            // Disable physics world
            this.physics.world.pause();
            
            // Reset camera follow
            this.cameras.main.stopFollow();
            
            // Restore saved state
            if (this.savedState) {
                this.restoreState(this.savedState);
                this.savedState = null;
            }
            
            // Re-enable selector tool
            this.setTool('selector');
        }
        
        // Update tool button states
        Object.entries(this.tools).forEach(([name]) => {
            const button = document.getElementById(`${name}-tool`);
            button.disabled = this.isPreviewMode;
        });
    }
    
    update() {
        if (this.player && this.isPreviewMode) {
            this.player.update();
        }
    }
    
    onPointerDown(pointer) {
        if (!this.isPreviewMode) {
            Object.values(this.tools).forEach(tool => {
                if (tool.active) tool.onPointerDown(pointer);
            });
        }
    }
    
    onPointerMove(pointer) {
        if (!this.isPreviewMode) {
            Object.values(this.tools).forEach(tool => {
                if (tool.active) tool.onPointerMove(pointer);
            });
        }
    }
    
    onPointerUp(pointer) {
        if (!this.isPreviewMode) {
            Object.values(this.tools).forEach(tool => {
                if (tool.active) tool.onPointerUp(pointer);
            });
        }
    }
}
