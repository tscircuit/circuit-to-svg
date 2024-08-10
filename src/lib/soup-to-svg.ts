import type { AnySoupElement } from "@tscircuit/soup";

function soupToSvg(soup: AnySoupElement[]): string {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  // First pass: find the bounds
  for (const item of soup) {
    if ('center' in item) {
      updateBounds(item.center, item.size || {width: 0.2, height: 0.2}, item.rotation || 0);
    } else if ('position' in item) {
      updateBounds(item.position, {width: 0, height: 0}, 0);
    }
  }

  const height = maxY - minY;

  // Function to flip y-coordinate
  const flipY = (y: number) => height - (y - minY) + minY;

  const svgContent: string[] = [];

  // Process ports
  const portPositions = new Map();
  for (const port of soup.filter((item) => item.type === "schematic_port")) {
    const flippedCenter = { x: port.center.x, y: flipY(port.center.y) };
    const svg = createSchematicPort(flippedCenter);
    svgContent.push(svg);
    portPositions.set(port.schematic_port_id, flippedCenter);
  }

  // Process components
  for (const component of soup.filter((item) => item.type === "schematic_component")) {
    const flippedCenter = { x: component.center.x, y: flipY(component.center.y) };
    const svg = createSchematicComponent(flippedCenter, component.size, -component.rotation);
    svgContent.push(svg);
  }

  // Process schematic traces
  for (const trace of soup.filter((item) => item.type === "schematic_trace")) {
    const svg = createSchematicTrace(trace, flipY, portPositions);
    svgContent.push(svg);
  }

  // Process text
  for (const text of soup.filter((item) => item.type === "schematic_text")) {
    const flippedPosition = { x: text.position.x, y: flipY(text.position.y) };
    const svg = createSchematicText(text, flippedPosition);
    svgContent.push(svg);
  }

  // Process net labels
  for (const label of soup.filter((item) => item.type === "schematic_net_label")) {
    const flippedCenter = { x: label.center.x, y: flipY(label.center.y) };
    const svg = createSchematicNetLabel(label, flippedCenter);
    svgContent.push(svg);
  }

  const padding = 1;
  const width = maxX - minX + 2 * padding;
  const viewBox = `${minX - padding} ${minY - padding} ${width} ${height + 2 * padding}`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="1200" height="600">
      <style>
        .component { fill: none; stroke: red; stroke-width: 0.03; }
        .component-pin { fill: none; stroke: blue; stroke-width: 0.05; }
        .trace { stroke: green; stroke-width: 0.03; fill: none; }
        .text { font-family: Arial, sans-serif; font-size: 0.2px; }
        .net-label { font-family: Arial, sans-serif; font-size: 0.2px; fill: gray; }
        .port { fill: none; stroke: blue; stroke-width: 0.03; }
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
      const rotatedX = corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation) + center.x;
      const rotatedY = corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation) + center.y;
      minX = Math.min(minX, rotatedX);
      minY = Math.min(minY, rotatedY);
      maxX = Math.max(maxX, rotatedX);
      maxY = Math.max(maxY, rotatedY);
    }
  }
}

function createSchematicComponent(center: {x: number, y: number}, size: {width: number, height: number}, rotation: number): string {
  const transform = `translate(${center.x}, ${center.y}) rotate(${(rotation * 180) / Math.PI})`;

  return `
    <g transform="${transform}">
      <rect 
        class="component" 
        x="${-size.width / 2}" 
        y="${-size.height / 2}" 
        width="${size.width}" 
        height="${size.height}" 
      />
    </g>
  `;
}

function createSchematicPort(center: {x: number, y: number}): string {
  const portSize = 0.2;
  const x = center.x - portSize / 2;
  const y = center.y - portSize / 2;

  return `
    <rect 
      class="port" 
      x="${x}" 
      y="${y}" 
      width="${portSize}" 
      height="${portSize}" 
    />
  `;
}

function createSchematicTrace(trace: any, flipY: (y: number) => number, portPositions: Map<string, {x: number, y: number}>): string {
  const path = trace.edges.map((edge: any, index: number) => {
    const fromPoint = portPositions.get(edge.from.ti) || { x: edge.from.x, y: flipY(edge.from.y) };
    const toPoint = portPositions.get(edge.to.ti) || { x: edge.to.x, y: flipY(edge.to.y) };
    
    const fromCoord = `${fromPoint.x} ${fromPoint.y}`;
    const toCoord = `${toPoint.x} ${toPoint.y}`;
    
    if (index === 0) {
      return `M ${fromCoord} L ${toCoord}`;
    }
    // Check if this is a 90-degree turn
    const prevEdge = trace.edges[index - 1];
    const prevToPoint = portPositions.get(prevEdge.to.ti) || { x: prevEdge.to.x, y: flipY(prevEdge.to.y) };
    if (prevToPoint.x === fromPoint.x && prevToPoint.y === fromPoint.y) {
      return `L ${toCoord}`;
    }
    // Insert a move command for discontinuous segments
    return `M ${fromCoord} L ${toCoord}`;
  }).join(' ');

  return `<path class="trace" d="${path}" />`;
}

function createSchematicText(text: any, position: {x: number, y: number}): string {
  return `
    <text 
      class="text" 
      x="${position.x}" 
      y="${position.y}" 
      text-anchor="${getTextAnchor(text.anchor)}"
      dominant-baseline="middle"
    >${text.text ? text.text : ""}</text>
  `;
}

function createSchematicNetLabel(label: any, center: {x: number, y: number}): string {
  const width = label.text.length * 0.15 + 0.3;
  const height = 0.3;
  const arrowTip = 0.15;
  const isLeftAnchor = label.anchor_side === "left";

  const labelCenterX = isLeftAnchor ? center.x - width / 3 - 0.2 : center.x;

  const path = isLeftAnchor
    ? `
      M ${labelCenterX + width},${center.y - height / 2}
      L ${labelCenterX + arrowTip},${center.y - height / 2}
      L ${labelCenterX},${center.y}
      L ${labelCenterX + arrowTip},${center.y + height / 2}
      L ${labelCenterX + width},${center.y + height / 2}
      Z
    `
    : `
      M ${labelCenterX},${center.y - height / 2}
      L ${labelCenterX + width - arrowTip},${center.y - height / 2}
      L ${labelCenterX + width},${center.y}
      L ${labelCenterX + width - arrowTip},${center.y + height / 2}
      L ${labelCenterX},${center.y + height / 2}
      Z
    `;

  const textX = labelCenterX + width / 2;

  const connectingLine = `
    <line 
      x1="${labelCenterX + width}" 
      y1="${center.y}" 
      x2="${center.x}" 
      y2="${center.y}" 
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
        y="${center.y}" 
        text-anchor="middle" 
        dominant-baseline="middle"
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