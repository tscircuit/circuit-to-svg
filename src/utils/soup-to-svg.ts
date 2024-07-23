import type { AnySoupElement } from "@tscircuit/soup";

function soupToSvg(soup: AnySoupElement[]): string {
  const svgContent: string[] = [];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  // Process components
  for (const component of soup.filter(
    (item) => item.type === "schematic_component"
  )) {
    const svg = createSchematicComponent(component);
    svgContent.push(svg);
    if (
      "center" in component &&
      "size" in component &&
      "rotation" in component
    ) {
      updateBounds(component.center, component.size, component.rotation);
    }
  }

  // Process traces
  for (const trace of soup.filter((item) => item.type === "schematic_trace")) {
    const svg = createSchematicTrace(trace);
    svgContent.push(svg);
    updateTraceBounds(trace.edges);
  }

  // Process text
  for (const text of soup.filter((item) => item.type === "schematic_text")) {
    const svg = createSchematicText(text);
    svgContent.push(svg);
    if ("position" in text) {
      updateTextBounds(text.position);
    }
  }

  // Process net labels
  for (const label of soup.filter(
    (item) => item.type === "schematic_net_label"
  )) {
    const svg = createSchematicNetLabel(label);
    svgContent.push(svg);
    const width = label.text.length * 0.15 + 0.3;
    const height = 0.3;
    minX = Math.min(minX, label.center.x);
    minY = Math.min(minY, label.center.y - height / 2);
    maxX = Math.max(maxX, label.center.x + width);
    maxY = Math.max(maxY, label.center.y + height / 2);
  }

  const padding = 1;
  const width = maxX - minX + 2 * padding;
  const height = maxY - minY + 2 * padding;
  const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;

  return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="1200" height="600">
      <style>
      .component { fill: none; stroke: red; stroke-width: 0.05; }
      .component-pin { fill: none; stroke: blue; stroke-width: 0.05; }
      .trace { stroke: green; stroke-width: 0.05; fill: none; }
      .text { font-family: Arial, sans-serif; font-size: 0.2px; }
      .net-label { font-family: Arial, sans-serif; font-size: 0.2px; fill: gray; }
    </style>
        ${svgContent.join("\n")}
      </svg>
    `;

  function updateBounds(center: any, size: any, rotation: number) {
    const corners = [
      { x: -size.width / 2, y: -size.height / 2 },
      { x: size.width / 2, y: -size.height / 2 },
      { x: size.width / 2, y: size.height / 2 },
      { x: -size.width / 2, y: size.height / 2 },
    ];

    for (const corner of corners) {
      const rotatedX =
        corner.x * Math.cos(rotation) -
        corner.y * Math.sin(rotation) +
        center.x;
      const rotatedY =
        corner.x * Math.sin(rotation) +
        corner.y * Math.cos(rotation) +
        center.y;
      minX = Math.min(minX, rotatedX);
      minY = Math.min(minY, rotatedY);
      maxX = Math.max(maxX, rotatedX);
      maxY = Math.max(maxY, rotatedY);
    }
  }

  function updateTraceBounds(edges: any[]) {
    for (const edge of edges) {
      minX = Math.min(minX, edge.from.x, edge.to.x);
      minY = Math.min(minY, edge.from.y, edge.to.y);
      maxX = Math.max(maxX, edge.from.x, edge.to.x);
      maxY = Math.max(maxY, edge.from.y, edge.to.y);
    }
  }

  function updateTextBounds(position: { x: number; y: number }) {
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x);
    maxY = Math.max(maxY, position.y);
  }
}

function createSchematicComponent(component: any): string {
  const { center, size, rotation } = component;
  const transform = `translate(${center.x}, ${center.y}) rotate(${
    (rotation * 180) / Math.PI
  })`;
  const pinSize = 0.2; // Size of the square pins

  return `
      <g transform="${transform}">
        <rect 
          class="component" 
          x="${-size.width / 2}" 
          y="${-size.height / 2}" 
          width="${size.width}" 
          height="${size.height}" 
        />
        <rect 
        class="component-pin"
          x="${-size.width / 2 - pinSize / 2}" 
          y="${-pinSize / 2}" 
          width="${pinSize}" 
          height="${pinSize}" 
        />
        <rect 
          class="component-pin"
          x="${size.width / 2 - pinSize / 2}" 
          y="${-pinSize / 2}" 
          width="${pinSize}" 
          height="${pinSize}" 
        />
      </g>
    `;
}

function createSchematicTrace(trace: any): string {
  const path = trace.edges.map((edge: any, index: number) => {
    const fromPoint = `${edge.from.x} ${edge.from.y}`;
    const toPoint = `${edge.to.x} ${edge.to.y}`;
    
    if (index === 0) {
      return `M ${fromPoint} L ${toPoint}`;
    }
      // Check if this is a 90-degree turn
      const prevEdge = trace.edges[index - 1];
      if (prevEdge.to.x === edge.from.x && prevEdge.to.y === edge.from.y) {
        return `L ${toPoint}`;
      }
        // Insert a move command for discontinuous segments
        return `M ${fromPoint} L ${toPoint}`;
  }).join(' ');

  return `<path class="trace" d="${path}" />`;
}

function createSchematicText(text: any): string {
  return `
      <text 
        class="text" 
        x="${text.position.x}" 
        y="${text.position.y}" 
        text-anchor="${getTextAnchor(text.anchor)}"
      >${text.text}</text>
    `;
}

function createSchematicNetLabel(label: any): string {
  const width = label.text.length * 0.15 + 0.3;
  const height = 0.3;
  const arrowTip = 0.15;
  const isLeftAnchor = label.anchor_side === "left";

  // Move the entire label to the left
  const labelCenterX = isLeftAnchor ? label.center.x - width / 3 - 0.2 : label.center.x;

  const path = isLeftAnchor
    ? `
      M ${labelCenterX + width},${label.center.y - height / 2}
      L ${labelCenterX + arrowTip},${label.center.y - height / 2}
      L ${labelCenterX},${label.center.y}
      L ${labelCenterX + arrowTip},${label.center.y + height / 2}
      L ${labelCenterX + width},${label.center.y + height / 2}
      Z
    `
    : `
      M ${labelCenterX},${label.center.y - height / 2}
      L ${labelCenterX + width - arrowTip},${label.center.y - height / 2}
      L ${labelCenterX + width},${label.center.y}
      L ${labelCenterX + width - arrowTip},${label.center.y + height / 2}
      L ${labelCenterX},${label.center.y + height / 2}
      Z
    `;

  // Keep text centered within the label
  const textX = labelCenterX + width / 2;

  // Add a line to connect the label to the resistor
  const connectingLine = `
    <line 
      x1="${labelCenterX + width}" 
      y1="${label.center.y}" 
      x2="${label.center.x}" 
      y2="${label.center.y}" 
      stroke="green" 
      stroke-width="0.05"
    />
  `;

  return `
    <g class="net-label">
      ${connectingLine}
      <path d="${path}" fill="white" stroke="black" stroke-width="0.02"/>
      <text 
        x="${textX}" 
        y="${label.center.y}" 
        text-anchor="middle" 
        dominant-baseline="central"
        fill="black"
      >${label.text}</text>
    </g>
  `;
}

function getTextAnchor(anchor: string): string {
  switch (anchor) {
    case "left":
      return "start";
    case "right":
      return "end";
    default:
      return "middle";
  }
}

export { soupToSvg };
