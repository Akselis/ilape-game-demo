class EditorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EditorScene' });
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
        this.blocks.add(ground);
        
        // Set up tools
        this.tools = {
            selector: new SelectorTool(this),
            mover: new MoverTool(this),
            block: new BlockTool(this),
            trigger: new TriggerTool(this)
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
            'trigger-tool': 'trigger'
        };
        
        Object.entries(buttons).forEach(([buttonId, toolName]) => {
            const button = document.getElementById(buttonId);
            button.addEventListener('click', () => this.setTool(toolName));
        });
        
        // Start with selector tool
        this.setTool('selector');
    }
    
    setTool(toolName) {
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
    
    onPointerDown(pointer) {
        Object.values(this.tools).forEach(tool => {
            if (tool.active) tool.onPointerDown(pointer);
        });
    }
    
    onPointerMove(pointer) {
        Object.values(this.tools).forEach(tool => {
            if (tool.active) tool.onPointerMove(pointer);
        });
    }
    
    onPointerUp(pointer) {
        Object.values(this.tools).forEach(tool => {
            if (tool.active) tool.onPointerUp(pointer);
        });
    }
}
