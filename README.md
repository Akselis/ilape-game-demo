# iLapė game editor demo
A simple, desktop and mobile capable game including a level editor and a visual scripting system for programming the player character. Built using [Node.js](https://nodejs.org/en) with [React](https://react.dev/), while employing the following JavaScript frameworks: [Phaser](https://phaser.io/) - a game framework, and [Rete.js](https://retejs.org/) - a visual programming framework.

A deployed build for testing features can be found [here](https://ilape-game-editor.windsurf.build/).
## Functions and systems
### Level editor & game
The level editor is a straightforward level building environment, using which the user can plan and develop a level and preview it.
![image](https://github.com/user-attachments/assets/55da08e7-302f-4ef1-a192-598d363f40ca)
The navigation for the whole page is simple - the left button on the top navbar allows for transitions between the game and script editors, while the green play button launches the preview.
The level editor has a couple of tools to the user's disposal:
1. **Selector**, which allows selecting, movingm, resizing and deleting game objects. Resizing an object can be done by selecting it and dragging one of the yellow squares in the corner, while deletion is handled by clicking/pressing the red X in the middle or on top of the object. 

![image](https://github.com/user-attachments/assets/9ea2a860-2d13-4321-9c0f-399b5ec5d9be)


2. **Block**, which allows placing of squares with simulated physics collisions.
3. **Level-end**, which allows placing of squares that represent the trigger, which ends the level.
4. **Player**, which allows placing of the player character (one per session).
5. A couple of more tools are in the works.

Additionally, the level editor incudles a minimap for easier traversal through the level, allowing the user to build it larger in width than their device's screen. Minimap can be used by clicking and dragging the active area or clicking on an inactive area to teleport there.

### Rete visual scripting graph editor
The visual script editor allows the user to program the primary character, enabling their movement on the horizontal and vertical axes. The script editor also allows manipulation of movement speeds and jump force. The following image demonstrates the appropriate connections in the script editor for the player to move as intended:
![image](https://github.com/user-attachments/assets/b173ea9c-c190-4d33-9b87-2d3c9dcaeb4b)

### Persistence
The web-portal uses cookies to save user progress, ensuring both the level built by the player (including block positions and sizes) and connections made in the script editor are preserved between sessions. Persistence is handled by auto-saves every 15 seconds. Last state save time can be viewed in the top right of the page with a "Delete all progress" button, which resets both the level to blank and removes all script editor connections and altered values.

![image](https://github.com/user-attachments/assets/82eb0d10-8158-4c1f-a5dd-6eea42a23301)

## Deployment
Concise guide on how to deploy the application:
1. Make sure Node.js is installed on your device.
2. Navigate to repo directory.
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Deploy the built `/dist` directory

