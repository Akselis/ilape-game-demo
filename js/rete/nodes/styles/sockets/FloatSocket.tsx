import { ClassicPreset } from "rete";
import styled from "styled-components";
import { $socketsize } from "../vars";

const Styles = styled.div`
  display: inline-block;
  cursor: pointer;
  width: ${$socketsize * 1.5}px;
  height: ${$socketsize * 1.5}px;
  vertical-align: middle;
  z-index: 2;
  box-sizing: border-box;
  position: relative;

  &:before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background-color: #7ed4fa;
    border-radius: 50%;
    transition: background-color 0.2s ease;
  }

  &:hover:before {
    background-color: #5b99b5; /* Darker green on hover */
  }
`;

export function FloatSocket<T extends ClassicPreset.Socket>(props: {
  data: T;
}) {
  return <Styles title={props.data.name} />;
}
