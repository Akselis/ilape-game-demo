import { NodeEditor, ClassicPreset, GetSchemes } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { ReactPlugin, ReactArea2D, Presets as ReactPresets } from 'rete-react-plugin';
import { createRoot } from "react-dom/client";

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


type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;
type AreaExtra = ReactArea2D<Schemes>;

export async function createEditor(container: HTMLElement) {
  const editor = new NodeEditor<Schemes>();
  
  // Create area plugin with container
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  
  // No need to set initial position when using restrictor
  // The restrictor will lock the viewport in place
  
  // Disable panning and zooming by adding a restrictor
  // This locks both scaling and translation to fixed values
  AreaExtensions.restrictor(area, {
    // Disable scaling (zooming)
    scaling: false,
    // Disable translation (panning)
    translation: false
  });
  
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });

  // Disable node selection and dragging to make positions static

  render.addPreset(
    ReactPresets.classic.setup({
      customize: {
        node(context) {
          if (context.payload.label === "On Update") {
            return ExecNode;
          }
          if (context.payload.label === "Float") {
            return NumberNode;
          }
          if (context.payload.label === "Multiply") {
            return MultiplyNodeStyle;
          }
          if (context.payload.label === "Get Horizontal Axis") {
            return HorizontalAxisNodeStyle;
          }
          if (context.payload.label === "Get Vertical Axis") {
            return VerticalAxisNodeStyle;
          }
          if (context.payload.label === "Transform") {
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
          return ReactPresets.classic.Connection;
        },
      },
    })
  );

  connection.addPreset(ConnectionPresets.classic.setup());

  editor.use(area);
  area.use(connection);
  area.use(render);

  AreaExtensions.simpleNodesOrder(area);

  const exec = new OnUpdateNode();
  const xSpeed = new FloatNode();
  const ySpeed = new FloatNode();
  const xMultiply = new MultiplyNode();
  const yMultiply = new MultiplyNode();
  const xAxis = new GetHorizontalAxisNode();
  const yAxis = new GetVerticalAxisNode();
  const transform = new TransformNode();

  await editor.addNode(exec);
  
  await editor.addNode(xSpeed);
  await editor.addNode(ySpeed);
  
  await editor.addNode(xMultiply);
  await editor.addNode(yMultiply);
  
  await editor.addNode(xAxis);
  await editor.addNode(yAxis);

  await editor.addNode(transform);
  
  await area.translate(exec.id, { x: 350, y: 100 });
  await area.translate(xSpeed.id, { x: 30, y: 200 });
  await area.translate(xAxis.id, { x: 30, y: 300 });
  await area.translate(xMultiply.id, { x: 300, y: 250 });
  
  await area.translate(ySpeed.id, { x: 30, y: 450 });
  await area.translate(yAxis.id, { x: 30, y: 550 });
  await area.translate(yMultiply.id, { x: 300, y: 500 });
  
  await area.translate(transform.id, { x: 700, y: 200 });
  
  setTimeout(() => {
    AreaExtensions.zoomAt(area, editor.getNodes());
  }, 70);
  
  return {
    editor,
    area,
    destroy: () => area.destroy(),
  };
}