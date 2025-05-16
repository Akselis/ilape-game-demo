import { ClassicScheme, Presets } from "rete-react-plugin";
import styled, { css } from "styled-components";
import { $nodewidth, $socketmargin, $socketsize } from "../vars";
import { sortByIndex, Props, NodeExtraData } from "../util";

const { RefSocket, RefControl } = Presets.classic;

export const NodeStyles = styled.div<
  NodeExtraData & { selected: boolean; styles?: (props: any) => any }
>`
  background: #393939;
  border: 1px solid black;
  cursor: pointer;
  box-sizing: border-box;
  width: ${(props) =>
    Number.isFinite(props.width) ? `${props.width}px` : `${$nodewidth}px`};
  height: ${(props) =>
    Number.isFinite(props.height) ? `${props.height}px` : "auto"};
  padding-bottom: 6px;
  position: relative;
  user-select: none;
  &:hover {
    background: #333;
  }
  ${(props) =>
    props.selected &&
    css`
      border-color: #247374;
    `}
  .title {
    color: white;
    font-family: sans-serif;
    font-size: 18px;
    padding: 8px;
    display: flex;
    align-items: center;
  }
  .icon {
    margin-right: 5px;
    width: 50px;
    height: 50px;
    background-color: #FE6D40;
    clip-path: polygon(10% 45%, 60% 45%, 60% 35%, 100% 50%, 60% 65%, 60% 55%, 10% 55%);
    transition: background-color 0.2s ease;
  }

  .output {
    text-align: right;
    padding-top: 5px;
    padding-bottom: 5px;
    display: flex;
  }
  .input {
    text-align: left;
    padding-top: 5px;
    padding-bottom: 5px;
    display: flex;
  }
  .output-socket {
    text-align: right;
    margin-right: 6px;
    display: inline-block;
  }
  .input-socket {
    text-align: left;
    margin-left: 6px;
    display: inline-block;
  }
  .input-title,
  .output-title {
    vertical-align: middle;
    color: white;
    display: inline-block;
    font-family: sans-serif;
    font-size: 14px;
    margin: ${$socketmargin}px;
    line-height: ${$socketsize}px;
  }
  .input-control {
    z-index: 1;
    width: calc(100% - ${$socketsize + 3 * $socketmargin}px);
    vertical-align: middle;
  }
  .control {
    display: block;
    padding: ${$socketmargin * 1.5}px ${$socketsize / 2 + $socketmargin * 2}px
      ${$socketmargin * 1.5}px ${$socketsize / 2 + $socketmargin}px;
  }
  .sockets {
    border-top: 1px solid #252525;
    border-bottom: 1px solid #252525;
    background-color: #3c3c3c;
    display: flex;
    width: 100%;
  }
  .inputs {
    flex: 1;
  }
  .outputs {
    flex: 1;
  }
  .controls {
    flex: 3;
  }
  input {
    background-color: #2a2a2a;
    border-radius: 4px;
    border: 1px solid #252525;
    height: 20px;
    color: white;
    font-size: 14px;
  }
  ${(props) => props.styles && props.styles(props)}
`;

export function HorizontalAxisNode<Scheme extends ClassicScheme>(props: Props<Scheme>) {
  const inputs = Object.entries(props.data.inputs);
  const outputs = Object.entries(props.data.outputs);
  const controls = Object.entries(props.data.controls);
  const selected = props.data.selected || false;
  const { id, label, width, height } = props.data;

  sortByIndex(inputs);
  sortByIndex(outputs);
  sortByIndex(controls);

  return (
    <NodeStyles
      selected={selected}
      width={width}
      height={height}
      styles={props.styles}
      data-testid="node"
    >
      <div className="color" />
      <div className="title" data-testid="title">
        <div className="icon" />
        {label}
      </div>
      <div className="sockets">
        <div className="inputs">
          {/* Inputs */}
          {inputs.map(
            ([key, input]) =>
              input && (
                <div className="input" key={key} data-testid={`input-${key}`}>
                  <RefSocket
                    name="input-socket"
                    emit={props.emit}
                    side="input"
                    socketKey={key}
                    nodeId={id}
                    payload={input.socket}
                  />
                  {input && (!input.control || !input.showControl) && (
                    <div className="input-title" data-testid="input-title">
                      {input?.label}
                    </div>
                  )}
                  {input?.control && input?.showControl && (
                    <span className="input-control">
                      <RefControl
                        key={key}
                        name="input-control"
                        emit={props.emit}
                        payload={input.control}
                      />
                    </span>
                  )}
                </div>
              )
          )}
        </div>
        <div className="controls">
          {/* Controls */}
          {controls.map(([key, control]) => {
            return control ? (
              <RefControl
                key={key}
                name="control"
                emit={props.emit}
                payload={control}
              />
            ) : null;
          })}
        </div>
        <div className="outputs">
          {/* Outputs */}
          {outputs.map(
            ([key, output]) =>
              output && (
                <div className="output" key={key} data-testid={`output-${key}`}>
                  <div className="output-title" data-testid="output-title">
                    {output?.label}
                  </div>
                  <RefSocket
                    name="output-socket"
                    side="output"
                    emit={props.emit}
                    socketKey={key}
                    nodeId={id}
                    payload={output.socket}
                  />
                </div>
              )
          )}
        </div>
      </div>
    </NodeStyles>
  );
}
