import React from "react";
import { pcbSoupToSvg, soupToSvg } from "../lib/index.js";
import soup from "../utils/soup.json";

export const NetLabelNotOverlap = () => {
  const svg = soupToSvg(soup);

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