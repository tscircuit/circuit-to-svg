import type { AnySoupElement } from "@tscircuit/soup";
import { applyToPoint, compose, scale, translate } from "transformation-matrix";

function pcbSoupToSvg(soup: AnySoupElement[]): string {
  const svgContent: string[] = [];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  // Process all elements to determine bounds
  for (const item of soup) {
    if ("center" in item && "width" in item && "height" in item) {
      updateBounds(item.center, item.width, item.height);
    } else if ("x" in item && "y" in item) {
      updateBounds({ x: item.x, y: item.y }, 0, 0);
    } else if ("route" in item) {
      updateTraceBounds(item.route);
    }
  }

  const padding = 1; // Reduced padding for tighter boundary
  const circuitWidth = maxX - minX + 2 * padding;
  const circuitHeight = maxY - minY + 2 * padding;

  const svgWidth = 800;
  const svgHeight = 600;

  // Calculate scale factor to fit the circuit within the SVG, maintaining aspect ratio
  const scaleX = svgWidth / circuitWidth;
  const scaleY = svgHeight / circuitHeight;
  const scaleFactor = Math.min(scaleX, scaleY);

  // Calculate centering offsets
  const offsetX = (svgWidth - circuitWidth * scaleFactor) / 2;
  const offsetY = (svgHeight - circuitHeight * scaleFactor) / 2;

  const transform = compose(
    translate(offsetX - minX * scaleFactor + padding * scaleFactor, svgHeight - offsetY + minY * scaleFactor - padding * scaleFactor),
    scale(scaleFactor, -scaleFactor)  // Flip in y-direction
  );

  // Process PCB elements
  for (const item of soup) {
    if (item.type === "pcb_component") {
      svgContent.push(createPcbComponent(item, transform));
    } else if (item.type === "pcb_trace") {
      svgContent.push(createPcbTrace(item, transform));
    } else if (item.type === "pcb_plated_hole" || item.type === "pcb_smtpad") {
      svgContent.push(createPcbHole(item, transform));
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
      <style>
        .pcb-board { fill: #000; }
        .pcb-trace { stroke: #FF0000; stroke-width: 0.3; fill: none; }
        .pcb-hole { fill: #FF00FF; }
        .pcb-pad { fill: #FF0000; }
        .pcb-boundary { fill: none; stroke: #FFFFFF; stroke-width: 0.5; }
      </style>
      <rect class="pcb-board" x="0" y="0" width="${svgWidth}" height="${svgHeight}" />
      ${svgContent.join("\n")}
      ${createPcbBoundary(transform, minX, minY, maxX, maxY)}
    </svg>
  `;

  function updateBounds(center: any, width: any, height: any) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    minX = Math.min(minX, center.x - halfWidth);
    minY = Math.min(minY, center.y - halfHeight);
    maxX = Math.max(maxX, center.x + halfWidth);
    maxY = Math.max(maxY, center.y + halfHeight);
  }

  function updateTraceBounds(route: any[]) {
    for (const point of route) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
}

function createPcbComponent(component: any, transform: any): string {
  const { center, width, height, rotation = 0 } = component;
  const [x, y] = applyToPoint(transform, [center.x, center.y]);
  const scaledWidth = width * Math.abs(transform.a);
  const scaledHeight = height * Math.abs(transform.d);
  const transformStr = `translate(${x}, ${y}) rotate(${-rotation}) scale(1, -1)`; // Note the scale(1, -1) to flip the component
  return `
    <g transform="${transformStr}">
      <rect class="pcb-component" x="${-scaledWidth / 2}" y="${-scaledHeight / 2}" width="${scaledWidth}" height="${scaledHeight}" />
      <rect class="pcb-component-outline" x="${-scaledWidth / 2}" y="${-scaledHeight / 2}" width="${scaledWidth}" height="${scaledHeight}" />
    </g>
  `;
}

function createPcbHole(hole: any, transform: any): string {
  const [x, y] = applyToPoint(transform, [hole.x, hole.y]);
  if (hole.type === "pcb_plated_hole") {
    const scaledRadius = (hole.outer_diameter / 2) * Math.abs(transform.a);
    return `<circle class="pcb-hole" cx="${x}" cy="${y}" r="${scaledRadius}" />`;
  }
  if (hole.type === "pcb_smtpad") {
    const scaledWidth = hole.width * Math.abs(transform.a);
    const scaledHeight = hole.height * Math.abs(transform.d);
    return `<rect class="pcb-pad" x="${x - scaledWidth / 2}" y="${y - scaledHeight / 2}" width="${scaledWidth}" height="${scaledHeight}" />`;
  }
  return "";
}

function createPcbTrace(trace: any, transform: any): string {
  if (!trace.route || !Array.isArray(trace.route)) return "";
  const path = trace.route
    .map((point: any, index: number) => {
      const [x, y] = applyToPoint(transform, [point.x, point.y]);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");
  return `<path class="pcb-trace" d="${path}" />`;
}

function createPcbBoundary(transform: any, minX: number, minY: number, maxX: number, maxY: number): string {
  const [x1, y1] = applyToPoint(transform, [minX, minY]);
  const [x2, y2] = applyToPoint(transform, [maxX, maxY]);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  return `<rect class="pcb-boundary" x="${x}" y="${y}" width="${width}" height="${height}" />`;
}

export { pcbSoupToSvg };
