import type { AnySoupElement } from "@tscircuit/soup";

function soupToSvg(soup: AnySoupElement[]): string {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const portSize = 0.2;
  const portPositions = new Map();

  // First pass: find the bounds and collect port positions
  for (const item of soup) {
    if (item.type === "schematic_component") {
      updateBounds(item.center, item.size, item.rotation || 0);
    } else if (item.type === "schematic_port") {
      updateBounds(item.center, { width: portSize, height: portSize }, 0);
      portPositions.set(item.schematic_port_id, item.center);
    } else if (item.type === "schematic_text") {
      updateBounds(item.position, { width: 0, height: 0 }, 0);
    }
  }

  const height = maxY - minY;
  const flipY = (y: number) => height - (y - minY) + minY;

  const svgContent: string[] = [];

  // Process components
  const componentMap = new Map();
  for (const component of soup.filter(
    (item) => item.type === "schematic_component"
  )) {
    const flippedCenter = {
      x: component.center.x,
      y: flipY(component.center.y),
    };
    const svg = createSchematicComponent(
      flippedCenter,
      component.size,
      component.rotation || 0
    );
    svgContent.push(svg);
    componentMap.set(component.schematic_component_id, component);
  }

  // Process ports and add lines to component edges
  for (const port of soup.filter((item) => item.type === "schematic_port")) {
    const flippedCenter = { x: port.center.x, y: flipY(port.center.y) };
    const svg = createSchematicPort(flippedCenter);
    svgContent.push(svg);

    const component = componentMap.get(port.schematic_component_id);
    if (component) {
      const line = createPortToComponentLine(
        flippedCenter,
        component,
        port.facing_direction
      );
      svgContent.push(line);
    }
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

  const padding = 1;
  const width = maxX - minX + 2 * padding;
  const viewBox = `${minX - padding} ${minY - padding} ${width} ${height + 2 * padding}`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="1200" height="600">
      <style>
        .component { fill: none; stroke: red; stroke-width: 0.03; }
        .component-pin { fill: none; stroke: red; stroke-width: 0.03; }
        .trace { stroke: green; stroke-width: 0.03; fill: none; }
        .text { font-family: Arial, sans-serif; font-size: 0.2px; }
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
}

function createSchematicComponent(
  center: { x: number; y: number },
  size: { width: number; height: number },
  rotation: number
): string {
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

function createSchematicPort(center: { x: number; y: number }): string {
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

function createPortToComponentLine(
  portCenter: { x: number; y: number },
  component: any,
  facingDirection: string
): string {
  const componentCenter = { x: component.center.x, y: portCenter.y };
  const halfWidth = component.size.width / 2;
  const halfHeight = component.size.height / 2;

  let endX = portCenter.x;
  let endY = portCenter.y;

  switch (facingDirection) {
    case "left":
      endX = componentCenter.x - halfWidth;
      break;
    case "right":
      endX = componentCenter.x + halfWidth;
      break;
    case "up":
      endY = componentCenter.y - halfHeight;
      break;
    case "down":
      endY = componentCenter.y + halfHeight;
      break;
  }

  return `
    <line 
      class="component-pin"
      x1="${portCenter.x}" 
      y1="${portCenter.y}" 
      x2="${endX}" 
      y2="${endY}"
    />
  `;
}

function createSchematicTrace(
  trace: any,
  flipY: (y: number) => number,
  portPositions: Map<string, { x: number; y: number }>
): string {
  const edges = trace.edges;
  if (edges.length === 0) return "";

  let path = "";

  // Process all edges
  edges.forEach((edge: any, index: number) => {
    const fromPoint =
      edge.from.ti !== undefined ? portPositions.get(edge.from.ti) : edge.from;
    const toPoint =
      edge.to.ti !== undefined ? portPositions.get(edge.to.ti) : edge.to;

    if (!fromPoint || !toPoint) {
      return;
    }

    const fromCoord = `${fromPoint.x} ${flipY(fromPoint.y)}`;
    const toCoord = `${toPoint.x} ${flipY(toPoint.y)}`;

    if (index === 0) {
      path += `M ${fromCoord} L ${toCoord}`;
    } else {
      path += ` L ${toCoord}`;
    }
  });

  // Handle connection to final port if needed
  if (trace.to_schematic_port_id) {
    const finalPort = portPositions.get(trace.to_schematic_port_id);
    if (finalPort) {
      const lastFromPoint = path.split("M")[1]?.split("L")[0];
      console.log(`Last from coord: ${lastFromPoint}`);
      const lastEdge = edges[edges.length - 1];
      const lastPoint =
        lastEdge.to.ti !== undefined
          ? portPositions.get(lastEdge.to.ti)
          : lastEdge.to;
      if (lastPoint.x !== finalPort.x || lastPoint.y !== finalPort.y) {
        const finalCoord = `${finalPort.x} ${flipY(finalPort.y)}`;
        path += ` M ${lastFromPoint} L ${finalCoord}`;
      }
    }
  }

  return path ? `<path class="trace" d="${path}" />` : "";
}

function createSchematicText(
  text: any,
  position: { x: number; y: number }
): string {
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
