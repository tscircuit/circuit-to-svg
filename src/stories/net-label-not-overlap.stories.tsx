import React from "react";
import { pcbSoupToSvg } from "../lib/pcb-soup-to-svg.js";
import soup from "../utils/soup.json";

export const NetLabelNotOverlap = () => {
  const svg = pcbSoupToSvg(soup);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default {
    title: 'Net Label Not Overlap',
    component: NetLabelNotOverlap,
}