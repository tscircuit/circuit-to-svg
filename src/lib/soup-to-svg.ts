import type { AnySoupElement } from "@tscircuit/soup";
import { stringify } from "svgson";

function circuitJsonToSchematicSvg(soup: AnySoupElement[]): string {
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

  const svgChildren: any[] = [];

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
    svgChildren.push(svg);
    componentMap.set(component.schematic_component_id, component);
  }

  // Process ports and add lines to component edges
  for (const port of soup.filter((item) => item.type === "schematic_port")) {
    const flippedCenter = { x: port.center.x, y: flipY(port.center.y) };
    const svg = createSchematicPort(flippedCenter);
    svgChildren.push(svg);

    const component = componentMap.get(port.schematic_component_id);
    if (component) {
      const line = createPortToComponentLine(
        flippedCenter,
        component,
        port.facing_direction || "right"
      );
      svgChildren.push(line);
    }
  }

  // Process schematic traces
  for (const trace of soup.filter((item) => item.type === "schematic_trace")) {
    const svg = createSchematicTrace(trace, flipY, portPositions);
    if (svg) svgChildren.push(svg);
  }

  // Process text
  for (const text of soup.filter((item) => item.type === "schematic_text")) {
    const flippedPosition = { x: text.position.x, y: flipY(text.position.y) };
    const svg = createSchematicText(text, flippedPosition);
    svgChildren.push(svg);
  }

  const padding = 1;
  const width = maxX - minX + 2 * padding;
  const viewBox = `${minX - padding} ${minY - padding} ${width} ${height + 2 * padding}`;

  const svgObject = {
    name: 'svg',
    type: 'element',
    attributes: {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox,
      width: '1200',
      height: '600',
    },
    children: [
      {
        name: 'style',
        type: 'element',
        children: [
          {
            type: 'text',
            value: `
              .component { fill: none; stroke: red; stroke-width: 0.03; }
              .component-pin { fill: none; stroke: red; stroke-width: 0.03; }
              .trace { stroke: green; stroke-width: 0.03; fill: none; }
              .text { font-family: Arial, sans-serif; font-size: 0.2px; }
              .port { fill: none; stroke: blue; stroke-width: 0.03; }
            `
          }
        ]
      },
      ...svgChildren
    ]
  };

  return stringify({ value: '', ...svgObject});

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
): any {
  const transform = `translate(${center.x}, ${center.y}) rotate(${(rotation * 180) / Math.PI})`;

  return {
    name: 'g',
    type: 'element',
    attributes: { transform },
    children: [
      {
        name: 'rect',
        type: 'element',
        attributes: {
          class: 'component',
          x: (-size.width / 2).toString(),
          y: (-size.height / 2).toString(),
          width: size.width.toString(),
          height: size.height.toString(),
        }
      }
    ]
  };
}

function createSchematicPort(center: { x: number; y: number }): any {
  const portSize = 0.2;
  const x = center.x - portSize / 2;
  const y = center.y - portSize / 2;

  return {
    name: 'rect',
    type: 'element',
    attributes: {
      class: 'port',
      x: x.toString(),
      y: y.toString(),
      width: portSize.toString(),
      height: portSize.toString(),
    }
  };
}

function createPortToComponentLine(
  portCenter: { x: number; y: number },
  component: any,
  facingDirection: string
): any {
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

  return {
    name: 'line',
    type: 'element',
    attributes: {
      class: 'component-pin',
      x1: portCenter.x.toString(),
      y1: portCenter.y.toString(),
      x2: endX.toString(),
      y2: endY.toString(),
    }
  };
}

function createSchematicTrace(
  trace: any,
  flipY: (y: number) => number,
  portPositions: Map<string, { x: number; y: number }>
): any {
  const edges = trace.edges;
  if (edges.length === 0) return null;

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

  return path ? {
    name: 'path',
    type: 'element',
    attributes: {
      class: 'trace',
      d: path,
    }
  } : null;
}

function createSchematicText(
  text: any,
  position: { x: number; y: number }
): any {
  return {
    name: 'text',
    type: 'element',
    attributes: {
      class: 'text',
      x: position.x.toString(),
      y: position.y.toString(),
      'text-anchor': getTextAnchor(text.anchor),
      'dominant-baseline': 'middle',
    },
    children: [
      {
        type: 'text',
        value: text.text ? text.text : "",
      }
    ]
  };
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

export { circuitJsonToSchematicSvg };