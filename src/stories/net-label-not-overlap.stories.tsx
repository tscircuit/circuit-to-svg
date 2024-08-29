import React, { useEffect, useState } from "react"
import { circuitJsonToSchematicSvg, circuitJsonToPcbSvg } from "../lib/index.js"
import soup from "../utils/soup.json"

export const NetLabelNotOverlap = () => {
  const result = circuitJsonToPcbSvg(soup)

  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default {
  title: "Net Label Not Overlap",
  component: NetLabelNotOverlap,
}
