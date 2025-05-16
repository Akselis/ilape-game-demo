import { ClassicPreset } from "rete";
import styled from "styled-components";
import { $socketsize } from "../vars";

const Styles = styled.div`
  display: inline-block;
  cursor: pointer;
  width: ${$socketsize * 0.5}px;
  height: ${$socketsize * 0.65}px;
  vertical-align: middle;
  z-index: 2;
  box-sizing: border-box;
  position: relative;

  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;

    width: 12px;
    height: 12px;
    background-color: #C2C2C2;
    border-radius: 50%;
    transition: background-color 0.2s ease;
  }

  &:hover:before {
    background-color:rgb(130, 130, 130);
  }
`;

export function NumberSocket<T extends ClassicPreset.Socket>(props: {
  data: T;
}) {
  return <Styles title={props.data.name} />;
}
