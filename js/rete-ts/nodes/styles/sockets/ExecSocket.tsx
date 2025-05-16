import { ClassicPreset } from "rete";
import styled from "styled-components";
import { $socketsize } from "../vars";

const Styles = styled.div`
  display: inline-block;
  cursor: pointer;
  width: ${$socketsize * 1.4}px;
  height: ${$socketsize * 0.9}px;
  vertical-align: middle;
  z-index: 2;
  box-sizing: border-box;
  position: relative;
  padding: 10;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;

    width: 100%;
    height: 100%;
    background-color: #B8FF59;
    clip-path: polygon(10% 30%, 60% 30%, 60% 0%, 100% 50%, 60% 100%, 60% 70%, 10% 70%); /* arrow */
    transition: background-color 0.2s ease;
  }
  
  &:hover:before {
    background-color: #45a049;
  }
`;

export function ExecSocket<T extends ClassicPreset.Socket>(props: {
  data: T;
}) {
  return <Styles title={props.data.name} />;
}
