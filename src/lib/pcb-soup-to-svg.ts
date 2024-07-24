import type { AnySoupElement } from "@tscircuit/soup";

function pcbSoupToSvg(soup: AnySoupElement[]): string {
    const svgContent: string[] = [];
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
  
    // Process PCB board
    const board = soup.find((item) => item.type === "pcb_board");
    if (board && "center" in board && "width" in board && "height" in board) {
      updateBounds(board.center, board.width, board.height);
    }
  
    // Process PCB components
    for (const component of soup.filter((item) => item.type === "pcb_component")) {
        if ("center" in component && "width" in component && "height" in component) {
            updateBounds((component as { center: { x: number; y: number }; width: number; height: number }).center, component.width, component.height);
            svgContent.push(createPcbComponent(component));
          }
    }
  
    // Process PCB traces
    for (const trace of soup.filter((item) => item.type === "pcb_trace")) {
      svgContent.push(createPcbTrace(trace));
      if ('route' in trace) {
        updateTraceBounds(trace.route);
      }
    }
  
    // Process PCB plated holes and SMT pads
    for (const item of soup.filter((i) => i.type === "pcb_plated_hole" || i.type === "pcb_smtpad")) {
        if ('x' in item && 'y' in item && ('outer_diameter' in item || ('width' in item && 'height' in item))) {
            const diameter = 'outer_diameter' in item ? item.outer_diameter : item.width;
            const height = 'outer_diameter' in item ? item.outer_diameter : item.height;
            updateBounds({ x: item.x, y: item.y }, diameter, height);
            svgContent.push(createPcbHole(item));
        }
    }
  
    const padding = 5;
    const width = maxX - minX + 2 * padding;
    const height = maxY - minY + 2 * padding;
    const viewBox = `${minX - padding} ${-maxY - padding} ${width} ${height}`;
  
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="800" height="600">
      <style>
        .pcb-board { fill: #000; }
        .pcb-trace { stroke: #CC0000; stroke-width: 0.1; fill: none; }
        .pcb-hole { fill: #FF00FF; }
        .pcb-pad { fill: #CC0000; }
        .pcb-outline { fill: none; stroke: white; stroke-width: 0.1; }
      </style>
        <g transform="scale(1, -1)">
          <rect class="pcb-board" x="${minX - padding}" y="${minY - padding}" width="${width}" height="${height}" />
          ${svgContent.join("\n")}
          <rect class="pcb-outline" x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" />
        </g>
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
  
  function createPcbComponent(component: any): string {
    const { center, width, height, rotation = 0 } = component;
    const transform = `translate(${center.x}, ${center.y}) rotate(${-rotation})`;
    return `
      <g transform="${transform}">
        <rect class="pcb-component" x="${-width/2}" y="${-height/2}" width="${width}" height="${height}" />
        <rect class="pcb-component-outline" x="${-width/2}" y="${-height/2}" width="${width}" height="${height}" />
      </g>
    `;
  }
  
  function createPcbTrace(trace: any): string {
    const path = trace.route.map((point: any, index: number) => {
      return index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`;
    }).join(" ");
    return `<path class="pcb-trace" d="${path}" />`;
  }
  
  function createPcbHole(hole: any): string {
    if (hole.type === "pcb_plated_hole") {
      return `<circle class="pcb-hole" cx="${hole.x}" cy="${hole.y}" r="${hole.outer_diameter / 2}" />`;
    }
      return `<rect class="pcb-pad" x="${hole.x - hole.width/2}" y="${hole.y - hole.height/2}" width="${hole.width}" height="${hole.height}" />`;
  }


export { pcbSoupToSvg };

