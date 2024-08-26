import React, { useEffect, useState } from "react";
import { circuitJsonToSchematicSvg, circuitJsonToPcbSvg } from "../lib/index.js";
import soup from "../utils/soup.json";

export const NetLabelNotOverlap = () => {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    const fetchSvg = async () => {
      try {
        const result = await circuitJsonToSchematicSvg(soup);
        setSvg(result);
      } catch (error) {
        console.error("Error generating SVG:", error);
      }
    };

    fetchSvg();
  }, []);

  if (!svg) {
    return <div>Loading...</div>;
  }

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
};

export default {
  title: "Net Label Not Overlap",
  component: NetLabelNotOverlap,
};
