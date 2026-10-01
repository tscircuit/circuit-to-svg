// lib/pcb/create-x-ray-svg-objects.ts
var copperTypes = /* @__PURE__ */ new Set([
  "pcb_trace",
  "pcb_smtpad",
  "pcb_via",
  "pcb_plated_hole",
  "pcb_copper_pour",
  "pcb_copper_text"
]);
var group = (attributes, children) => ({
  name: "g",
  type: "element",
  value: "",
  attributes,
  children
});
function selectGeometry(objects, drills) {
  return objects.flatMap((object) => {
    if (object.children.length) {
      const children = selectGeometry(object.children, drills);
      return children.length ? [{ ...object, children }] : [];
    }
    const isDrill = object.attributes["data-pcb-layer"] === "drill";
    return isDrill === drills ? [object] : [];
  });
}
function opaque(object) {
  const attributes = { ...object.attributes };
  for (const key of ["opacity", "fill-opacity", "stroke-opacity"])
    if (key in attributes) attributes[key] = "1";
  return { ...object, attributes, children: object.children.map(opaque) };
}
function blacken(object) {
  return {
    ...object,
    attributes: {
      ...object.attributes,
      ...object.attributes.fill && object.attributes.fill !== "none" ? { fill: "black" } : {},
      ...object.attributes.stroke && object.attributes.stroke !== "none" ? { stroke: "black" } : {}
    },
    children: object.children.map(blacken)
  };
}
function createXRaySvgObjects({
  circuitJson,
  ctx,
  selectedIds,
  hiddenOpacity,
  width,
  height,
  create
}) {
  const selected = new Set(selectedIds);
  const id = (element) => element[`${element.type}_id`];
  const layers = /* @__PURE__ */ new Set(["top", "bottom"]);
  for (const element of circuitJson) {
    if (element.type === "pcb_board")
      for (let i = 1; i <= (element.num_layers ?? 2) - 2; i++)
        layers.add(`inner${i}`);
    if ("layer" in element && typeof element.layer === "string" && /^(top|bottom|inner\d+)$/.test(element.layer))
      layers.add(element.layer);
    if ("layers" in element && Array.isArray(element.layers)) {
      for (const layer of element.layers)
        if (/^(top|bottom|inner\d+)$/.test(layer)) layers.add(layer);
    }
    if (element.type === "pcb_trace") {
      for (const point of element.route)
        if (point.route_type === "wire") layers.add(point.layer);
    }
  }
  const front = ctx.layer ?? "top";
  const rank = (layer) => layer === front ? 100 : layer === "bottom" ? 0 : layer === "top" ? 50 : 40 - Number(layer.slice(5));
  const orderedLayers = [...layers].sort((a, b) => rank(a) - rank(b));
  const baseContext = {
    ...ctx,
    showSolderMask: false,
    showSolderPaste: false,
    showPinNumbers: false,
    showAnchorOffsets: false,
    // X-Ray exposes trace geometry even where ordinary rendering merges it into a pour.
    circuitJson: circuitJson.filter((el) => el.type !== "pcb_copper_pour")
  };
  const background = [];
  const foreground = [];
  const selectedDrills = [];
  const defs = [];
  for (const layer of orderedLayers) {
    const context = {
      ...baseContext,
      layer,
      // Existing via geometry uses top copper unless soldermask is enabled.
      colorMap: {
        ...ctx.colorMap,
        copper: { ...ctx.colorMap.copper, top: ctx.colorMap.copper[layer] }
      }
    };
    const ordinary = [];
    const inspected = [];
    const holes = [];
    for (const element of circuitJson) {
      if (element.type === "pcb_hole" || element.type === "pcb_cutout") {
        holes.push(...create(element, context).map(blacken));
        continue;
      }
      if (!copperTypes.has(element.type)) continue;
      if ("layer" in element && element.layer !== layer) continue;
      if ((element.type === "pcb_via" || element.type === "pcb_plated_hole") && !element.layers.includes(layer))
        continue;
      const input = element.type === "pcb_plated_hole" ? { ...element, layers: [layer] } : element;
      const drawable = input.type === "pcb_trace" ? {
        ...input,
        route: input.route.map((point) => {
          const { is_inside_copper_pour, copper_pour_id, ...geometry } = point;
          return geometry;
        })
      } : input;
      const objects = create(drawable, context).map(opaque);
      const drills = selectGeometry(objects, true);
      holes.push(...drills.map(blacken));
      ordinary.push(...selectGeometry(objects, false));
      if (selected.has(id(element))) {
        inspected.push(...selectGeometry(objects, false));
        if (layer === orderedLayers.filter(
          (candidate) => !("layers" in element) || !Array.isArray(element.layers) || element.layers.includes(candidate)
        ).at(-1))
          selectedDrills.push(...drills);
      }
    }
    const maskId = `xray-holes-${layer}`;
    defs.push({
      name: "mask",
      type: "element",
      value: "",
      attributes: {
        id: maskId,
        maskUnits: "userSpaceOnUse",
        x: "0",
        y: "0",
        width: String(width),
        height: String(height)
      },
      children: [
        {
          name: "rect",
          type: "element",
          value: "",
          children: [],
          attributes: {
            x: "0",
            y: "0",
            width: String(width),
            height: String(height),
            fill: "white"
          }
        },
        ...holes
      ]
    });
    const attrs = { "data-pcb-layer": layer, mask: `url(#${maskId})` };
    background.push(
      group({ ...attrs, opacity: String(hiddenOpacity) }, ordinary)
    );
    foreground.push(group(attrs, inspected));
  }
  return [
    {
      name: "defs",
      type: "element",
      value: "",
      attributes: {},
      children: defs
    },
    group({ "data-x-ray": "background" }, background),
    group({ "data-x-ray": "selected" }, foreground),
    group({ "data-x-ray": "drills" }, selectedDrills)
  ];
}

// lib/utils/stringify-svg.ts
import base64Font from "@tscircuit/alphabet/base64font";
import { stringify } from "svgson";
var ALPHABET_FONT_FAMILY = "TscircuitAlphabet";
var FONT_STYLE_ATTRIBUTE = "data-tscircuit-alphabet-font";
function stringifySvg(svg) {
  const withoutEmbeddedFont = (node) => ({
    ...node,
    children: (node.children ?? []).filter((child) => !(FONT_STYLE_ATTRIBUTE in (child.attributes ?? {}))).map(withoutEmbeddedFont)
  });
  const root = withoutEmbeddedFont(svg);
  root.children.push({
    name: "style",
    type: "element",
    value: "",
    attributes: { [FONT_STYLE_ATTRIBUTE]: "", type: "text/css" },
    children: [
      {
        name: "",
        type: "text",
        value: `@font-face { font-family: '${ALPHABET_FONT_FAMILY}'; src: url('data:font/ttf;base64,${base64Font}') format('truetype'); font-weight: normal; font-style: normal; }`,
        attributes: {},
        children: []
      }
    ]
  });
  return stringify(root);
}

// lib/pcb/convert-circuit-json-to-pcb-svg.ts
import "circuit-json";
import "svgson";
import {
  applyToPoint as applyToPoint48,
  compose as compose7,
  scale as scale3,
  translate as translate7
} from "transformation-matrix";

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-trace-error.ts
import { applyToPoint } from "transformation-matrix";
function createSvgObjectsFromPcbTraceError(pcbTraceError, circuitJson, ctx) {
  const { transform, shouldDrawErrors } = ctx;
  if (!shouldDrawErrors) return [];
  const { pcb_port_ids } = pcbTraceError;
  const port1 = circuitJson.find(
    (el) => el.type === "pcb_port" && el.pcb_port_id === pcb_port_ids?.[0]
  );
  const port2 = circuitJson.find(
    (el) => el.type === "pcb_port" && el.pcb_port_id === pcb_port_ids?.[1]
  );
  if (!port1 || !port2) {
    const viaIdMatch = pcbTraceError.message?.match(
      /pcb_via\[#?(pcb_via_\d+)\]/
    );
    const viaId = viaIdMatch?.[1];
    const via = circuitJson.find(
      (el) => el.type === "pcb_via" && el.pcb_via_id === viaId
    );
    if (via && via.type === "pcb_via") {
      return createSvgObjectsForViaTraceError(pcbTraceError, via, ctx);
    }
    if (pcbTraceError.center) {
      const screenCenter = applyToPoint(transform, {
        x: pcbTraceError.center.x,
        y: pcbTraceError.center.y
      });
      return annotateTraceErrorSvgObjects([
        {
          name: "rect",
          type: "element",
          attributes: {
            x: (screenCenter.x - 5).toString(),
            y: (screenCenter.y - 5).toString(),
            width: "10",
            height: "10",
            fill: "red",
            transform: `rotate(45 ${screenCenter.x} ${screenCenter.y})`
          },
          children: [],
          value: ""
        },
        {
          name: "text",
          type: "element",
          attributes: {
            x: screenCenter.x.toString(),
            y: (screenCenter.y - 15).toString(),
            fill: "red",
            "font-family": "sans-serif",
            "font-size": "12",
            "text-anchor": "middle"
          },
          children: [
            {
              type: "text",
              value: pcbTraceError.message || "Pcb Trace Error",
              name: "",
              attributes: {},
              children: []
            }
          ],
          value: ""
        }
      ]);
    } else return [];
  }
  const screenPort1 = applyToPoint(transform, {
    x: port1.x,
    y: port1.y
  });
  const screenPort2 = applyToPoint(transform, {
    x: port2.x,
    y: port2.y
  });
  const errorCenter = {
    x: (screenPort1.x + screenPort2.x) / 2,
    y: (screenPort1.y + screenPort2.y) / 2
  };
  if (isNaN(screenPort1.x) || isNaN(screenPort1.y) || isNaN(screenPort2.x) || isNaN(screenPort2.y) || isNaN(errorCenter.x) || isNaN(errorCenter.y)) {
    return [];
  }
  const svgObjects = [
    {
      name: "line",
      type: "element",
      attributes: {
        x1: screenPort1.x.toString(),
        y1: screenPort1.y.toString(),
        x2: errorCenter.x.toString(),
        y2: errorCenter.y.toString(),
        stroke: "red",
        "stroke-width": "1.5",
        "stroke-dasharray": "2,2"
      },
      children: [],
      value: ""
    },
    {
      name: "line",
      type: "element",
      attributes: {
        x1: errorCenter.x.toString(),
        y1: errorCenter.y.toString(),
        x2: screenPort2.x.toString(),
        y2: screenPort2.y.toString(),
        stroke: "red",
        "stroke-width": "1.5",
        "stroke-dasharray": "2,2"
      },
      children: [],
      value: ""
    },
    {
      name: "rect",
      type: "element",
      attributes: {
        x: (errorCenter.x - 5).toString(),
        y: (errorCenter.y - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${errorCenter.x} ${errorCenter.y})`
      },
      children: [],
      value: ""
    },
    {
      name: "text",
      type: "element",
      attributes: {
        x: errorCenter.x.toString(),
        y: (errorCenter.y - 15).toString(),
        fill: "red",
        "font-family": "sans-serif",
        "font-size": "12",
        "text-anchor": "middle"
      },
      children: [
        {
          type: "text",
          value: pcbTraceError.message || "Pcb Trace Error",
          name: "",
          attributes: {},
          children: []
        }
      ],
      value: ""
    }
  ];
  return annotateTraceErrorSvgObjects(svgObjects);
}
function createSvgObjectsForViaTraceError(pcbTraceError, via, ctx) {
  const { transform } = ctx;
  if (pcbTraceError.center && via) {
    const screenCenter = applyToPoint(transform, {
      x: pcbTraceError.center.x,
      y: pcbTraceError.center.y
    });
    const screenVia = applyToPoint(transform, {
      x: via.x,
      y: via.y
    });
    const dx = screenVia.x - screenCenter.x;
    const dy = screenVia.y - screenCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const margin = 10;
    const boxWidth = dist + margin * 2;
    const boxHeight = 20;
    const midX = (screenCenter.x + screenVia.x) / 2;
    const midY = (screenCenter.y + screenVia.y) / 2;
    return annotateTraceErrorSvgObjects([
      // Rotated bounding box
      {
        name: "rect",
        type: "element",
        attributes: {
          x: (midX - boxWidth / 2).toString(),
          y: (midY - boxHeight / 2).toString(),
          width: boxWidth.toString(),
          height: boxHeight.toString(),
          fill: "none",
          stroke: "red",
          "stroke-width": "1",
          "stroke-dasharray": "3,2",
          transform: `rotate(${angle} ${midX} ${midY})`
        },
        children: [],
        value: ""
      },
      // Error diamond
      {
        name: "rect",
        type: "element",
        attributes: {
          x: (midX - 5).toString(),
          y: (midY - 5).toString(),
          width: "10",
          height: "10",
          fill: "red",
          transform: `rotate(45 ${midX} ${midY})`
        },
        children: [],
        value: ""
      },
      // Error label
      {
        name: "text",
        type: "element",
        attributes: {
          x: midX.toString(),
          y: (midY - boxHeight / 2 - 5).toString(),
          fill: "red",
          "font-family": "sans-serif",
          "font-size": "12",
          "text-anchor": "middle"
        },
        children: [
          {
            type: "text",
            value: pcbTraceError.message || "Pcb Trace Error",
            name: "",
            attributes: {},
            children: []
          }
        ],
        value: ""
      }
    ]);
  }
  return [];
}
function annotateTraceErrorSvgObjects(objects) {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...object.attributes ?? {},
      "data-type": object.attributes?.["data-type"] ?? "pcb_trace_error",
      "data-pcb-layer": object.attributes?.["data-pcb-layer"] ?? "overlay"
    },
    children: (object.children ?? []).map((child) => {
      if (child?.type === "element") {
        return {
          ...child,
          attributes: {
            ...child.attributes ?? {},
            "data-type": child.attributes?.["data-type"] ?? "pcb_trace_error",
            "data-pcb-layer": child.attributes?.["data-pcb-layer"] ?? "overlay"
          }
        };
      }
      return child;
    })
  }));
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-footprint-overlap-error.ts
import { applyToPoint as applyToPoint2 } from "transformation-matrix";
function annotateFootprintErrorSvgObjects(objects) {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...object.attributes ?? {},
      "data-type": object.attributes?.["data-type"] ?? "pcb_footprint_overlap_error",
      "data-pcb-layer": object.attributes?.["data-pcb-layer"] ?? "overlay"
    },
    children: (object.children ?? []).map((child) => {
      if (child?.type === "element") {
        return {
          ...child,
          attributes: {
            ...child.attributes ?? {},
            "data-type": child.attributes?.["data-type"] ?? "pcb_footprint_overlap_error",
            "data-pcb-layer": child.attributes?.["data-pcb-layer"] ?? "overlay"
          }
        };
      }
      return child;
    })
  }));
}
function createSvgObjectsFromPcbFootprintOverlapError(error, circuitJson, ctx) {
  const { transform, shouldDrawErrors } = ctx;
  if (!shouldDrawErrors) return [];
  const svgObjects = [];
  const referencedElements = [];
  let padPortIds = [];
  if (error.pcb_smtpad_ids) {
    for (const padId of error.pcb_smtpad_ids) {
      const pad = circuitJson.find(
        (el) => el.type === "pcb_smtpad" && el.pcb_smtpad_id === padId
      );
      if (pad) {
        referencedElements.push({
          x: pad.x,
          y: pad.y,
          type: "pcb_smtpad",
          id: padId,
          pcb_port_id: pad.pcb_port_id
        });
        if (pad.pcb_port_id) padPortIds.push(pad.pcb_port_id);
      }
    }
  }
  const allPadsSamePort = padPortIds.length > 1 && padPortIds.every((id) => id === padPortIds[0]);
  let filteredReferencedElements = referencedElements;
  if (allPadsSamePort) {
    filteredReferencedElements = referencedElements.filter(
      (e) => e.type !== "pcb_smtpad"
    );
  }
  if (error.pcb_plated_hole_ids) {
    for (const holeId of error.pcb_plated_hole_ids) {
      const hole = circuitJson.find(
        (el) => el.type === "pcb_plated_hole" && el.pcb_plated_hole_id === holeId
      );
      if (hole) {
        filteredReferencedElements.push({
          x: hole.x,
          y: hole.y,
          type: "pcb_plated_hole",
          id: holeId
        });
      }
    }
  }
  if (error.pcb_hole_ids) {
    for (const holeId of error.pcb_hole_ids) {
      const hole = circuitJson.find(
        (el) => el.type === "pcb_hole" && el.pcb_hole_id === holeId
      );
      if (hole) {
        filteredReferencedElements.push({
          x: hole.x,
          y: hole.y,
          type: "pcb_hole",
          id: holeId
        });
      }
    }
  }
  if (filteredReferencedElements.length > 0) {
    const centerX = filteredReferencedElements.reduce((sum, el) => sum + el.x, 0) / filteredReferencedElements.length;
    const centerY = filteredReferencedElements.reduce((sum, el) => sum + el.y, 0) / filteredReferencedElements.length;
    const screenCenter = applyToPoint2(transform, { x: centerX, y: centerY });
    svgObjects.push({
      name: "rect",
      type: "element",
      attributes: {
        x: (screenCenter.x - 5).toString(),
        y: (screenCenter.y - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${screenCenter.x} ${screenCenter.y})`
      },
      children: [],
      value: ""
    });
    svgObjects.push({
      name: "text",
      type: "element",
      attributes: {
        x: screenCenter.x.toString(),
        y: (screenCenter.y - 15).toString(),
        fill: "red",
        "font-family": "sans-serif",
        "font-size": "12",
        "text-anchor": "middle"
      },
      children: [
        {
          type: "text",
          value: error.message || "PCB Footprint Overlap Error",
          name: "",
          attributes: {},
          children: []
        }
      ],
      value: ""
    });
    for (const element of filteredReferencedElements) {
      const screenPos = applyToPoint2(transform, { x: element.x, y: element.y });
      svgObjects.push({
        name: "rect",
        type: "element",
        attributes: {
          x: (screenPos.x - 5).toString(),
          y: (screenPos.y - 5).toString(),
          width: "10",
          height: "10",
          fill: "red",
          transform: `rotate(45 ${screenPos.x} ${screenPos.y})`
        },
        children: [],
        value: ""
      });
      if (filteredReferencedElements.length > 1) {
        svgObjects.push({
          name: "line",
          type: "element",
          attributes: {
            x1: screenCenter.x.toString(),
            y1: screenCenter.y.toString(),
            x2: screenPos.x.toString(),
            y2: screenPos.y.toString(),
            stroke: "red",
            "stroke-width": "1.5",
            "stroke-dasharray": "2,2"
          },
          children: [],
          value: ""
        });
      }
    }
  }
  return annotateFootprintErrorSvgObjects(svgObjects);
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-courtyard-overlap-error.ts
import { applyToPoint as applyToPoint3 } from "transformation-matrix";
function createSvgObjectsFromPcbCourtyardOverlapError(error, circuitJson, ctx) {
  const { transform, shouldDrawErrors } = ctx;
  if (!shouldDrawErrors) return [];
  const svgObjects = [];
  const componentCenters = [];
  for (const compId of error.pcb_component_ids) {
    const comp = circuitJson.find(
      (el) => el.type === "pcb_component" && el.pcb_component_id === compId
    );
    if (comp) {
      componentCenters.push(comp.center);
    }
  }
  if (componentCenters.length === 0) return [];
  const midX = componentCenters.reduce((s, c) => s + c.x, 0) / componentCenters.length;
  const midY = componentCenters.reduce((s, c) => s + c.y, 0) / componentCenters.length;
  const screenMid = applyToPoint3(transform, { x: midX, y: midY });
  svgObjects.push({
    name: "rect",
    type: "element",
    attributes: {
      x: (screenMid.x - 5).toString(),
      y: (screenMid.y - 5).toString(),
      width: "10",
      height: "10",
      fill: "red",
      transform: `rotate(45 ${screenMid.x} ${screenMid.y})`,
      "data-type": "pcb_courtyard_overlap_error",
      "data-pcb-layer": "overlay"
    },
    children: [],
    value: ""
  });
  svgObjects.push({
    name: "text",
    type: "element",
    attributes: {
      x: screenMid.x.toString(),
      y: (screenMid.y - 15).toString(),
      fill: "red",
      "font-family": "sans-serif",
      "font-size": "12",
      "text-anchor": "middle",
      "data-type": "pcb_courtyard_overlap_error",
      "data-pcb-layer": "overlay"
    },
    children: [
      {
        type: "text",
        value: error.message || "PCB Courtyard Overlap",
        name: "",
        attributes: {},
        children: []
      }
    ],
    value: ""
  });
  for (const center of componentCenters) {
    const screenPos = applyToPoint3(transform, center);
    svgObjects.push({
      name: "rect",
      type: "element",
      attributes: {
        x: (screenPos.x - 5).toString(),
        y: (screenPos.y - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${screenPos.x} ${screenPos.y})`,
        "data-type": "pcb_courtyard_overlap_error",
        "data-pcb-layer": "overlay"
      },
      children: [],
      value: ""
    });
  }
  if (componentCenters.length === 2) {
    const mapped = componentCenters.map((c) => applyToPoint3(transform, c));
    const s1 = mapped[0];
    const s2 = mapped[1];
    svgObjects.push({
      name: "line",
      type: "element",
      attributes: {
        x1: s1.x.toString(),
        y1: s1.y.toString(),
        x2: s2.x.toString(),
        y2: s2.y.toString(),
        stroke: "red",
        "stroke-width": "1.5",
        "stroke-dasharray": "4,3",
        "data-type": "pcb_courtyard_overlap_error",
        "data-pcb-layer": "overlay"
      },
      children: [],
      value: ""
    });
  }
  return svgObjects;
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-component-outside-board-error.ts
import { applyToPoint as applyToPoint4 } from "transformation-matrix";
function annotateError(objects) {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...object.attributes ?? {},
      "data-type": object.attributes?.["data-type"] ?? "pcb_component_outside_board_error",
      "data-pcb-layer": object.attributes?.["data-pcb-layer"] ?? "overlay"
    }
  }));
}
function getComponentBounds(error, circuitJson) {
  const pcbComponentId = error.pcb_component_id;
  if (!pcbComponentId) return error.component_bounds ?? null;
  const pcbComponent = circuitJson.find(
    (elm) => elm.type === "pcb_component" && elm.pcb_component_id === pcbComponentId
  );
  if (pcbComponent?.center && pcbComponent?.width && pcbComponent?.height) {
    return {
      min_x: pcbComponent.center.x - pcbComponent.width / 2,
      max_x: pcbComponent.center.x + pcbComponent.width / 2,
      min_y: pcbComponent.center.y - pcbComponent.height / 2,
      max_y: pcbComponent.center.y + pcbComponent.height / 2
    };
  }
  return error.component_bounds ?? null;
}
function createSvgObjectsFromPcbComponentOutsideBoardError(error, circuitJson, ctx) {
  const { shouldDrawErrors, transform } = ctx;
  if (!shouldDrawErrors) return [];
  const bounds = getComponentBounds(error, circuitJson);
  if (!bounds) return [];
  const topLeft = applyToPoint4(transform, { x: bounds.min_x, y: bounds.min_y });
  const bottomRight = applyToPoint4(transform, {
    x: bounds.max_x,
    y: bounds.max_y
  });
  const x = Math.min(topLeft.x, bottomRight.x);
  const y = Math.min(topLeft.y, bottomRight.y);
  const width = Math.abs(bottomRight.x - topLeft.x);
  const height = Math.abs(bottomRight.y - topLeft.y);
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const svgObjects = [
    {
      type: "element",
      name: "rect",
      value: "",
      attributes: {
        x: x.toString(),
        y: y.toString(),
        width: width.toString(),
        height: height.toString(),
        fill: "none",
        stroke: "red",
        "stroke-width": "1.5",
        "stroke-dasharray": "4,2"
      },
      children: []
    },
    {
      type: "element",
      name: "rect",
      value: "",
      attributes: {
        x: (centerX - 5).toString(),
        y: (centerY - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${centerX} ${centerY})`
      },
      children: []
    },
    {
      type: "element",
      name: "text",
      value: "",
      attributes: {
        x: centerX.toString(),
        y: (y - 10).toString(),
        fill: "red",
        "font-family": "sans-serif",
        "font-size": "12",
        "text-anchor": "middle"
      },
      children: [
        {
          type: "text",
          name: "",
          value: error.message ?? "PCB component extends outside board boundaries",
          attributes: {},
          children: []
        }
      ]
    }
  ];
  return annotateError(svgObjects);
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-trace-clearance-error.ts
import { applyToPoint as applyToPoint5 } from "transformation-matrix";
function isFinitePoint(point) {
  return point !== void 0 && typeof point.x === "number" && Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y);
}
function findObstacle(error, circuitJson) {
  if (error.type === "pcb_via_trace_clearance_error") {
    return circuitJson.find(
      (element) => element.type === "pcb_via" && element.pcb_via_id === error.pcb_via_id
    );
  }
  return circuitJson.find(
    (element) => element.type === "pcb_smtpad" && element.pcb_smtpad_id === error.pcb_pad_id || element.type === "pcb_plated_hole" && element.pcb_plated_hole_id === error.pcb_pad_id
  );
}
function getObstacleCenter(obstacle) {
  if (!obstacle) return void 0;
  if ("x" in obstacle && "y" in obstacle && isFinitePoint(obstacle)) {
    return { x: obstacle.x, y: obstacle.y };
  }
  if (obstacle.type === "pcb_smtpad" && obstacle.shape === "polygon" && obstacle.points.length > 0) {
    const points = obstacle.points.filter(isFinitePoint);
    if (points.length === 0) return void 0;
    const xValues = points.map((point) => point.x);
    const yValues = points.map((point) => point.y);
    return {
      x: (Math.min(...xValues) + Math.max(...xValues)) / 2,
      y: (Math.min(...yValues) + Math.max(...yValues)) / 2
    };
  }
  return void 0;
}
function getRoutePointPositions(point) {
  if (point.route_type === "through_pad") {
    return [point.start, point.end].filter(isFinitePoint);
  }
  const position = point;
  return isFinitePoint(position) ? [{ x: position.x, y: position.y }] : [];
}
function getTraceEndpoints(trace) {
  if (!trace) return void 0;
  let start;
  let end;
  for (const routePoint of trace.route) {
    const positions = getRoutePointPositions(routePoint);
    if (!start && positions[0]) start = positions[0];
    if (positions.length > 0) end = positions[positions.length - 1];
  }
  return start && end ? { start, end } : void 0;
}
function midpoint(pointA, pointB) {
  return {
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2
  };
}
function createDashedReferenceLine(referencePoint, errorCenter, referenceType) {
  const dx = referencePoint.x - errorCenter.x;
  const dy = referencePoint.y - errorCenter.y;
  if (dx * dx + dy * dy < 0.25) return void 0;
  return {
    type: "element",
    name: "line",
    value: "",
    attributes: {
      x1: referencePoint.x.toString(),
      y1: referencePoint.y.toString(),
      x2: errorCenter.x.toString(),
      y2: errorCenter.y.toString(),
      stroke: "red",
      "stroke-width": "1.5",
      "stroke-dasharray": "2,2",
      "data-error-reference": referenceType
    },
    children: []
  };
}
function annotateError2(objects, errorType) {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...object.attributes ?? {},
      "data-type": object.attributes?.["data-type"] ?? errorType,
      "data-pcb-layer": object.attributes?.["data-pcb-layer"] ?? "overlay"
    }
  }));
}
function createSvgObjectsFromPcbTraceClearanceError(error, circuitJson, ctx) {
  const { shouldDrawErrors, transform } = ctx;
  if (!shouldDrawErrors) return [];
  const obstacleCenter = getObstacleCenter(findObstacle(error, circuitJson));
  const trace = circuitJson.find(
    (element) => element.type === "pcb_trace" && element.pcb_trace_id === error.pcb_trace_id
  );
  const traceEndpoints = getTraceEndpoints(trace);
  const worldErrorCenter = isFinitePoint(error.center) ? error.center : obstacleCenter ?? (traceEndpoints ? midpoint(traceEndpoints.start, traceEndpoints.end) : void 0);
  if (!worldErrorCenter) return [];
  const screenErrorCenter = applyToPoint5(
    transform,
    worldErrorCenter
  );
  const screenObstacleCenter = obstacleCenter ? applyToPoint5(transform, obstacleCenter) : void 0;
  const screenTraceEndpoints = traceEndpoints ? {
    start: applyToPoint5(
      transform,
      traceEndpoints.start
    ),
    end: applyToPoint5(transform, traceEndpoints.end)
  } : void 0;
  const referenceLines = [
    screenTraceEndpoints ? createDashedReferenceLine(
      screenTraceEndpoints.start,
      screenErrorCenter,
      "trace-start"
    ) : void 0,
    screenTraceEndpoints ? createDashedReferenceLine(
      screenTraceEndpoints.end,
      screenErrorCenter,
      "trace-end"
    ) : void 0,
    screenObstacleCenter ? createDashedReferenceLine(
      screenObstacleCenter,
      screenErrorCenter,
      "obstacle"
    ) : void 0
  ].filter((object) => object !== void 0);
  const errorSubject = error.type === "pcb_pad_trace_clearance_error" ? "Pad/trace" : "Via/trace";
  const actualClearance = error.actual_clearance;
  const minimumClearance = error.minimum_clearance;
  const defaultMessage = actualClearance !== void 0 && minimumClearance !== void 0 ? `${errorSubject} clearance ${actualClearance} is below minimum ${minimumClearance}` : error.type === "pcb_pad_trace_clearance_error" ? "Pad and trace too close" : "Via and trace too close";
  const message = error.message ?? defaultMessage;
  const svgObjects = [
    ...referenceLines,
    {
      type: "element",
      name: "rect",
      value: "",
      attributes: {
        x: (screenErrorCenter.x - 5).toString(),
        y: (screenErrorCenter.y - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${screenErrorCenter.x} ${screenErrorCenter.y})`
      },
      children: []
    },
    {
      type: "element",
      name: "text",
      value: "",
      attributes: {
        x: screenErrorCenter.x.toString(),
        y: (screenErrorCenter.y - 15).toString(),
        fill: "red",
        "font-family": "sans-serif",
        "font-size": "12",
        "text-anchor": "middle"
      },
      children: [
        {
          type: "text",
          name: "",
          value: message,
          attributes: {},
          children: []
        }
      ]
    }
  ];
  return annotateError2(svgObjects, error.type);
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-fabrication-note-path.ts
import { applyToPoint as applyToPoint6 } from "transformation-matrix";
function createSvgObjectsFromPcbFabricationNotePath(fabNotePath, ctx) {
  const { transform, layer: layerFilter } = ctx;
  if (!fabNotePath.route || !Array.isArray(fabNotePath.route)) return [];
  const firstPoint = fabNotePath.route[0];
  const lastPoint = fabNotePath.route[fabNotePath.route.length - 1];
  const isClosed = firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y;
  const path = fabNotePath.route.slice(0, isClosed ? -1 : void 0).map((point, index) => {
    const [x, y] = applyToPoint6(transform, [point.x, point.y]);
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(" ") + (isClosed ? " Z" : "");
  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-fabrication-note-path",
        stroke: fabNotePath.color || "rgba(255,255,255,0.5)",
        fill: "none",
        d: path,
        "stroke-width": (fabNotePath.stroke_width * Math.abs(transform.a)).toString(),
        "data-pcb-component-id": fabNotePath.pcb_component_id,
        "data-pcb-fabrication-note-path-id": fabNotePath.pcb_fabrication_note_path_id,
        "data-type": "pcb_fabrication_note_path",
        "data-pcb-layer": "overlay"
      },
      value: "",
      children: []
    }
  ];
}

// lib/utils/debug.ts
import Debug from "debug";
var debug = Debug("circuit-to-svg");
var debugPcb = debug.extend("pcb");
var debugSch = debug.extend("sch");

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-fabrication-note-text.ts
import { toString as matrixToString } from "transformation-matrix";
import { applyToPoint as applyToPoint7, compose, rotate, translate } from "transformation-matrix";

// lib/pcb/get-svg-text-anchor-alignment.ts
function getSvgTextAnchorAlignment(anchorAlignment) {
  switch (anchorAlignment) {
    case "top_left":
      return {
        textAnchor: "start",
        dominantBaseline: "text-before-edge"
      };
    case "top_center":
      return {
        textAnchor: "middle",
        dominantBaseline: "text-before-edge"
      };
    case "top_right":
      return {
        textAnchor: "end",
        dominantBaseline: "text-before-edge"
      };
    case "center_left":
      return {
        textAnchor: "start",
        dominantBaseline: "central"
      };
    case "center_right":
      return {
        textAnchor: "end",
        dominantBaseline: "central"
      };
    case "bottom_left":
      return {
        textAnchor: "start",
        dominantBaseline: "text-after-edge"
      };
    case "bottom_center":
      return {
        textAnchor: "middle",
        dominantBaseline: "text-after-edge"
      };
    case "bottom_right":
      return {
        textAnchor: "end",
        dominantBaseline: "text-after-edge"
      };
    case "center":
    default:
      return {
        textAnchor: "middle",
        dominantBaseline: "central"
      };
  }
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-fabrication-note-text.ts
function createSvgObjectsFromPcbFabricationNoteText(pcbFabNoteText, ctx) {
  const { transform, layer: layerFilter } = ctx;
  const {
    anchor_position,
    anchor_alignment = "center",
    text,
    font_size = 1,
    layer = "top",
    color,
    ccw_rotation = 0
  } = pcbFabNoteText;
  if (layerFilter && layer !== layerFilter) return [];
  if (!anchor_position || typeof anchor_position.x !== "number" || typeof anchor_position.y !== "number") {
    debugPcb(
      `[pcb_fabrication_note_text] Invalid anchor_position for "${pcbFabNoteText.pcb_fabrication_note_text_id}": expected {x: number, y: number}, got ${JSON.stringify(anchor_position)}`
    );
    return [];
  }
  const [transformedX, transformedY] = applyToPoint7(transform, [
    anchor_position.x,
    anchor_position.y
  ]);
  const transformedFontSize = font_size * Math.abs(transform.a);
  const { textAnchor, dominantBaseline } = getSvgTextAnchorAlignment(
    anchor_alignment
  );
  const textTransform = compose(
    translate(transformedX, transformedY),
    rotate(-ccw_rotation * Math.PI / 180)
  );
  const svgObject = {
    name: "text",
    type: "element",
    attributes: {
      x: "0",
      y: "0",
      "font-family": ALPHABET_FONT_FAMILY,
      "font-size": transformedFontSize.toString(),
      "text-anchor": textAnchor,
      "dominant-baseline": dominantBaseline,
      transform: matrixToString(textTransform),
      class: "pcb-fabrication-note-text",
      fill: color || "rgba(255,255,255,0.5)",
      "data-type": "pcb_fabrication_note_text",
      "data-pcb-layer": "overlay"
    },
    children: [
      {
        type: "text",
        value: text,
        name: "",
        attributes: {},
        children: []
      }
    ],
    value: ""
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-fabrication-note-rect.ts
import { applyToPoint as applyToPoint8 } from "transformation-matrix";
var DEFAULT_OVERLAY_STROKE_COLOR = "rgba(255,255,255,0.5)";
var DEFAULT_OVERLAY_FILL_COLOR = "rgba(255,255,255,0.2)";
function createSvgObjectsFromPcbFabricationNoteRect(fabricationNoteRect, ctx) {
  const { transform, layer: layerFilter } = ctx;
  const {
    center,
    width,
    height,
    stroke_width,
    is_filled,
    has_stroke,
    is_stroke_dashed,
    color,
    layer = "top",
    pcb_component_id,
    pcb_fabrication_note_rect_id,
    corner_radius
  } = fabricationNoteRect;
  if (layerFilter && layer !== layerFilter) return [];
  if (!center || typeof center.x !== "number" || typeof center.y !== "number" || typeof width !== "number" || typeof height !== "number") {
    debugPcb(
      `[pcb_fabrication_note_rect] Invalid data for "${pcb_fabrication_note_rect_id}": expected center {x: number, y: number}, width: number, height: number, got center=${JSON.stringify(center)}, width=${JSON.stringify(width)}, height=${JSON.stringify(height)}`
    );
    return [];
  }
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const [topLeftX, topLeftY] = applyToPoint8(transform, [
    center.x - halfWidth,
    center.y + halfHeight
  ]);
  const [bottomRightX, bottomRightY] = applyToPoint8(transform, [
    center.x + halfWidth,
    center.y - halfHeight
  ]);
  const rectX = Math.min(topLeftX, bottomRightX);
  const rectY = Math.min(topLeftY, bottomRightY);
  const rectWidth = Math.abs(bottomRightX - topLeftX);
  const rectHeight = Math.abs(bottomRightY - topLeftY);
  const baseStrokeWidth = typeof stroke_width === "number" ? stroke_width : 0;
  const transformedStrokeWidth = baseStrokeWidth * Math.abs(transform.a);
  const overlayStrokeColor = color ?? DEFAULT_OVERLAY_STROKE_COLOR;
  const baseCornerRadius = typeof corner_radius === "number" && corner_radius > 0 ? corner_radius : 0;
  const transformedCornerRadiusX = baseCornerRadius * Math.abs(transform.a);
  const transformedCornerRadiusY = baseCornerRadius * Math.abs(transform.d);
  const attributes = {
    x: rectX.toString(),
    y: rectY.toString(),
    width: rectWidth.toString(),
    height: rectHeight.toString(),
    class: "pcb-fabrication-note-rect",
    "data-type": "pcb_fabrication_note_rect",
    "data-pcb-fabrication-note-rect-id": pcb_fabrication_note_rect_id,
    "data-pcb-layer": "overlay"
  };
  if (pcb_component_id !== void 0) {
    attributes["data-pcb-component-id"] = pcb_component_id;
  }
  if (transformedCornerRadiusX > 0) {
    attributes.rx = transformedCornerRadiusX.toString();
  }
  if (transformedCornerRadiusY > 0) {
    attributes.ry = transformedCornerRadiusY.toString();
  }
  if (is_filled) {
    attributes.fill = color ?? DEFAULT_OVERLAY_FILL_COLOR;
  } else {
    attributes.fill = "none";
  }
  const shouldDrawStroke = has_stroke ?? transformedStrokeWidth > 0;
  if (shouldDrawStroke) {
    attributes.stroke = overlayStrokeColor;
    attributes["stroke-width"] = transformedStrokeWidth.toString();
    if (is_stroke_dashed) {
      const dash = 0.2 * Math.abs(transform.a);
      const gap = 0.1 * Math.abs(transform.a);
      attributes["stroke-dasharray"] = `${dash} ${gap}`;
    }
  } else {
    attributes.stroke = "none";
  }
  const svgObject = {
    name: "rect",
    type: "element",
    value: "",
    attributes,
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-fabrication-note-dimension.ts
import { applyToPoint as applyToPoint9 } from "transformation-matrix";
function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}
var TEXT_OFFSET_MULTIPLIER = 1.5;
var CHARACTER_WIDTH_MULTIPLIER = 0.6;
var TEXT_INTERSECTION_PADDING_MULTIPLIER = 0.3;
function toPath(points) {
  return points.map(
    (point, index) => index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
  ).join(" ");
}
function createSvgObjectsFromPcbFabricationNoteDimension(dimension, ctx) {
  const { transform, layer: layerFilter } = ctx;
  const {
    from,
    to,
    text,
    font_size = 1,
    color,
    arrow_size,
    layer,
    pcb_component_id,
    pcb_fabrication_note_dimension_id,
    offset_distance,
    offset_direction,
    text_ccw_rotation
  } = dimension;
  if (layerFilter && layer && layer !== layerFilter) return [];
  if (!from || !to || typeof from !== "object" || typeof to !== "object") {
    debugPcb(
      `[pcb_fabrication_note_dimension] Invalid endpoints for "${pcb_fabrication_note_dimension_id}": expected {from: {x, y}, to: {x, y}}, got from=${JSON.stringify(from)}, to=${JSON.stringify(to)}`
    );
    return [];
  }
  if (typeof from.x !== "number" || typeof from.y !== "number" || typeof to.x !== "number" || typeof to.y !== "number") {
    debugPcb(
      `[pcb_fabrication_note_dimension] Invalid point values for "${pcb_fabrication_note_dimension_id}": x and y must be numbers, got from=${JSON.stringify(from)}, to=${JSON.stringify(to)}`
    );
    return [];
  }
  const numericArrowSize = typeof arrow_size === "number" ? arrow_size : void 0;
  if (numericArrowSize === void 0 || !Number.isFinite(numericArrowSize) || numericArrowSize <= 0) {
    debugPcb(
      `[pcb_fabrication_note_dimension] Invalid arrow_size for "${pcb_fabrication_note_dimension_id}": expected positive number, got ${JSON.stringify(arrow_size)}`
    );
    return [];
  }
  const arrowSize = numericArrowSize;
  const direction = normalize({ x: to.x - from.x, y: to.y - from.y });
  if (Number.isNaN(direction.x) || Number.isNaN(direction.y)) {
    return [];
  }
  const perpendicular = { x: -direction.y, y: direction.x };
  const hasOffsetDirection = offset_direction && typeof offset_direction.x === "number" && typeof offset_direction.y === "number";
  const normalizedOffsetDirection = hasOffsetDirection ? normalize({ x: offset_direction.x, y: offset_direction.y }) : { x: 0, y: 0 };
  const offsetMagnitude = typeof offset_distance === "number" ? offset_distance : 0;
  const offsetVector = {
    x: normalizedOffsetDirection.x * offsetMagnitude,
    y: normalizedOffsetDirection.y * offsetMagnitude
  };
  const applyOffset = (point) => ({
    x: point.x + offsetVector.x,
    y: point.y + offsetVector.y
  });
  const fromOffset = applyOffset(from);
  const toOffset = applyOffset(to);
  const arrowHalfWidth = arrowSize / 2;
  const fromBase = {
    x: fromOffset.x + direction.x * arrowSize,
    y: fromOffset.y + direction.y * arrowSize
  };
  const toBase = {
    x: toOffset.x - direction.x * arrowSize,
    y: toOffset.y - direction.y * arrowSize
  };
  const fromTriangle = [
    toScreen(fromOffset),
    toScreen({
      x: fromBase.x + perpendicular.x * arrowHalfWidth,
      y: fromBase.y + perpendicular.y * arrowHalfWidth
    }),
    toScreen({
      x: fromBase.x - perpendicular.x * arrowHalfWidth,
      y: fromBase.y - perpendicular.y * arrowHalfWidth
    })
  ];
  const toTriangle = [
    toScreen(toOffset),
    toScreen({
      x: toBase.x + perpendicular.x * arrowHalfWidth,
      y: toBase.y + perpendicular.y * arrowHalfWidth
    }),
    toScreen({
      x: toBase.x - perpendicular.x * arrowHalfWidth,
      y: toBase.y - perpendicular.y * arrowHalfWidth
    })
  ];
  const [lineStartX, lineStartY] = applyToPoint9(transform, [
    fromBase.x,
    fromBase.y
  ]);
  const [lineEndX, lineEndY] = applyToPoint9(transform, [toBase.x, toBase.y]);
  const strokeWidth = arrowSize / 5 * Math.abs(transform.a);
  const lineColor = color || "rgba(255,255,255,0.5)";
  const extensionDirection = hasOffsetDirection && (Math.abs(normalizedOffsetDirection.x) > Number.EPSILON || Math.abs(normalizedOffsetDirection.y) > Number.EPSILON) ? normalizedOffsetDirection : perpendicular;
  const extensionLength = offsetMagnitude + arrowSize;
  const createExtensionLine = (anchor) => {
    const endPoint = {
      x: anchor.x + extensionDirection.x * extensionLength,
      y: anchor.y + extensionDirection.y * extensionLength
    };
    const [startX, startY] = applyToPoint9(transform, [anchor.x, anchor.y]);
    const [endX, endY] = applyToPoint9(transform, [endPoint.x, endPoint.y]);
    return {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `M ${startX} ${startY} L ${endX} ${endY}`,
        stroke: lineColor,
        fill: "none",
        "stroke-width": strokeWidth.toString(),
        "stroke-linecap": "round",
        class: "pcb-fabrication-note-dimension-extension"
      },
      children: []
    };
  };
  const extensionSegments = [createExtensionLine(from), createExtensionLine(to)];
  const midPoint = {
    x: (from.x + to.x) / 2 + offsetVector.x,
    y: (from.y + to.y) / 2 + offsetVector.y
  };
  const [screenFromX, screenFromY] = applyToPoint9(transform, [
    fromOffset.x,
    fromOffset.y
  ]);
  const [screenToX, screenToY] = applyToPoint9(transform, [
    toOffset.x,
    toOffset.y
  ]);
  const screenDirection = normalize({
    x: screenToX - screenFromX,
    y: screenToY - screenFromY
  });
  let textAngle = Math.atan2(screenDirection.y, screenDirection.x) * 180 / Math.PI;
  if (textAngle > 90 || textAngle < -90) {
    textAngle += 180;
  }
  const finalTextAngle = typeof text_ccw_rotation === "number" && Number.isFinite(text_ccw_rotation) ? textAngle - text_ccw_rotation : textAngle;
  let additionalOffset = 0;
  if (text && typeof text_ccw_rotation === "number" && Number.isFinite(text_ccw_rotation)) {
    const textWidth = text.length * font_size * CHARACTER_WIDTH_MULTIPLIER;
    const textHeight = font_size;
    const rotationRad = text_ccw_rotation * Math.PI / 180;
    const sinRot = Math.abs(Math.sin(rotationRad));
    const cosRot = Math.abs(Math.cos(rotationRad));
    const halfWidth = textWidth / 2;
    const halfHeight = textHeight / 2;
    const maxExtension = halfWidth * sinRot + halfHeight * cosRot;
    additionalOffset = maxExtension + font_size * TEXT_INTERSECTION_PADDING_MULTIPLIER;
  }
  const textOffset = arrowSize * TEXT_OFFSET_MULTIPLIER + additionalOffset;
  const textPoint = {
    x: midPoint.x + perpendicular.x * textOffset,
    y: midPoint.y + perpendicular.y * textOffset
  };
  const [textX, textY] = applyToPoint9(transform, [textPoint.x, textPoint.y]);
  const transformedFontSize = font_size * Math.abs(transform.a);
  const children = [
    ...extensionSegments,
    {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `M ${lineStartX} ${lineStartY} L ${lineEndX} ${lineEndY}`,
        stroke: lineColor,
        fill: "none",
        "stroke-width": strokeWidth.toString(),
        "stroke-linecap": "round",
        class: "pcb-fabrication-note-dimension-line"
      },
      children: []
    },
    {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `${toPath(fromTriangle)} Z`,
        fill: lineColor,
        class: "pcb-fabrication-note-dimension-arrow"
      },
      children: []
    },
    {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `${toPath(toTriangle)} Z`,
        fill: lineColor,
        class: "pcb-fabrication-note-dimension-arrow"
      },
      children: []
    }
  ];
  if (text) {
    children.push({
      name: "text",
      type: "element",
      value: "",
      attributes: {
        x: textX.toString(),
        y: textY.toString(),
        fill: lineColor,
        "font-size": transformedFontSize.toString(),
        "font-family": ALPHABET_FONT_FAMILY,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        class: "pcb-fabrication-note-dimension-text",
        transform: `rotate(${finalTextAngle} ${textX} ${textY})`
      },
      children: [
        {
          type: "text",
          name: "",
          value: text,
          attributes: {},
          children: []
        }
      ]
    });
  }
  const attributes = {
    class: "pcb-fabrication-note-dimension",
    "data-type": "pcb_fabrication_note_dimension",
    "data-pcb-fabrication-note-dimension-id": pcb_fabrication_note_dimension_id,
    "data-pcb-layer": layer ?? "overlay"
  };
  if (pcb_component_id !== void 0) {
    attributes["data-pcb-component-id"] = pcb_component_id;
  }
  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes,
      children
    }
  ];
  function toScreen(point) {
    const [x, y] = applyToPoint9(transform, [point.x, point.y]);
    return { x, y };
  }
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-dimension.ts
import { applyToPoint as applyToPoint10 } from "transformation-matrix";

// lib/utils/colors.ts
var colorMap = {
  "3d_viewer": {
    background_bottom: "rgb(102, 102, 128)",
    background_top: "rgb(204, 204, 230)",
    board: "rgb(51, 43, 23)",
    copper: "rgb(179, 156, 0)",
    silkscreen_bottom: "rgb(230, 230, 230)",
    silkscreen_top: "rgb(230, 230, 230)",
    soldermask: "rgb(20, 51, 36)",
    solderpaste: "rgb(128, 128, 128)"
  },
  board: {
    anchor: "rgb(255, 38, 226)",
    aux_items: "rgb(255, 255, 255)",
    b_adhes: "rgb(0, 0, 132)",
    b_crtyd: "rgb(255, 38, 226)",
    b_fab: "rgb(88, 93, 132)",
    b_mask: "rgba(2, 255, 238, 0.400)",
    b_paste: "rgb(0, 194, 194)",
    b_silks: "rgb(232, 178, 167)",
    background: "rgb(0, 16, 35)",
    cmts_user: "rgb(89, 148, 220)",
    copper: {
      b: "rgb(77, 127, 196)",
      f: "rgb(200, 52, 52)",
      in1: "rgb(127, 200, 127)",
      in10: "rgb(237, 124, 51)",
      in11: "rgb(91, 195, 235)",
      in12: "rgb(247, 111, 142)",
      in13: "rgb(167, 165, 198)",
      in14: "rgb(40, 204, 217)",
      in15: "rgb(232, 178, 167)",
      in16: "rgb(242, 237, 161)",
      in17: "rgb(237, 124, 51)",
      in18: "rgb(91, 195, 235)",
      in19: "rgb(247, 111, 142)",
      in2: "rgb(206, 125, 44)",
      in20: "rgb(167, 165, 198)",
      in21: "rgb(40, 204, 217)",
      in22: "rgb(232, 178, 167)",
      in23: "rgb(242, 237, 161)",
      in24: "rgb(237, 124, 51)",
      in25: "rgb(91, 195, 235)",
      in26: "rgb(247, 111, 142)",
      in27: "rgb(167, 165, 198)",
      in28: "rgb(40, 204, 217)",
      in29: "rgb(232, 178, 167)",
      in3: "rgb(79, 203, 203)",
      in30: "rgb(242, 237, 161)",
      in4: "rgb(219, 98, 139)",
      in5: "rgb(167, 165, 198)",
      in6: "rgb(40, 204, 217)",
      in7: "rgb(232, 178, 167)",
      in8: "rgb(242, 237, 161)",
      in9: "rgb(141, 203, 129)"
    },
    cursor: "rgb(255, 255, 255)",
    drc: "rgb(194, 194, 194)",
    drc_error: "rgba(215, 91, 107, 0.800)",
    drc_exclusion: "rgb(255, 255, 255)",
    drc_warning: "rgba(255, 208, 66, 0.902)",
    dwgs_user: "rgb(194, 194, 194)",
    eco1_user: "rgb(180, 219, 210)",
    eco2_user: "rgb(216, 200, 82)",
    edge_cuts: "rgb(208, 210, 205)",
    f_adhes: "rgb(132, 0, 132)",
    f_crtyd: "rgb(255, 0, 245)",
    f_fab: "rgb(175, 175, 175)",
    f_mask: "rgba(216, 100, 255, 0.400)",
    f_paste: "rgba(180, 160, 154, 0.902)",
    f_silks: "rgb(242, 237, 161)",
    footprint_text_back: "rgb(0, 0, 132)",
    footprint_text_front: "rgb(194, 194, 194)",
    footprint_text_invisible: "rgb(132, 132, 132)",
    grid: "rgb(132, 132, 132)",
    grid_axes: "rgb(194, 194, 194)",
    margin: "rgb(255, 38, 226)",
    microvia: "rgb(0, 132, 132)",
    no_connect: "rgb(0, 0, 132)",
    pad_back: "rgb(77, 127, 196)",
    pad_front: "rgb(200, 52, 52)",
    pad_plated_hole: "rgb(194, 194, 0)",
    pad_through_hole: "rgb(227, 183, 46)",
    plated_hole: "rgb(26, 196, 210)",
    ratsnest: "rgba(245, 255, 213, 0.702)",
    select_overlay: "rgb(4, 255, 67)",
    through_via: "rgb(236, 236, 236)",
    user_1: "rgb(194, 194, 194)",
    user_2: "rgb(89, 148, 220)",
    user_3: "rgb(180, 219, 210)",
    user_4: "rgb(216, 200, 82)",
    user_5: "rgb(194, 194, 194)",
    user_6: "rgb(89, 148, 220)",
    user_7: "rgb(180, 219, 210)",
    user_8: "rgb(216, 200, 82)",
    user_9: "rgb(232, 178, 167)",
    via_blind_buried: "rgb(187, 151, 38)",
    via_hole: "rgb(227, 183, 46)",
    via_micro: "rgb(0, 132, 132)",
    via_through: "rgb(236, 236, 236)",
    worksheet: "rgb(200, 114, 171)"
  },
  gerbview: {
    axes: "rgb(0, 0, 132)",
    background: "rgb(0, 0, 0)",
    dcodes: "rgb(255, 255, 255)",
    grid: "rgb(132, 132, 132)",
    layers: [
      "rgb(132, 0, 0)",
      "rgb(194, 194, 0)",
      "rgb(194, 0, 194)",
      "rgb(194, 0, 0)",
      "rgb(0, 132, 132)",
      "rgb(0, 132, 0)",
      "rgb(0, 0, 132)",
      "rgb(132, 132, 132)",
      "rgb(132, 0, 132)",
      "rgb(194, 194, 194)",
      "rgb(132, 0, 132)",
      "rgb(132, 0, 0)",
      "rgb(132, 132, 0)",
      "rgb(194, 194, 194)",
      "rgb(0, 0, 132)",
      "rgb(0, 132, 0)",
      "rgb(132, 0, 0)",
      "rgb(194, 194, 0)",
      "rgb(194, 0, 194)",
      "rgb(194, 0, 0)",
      "rgb(0, 132, 132)",
      "rgb(0, 132, 0)",
      "rgb(0, 0, 132)",
      "rgb(132, 132, 132)",
      "rgb(132, 0, 132)",
      "rgb(194, 194, 194)",
      "rgb(132, 0, 132)",
      "rgb(132, 0, 0)",
      "rgb(132, 132, 0)",
      "rgb(194, 194, 194)",
      "rgb(0, 0, 132)",
      "rgb(0, 132, 0)",
      "rgb(132, 0, 0)",
      "rgb(194, 194, 0)",
      "rgb(194, 0, 194)",
      "rgb(194, 0, 0)",
      "rgb(0, 132, 132)",
      "rgb(0, 132, 0)",
      "rgb(0, 0, 132)",
      "rgb(132, 132, 132)",
      "rgb(132, 0, 132)",
      "rgb(194, 194, 194)",
      "rgb(132, 0, 132)",
      "rgb(132, 0, 0)",
      "rgb(132, 132, 0)",
      "rgb(194, 194, 194)",
      "rgb(0, 0, 132)",
      "rgb(0, 132, 0)",
      "rgb(132, 0, 0)",
      "rgb(194, 194, 0)",
      "rgb(194, 0, 194)",
      "rgb(194, 0, 0)",
      "rgb(0, 132, 132)",
      "rgb(0, 132, 0)",
      "rgb(0, 0, 132)",
      "rgb(132, 132, 132)",
      "rgb(132, 0, 132)",
      "rgb(194, 194, 194)",
      "rgb(132, 0, 132)",
      "rgb(132, 0, 0)"
    ],
    negative_objects: "rgb(132, 132, 132)",
    worksheet: "rgb(0, 0, 132)"
  },
  meta: {
    filename: "kicad_2020",
    name: "KiCad 2020",
    version: 2
  },
  simulation_palette: [
    "#1f77b4",
    "#d62728",
    "#2ca02c",
    "#ff7f0e",
    "#9467bd",
    "#17becf",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22"
  ],
  palette: [
    "rgb(132, 0, 0)",
    "rgb(194, 194, 0)",
    "rgb(194, 0, 194)",
    "rgb(194, 0, 0)",
    "rgb(0, 132, 132)",
    "rgb(0, 132, 0)",
    "rgb(0, 0, 132)",
    "rgb(132, 132, 132)",
    "rgb(132, 0, 132)",
    "rgb(194, 194, 194)",
    "rgb(132, 0, 132)",
    "rgb(132, 0, 0)",
    "rgb(132, 132, 0)",
    "rgb(194, 194, 194)",
    "rgb(0, 0, 132)",
    "rgb(0, 132, 0)"
  ],
  schematic: {
    aux_items: "rgb(46, 46, 46)",
    background: "rgb(245, 241, 237)",
    brightened: "rgb(255, 0, 255)",
    bus: "rgb(0, 0, 132)",
    bus_junction: "rgb(0, 0, 132)",
    component_body: "rgb(255, 255, 194)",
    component_outline: "rgb(132, 0, 0)",
    cursor: "rgb(15, 15, 15)",
    erc_error: "rgba(230, 9, 13, 0.800)",
    erc_warning: "rgba(209, 146, 0, 0.800)",
    fields: "rgb(132, 0, 132)",
    grid: "rgb(181, 181, 181)",
    grid_axes: "rgb(0, 0, 132)",
    hidden: "rgb(194, 194, 194)",
    junction: "rgb(0, 150, 0)",
    label_global: "rgb(132, 0, 0)",
    label_background: "rgba(255, 255, 255, 0.6)",
    label_hier: "rgb(114, 86, 0)",
    label_local: "rgb(15, 15, 15)",
    net_name: "rgb(132, 132, 132)",
    no_connect: "rgb(132, 0, 0)",
    note: "rgb(0, 0, 194)",
    override_item_colors: false,
    pin: "rgb(132, 0, 0)",
    pin_name: "rgb(0, 100, 100)",
    pin_number: "rgb(169, 0, 0)",
    reference: "rgb(0, 100, 100)",
    shadow: "rgba(102, 179, 255, 0.800)",
    sheet: "rgb(132, 0, 0)",
    sheet_background: "rgba(253, 255, 231, 0.000)",
    sheet_fields: "rgb(132, 0, 132)",
    sheet_filename: "rgb(114, 86, 0)",
    sheet_label: "rgb(0, 100, 100)",
    sheet_name: "rgb(0, 100, 100)",
    table: "rgb(102, 102, 102)",
    value: "rgb(0, 100, 100)",
    wire: "rgb(0, 150, 0)",
    wire_crossing: "rgb(30, 180, 30)",
    worksheet: "rgb(132, 0, 0)"
  }
};

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-dimension.ts
function normalize2(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}
function toPath2(points) {
  return points.map(
    (point, index) => index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
  ).join(" ");
}
function createSvgObjectsFromPcbNoteDimension(dimension, ctx) {
  const { transform } = ctx;
  const {
    from,
    to,
    text,
    font_size = 1,
    color,
    arrow_size,
    offset_distance,
    offset_direction,
    text_ccw_rotation
  } = dimension;
  if (!from || !to) {
    debugPcb(
      `[pcb_note_dimension] Invalid endpoints for "${dimension.pcb_note_dimension_id}": expected {from: {x, y}, to: {x, y}}, got from=${JSON.stringify(from)}, to=${JSON.stringify(to)}`
    );
    return [];
  }
  if (!Number.isFinite(arrow_size) || arrow_size <= 0) {
    debugPcb(
      `[pcb_note_dimension] Invalid arrow_size for "${dimension.pcb_note_dimension_id}": expected positive number, got ${JSON.stringify(arrow_size)}`
    );
    return [];
  }
  const direction = normalize2({ x: to.x - from.x, y: to.y - from.y });
  if (Number.isNaN(direction.x) || Number.isNaN(direction.y)) {
    return [];
  }
  const perpendicular = { x: -direction.y, y: direction.x };
  const hasOffsetDirection = offset_direction && typeof offset_direction.x === "number" && typeof offset_direction.y === "number";
  const normalizedOffsetDirection = hasOffsetDirection ? normalize2({ x: offset_direction.x, y: offset_direction.y }) : { x: 0, y: 0 };
  const offsetMagnitude = typeof offset_distance === "number" ? offset_distance : 0;
  const offsetVector = {
    x: normalizedOffsetDirection.x * offsetMagnitude,
    y: normalizedOffsetDirection.y * offsetMagnitude
  };
  const applyOffset = (point) => ({
    x: point.x + offsetVector.x,
    y: point.y + offsetVector.y
  });
  const fromOffset = applyOffset(from);
  const toOffset = applyOffset(to);
  const arrowHalfWidth = arrow_size / 2;
  const fromBase = {
    x: fromOffset.x + direction.x * arrow_size,
    y: fromOffset.y + direction.y * arrow_size
  };
  const toBase = {
    x: toOffset.x - direction.x * arrow_size,
    y: toOffset.y - direction.y * arrow_size
  };
  const fromTriangle = [
    toScreen(fromOffset),
    toScreen({
      x: fromBase.x + perpendicular.x * arrowHalfWidth,
      y: fromBase.y + perpendicular.y * arrowHalfWidth
    }),
    toScreen({
      x: fromBase.x - perpendicular.x * arrowHalfWidth,
      y: fromBase.y - perpendicular.y * arrowHalfWidth
    })
  ];
  const toTriangle = [
    toScreen(toOffset),
    toScreen({
      x: toBase.x + perpendicular.x * arrowHalfWidth,
      y: toBase.y + perpendicular.y * arrowHalfWidth
    }),
    toScreen({
      x: toBase.x - perpendicular.x * arrowHalfWidth,
      y: toBase.y - perpendicular.y * arrowHalfWidth
    })
  ];
  const [lineStartX, lineStartY] = applyToPoint10(transform, [
    fromBase.x,
    fromBase.y
  ]);
  const [lineEndX, lineEndY] = applyToPoint10(transform, [toBase.x, toBase.y]);
  const strokeWidth = arrow_size / 5 * Math.abs(transform.a);
  const lineColor = color || colorMap.board.user_2;
  const extensionDirection = hasOffsetDirection && (Math.abs(normalizedOffsetDirection.x) > Number.EPSILON || Math.abs(normalizedOffsetDirection.y) > Number.EPSILON) ? normalizedOffsetDirection : perpendicular;
  const extensionLength = offsetMagnitude + arrow_size;
  const createExtensionLine = (anchor) => {
    const endPoint = {
      x: anchor.x + extensionDirection.x * extensionLength,
      y: anchor.y + extensionDirection.y * extensionLength
    };
    const [startX, startY] = applyToPoint10(transform, [anchor.x, anchor.y]);
    const [endX, endY] = applyToPoint10(transform, [endPoint.x, endPoint.y]);
    return {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `M ${startX} ${startY} L ${endX} ${endY}`,
        stroke: lineColor,
        fill: "none",
        "stroke-width": strokeWidth.toString(),
        "stroke-linecap": "round",
        class: "pcb-note-dimension-extension"
      },
      children: []
    };
  };
  const extensionSegments = [createExtensionLine(from), createExtensionLine(to)];
  const midPoint = {
    x: (from.x + to.x) / 2 + offsetVector.x,
    y: (from.y + to.y) / 2 + offsetVector.y
  };
  const [screenFromX, screenFromY] = applyToPoint10(transform, [
    fromOffset.x,
    fromOffset.y
  ]);
  const [screenToX, screenToY] = applyToPoint10(transform, [
    toOffset.x,
    toOffset.y
  ]);
  const screenDirection = normalize2({
    x: screenToX - screenFromX,
    y: screenToY - screenFromY
  });
  let textAngle = Math.atan2(screenDirection.y, screenDirection.x) * 180 / Math.PI;
  if (textAngle > 90 || textAngle < -90) {
    textAngle += 180;
  }
  const finalTextAngle = typeof text_ccw_rotation === "number" && Number.isFinite(text_ccw_rotation) ? textAngle - text_ccw_rotation : textAngle;
  let additionalOffset = 0;
  if (text && typeof text_ccw_rotation === "number" && Number.isFinite(text_ccw_rotation)) {
    const textWidth = text.length * font_size * 0.6;
    const textHeight = font_size;
    const rotationRad = text_ccw_rotation * Math.PI / 180;
    const sinRot = Math.abs(Math.sin(rotationRad));
    const cosRot = Math.abs(Math.cos(rotationRad));
    const halfWidth = textWidth / 2;
    const halfHeight = textHeight / 2;
    const maxExtension = halfWidth * sinRot + halfHeight * cosRot;
    additionalOffset = maxExtension + font_size * 0.3;
  }
  const textOffset = arrow_size * 1.5 + additionalOffset;
  const textPoint = {
    x: midPoint.x + perpendicular.x * textOffset,
    y: midPoint.y + perpendicular.y * textOffset
  };
  const [textX, textY] = applyToPoint10(transform, [textPoint.x, textPoint.y]);
  const transformedFontSize = font_size * Math.abs(transform.a);
  const children = [
    ...extensionSegments,
    {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `M ${lineStartX} ${lineStartY} L ${lineEndX} ${lineEndY}`,
        stroke: lineColor,
        fill: "none",
        "stroke-width": strokeWidth.toString(),
        "stroke-linecap": "round",
        class: "pcb-note-dimension-line"
      },
      children: []
    },
    {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `${toPath2(fromTriangle)} Z`,
        fill: lineColor,
        class: "pcb-note-dimension-arrow"
      },
      children: []
    },
    {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `${toPath2(toTriangle)} Z`,
        fill: lineColor,
        class: "pcb-note-dimension-arrow"
      },
      children: []
    }
  ];
  if (text) {
    children.push({
      name: "text",
      type: "element",
      value: "",
      attributes: {
        x: textX.toString(),
        y: textY.toString(),
        fill: lineColor,
        "font-size": transformedFontSize.toString(),
        "font-family": "Arial, sans-serif",
        "text-anchor": "middle",
        "dominant-baseline": "central",
        class: "pcb-note-dimension-text",
        transform: `rotate(${finalTextAngle} ${textX} ${textY})`
      },
      children: [
        {
          type: "text",
          name: "",
          value: text,
          attributes: {},
          children: []
        }
      ]
    });
  }
  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "pcb-note-dimension",
        "data-type": "pcb_note_dimension",
        "data-pcb-note-dimension-id": dimension.pcb_note_dimension_id,
        "data-pcb-layer": "overlay"
      },
      children
    }
  ];
  function toScreen(point) {
    const [x, y] = applyToPoint10(transform, [point.x, point.y]);
    return { x, y };
  }
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-text.ts
import { applyToPoint as applyToPoint11 } from "transformation-matrix";
var DEFAULT_OVERLAY_COLOR = colorMap.board.user_2;
function createSvgObjectsFromPcbNoteText(note, ctx) {
  const { transform } = ctx;
  const {
    anchor_position,
    text,
    font_size = 1,
    anchor_alignment = "center",
    color
  } = note;
  if (!anchor_position || typeof anchor_position.x !== "number" || typeof anchor_position.y !== "number") {
    debugPcb(
      `[pcb_note_text] Invalid anchor_position for "${note.pcb_note_text_id}": expected {x: number, y: number}, got ${JSON.stringify(anchor_position)}`
    );
    return [];
  }
  if (typeof text !== "string" || text.length === 0) {
    debugPcb(
      `[pcb_note_text] Invalid text for "${note.pcb_note_text_id}": expected non-empty string, got ${JSON.stringify(text)}`
    );
    return [];
  }
  const [x, y] = applyToPoint11(transform, [anchor_position.x, anchor_position.y]);
  const transformedFontSize = font_size * Math.abs(transform.a);
  const { textAnchor, dominantBaseline } = getSvgTextAnchorAlignment(
    anchor_alignment
  );
  const lines = text.split("\n");
  const children = lines.length === 1 ? [
    {
      type: "text",
      name: "",
      value: text,
      attributes: {},
      children: []
    }
  ] : lines.map((line, index) => ({
    type: "element",
    name: "tspan",
    value: "",
    attributes: {
      x: x.toString(),
      ...index > 0 ? { dy: "1em" } : {}
    },
    children: [
      {
        type: "text",
        name: "",
        value: line,
        attributes: {},
        children: []
      }
    ]
  }));
  const svgObject = {
    name: "text",
    type: "element",
    value: "",
    attributes: {
      x: x.toString(),
      y: y.toString(),
      fill: color ?? DEFAULT_OVERLAY_COLOR,
      "font-family": "Arial, sans-serif",
      "font-size": transformedFontSize.toString(),
      "text-anchor": textAnchor,
      "dominant-baseline": dominantBaseline,
      class: "pcb-note-text",
      "data-type": "pcb_note_text",
      "data-pcb-note-text-id": note.pcb_note_text_id,
      "data-pcb-layer": "overlay"
    },
    children
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-rect.ts
import { applyToPoint as applyToPoint12 } from "transformation-matrix";
var DEFAULT_OVERLAY_COLOR2 = colorMap.board.user_2;
var DEFAULT_FILL_COLOR = colorMap.board.user_2;
function createSvgObjectsFromPcbNoteRect(noteRect, ctx) {
  const { transform } = ctx;
  const {
    center,
    width,
    height,
    stroke_width,
    is_filled,
    has_stroke,
    is_stroke_dashed,
    color,
    corner_radius
  } = noteRect;
  if (!center || typeof center.x !== "number" || typeof center.y !== "number" || typeof width !== "number" || typeof height !== "number") {
    debugPcb(
      `[pcb_note_rect] Invalid data for "${noteRect.pcb_note_rect_id}": expected center {x: number, y: number}, width: number, height: number, got center=${JSON.stringify(center)}, width=${JSON.stringify(width)}, height=${JSON.stringify(height)}`
    );
    return [];
  }
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const [topLeftX, topLeftY] = applyToPoint12(transform, [
    center.x - halfWidth,
    center.y + halfHeight
  ]);
  const [bottomRightX, bottomRightY] = applyToPoint12(transform, [
    center.x + halfWidth,
    center.y - halfHeight
  ]);
  const rectX = Math.min(topLeftX, bottomRightX);
  const rectY = Math.min(topLeftY, bottomRightY);
  const rectWidth = Math.abs(bottomRightX - topLeftX);
  const rectHeight = Math.abs(bottomRightY - topLeftY);
  const baseStrokeWidth = typeof stroke_width === "number" ? stroke_width : 0;
  const transformedStrokeWidth = baseStrokeWidth * Math.abs(transform.a);
  const baseCornerRadius = typeof corner_radius === "number" && corner_radius > 0 ? corner_radius : 0;
  const transformedCornerRadiusX = baseCornerRadius * Math.abs(transform.a);
  const transformedCornerRadiusY = baseCornerRadius * Math.abs(transform.d);
  const overlayColor = color ?? DEFAULT_OVERLAY_COLOR2;
  const attributes = {
    x: rectX.toString(),
    y: rectY.toString(),
    width: rectWidth.toString(),
    height: rectHeight.toString(),
    class: "pcb-note-rect",
    "data-type": "pcb_note_rect",
    "data-pcb-note-rect-id": noteRect.pcb_note_rect_id,
    "data-pcb-layer": "overlay"
  };
  if (transformedCornerRadiusX > 0) {
    attributes.rx = transformedCornerRadiusX.toString();
  }
  if (transformedCornerRadiusY > 0) {
    attributes.ry = transformedCornerRadiusY.toString();
  }
  if (is_filled) {
    attributes.fill = color ?? DEFAULT_FILL_COLOR;
  } else {
    attributes.fill = "none";
  }
  const shouldDrawStroke = has_stroke ?? transformedStrokeWidth > 0;
  if (shouldDrawStroke) {
    attributes.stroke = overlayColor;
    attributes["stroke-width"] = transformedStrokeWidth.toString();
    if (is_stroke_dashed) {
      const dash = 0.2 * Math.abs(transform.a);
      const gap = 0.1 * Math.abs(transform.a);
      attributes["stroke-dasharray"] = `${dash} ${gap}`;
    }
  } else {
    attributes.stroke = "none";
  }
  const svgObject = {
    name: "rect",
    type: "element",
    value: "",
    attributes,
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-path.ts
import { applyToPoint as applyToPoint13 } from "transformation-matrix";
var DEFAULT_OVERLAY_COLOR3 = colorMap.board.user_2;
function createSvgObjectsFromPcbNotePath(notePath, ctx) {
  const { transform } = ctx;
  if (!Array.isArray(notePath.route) || notePath.route.length === 0) {
    debugPcb(
      `[pcb_note_path] Invalid route for "${notePath.pcb_note_path_id}": expected non-empty array of points, got ${JSON.stringify(notePath.route)}`
    );
    return [];
  }
  for (const point of notePath.route) {
    if (typeof point.x !== "number" || typeof point.y !== "number") {
      debugPcb(
        `[pcb_note_path] Invalid point in route for "${notePath.pcb_note_path_id}": expected {x: number, y: number}, got ${JSON.stringify(point)}`
      );
      return [];
    }
  }
  const pathD = notePath.route.map((point, index) => {
    const [x, y] = applyToPoint13(transform, [point.x, point.y]);
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(" ");
  const strokeWidth = notePath.stroke_width * Math.abs(transform.a);
  const svgObject = {
    name: "path",
    type: "element",
    value: "",
    attributes: {
      d: pathD,
      stroke: notePath.color ?? DEFAULT_OVERLAY_COLOR3,
      fill: "none",
      "stroke-width": strokeWidth.toString(),
      class: "pcb-note-path",
      "data-type": "pcb_note_path",
      "data-pcb-note-path-id": notePath.pcb_note_path_id,
      "data-pcb-layer": "overlay"
    },
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-line.ts
import { applyToPoint as applyToPoint14 } from "transformation-matrix";
var DEFAULT_OVERLAY_COLOR4 = colorMap.board.user_2;
function createSvgObjectsFromPcbNoteLine(noteLine, ctx) {
  const { transform } = ctx;
  const { x1, y1, x2, y2, stroke_width, color, is_dashed } = noteLine;
  if (typeof x1 !== "number" || typeof y1 !== "number" || typeof x2 !== "number" || typeof y2 !== "number") {
    debugPcb(
      `[pcb_note_line] Invalid coordinates for "${noteLine.pcb_note_line_id}": expected x1, y1, x2, y2 as numbers, got x1=${JSON.stringify(x1)}, y1=${JSON.stringify(y1)}, x2=${JSON.stringify(x2)}, y2=${JSON.stringify(y2)}`
    );
    return [];
  }
  const [startX, startY] = applyToPoint14(transform, [x1, y1]);
  const [endX, endY] = applyToPoint14(transform, [x2, y2]);
  const baseStrokeWidth = typeof stroke_width === "number" ? stroke_width : 0;
  const transformedStrokeWidth = baseStrokeWidth * Math.abs(transform.a);
  const attributes = {
    x1: startX.toString(),
    y1: startY.toString(),
    x2: endX.toString(),
    y2: endY.toString(),
    stroke: color ?? DEFAULT_OVERLAY_COLOR4,
    "stroke-width": transformedStrokeWidth.toString(),
    "stroke-linecap": "round",
    class: "pcb-note-line",
    "data-type": "pcb_note_line",
    "data-pcb-note-line-id": noteLine.pcb_note_line_id,
    "data-pcb-layer": "overlay"
  };
  if (is_dashed) {
    const dash = 0.2 * Math.abs(transform.a);
    const gap = 0.1 * Math.abs(transform.a);
    attributes["stroke-dasharray"] = `${dash} ${gap}`;
  }
  const svgObject = {
    name: "line",
    type: "element",
    value: "",
    attributes,
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-bend.ts
import { applyToPoint as applyToPoint15 } from "transformation-matrix";
function createSvgObjectsFromPcbBend(bend, ctx) {
  const board = ctx.boardOwnerMap?.get(bend.pcb_board_id);
  if (!board) return [];
  const [startX, startY] = applyToPoint15(ctx.transform, [
    board.center.x + bend.start.x,
    board.center.y + bend.start.y
  ]);
  const [endX, endY] = applyToPoint15(ctx.transform, [
    board.center.x + bend.end.x,
    board.center.y + bend.end.y
  ]);
  const scale10 = Math.abs(ctx.transform.a);
  return [
    {
      name: "line",
      type: "element",
      value: "",
      attributes: {
        x1: startX.toString(),
        y1: startY.toString(),
        x2: endX.toString(),
        y2: endY.toString(),
        stroke: "#ffd54f",
        "stroke-width": (0.15 * scale10).toString(),
        "stroke-dasharray": `${0.75 * scale10} ${0.4 * scale10}`,
        "stroke-linecap": "butt",
        class: "pcb-bend-line",
        "data-type": "pcb_bend",
        "data-pcb-bend-id": bend.pcb_bend_id,
        "data-pcb-board-id": bend.pcb_board_id,
        "data-pcb-layer": "overlay"
      },
      children: [
        {
          name: "title",
          type: "element",
          value: "",
          attributes: {},
          children: [
            {
              name: "",
              type: "text",
              value: `${bend.name ?? bend.pcb_bend_id}: ${bend.bend_angle}\xB0, radius ${bend.bend_radius} mm`,
              attributes: {},
              children: []
            }
          ]
        }
      ]
    }
  ];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-plated-hole.ts
import { applyToPoint as applyToPoint16 } from "transformation-matrix";

// lib/pcb/svg-object-fns/get-pad-data-attributes.ts
function getPadDataAttributes(element, circuitJson) {
  if (!circuitJson) return {};
  const sourcePortId = getSourcePortId(element, circuitJson);
  if (!sourcePortId) return {};
  const sourcePort = circuitJson.find(
    (elm) => elm.type === "source_port" && elm.source_port_id === sourcePortId
  );
  const sourceComponent = circuitJson.find(
    (elm) => elm.type === "source_component" && elm.source_component_id === sourcePort?.source_component_id
  );
  const dataAttributes = {};
  if (sourceComponent?.name && sourcePort?.name) {
    dataAttributes["data-pad-name"] = `${sourceComponent.name}.${sourcePort.name}`;
  }
  const sourceNetName = getConnectedSourceNetName(sourcePortId, circuitJson);
  if (sourceNetName) {
    dataAttributes["data-pad-net-name"] = sourceNetName;
  }
  return dataAttributes;
}
function getPadPinNumber(element, circuitJson) {
  if (circuitJson) {
    const sourcePortId = getSourcePortId(element, circuitJson);
    const sourcePort = circuitJson.find(
      (elm) => elm.type === "source_port" && elm.source_port_id === sourcePortId
    );
    if (sourcePort?.type === "source_port" && sourcePort.pin_number != null) {
      return sourcePort.pin_number.toString();
    }
  }
  const portHint = element.port_hints?.find((hint) => hint.trim().length > 0);
  if (!portHint) return void 0;
  const pinNumberMatch = portHint.match(/^pin(\d+)$/i);
  return pinNumberMatch?.[1] ?? portHint;
}
function getSourcePortId(element, circuitJson) {
  if (element.source_port_id) return element.source_port_id;
  if (element.pcb_port_id) {
    const pcbPort2 = circuitJson.find(
      (elm) => elm.type === "pcb_port" && elm.pcb_port_id === element.pcb_port_id
    );
    if (pcbPort2?.source_port_id) return pcbPort2.source_port_id;
  }
  const physicalPadId = element.pcb_smtpad_id ?? element.pcb_plated_hole_id;
  if (!physicalPadId) return void 0;
  const pcbPort = circuitJson.find((elm) => {
    if (elm.type !== "pcb_port") return false;
    const port = elm;
    return port.pcb_smtpad_id === physicalPadId || port.pcb_plated_hole_id === physicalPadId;
  });
  return pcbPort?.source_port_id;
}
function getConnectedSourceNetName(sourcePortId, circuitJson) {
  const sourceTrace = circuitJson.find((elm) => {
    if (elm.type !== "source_trace") return false;
    const connectedPortIds = elm.connected_source_port_ids;
    return connectedPortIds?.includes(sourcePortId);
  });
  const sourceNetId = sourceTrace?.connected_source_net_ids?.[0];
  if (!sourceNetId) return void 0;
  const sourceNet = circuitJson.find(
    (elm) => elm.type === "source_net" && elm.source_net_id === sourceNetId
  );
  return sourceNet?.name;
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-plated-hole.ts
function createSvgObjectsFromPcbPlatedHole(hole, ctx) {
  const { transform, colorMap: colorMap2, showSolderMask } = ctx;
  const [x, y] = applyToPoint16(transform, [hole.x, hole.y]);
  const padDataAttributes = getPadDataAttributes(hole, ctx.circuitJson);
  const layer = Array.isArray(hole.layers) && hole.layers[0] || hole.layer || "top";
  const maskLayer = layer;
  const isCoveredWithSolderMask = Boolean(hole.is_covered_with_solder_mask);
  const soldermaskMargin = (hole.soldermask_margin ?? 0) * Math.abs(transform.a);
  const shouldShowSolderMask = showSolderMask && isCoveredWithSolderMask && soldermaskMargin !== 0;
  const solderMaskColor = colorMap2.soldermaskWithCopperUnderneath.top;
  if (hole.shape === "pill") {
    const scaledOuterWidth = hole.outer_width * Math.abs(transform.a);
    const scaledOuterHeight = hole.outer_height * Math.abs(transform.a);
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a);
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a);
    const rotation = hole.ccw_rotation || 0;
    const outerTransform = rotation ? `translate(${x} ${y}) rotate(${-rotation})` : `translate(${x} ${y})`;
    const innerTransform = rotation ? `translate(${x} ${y}) rotate(${-rotation})` : `translate(${x} ${y})`;
    const createPillPath = (width, height) => {
      if (width > height) {
        const radius = height / 2;
        const straightLength = width - 2 * radius;
        return `M${-width / 2 + radius},${-radius} h${straightLength} a${radius},${radius} 0 0 1 0,${height} h${-straightLength} a${radius},${radius} 0 0 1 0,${-height} z`;
      } else if (height > width) {
        const radius = width / 2;
        const straightLength = height - 2 * radius;
        return `M${radius},${-height / 2 + radius} v${straightLength} a${radius},${radius} 0 0 1 ${-width},0 v${-straightLength} a${radius},${radius} 0 0 1 ${width},0 z`;
      } else {
        const radius = width / 2;
        return `M${-radius},0 a${radius},${radius} 0 0 1 ${width},0 a${radius},${radius} 0 0 1 ${-width},0 z`;
      }
    };
    let children = [
      // Outer pill shape
      {
        name: "path",
        type: "element",
        attributes: {
          class: "pcb-hole-outer",
          fill: colorMap2.copper.top,
          d: createPillPath(scaledOuterWidth, scaledOuterHeight),
          transform: outerTransform,
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": layer
        },
        value: "",
        children: []
      },
      // Inner pill shape
      {
        name: "path",
        type: "element",
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap2.drill,
          d: createPillPath(scaledHoleWidth, scaledHoleHeight),
          transform: innerTransform,
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill"
        },
        value: "",
        children: []
      }
    ];
    if (shouldShowSolderMask) {
      const maskWidth = scaledOuterWidth + 2 * soldermaskMargin;
      const maskHeight = scaledOuterHeight + 2 * soldermaskMargin;
      if (soldermaskMargin < 0) {
        children = [
          // 1. Draw the outer pad in soldermask color (covered)
          {
            name: "path",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-covered",
              fill: solderMaskColor,
              d: createPillPath(scaledOuterWidth, scaledOuterHeight),
              transform: outerTransform,
              "data-type": "pcb_plated_hole",
              "data-pcb-layer": layer
            },
            value: "",
            children: []
          },
          // 2. Draw the exposed opening in copper color
          {
            name: "path",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-exposed",
              fill: colorMap2.copper.top,
              d: createPillPath(maskWidth, maskHeight),
              transform: outerTransform,
              "data-type": "pcb_soldermask",
              "data-pcb-layer": maskLayer
            },
            value: "",
            children: []
          },
          // 3. Draw the drill hole on top
          children[1]
          // Original inner hole
        ];
      } else {
        children.unshift({
          name: "path",
          type: "element",
          attributes: {
            class: "pcb-soldermask-cutout",
            fill: colorMap2.substrate,
            d: createPillPath(maskWidth, maskHeight),
            transform: outerTransform,
            "data-type": "pcb_soldermask_opening",
            "data-pcb-layer": maskLayer
          },
          value: "",
          children: []
        });
      }
    }
    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
          ...padDataAttributes
        },
        children,
        value: ""
      }
    ];
  }
  if (hole.shape === "oval") {
    const scaledOuterWidth = hole.outer_width * Math.abs(transform.a);
    const scaledOuterHeight = hole.outer_height * Math.abs(transform.a);
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a);
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a);
    const rotation = hole.ccw_rotation || 0;
    const transformStr = rotation ? `translate(${x} ${y}) rotate(${-rotation})` : `translate(${x} ${y})`;
    const children = [
      // Outer oval shape
      {
        name: "ellipse",
        type: "element",
        attributes: {
          class: "pcb-hole-outer",
          fill: colorMap2.copper.top,
          cx: "0",
          cy: "0",
          rx: (scaledOuterWidth / 2).toString(),
          ry: (scaledOuterHeight / 2).toString(),
          transform: transformStr,
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": layer
        },
        value: "",
        children: []
      },
      // Inner oval shape
      {
        name: "ellipse",
        type: "element",
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap2.drill,
          cx: "0",
          cy: "0",
          rx: (scaledHoleWidth / 2).toString(),
          ry: (scaledHoleHeight / 2).toString(),
          transform: transformStr,
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill"
        },
        value: "",
        children: []
      }
    ];
    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
          ...padDataAttributes
        },
        children,
        value: ""
      }
    ];
  }
  if (hole.shape === "circle") {
    const scaledOuterWidth = hole.outer_diameter * Math.abs(transform.a);
    const scaledOuterHeight = hole.outer_diameter * Math.abs(transform.a);
    const scaledHoleWidth = hole.hole_diameter * Math.abs(transform.a);
    const scaledHoleHeight = hole.hole_diameter * Math.abs(transform.a);
    const outerRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2;
    const innerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2;
    let children = [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole-outer",
          fill: colorMap2.copper.top,
          cx: x.toString(),
          cy: y.toString(),
          r: outerRadius.toString(),
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": layer
        },
        value: "",
        children: []
      },
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap2.drill,
          cx: x.toString(),
          cy: y.toString(),
          r: innerRadius.toString(),
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill"
        },
        value: "",
        children: []
      }
    ];
    if (shouldShowSolderMask) {
      const maskRadius = outerRadius + soldermaskMargin;
      if (soldermaskMargin < 0) {
        children = [
          // 1. Draw the outer ring in soldermask color (covered)
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-covered",
              fill: solderMaskColor,
              cx: x.toString(),
              cy: y.toString(),
              r: outerRadius.toString(),
              "data-type": "pcb_plated_hole",
              "data-pcb-layer": layer
            },
            value: "",
            children: []
          },
          // 2. Draw the exposed opening in copper color
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-exposed",
              fill: colorMap2.copper.top,
              cx: x.toString(),
              cy: y.toString(),
              r: maskRadius.toString(),
              "data-type": "pcb_soldermask",
              "data-pcb-layer": maskLayer
            },
            value: "",
            children: []
          },
          // 3. Draw the drill hole on top
          children[1]
          // Original inner hole
        ];
      } else {
        children.unshift({
          name: "circle",
          type: "element",
          attributes: {
            class: "pcb-soldermask-cutout",
            fill: colorMap2.substrate,
            cx: x.toString(),
            cy: y.toString(),
            r: maskRadius.toString(),
            "data-type": "pcb_soldermask_opening",
            "data-pcb-layer": maskLayer
          },
          value: "",
          children: []
        });
      }
    }
    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
          ...padDataAttributes
        },
        children,
        value: ""
      }
    ];
  }
  if (hole.shape === "circular_hole_with_rect_pad") {
    const h = hole;
    const scaledHoleDiameter = hole.hole_diameter * Math.abs(transform.a);
    const scaledRectPadWidth = hole.rect_pad_width * Math.abs(transform.a);
    const scaledRectPadHeight = hole.rect_pad_height * Math.abs(transform.a);
    const scaledRectBorderRadius = (hole.rect_border_radius ?? 0) * Math.abs(transform.a);
    const rectCcwRotation = hole.rect_ccw_rotation ?? 0;
    const rotation = h.rect_ccw_rotation ?? 0;
    const rectTransform = rotation ? `translate(${x} ${y}) rotate(${-rotation})` : void 0;
    const xStr = rotation ? (-scaledRectPadWidth / 2).toString() : (x - scaledRectPadWidth / 2).toString();
    const yStr = rotation ? (-scaledRectPadHeight / 2).toString() : (y - scaledRectPadHeight / 2).toString();
    const holeRadius = scaledHoleDiameter / 2;
    const [holeCx, holeCy] = applyToPoint16(transform, [
      h.x + (h.hole_offset_x ?? 0),
      h.y + (h.hole_offset_y ?? 0)
    ]);
    let children = [
      // Rectangular pad (outer shape)
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-hole-outer-pad",
          fill: colorMap2.copper.top,
          ...rectCcwRotation ? {
            x: (-scaledRectPadWidth / 2).toString(),
            y: (-scaledRectPadHeight / 2).toString(),
            transform: `translate(${x} ${y}) rotate(${-rectCcwRotation})`
          } : {
            x: (x - scaledRectPadWidth / 2).toString(),
            y: (y - scaledRectPadHeight / 2).toString()
          },
          width: scaledRectPadWidth.toString(),
          height: scaledRectPadHeight.toString(),
          ...rectTransform ? { transform: rectTransform } : {},
          ...scaledRectBorderRadius ? {
            rx: scaledRectBorderRadius.toString(),
            ry: scaledRectBorderRadius.toString()
          } : {},
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": layer
        },
        value: "",
        children: []
      },
      // Circular hole inside the rectangle (with optional offset)
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap2.drill,
          cx: holeCx.toString(),
          cy: holeCy.toString(),
          r: holeRadius.toString(),
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill"
        },
        value: "",
        children: []
      }
    ];
    if (shouldShowSolderMask) {
      const maskWidth = scaledRectPadWidth + 2 * soldermaskMargin;
      const maskHeight = scaledRectPadHeight + 2 * soldermaskMargin;
      const maskBorderRadius = scaledRectBorderRadius + soldermaskMargin;
      if (soldermaskMargin < 0) {
        children = [
          // 1. Draw the outer pad in soldermask color (covered)
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-covered",
              fill: solderMaskColor,
              ...rectCcwRotation ? {
                x: (-scaledRectPadWidth / 2).toString(),
                y: (-scaledRectPadHeight / 2).toString(),
                transform: `translate(${x} ${y}) rotate(${-rectCcwRotation})`
              } : {
                x: (x - scaledRectPadWidth / 2).toString(),
                y: (y - scaledRectPadHeight / 2).toString()
              },
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
              ...rectTransform ? { transform: rectTransform } : {},
              ...scaledRectBorderRadius ? {
                rx: scaledRectBorderRadius.toString(),
                ry: scaledRectBorderRadius.toString()
              } : {},
              "data-type": "pcb_plated_hole",
              "data-pcb-layer": layer
            },
            value: "",
            children: []
          },
          // 2. Draw the exposed opening in copper color
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-exposed",
              fill: colorMap2.copper.top,
              ...rectCcwRotation ? {
                x: (-maskWidth / 2).toString(),
                y: (-maskHeight / 2).toString(),
                transform: `translate(${x} ${y}) rotate(${-rectCcwRotation})`
              } : {
                x: (x - maskWidth / 2).toString(),
                y: (y - maskHeight / 2).toString()
              },
              width: maskWidth.toString(),
              height: maskHeight.toString(),
              ...rectTransform ? { transform: rectTransform } : {},
              ...maskBorderRadius > 0 ? {
                rx: maskBorderRadius.toString(),
                ry: maskBorderRadius.toString()
              } : {},
              "data-type": "pcb_soldermask",
              "data-pcb-layer": maskLayer
            },
            value: "",
            children: []
          },
          // 3. Draw the drill hole on top
          children[1]
          // Original hole
        ];
      } else {
        children.unshift({
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-soldermask-cutout",
            fill: colorMap2.substrate,
            ...rectCcwRotation ? {
              x: (-maskWidth / 2).toString(),
              y: (-maskHeight / 2).toString(),
              transform: `translate(${x} ${y}) rotate(${-rectCcwRotation})`
            } : {
              x: (x - maskWidth / 2).toString(),
              y: (y - maskHeight / 2).toString()
            },
            width: maskWidth.toString(),
            height: maskHeight.toString(),
            ...rectTransform ? { transform: rectTransform } : {},
            ...scaledRectBorderRadius ? {
              rx: maskBorderRadius.toString(),
              ry: maskBorderRadius.toString()
            } : {},
            "data-type": "pcb_soldermask_opening",
            "data-pcb-layer": maskLayer
          },
          value: "",
          children: []
        });
      }
    }
    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
          ...padDataAttributes
        },
        children,
        value: ""
      }
    ];
  }
  if (hole.shape === "pill_hole_with_rect_pad") {
    const pillHole = hole;
    const scaledRectPadWidth = pillHole.rect_pad_width * Math.abs(transform.a);
    const scaledRectPadHeight = pillHole.rect_pad_height * Math.abs(transform.a);
    const scaledRectBorderRadius = (pillHole.rect_border_radius ?? 0) * Math.abs(transform.a);
    const scaledHoleHeight = pillHole.hole_height * Math.abs(transform.a);
    const scaledHoleWidth = pillHole.hole_width * Math.abs(transform.a);
    const pillHoleWithOffsets = pillHole;
    const holeOffsetX = pillHoleWithOffsets.hole_offset_x ?? 0;
    const holeOffsetY = pillHoleWithOffsets.hole_offset_y ?? 0;
    const [holeCenterX, holeCenterY] = applyToPoint16(transform, [
      pillHole.x + holeOffsetX,
      pillHole.y + holeOffsetY
    ]);
    const holeRadius = Math.min(scaledHoleHeight, scaledHoleWidth) / 2;
    let children = [
      // Rectangular pad (outer shape)
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-hole-outer-pad",
          fill: colorMap2.copper.top,
          x: (x - scaledRectPadWidth / 2).toString(),
          y: (y - scaledRectPadHeight / 2).toString(),
          width: scaledRectPadWidth.toString(),
          height: scaledRectPadHeight.toString(),
          ...scaledRectBorderRadius ? {
            rx: scaledRectBorderRadius.toString(),
            ry: scaledRectBorderRadius.toString()
          } : {},
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": layer
        },
        value: "",
        children: []
      },
      // pill hole inside the rectangle
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap2.drill,
          x: (holeCenterX - scaledHoleWidth / 2).toString(),
          y: (holeCenterY - scaledHoleHeight / 2).toString(),
          width: scaledHoleWidth.toString(),
          height: scaledHoleHeight.toString(),
          rx: holeRadius.toString(),
          ry: holeRadius.toString(),
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill"
        },
        value: "",
        children: []
      }
    ];
    if (shouldShowSolderMask) {
      const maskWidth = scaledRectPadWidth + 2 * soldermaskMargin;
      const maskHeight = scaledRectPadHeight + 2 * soldermaskMargin;
      const maskBorderRadius = scaledRectBorderRadius + soldermaskMargin;
      if (soldermaskMargin < 0) {
        children = [
          // 1. Draw the outer pad in soldermask color (covered)
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-covered",
              fill: solderMaskColor,
              x: (x - scaledRectPadWidth / 2).toString(),
              y: (y - scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
              ...scaledRectBorderRadius ? {
                rx: scaledRectBorderRadius.toString(),
                ry: scaledRectBorderRadius.toString()
              } : {},
              "data-type": "pcb_plated_hole",
              "data-pcb-layer": layer
            },
            value: "",
            children: []
          },
          // 2. Draw the exposed opening in copper color
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-exposed",
              fill: colorMap2.copper.top,
              x: (x - maskWidth / 2).toString(),
              y: (y - maskHeight / 2).toString(),
              width: maskWidth.toString(),
              height: maskHeight.toString(),
              ...maskBorderRadius > 0 ? {
                rx: maskBorderRadius.toString(),
                ry: maskBorderRadius.toString()
              } : {},
              "data-type": "pcb_soldermask",
              "data-pcb-layer": maskLayer
            },
            value: "",
            children: []
          },
          // 3. Draw the drill hole on top
          children[1]
          // Original hole
        ];
      } else {
        children.unshift({
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-soldermask-cutout",
            fill: colorMap2.substrate,
            x: (x - maskWidth / 2).toString(),
            y: (y - maskHeight / 2).toString(),
            width: maskWidth.toString(),
            height: maskHeight.toString(),
            ...scaledRectBorderRadius ? {
              rx: maskBorderRadius.toString(),
              ry: maskBorderRadius.toString()
            } : {},
            "data-type": "pcb_soldermask_opening",
            "data-pcb-layer": maskLayer
          },
          value: "",
          children: []
        });
      }
    }
    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
          ...padDataAttributes
        },
        children,
        value: ""
      }
    ];
  }
  if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    const rotatedHole = hole;
    const scaledRectPadWidth = rotatedHole.rect_pad_width * Math.abs(transform.a);
    const scaledRectPadHeight = rotatedHole.rect_pad_height * Math.abs(transform.a);
    const scaledRectBorderRadius = (rotatedHole.rect_border_radius ?? 0) * Math.abs(transform.a);
    const scaledHoleHeight = rotatedHole.hole_height * Math.abs(transform.a);
    const scaledHoleWidth = rotatedHole.hole_width * Math.abs(transform.a);
    const rotatedHoleWithOffsets = rotatedHole;
    const holeOffsetX = rotatedHoleWithOffsets.hole_offset_x ?? 0;
    const holeOffsetY = rotatedHoleWithOffsets.hole_offset_y ?? 0;
    const [holeCenterX, holeCenterY] = applyToPoint16(transform, [
      rotatedHole.x + holeOffsetX,
      rotatedHole.y + holeOffsetY
    ]);
    const holeRadius = Math.min(scaledHoleHeight, scaledHoleWidth) / 2;
    let children = [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-hole-outer-pad",
          fill: colorMap2.copper.top,
          x: (-scaledRectPadWidth / 2).toString(),
          y: (-scaledRectPadHeight / 2).toString(),
          width: scaledRectPadWidth.toString(),
          height: scaledRectPadHeight.toString(),
          transform: `translate(${x} ${y}) rotate(${-rotatedHole.rect_ccw_rotation})`,
          ...scaledRectBorderRadius ? {
            rx: scaledRectBorderRadius.toString(),
            ry: scaledRectBorderRadius.toString()
          } : {},
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": layer
        },
        value: "",
        children: []
      },
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap2.drill,
          x: (-scaledHoleWidth / 2).toString(),
          y: (-scaledHoleHeight / 2).toString(),
          width: scaledHoleWidth.toString(),
          height: scaledHoleHeight.toString(),
          rx: holeRadius.toString(),
          ry: holeRadius.toString(),
          transform: `translate(${holeCenterX} ${holeCenterY}) rotate(${-rotatedHole.hole_ccw_rotation})`,
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill"
        },
        value: "",
        children: []
      }
    ];
    if (shouldShowSolderMask) {
      const maskWidth = scaledRectPadWidth + 2 * soldermaskMargin;
      const maskHeight = scaledRectPadHeight + 2 * soldermaskMargin;
      const maskBorderRadius = scaledRectBorderRadius + soldermaskMargin;
      if (soldermaskMargin < 0) {
        children = [
          // 1. Draw the outer pad in soldermask color (covered)
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-covered",
              fill: solderMaskColor,
              x: (-scaledRectPadWidth / 2).toString(),
              y: (-scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
              transform: `translate(${x} ${y}) rotate(${-rotatedHole.rect_ccw_rotation})`,
              ...scaledRectBorderRadius ? {
                rx: scaledRectBorderRadius.toString(),
                ry: scaledRectBorderRadius.toString()
              } : {},
              "data-type": "pcb_plated_hole",
              "data-pcb-layer": layer
            },
            value: "",
            children: []
          },
          // 2. Draw the exposed opening in copper color
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-exposed",
              fill: colorMap2.copper.top,
              x: (-maskWidth / 2).toString(),
              y: (-maskHeight / 2).toString(),
              width: maskWidth.toString(),
              height: maskHeight.toString(),
              transform: `translate(${x} ${y}) rotate(${-rotatedHole.rect_ccw_rotation})`,
              ...maskBorderRadius > 0 ? {
                rx: maskBorderRadius.toString(),
                ry: maskBorderRadius.toString()
              } : {},
              "data-type": "pcb_soldermask",
              "data-pcb-layer": maskLayer
            },
            value: "",
            children: []
          },
          // 3. Draw the drill hole on top
          children[1]
          // Original hole
        ];
      } else {
        children.push({
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-solder-mask",
            fill: solderMaskColor,
            x: (-maskWidth / 2).toString(),
            y: (-maskHeight / 2).toString(),
            width: maskWidth.toString(),
            height: maskHeight.toString(),
            transform: `translate(${x} ${y}) rotate(${-rotatedHole.rect_ccw_rotation})`,
            ...scaledRectBorderRadius ? {
              rx: maskBorderRadius.toString(),
              ry: maskBorderRadius.toString()
            } : {},
            "data-type": "pcb_soldermask",
            "data-pcb-layer": maskLayer
          },
          value: "",
          children: []
        });
      }
    }
    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
          ...padDataAttributes
        },
        children,
        value: ""
      }
    ];
  }
  if (hole.shape === "hole_with_polygon_pad") {
    const polygonHole = hole;
    const padOutline = polygonHole.pad_outline || [];
    const holeX = polygonHole.x ?? 0;
    const holeY = polygonHole.y ?? 0;
    const padPoints = padOutline.map(
      (point) => applyToPoint16(transform, [holeX + point.x, holeY + point.y])
    );
    const padPointsString = padPoints.map((p) => p.join(",")).join(" ");
    const [holeCenterX, holeCenterY] = applyToPoint16(transform, [
      holeX + polygonHole.hole_offset_x,
      holeY + polygonHole.hole_offset_y
    ]);
    const createHoleSvgObject = () => {
      if (polygonHole.hole_shape === "circle") {
        const scaledDiameter = (polygonHole.hole_diameter ?? 0) * Math.abs(transform.a);
        const radius = scaledDiameter / 2;
        return {
          name: "circle",
          type: "element",
          attributes: {
            class: "pcb-hole-inner",
            fill: colorMap2.drill,
            cx: holeCenterX.toString(),
            cy: holeCenterY.toString(),
            r: radius.toString(),
            "data-type": "pcb_plated_hole_drill",
            "data-pcb-layer": "drill"
          },
          value: "",
          children: []
        };
      }
      if (polygonHole.hole_shape === "oval") {
        const scaledWidth = (polygonHole.hole_width ?? 0) * Math.abs(transform.a);
        const scaledHeight = (polygonHole.hole_height ?? 0) * Math.abs(transform.a);
        const rx = scaledWidth / 2;
        const ry = scaledHeight / 2;
        return {
          name: "ellipse",
          type: "element",
          attributes: {
            class: "pcb-hole-inner",
            fill: colorMap2.drill,
            cx: holeCenterX.toString(),
            cy: holeCenterY.toString(),
            rx: rx.toString(),
            ry: ry.toString(),
            "data-type": "pcb_plated_hole_drill",
            "data-pcb-layer": "drill"
          },
          value: "",
          children: []
        };
      }
      if (polygonHole.hole_shape === "pill" || polygonHole.hole_shape === "rotated_pill") {
        const scaledWidth = (polygonHole.hole_width ?? 0) * Math.abs(transform.a);
        const scaledHeight = (polygonHole.hole_height ?? 0) * Math.abs(transform.a);
        const isHorizontal = scaledWidth > scaledHeight;
        const radius = Math.min(scaledWidth, scaledHeight) / 2;
        const straightLength = Math.abs(
          isHorizontal ? scaledWidth - scaledHeight : scaledHeight - scaledWidth
        );
        const pathD = isHorizontal ? `M${-straightLength / 2},${-radius} h${straightLength} a${radius},${radius} 0 0 1 0,${scaledHeight} h-${straightLength} a${radius},${radius} 0 0 1 0,-${scaledHeight} z` : `M${-radius},${-straightLength / 2} v${straightLength} a${radius},${radius} 0 0 0 ${scaledWidth},0 v-${straightLength} a${radius},${radius} 0 0 0 -${scaledWidth},0 z`;
        return {
          name: "path",
          type: "element",
          attributes: {
            class: "pcb-hole-inner",
            fill: colorMap2.drill,
            d: pathD,
            transform: `translate(${holeCenterX} ${holeCenterY})`,
            "data-type": "pcb_plated_hole_drill",
            "data-pcb-layer": "drill"
          },
          value: "",
          children: []
        };
      }
      return {
        name: "g",
        type: "element",
        attributes: {},
        value: "",
        children: []
      };
    };
    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
          ...padDataAttributes
        },
        children: [
          // Polygon pad (outer shape)
          {
            name: "polygon",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-pad",
              fill: colorMap2.copper.top,
              points: padPointsString,
              "data-type": "pcb_plated_hole",
              "data-pcb-layer": layer
            },
            value: "",
            children: []
          },
          // Hole inside the polygon (with offset)
          createHoleSvgObject()
        ],
        value: ""
      }
    ];
  }
  return [];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-path.ts
import { applyToPoint as applyToPoint17 } from "transformation-matrix";
function createSvgObjectsFromPcbSilkscreenPath(silkscreenPath, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  if (!silkscreenPath.route || !Array.isArray(silkscreenPath.route)) return [];
  let path = silkscreenPath.route.map((point, index) => {
    const [x, y] = applyToPoint17(transform, [point.x, point.y]);
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(" ");
  const firstPoint = silkscreenPath.route[0];
  const lastPoint = silkscreenPath.route[silkscreenPath.route.length - 1];
  if (firstPoint && lastPoint && firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y) {
    path += " Z";
  }
  const layer = silkscreenPath.layer || "top";
  if (layerFilter && layer !== layerFilter) return [];
  const color = layer === "bottom" ? colorMap2.silkscreen.bottom : colorMap2.silkscreen.top;
  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: `pcb-silkscreen pcb-silkscreen-${layer}`,
        d: path,
        fill: "none",
        stroke: color,
        "stroke-width": (silkscreenPath.stroke_width * Math.abs(transform.a)).toString(),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "data-pcb-component-id": silkscreenPath.pcb_component_id,
        "data-pcb-silkscreen-path-id": silkscreenPath.pcb_silkscreen_path_id,
        "data-type": "pcb_silkscreen_path",
        "data-pcb-layer": layer
      },
      value: "",
      children: []
    }
  ];
}

// lib/utils/ring-to-path-d.ts
import { applyToPoint as applyToPoint18 } from "transformation-matrix";
function ringToPathD(vertices, transform) {
  if (vertices.length === 0) return "";
  const transformedVertices = vertices.map((v) => {
    const [x, y] = applyToPoint18(transform, [v.x, v.y]);
    return { ...v, x, y };
  });
  let d = `M ${transformedVertices[0].x} ${transformedVertices[0].y}`;
  for (let i = 0; i < transformedVertices.length; i++) {
    const start = transformedVertices[i];
    const end = transformedVertices[(i + 1) % transformedVertices.length];
    if (start.bulge) {
      if (Math.hypot(end.x - start.x, end.y - start.y) < 1e-9) continue;
      const bulge = start.bulge;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.hypot(dx, dy);
      const radius = Math.abs(dist / 4 / bulge * (bulge * bulge + 1));
      const sweepFlag = bulge < 0 ? 1 : 0;
      const largeArcFlag = Math.abs(bulge) > 1 ? 1 : 0;
      d += ` A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
    } else {
      d += ` L ${end.x} ${end.y}`;
    }
  }
  d += " Z";
  return d;
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-graphic.ts
function createSvgObjectsFromPcbSilkscreenGraphic(silkscreenGraphic, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const { layer = "top" } = silkscreenGraphic;
  if (layerFilter && layer !== layerFilter) return [];
  if (silkscreenGraphic.shape !== "brep") return [];
  const color = layer === "bottom" ? colorMap2.silkscreen.bottom : colorMap2.silkscreen.top;
  let silkscreenGraphicPathD = ringToPathD(
    silkscreenGraphic.brep_shape.outer_ring.vertices,
    transform
  );
  for (const innerRing of silkscreenGraphic.brep_shape.inner_rings ?? []) {
    silkscreenGraphicPathD += ` ${ringToPathD(innerRing.vertices, transform)}`;
  }
  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: `pcb-silkscreen pcb-silkscreen-${layer}`,
        d: silkscreenGraphicPathD,
        fill: color,
        "fill-rule": "evenodd",
        stroke: "none",
        "data-pcb-component-id": silkscreenGraphic.pcb_component_id,
        "data-pcb-silkscreen-graphic-id": silkscreenGraphic.pcb_silkscreen_graphic_id,
        "data-type": "pcb_silkscreen_graphic",
        "data-pcb-layer": layer
      },
      value: "",
      children: []
    }
  ];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-text.ts
import {
  applyToPoint as applyToPoint19,
  compose as compose2,
  rotate as rotate2,
  translate as translate2,
  scale,
  toString as matrixToString2
} from "transformation-matrix";

// lib/pcb/svg-object-fns/create-pcb-alphabet-text-geometry.ts
import { lineAlphabet } from "@tscircuit/alphabet";
function createPcbAlphabetTextGeometry(params) {
  const {
    text,
    anchorAlignment,
    fontSize,
    charAdvance,
    spaceAdvance,
    trailingSpacing,
    lineHeight,
    mapSegment
  } = params;
  const textLines = text.split("\n");
  const totalHeight = textLines.length * lineHeight;
  const lineWidths = textLines.map(
    (line) => getLineWidth(line, charAdvance, spaceAdvance, trailingSpacing)
  );
  const baseSegments = [];
  let y = -totalHeight / 2;
  for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
    const line = textLines[lineIndex] ?? "";
    const lineWidth = lineWidths[lineIndex] ?? 0;
    let x = -lineWidth / 2;
    for (const char of line) {
      if (char === " ") {
        x += spaceAdvance;
        continue;
      }
      const charLines = lineAlphabet[char];
      if (charLines) {
        for (const segment of charLines) {
          baseSegments.push(mapSegment(segment, x, y, fontSize));
        }
      }
      x += charAdvance;
    }
    y += lineHeight;
  }
  const baseBounds = getSegmentBounds(baseSegments);
  if (!baseBounds) {
    return { pathData: "", bounds: null };
  }
  const anchorOffset = getAnchorOffsetForBounds(anchorAlignment, baseBounds);
  const anchoredSegments = translateSegments(baseSegments, anchorOffset);
  const anchoredBounds = translateBounds(baseBounds, anchorOffset);
  return {
    pathData: segmentsToPathData(anchoredSegments),
    bounds: anchoredBounds
  };
}
function getLineWidth(line, charAdvance, spaceAdvance, trailingSpacing) {
  let width = 0;
  for (const char of line) {
    width += char === " " ? spaceAdvance : charAdvance;
  }
  return width > 0 ? width - trailingSpacing : 0;
}
function getSegmentBounds(segments) {
  if (segments.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const segment of segments) {
    minX = Math.min(minX, segment.x1, segment.x2);
    minY = Math.min(minY, segment.y1, segment.y2);
    maxX = Math.max(maxX, segment.x1, segment.x2);
    maxY = Math.max(maxY, segment.y1, segment.y2);
  }
  return { minX, minY, maxX, maxY };
}
function getAnchorOffsetForBounds(anchorAlignment, bounds) {
  return {
    x: -getHorizontalAnchorPosition(anchorAlignment, bounds),
    y: -getVerticalAnchorPosition(anchorAlignment, bounds)
  };
}
function getHorizontalAnchorPosition(anchorAlignment, bounds) {
  if (anchorAlignment === "top_left" || anchorAlignment === "center_left" || anchorAlignment === "bottom_left") {
    return bounds.minX;
  }
  if (anchorAlignment === "top_right" || anchorAlignment === "center_right" || anchorAlignment === "bottom_right") {
    return bounds.maxX;
  }
  return (bounds.minX + bounds.maxX) / 2;
}
function getVerticalAnchorPosition(anchorAlignment, bounds) {
  if (anchorAlignment === "top_left" || anchorAlignment === "top_center" || anchorAlignment === "top_right") {
    return bounds.minY;
  }
  if (anchorAlignment === "bottom_left" || anchorAlignment === "bottom_center" || anchorAlignment === "bottom_right") {
    return bounds.maxY;
  }
  return (bounds.minY + bounds.maxY) / 2;
}
function translateSegments(segments, offset) {
  if (offset.x === 0 && offset.y === 0) {
    return segments;
  }
  return segments.map((segment) => ({
    x1: segment.x1 + offset.x,
    y1: segment.y1 + offset.y,
    x2: segment.x2 + offset.x,
    y2: segment.y2 + offset.y
  }));
}
function translateBounds(bounds, offset) {
  return {
    minX: bounds.minX + offset.x,
    minY: bounds.minY + offset.y,
    maxX: bounds.maxX + offset.x,
    maxY: bounds.maxY + offset.y
  };
}
function segmentsToPathData(segments) {
  return segments.map(
    (segment) => `M${segment.x1} ${segment.y1}L${segment.x2} ${segment.y2}`
  ).join(" ");
}

// lib/pcb/svg-object-fns/create-alphabet-knockout-text.ts
import { lineAlphabet as lineAlphabet2 } from "@tscircuit/alphabet";
var ASCENDER = 0.94;
var STROKE_RADIUS = 0.09 / 2;
var glyphBounds = Object.fromEntries(
  Object.entries(lineAlphabet2).map(([char, segments]) => {
    const xs = segments.flatMap((s) => [s.x1, s.x2]);
    const ys = segments.flatMap((s) => [s.y1, s.y2]);
    return [
      char,
      segments.length ? {
        minX: Math.min(...xs) - STROKE_RADIUS,
        maxX: Math.max(...xs) + STROKE_RADIUS,
        minY: -(Math.max(...ys) + STROKE_RADIUS) * ASCENDER,
        maxY: -(Math.min(...ys) - STROKE_RADIUS) * ASCENDER
      } : null
    ];
  })
);
var CHAR_ADVANCE = Math.round(
  Math.max(
    ...Object.values(glyphBounds).map((b) => b ? b.maxX - b.minX : 0)
  ) * 1e3
) / 1e3;
function createAlphabetKnockoutText(text, fontSize) {
  let bounds = null;
  const lines = text.split("\n");
  const children = lines.map((line, index) => {
    const chars = Array.from(line);
    const x = -(chars.length * CHAR_ADVANCE * fontSize) / 2;
    const y = index * fontSize * 1.1;
    chars.forEach((char, charIndex) => {
      const glyph = glyphBounds[char];
      if (!glyph) return;
      const offset = x + charIndex * CHAR_ADVANCE * fontSize;
      const ink = {
        minX: offset + glyph.minX * fontSize,
        maxX: offset + glyph.maxX * fontSize,
        minY: y + glyph.minY * fontSize,
        maxY: y + glyph.maxY * fontSize
      };
      bounds = bounds ? {
        minX: Math.min(bounds.minX, ink.minX),
        maxX: Math.max(bounds.maxX, ink.maxX),
        minY: Math.min(bounds.minY, ink.minY),
        maxY: Math.max(bounds.maxY, ink.maxY)
      } : ink;
    });
    return {
      name: "tspan",
      type: "element",
      value: "",
      attributes: { x: x.toString(), y: y.toString() },
      children: [
        { name: "", type: "text", value: line, attributes: {}, children: [] }
      ]
    };
  });
  return {
    bounds,
    textNode: {
      name: "text",
      type: "element",
      value: "",
      attributes: {
        "font-family": ALPHABET_FONT_FAMILY,
        "font-size": fontSize.toString(),
        "text-anchor": "start",
        "dominant-baseline": "alphabetic",
        "xml:space": "preserve",
        fill: "black",
        stroke: "none"
      },
      children
    }
  };
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-text.ts
var silkscreenMaskIdCounter = 0;
function createSvgObjectsFromPcbSilkscreenText(pcbSilkscreenText, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const {
    anchor_position,
    text,
    font_size = 1,
    layer = "top",
    ccw_rotation = 0,
    anchor_alignment = "center",
    is_knockout = false,
    knockout_padding,
    is_mirrored = false
  } = pcbSilkscreenText;
  if (layerFilter && layer !== layerFilter) return [];
  if (!anchor_position || typeof anchor_position.x !== "number" || typeof anchor_position.y !== "number") {
    debugPcb(
      `[pcb_silkscreen_text] Invalid anchor_position for "${pcbSilkscreenText.pcb_silkscreen_text_id}": expected {x: number, y: number}, got ${JSON.stringify(anchor_position)}`
    );
    return [];
  }
  if (!text) return [];
  const [transformedX, transformedY] = applyToPoint19(transform, [
    anchor_position.x,
    anchor_position.y
  ]);
  const scaleFactor = Math.abs(transform.a);
  const silkscreenColor = layer === "bottom" ? colorMap2.silkscreen.bottom : colorMap2.silkscreen.top;
  const isBottom = layer === "bottom";
  const applyMirror = isBottom ? true : is_mirrored === true;
  if (is_knockout) {
    const geometry = createAlphabetKnockoutText(text, font_size);
    if (!geometry.bounds) return [];
    const padLeft = knockout_padding?.left ?? font_size * 0.5;
    const padRight = knockout_padding?.right ?? font_size * 0.5;
    const padTop = knockout_padding?.top ?? font_size * 0.3;
    const padBottom = knockout_padding?.bottom ?? font_size * 0.3;
    const rectX = geometry.bounds.minX - padLeft;
    const rectY = geometry.bounds.minY - padTop;
    const rectW = geometry.bounds.maxX - geometry.bounds.minX + padLeft + padRight;
    const rectH = geometry.bounds.maxY - geometry.bounds.minY + padTop + padBottom;
    const knockoutBounds = {
      minX: rectX,
      minY: rectY,
      maxX: rectX + rectW,
      maxY: rectY + rectH
    };
    const knockoutAnchorOffset = getAnchorOffsetForBounds(
      anchor_alignment,
      knockoutBounds
    );
    const alignedRectX = rectX + knockoutAnchorOffset.x;
    const alignedRectY = rectY + knockoutAnchorOffset.y;
    const maskCutoutChildren = [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          x: rectX.toString(),
          y: rectY.toString(),
          width: rectW.toString(),
          height: rectH.toString(),
          fill: "white"
        },
        children: []
      },
      geometry.textNode
    ];
    const hasKnockoutAnchorOffset = knockoutAnchorOffset.x !== 0 || knockoutAnchorOffset.y !== 0;
    const maskChildren = hasKnockoutAnchorOffset ? [
      {
        name: "g",
        type: "element",
        value: "",
        attributes: {
          transform: `translate(${knockoutAnchorOffset.x} ${knockoutAnchorOffset.y})`
        },
        children: maskCutoutChildren
      }
    ] : maskCutoutChildren;
    const knockoutTransform = matrixToString2(
      compose2(
        translate2(transformedX, transformedY),
        rotate2(-ccw_rotation * Math.PI / 180),
        ...applyMirror ? [scale(-1, 1)] : [],
        scale(scaleFactor, scaleFactor)
      )
    );
    const maskId = `silkscreen-knockout-mask-${pcbSilkscreenText.pcb_silkscreen_text_id}-${silkscreenMaskIdCounter++}`;
    return [
      {
        name: "defs",
        type: "element",
        value: "",
        children: [
          {
            name: "mask",
            type: "element",
            value: "",
            attributes: {
              id: maskId
            },
            children: maskChildren
          }
        ],
        attributes: {}
      },
      {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          x: alignedRectX.toString(),
          y: alignedRectY.toString(),
          width: rectW.toString(),
          height: rectH.toString(),
          fill: silkscreenColor,
          mask: `url(#${maskId})`,
          transform: knockoutTransform,
          class: `pcb-silkscreen-text-knockout pcb-silkscreen-${layer}`,
          "data-type": "pcb_silkscreen_text",
          "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_silkscreen_text_id,
          "data-pcb-layer": layer
        }
      }
    ];
  }
  const transformedFontSize = font_size * scaleFactor;
  let textAnchor = "middle";
  let dominantBaseline = "central";
  switch (anchor_alignment) {
    case "top_left":
      textAnchor = "start";
      dominantBaseline = "text-before-edge";
      break;
    case "top_center":
      textAnchor = "middle";
      dominantBaseline = "text-before-edge";
      break;
    case "top_right":
      textAnchor = "end";
      dominantBaseline = "text-before-edge";
      break;
    case "center_left":
      textAnchor = "start";
      dominantBaseline = "central";
      break;
    case "center_right":
      textAnchor = "end";
      dominantBaseline = "central";
      break;
    case "bottom_left":
      textAnchor = "start";
      dominantBaseline = "text-after-edge";
      break;
    case "bottom_center":
      textAnchor = "middle";
      dominantBaseline = "text-after-edge";
      break;
    case "bottom_right":
      textAnchor = "end";
      dominantBaseline = "text-after-edge";
      break;
    case "center":
    default:
      textAnchor = "middle";
      dominantBaseline = "central";
      break;
  }
  const textTransform = compose2(
    translate2(transformedX, transformedY),
    rotate2(-ccw_rotation * Math.PI / 180),
    ...applyMirror ? [scale(-1, 1)] : []
  );
  const lines = text.split("\n");
  const children = lines.length === 1 ? [
    {
      type: "text",
      value: text,
      name: "",
      attributes: {},
      children: []
    }
  ] : lines.map((line, idx) => ({
    type: "element",
    name: "tspan",
    value: "",
    attributes: {
      x: "0",
      ...idx > 0 ? { dy: transformedFontSize.toString() } : {}
    },
    children: [
      {
        type: "text",
        value: line,
        name: "",
        attributes: {},
        children: []
      }
    ]
  }));
  return [
    {
      name: "text",
      type: "element",
      attributes: {
        x: "0",
        y: "0",
        dx: "0",
        dy: "0",
        fill: silkscreenColor,
        "font-family": ALPHABET_FONT_FAMILY,
        "font-size": transformedFontSize.toString(),
        "text-anchor": textAnchor,
        "dominant-baseline": dominantBaseline,
        transform: matrixToString2(textTransform),
        class: `pcb-silkscreen-text pcb-silkscreen-${layer}`,
        "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_silkscreen_text_id,
        stroke: "none",
        "data-type": "pcb_silkscreen_text",
        "data-pcb-layer": layer
      },
      children,
      value: ""
    }
  ];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-rect.ts
import { applyToPoint as applyToPoint20 } from "transformation-matrix";
function createSvgObjectsFromPcbSilkscreenRect(pcbSilkscreenRect, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const {
    center,
    width,
    height,
    layer = "top",
    pcb_silkscreen_rect_id,
    stroke_width,
    is_filled,
    has_stroke,
    is_stroke_dashed,
    corner_radius,
    ccw_rotation = 0
  } = pcbSilkscreenRect;
  if (layerFilter && layer !== layerFilter) return [];
  if (!center || typeof center.x !== "number" || typeof center.y !== "number" || typeof width !== "number" || typeof height !== "number") {
    debugPcb(
      `[pcb_silkscreen_rect] Invalid data for "${pcb_silkscreen_rect_id}": expected center {x: number, y: number}, width: number, height: number, got center=${JSON.stringify(center)}, width=${JSON.stringify(width)}, height=${JSON.stringify(height)}`
    );
    return [];
  }
  const [transformedX, transformedY] = applyToPoint20(transform, [
    center.x,
    center.y
  ]);
  const baseCornerRadius = typeof corner_radius === "number" && corner_radius > 0 ? corner_radius : 0;
  const transformedCornerRadiusX = baseCornerRadius * Math.abs(transform.a);
  const transformedCornerRadiusY = baseCornerRadius * Math.abs(transform.d);
  const transformedWidth = width * Math.abs(transform.a);
  const transformedHeight = height * Math.abs(transform.d);
  const transformedStrokeWidth = stroke_width * Math.abs(transform.a);
  const color = layer === "bottom" ? colorMap2.silkscreen.bottom : colorMap2.silkscreen.top;
  const attributes = {
    x: (-transformedWidth / 2).toString(),
    y: (-transformedHeight / 2).toString(),
    width: transformedWidth.toString(),
    height: transformedHeight.toString(),
    class: `pcb-silkscreen-rect pcb-silkscreen-${layer}`,
    "data-pcb-silkscreen-rect-id": pcb_silkscreen_rect_id,
    "data-type": "pcb_silkscreen_rect",
    "data-pcb-layer": layer
  };
  if (typeof ccw_rotation === "number" && ccw_rotation !== 0) {
    attributes.transform = `translate(${transformedX} ${transformedY}) rotate(${-ccw_rotation})`;
  } else {
    attributes.x = (transformedX - transformedWidth / 2).toString();
    attributes.y = (transformedY - transformedHeight / 2).toString();
  }
  if (transformedCornerRadiusX > 0) {
    attributes.rx = transformedCornerRadiusX.toString();
  }
  if (transformedCornerRadiusY > 0) {
    attributes.ry = transformedCornerRadiusY.toString();
  }
  attributes.fill = is_filled ? color : "none";
  let actualHasStroke;
  if (has_stroke === void 0) {
    actualHasStroke = transformedStrokeWidth > 0;
  } else {
    actualHasStroke = has_stroke;
  }
  if (actualHasStroke) {
    attributes.stroke = color;
    attributes["stroke-width"] = transformedStrokeWidth.toString();
    if (is_stroke_dashed) {
      const dashLength = 0.1 * Math.abs(transform.a);
      const gapLength = 0.05 * Math.abs(transform.a);
      attributes["stroke-dasharray"] = `${dashLength} ${gapLength}`;
    }
  } else {
    attributes.stroke = "none";
  }
  const svgObject = {
    name: "rect",
    type: "element",
    attributes,
    value: "",
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-copper-text.ts
import {
  applyToPoint as applyToPoint21,
  compose as compose3,
  rotate as rotate3,
  translate as translate3,
  scale as scale2,
  toString as matrixToString4
} from "transformation-matrix";

// lib/pcb/colors.ts
var DEFAULT_PCB_COLOR_MAP = {
  copper: {
    top: "rgb(200, 52, 52)",
    inner1: "rgb(255, 140, 0)",
    inner2: "rgb(255, 215, 0)",
    inner3: "rgb(50, 205, 50)",
    inner4: "rgb(64, 224, 208)",
    inner5: "rgb(138, 43, 226)",
    inner6: "rgb(255, 105, 180)",
    inner7: "rgb(0, 191, 255)",
    inner8: "rgb(160, 82, 45)",
    bottom: "rgb(77, 127, 196)"
  },
  soldermaskWithCopperUnderneath: {
    top: "rgb(18, 82, 50)",
    bottom: "rgb(18, 82, 50)"
  },
  soldermask: {
    top: "rgb(12, 55, 33)",
    bottom: "rgb(12, 55, 33)"
  },
  soldermaskOverCopper: {
    top: "rgb(52, 135, 73)",
    bottom: "rgb(52, 135, 73)"
  },
  substrate: "rgb(201, 162, 110)",
  // FR4 substrate color (tan/beige)
  drill: "#FF26E2",
  silkscreen: {
    top: "#f2eda1",
    bottom: "#5da9e9"
  },
  boardOutline: "rgba(255, 255, 255, 0.5)",
  courtyard: {
    top: "#FF00FF",
    bottom: "rgb(38, 233, 255)"
  },
  keepout: "#FF6B6B",
  // Red color for keepout zones
  debugComponent: {
    fill: null,
    stroke: null
  }
};
var HOLE_COLOR = DEFAULT_PCB_COLOR_MAP.drill;
var SILKSCREEN_TOP_COLOR = DEFAULT_PCB_COLOR_MAP.silkscreen.top;
var SILKSCREEN_BOTTOM_COLOR = DEFAULT_PCB_COLOR_MAP.silkscreen.bottom;

// lib/pcb/layer-name-to-color.ts
var LAYER_NAME_TO_COLOR = {
  ...DEFAULT_PCB_COLOR_MAP.copper
};
function layerNameToColor(layerName, colorMap2 = DEFAULT_PCB_COLOR_MAP) {
  return colorMap2.copper[layerName] ?? "white";
}
var SOLDER_PASTE_LAYER_NAME_TO_COLOR = {
  bottom: "rgb(105, 105, 105)",
  top: "rgb(105, 105, 105)"
};
function solderPasteLayerNameToColor(layerName) {
  return SOLDER_PASTE_LAYER_NAME_TO_COLOR[layerName] ?? "rgb(105, 105, 105)";
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-copper-text.ts
import { distance } from "circuit-json";
var CHAR_WIDTH = 1;
var CHAR_SPACING = 0.2;
var LINE_HEIGHT = 1.4;
var FONT_SCALE = 0.53;
var maskIdCounter = 0;
function createSvgObjectsFromPcbCopperText(pcbCopperText, ctx) {
  const { transform, layer: filterLayer, colorMap: colorMap2 } = ctx;
  const {
    anchor_position,
    text,
    font_size = "0.2mm",
    layer,
    ccw_rotation = 0,
    anchor_alignment = "center",
    is_knockout = false,
    knockout_padding,
    is_mirrored = false
  } = pcbCopperText;
  const layerName = layer ?? "top";
  if (filterLayer && filterLayer !== layerName) return [];
  if (!anchor_position) return [];
  if (!text) return [];
  const [ax, ay] = applyToPoint21(transform, [
    anchor_position.x,
    anchor_position.y
  ]);
  const fontSizeNum = distance.parse(font_size) ?? 0.2;
  const scaleFactor = Math.abs(transform.a);
  const copperColor = layerNameToColor(layerName, colorMap2);
  const isBottom = layerName === "bottom";
  const applyMirror = isBottom ? true : is_mirrored === true;
  if (is_knockout) {
    const scaledFontSize2 = fontSizeNum * FONT_SCALE;
    const geometry2 = createPcbAlphabetTextGeometry({
      text,
      anchorAlignment: anchor_alignment,
      fontSize: scaledFontSize2,
      charAdvance: (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize2,
      spaceAdvance: (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize2 * 0.6,
      trailingSpacing: CHAR_SPACING * scaledFontSize2,
      lineHeight: scaledFontSize2 * LINE_HEIGHT,
      mapSegment: (segment, offsetX, offsetY, fontSize) => ({
        x1: offsetX + segment.x1 * fontSize,
        y1: offsetY + (1 - segment.y1) * fontSize,
        x2: offsetX + segment.x2 * fontSize,
        y2: offsetY + (1 - segment.y2) * fontSize
      })
    });
    if (!geometry2.bounds || !geometry2.pathData) return [];
    const padLeft = knockout_padding?.left ?? scaledFontSize2 * 0.5;
    const padRight = knockout_padding?.right ?? scaledFontSize2 * 0.5;
    const padTop = knockout_padding?.top ?? scaledFontSize2 * 0.3;
    const padBottom = knockout_padding?.bottom ?? scaledFontSize2 * 0.3;
    const rectX = geometry2.bounds.minX - padLeft;
    const rectY = geometry2.bounds.minY - padTop;
    const rectW = geometry2.bounds.maxX - geometry2.bounds.minX + padLeft + padRight;
    const rectH = geometry2.bounds.maxY - geometry2.bounds.minY + padTop + padBottom;
    const strokeWidth2 = scaledFontSize2 * 0.15;
    const knockoutBounds = {
      minX: rectX,
      minY: rectY,
      maxX: rectX + rectW,
      maxY: rectY + rectH
    };
    const knockoutAnchorOffset = getAnchorOffsetForBounds(
      anchor_alignment,
      knockoutBounds
    );
    const alignedRectX = rectX + knockoutAnchorOffset.x;
    const alignedRectY = rectY + knockoutAnchorOffset.y;
    const maskCutoutChildren = [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          x: rectX.toString(),
          y: rectY.toString(),
          width: rectW.toString(),
          height: rectH.toString(),
          fill: "white"
        },
        children: []
      },
      {
        name: "path",
        type: "element",
        value: "",
        attributes: {
          d: geometry2.pathData,
          fill: "none",
          stroke: "black",
          "stroke-width": strokeWidth2.toString(),
          "stroke-linecap": "round",
          "stroke-linejoin": "round"
        },
        children: []
      }
    ];
    const hasKnockoutAnchorOffset = knockoutAnchorOffset.x !== 0 || knockoutAnchorOffset.y !== 0;
    const maskChildren = hasKnockoutAnchorOffset ? [
      {
        name: "g",
        type: "element",
        value: "",
        attributes: {
          transform: `translate(${knockoutAnchorOffset.x} ${knockoutAnchorOffset.y})`
        },
        children: maskCutoutChildren
      }
    ] : maskCutoutChildren;
    const knockoutTransform = matrixToString4(
      compose3(
        translate3(ax, ay),
        rotate3(-ccw_rotation * Math.PI / 180),
        ...applyMirror ? [scale2(-1, 1)] : [],
        scale2(scaleFactor, scaleFactor)
      )
    );
    const maskId = `knockout-mask-${pcbCopperText.pcb_copper_text_id}-${maskIdCounter++}`;
    return [
      {
        name: "defs",
        type: "element",
        value: "",
        children: [
          {
            name: "mask",
            type: "element",
            value: "",
            attributes: {
              id: maskId
            },
            children: maskChildren
          }
        ],
        attributes: {}
      },
      {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          x: alignedRectX.toString(),
          y: alignedRectY.toString(),
          width: rectW.toString(),
          height: rectH.toString(),
          fill: copperColor,
          mask: `url(#${maskId})`,
          transform: knockoutTransform,
          class: `pcb-copper-text-knockout pcb-copper-${layerName}`,
          "data-type": "pcb_copper_text",
          "data-pcb-copper-text-id": pcbCopperText.pcb_copper_text_id
        }
      }
    ];
  }
  const scaledFontSize = fontSizeNum * FONT_SCALE;
  const geometry = createPcbAlphabetTextGeometry({
    text,
    anchorAlignment: anchor_alignment,
    fontSize: scaledFontSize,
    charAdvance: (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize,
    spaceAdvance: (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize * 0.6,
    trailingSpacing: CHAR_SPACING * scaledFontSize,
    lineHeight: scaledFontSize * LINE_HEIGHT,
    mapSegment: (segment, offsetX, offsetY, fontSize) => ({
      x1: offsetX + segment.x1 * fontSize,
      y1: offsetY + (1 - segment.y1) * fontSize,
      x2: offsetX + segment.x2 * fontSize,
      y2: offsetY + (1 - segment.y2) * fontSize
    })
  });
  if (!geometry.pathData) return [];
  const textTransform = matrixToString4(
    compose3(
      translate3(ax, ay),
      rotate3(-ccw_rotation * Math.PI / 180),
      ...applyMirror ? [scale2(-1, 1)] : [],
      scale2(scaleFactor, scaleFactor)
    )
  );
  const strokeWidth = scaledFontSize * 0.15;
  return [
    {
      name: "path",
      type: "element",
      attributes: {
        d: geometry.pathData,
        fill: "none",
        stroke: copperColor,
        "stroke-width": strokeWidth.toString(),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        transform: textTransform,
        class: `pcb-copper-text pcb-copper-${layerName}`,
        "data-type": "pcb_copper_text",
        "data-pcb-copper-text-id": pcbCopperText.pcb_copper_text_id
      },
      children: [],
      value: ""
    }
  ];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-circle.ts
import { applyToPoint as applyToPoint22 } from "transformation-matrix";
function createSvgObjectsFromPcbSilkscreenCircle(pcbSilkscreenCircle, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const {
    center,
    radius,
    layer = "top",
    pcb_silkscreen_circle_id,
    stroke_width = 1,
    is_filled
  } = pcbSilkscreenCircle;
  if (layerFilter && layer !== layerFilter) return [];
  if (!center || typeof center.x !== "number" || typeof center.y !== "number" || typeof radius !== "number") {
    console.error("Invalid PCB Silkscreen Circle data:", { center, radius });
    return [];
  }
  const [transformedX, transformedY] = applyToPoint22(transform, [
    center.x,
    center.y
  ]);
  const transformedRadius = radius * Math.abs(transform.a);
  const transformedStrokeWidth = stroke_width * Math.abs(transform.a);
  const color = layer === "bottom" ? colorMap2.silkscreen.bottom : colorMap2.silkscreen.top;
  const svgObject = {
    name: "circle",
    type: "element",
    attributes: {
      cx: transformedX.toString(),
      cy: transformedY.toString(),
      r: transformedRadius.toString(),
      class: `pcb-silkscreen-circle pcb-silkscreen-${layer}`,
      fill: is_filled ? color : "none",
      stroke: color,
      "stroke-width": transformedStrokeWidth.toString(),
      "data-pcb-silkscreen-circle-id": pcb_silkscreen_circle_id,
      "data-type": "pcb_silkscreen_circle",
      "data-pcb-layer": layer
    },
    value: "",
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-line.ts
import { applyToPoint as applyToPoint23 } from "transformation-matrix";
function createSvgObjectsFromPcbSilkscreenLine(pcbSilkscreenLine, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const {
    x1,
    y1,
    x2,
    y2,
    stroke_width,
    layer = "top",
    pcb_silkscreen_line_id
  } = pcbSilkscreenLine;
  if (layerFilter && layer !== layerFilter) return [];
  if (typeof x1 !== "number" || typeof y1 !== "number" || typeof x2 !== "number" || typeof y2 !== "number") {
    debugPcb(
      `[pcb_silkscreen_line] Invalid coordinates for "${pcb_silkscreen_line_id}": expected x1, y1, x2, y2 as numbers, got x1=${JSON.stringify(x1)}, y1=${JSON.stringify(y1)}, x2=${JSON.stringify(x2)}, y2=${JSON.stringify(y2)}`
    );
    return [];
  }
  const [transformedX1, transformedY1] = applyToPoint23(transform, [x1, y1]);
  const [transformedX2, transformedY2] = applyToPoint23(transform, [x2, y2]);
  const transformedStrokeWidth = stroke_width * Math.abs(transform.a);
  const color = layer === "bottom" ? colorMap2.silkscreen.bottom : colorMap2.silkscreen.top;
  return [
    {
      name: "line",
      type: "element",
      attributes: {
        x1: transformedX1.toString(),
        y1: transformedY1.toString(),
        x2: transformedX2.toString(),
        y2: transformedY2.toString(),
        stroke: color,
        "stroke-width": transformedStrokeWidth.toString(),
        class: `pcb-silkscreen-line pcb-silkscreen-${layer}`,
        "data-pcb-silkscreen-line-id": pcb_silkscreen_line_id,
        "data-type": "pcb_silkscreen_line",
        "data-pcb-layer": layer
      },
      value: "",
      children: []
    }
  ];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-pill.ts
import { applyToPoint as applyToPoint24 } from "transformation-matrix";
function createSvgObjectsFromPcbSilkscreenPill(pcbSilkscreenPill, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const {
    center,
    width,
    height,
    layer = "top",
    pcb_silkscreen_pill_id,
    ccw_rotation = 0
  } = pcbSilkscreenPill;
  if (layerFilter && layer !== layerFilter) return [];
  const [transformedX, transformedY] = applyToPoint24(transform, [
    center.x,
    center.y
  ]);
  const transformedWidth = width * Math.abs(transform.a);
  const transformedHeight = height * Math.abs(transform.d);
  const minDimension = Math.min(width, height);
  const baseCornerRadius = minDimension / 2;
  const transformedCornerRadiusX = baseCornerRadius * Math.abs(transform.a);
  const transformedCornerRadiusY = baseCornerRadius * Math.abs(transform.d);
  const color = layer === "bottom" ? colorMap2.silkscreen.bottom : colorMap2.silkscreen.top;
  const svgObject = {
    name: "rect",
    type: "element",
    attributes: {
      x: (transformedX - transformedWidth / 2).toString(),
      y: (transformedY - transformedHeight / 2).toString(),
      width: transformedWidth.toString(),
      height: transformedHeight.toString(),
      rx: transformedCornerRadiusX.toString(),
      ry: transformedCornerRadiusY.toString(),
      fill: "none",
      stroke: color,
      "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
      class: `pcb-silkscreen-pill pcb-silkscreen-${layer}`,
      "data-pcb-silkscreen-pill-id": pcb_silkscreen_pill_id,
      "data-type": "pcb_silkscreen_pill",
      "data-pcb-layer": layer,
      ...ccw_rotation !== 0 && {
        transform: `rotate(${-ccw_rotation} ${transformedX} ${transformedY})`
      }
    },
    value: "",
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-oval.ts
import { applyToPoint as applyToPoint25 } from "transformation-matrix";
function createSvgObjectsFromPcbSilkscreenOval(pcbSilkscreenOval, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const {
    center,
    radius_x,
    radius_y,
    layer = "top",
    pcb_silkscreen_oval_id,
    ccw_rotation = 0
  } = pcbSilkscreenOval;
  if (layerFilter && layer !== layerFilter) return [];
  if (!center || typeof center.x !== "number" || typeof center.y !== "number" || typeof radius_x !== "number" || typeof radius_y !== "number") {
    debugPcb(
      `[pcb_silkscreen_oval] Invalid data for "${pcb_silkscreen_oval_id}": expected center {x: number, y: number}, radius_x: number, radius_y: number, got center=${JSON.stringify(center)}, radius_x=${JSON.stringify(radius_x)}, radius_y=${JSON.stringify(radius_y)}`
    );
    return [];
  }
  const [transformedX, transformedY] = applyToPoint25(transform, [
    center.x,
    center.y
  ]);
  const transformedRadiusX = radius_x * Math.abs(transform.a);
  const transformedRadiusY = radius_y * Math.abs(transform.d);
  const color = layer === "bottom" ? colorMap2.silkscreen.bottom : colorMap2.silkscreen.top;
  const svgObject = {
    name: "ellipse",
    type: "element",
    attributes: {
      cx: transformedX.toString(),
      cy: transformedY.toString(),
      rx: transformedRadiusX.toString(),
      ry: transformedRadiusY.toString(),
      fill: "none",
      stroke: color,
      "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
      class: `pcb-silkscreen-oval pcb-silkscreen-${layer}`,
      "data-pcb-silkscreen-oval-id": pcb_silkscreen_oval_id,
      "data-type": "pcb_silkscreen_oval",
      "data-pcb-layer": layer,
      ...ccw_rotation !== 0 && {
        transform: `rotate(${-ccw_rotation} ${transformedX} ${transformedY})`
      }
    },
    value: "",
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-courtyard-rect.ts
import { applyToPoint as applyToPoint26 } from "transformation-matrix";
function createSvgObjectsFromPcbCourtyardRect(pcbCourtyardRect, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const {
    center,
    width,
    height,
    layer = "top",
    pcb_courtyard_rect_id,
    ccw_rotation = 0
  } = pcbCourtyardRect;
  if (layerFilter && layer !== layerFilter) return [];
  if (!center || typeof center.x !== "number" || typeof center.y !== "number" || typeof width !== "number" || typeof height !== "number") {
    debugPcb(
      `[pcb_courtyard_rect] Invalid data for "${pcb_courtyard_rect_id}": expected center {x: number, y: number}, width: number, height: number, got center=${JSON.stringify(center)}, width=${JSON.stringify(width)}, height=${JSON.stringify(height)}`
    );
    return [];
  }
  const [transformedX, transformedY] = applyToPoint26(transform, [
    center.x,
    center.y
  ]);
  const transformedWidth = width * Math.abs(transform.a);
  const transformedHeight = height * Math.abs(transform.d);
  const transformedStrokeWidth = 0.05 * Math.abs(transform.a);
  const color = layer === "bottom" ? colorMap2.courtyard.bottom : colorMap2.courtyard.top;
  const attributes = {
    x: (-transformedWidth / 2).toString(),
    y: (-transformedHeight / 2).toString(),
    width: transformedWidth.toString(),
    height: transformedHeight.toString(),
    class: `pcb-courtyard-rect pcb-courtyard-${layer}`,
    "data-pcb-courtyard-rect-id": pcb_courtyard_rect_id,
    "data-type": "pcb_courtyard_rect",
    "data-pcb-layer": layer,
    "stroke-linejoin": "round"
  };
  if (typeof ccw_rotation === "number" && ccw_rotation !== 0) {
    attributes.transform = `translate(${transformedX} ${transformedY}) rotate(${-ccw_rotation})`;
  } else {
    attributes.x = (transformedX - transformedWidth / 2).toString();
    attributes.y = (transformedY - transformedHeight / 2).toString();
  }
  attributes.fill = "none";
  attributes.stroke = color;
  attributes["stroke-width"] = transformedStrokeWidth.toString();
  const svgObject = {
    name: "rect",
    type: "element",
    attributes,
    value: "",
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-courtyard-polygon.ts
import { applyToPoint as applyToPoint27 } from "transformation-matrix";
function createSvgObjectsFromPcbCourtyardPolygon(pcbCourtyardPolygon, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const {
    layer = "top",
    pcb_courtyard_polygon_id,
    points,
    color
  } = pcbCourtyardPolygon;
  if (layerFilter && layer !== layerFilter) return [];
  if (!points || points.length === 0) {
    debugPcb(
      `[pcb_courtyard_polygon] Invalid data for "${pcb_courtyard_polygon_id}": expected non-empty array of points, got ${JSON.stringify(points)}`
    );
    return [];
  }
  const transformedPoints = points.map(
    (p) => applyToPoint27(transform, [p.x, p.y])
  );
  const pointsString = transformedPoints.map((p) => `${p[0]},${p[1]}`).join(" ");
  const transformedStrokeWidth = 0.05 * Math.abs(transform.a);
  const strokeColor = color ?? (layer === "bottom" ? colorMap2.courtyard.bottom : colorMap2.courtyard.top);
  const attributes = {
    points: pointsString,
    class: `pcb-courtyard-polygon pcb-courtyard-${layer}`,
    "data-pcb-courtyard-polygon-id": pcb_courtyard_polygon_id,
    "data-type": "pcb_courtyard_polygon",
    "data-pcb-layer": layer,
    fill: "none",
    stroke: strokeColor,
    "stroke-width": transformedStrokeWidth.toString(),
    "stroke-linejoin": "round"
  };
  const svgObject = {
    name: "polygon",
    type: "element",
    attributes,
    value: "",
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-courtyard-outline.ts
import { applyToPoint as applyToPoint28 } from "transformation-matrix";
function createSvgObjectsFromPcbCourtyardOutline(pcbCourtyardOutline, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const { layer, pcb_courtyard_outline_id, outline } = pcbCourtyardOutline;
  if (layerFilter && layer !== layerFilter) return [];
  if (!outline || outline.length === 0) {
    debugPcb(
      `[pcb_courtyard_outline] Invalid data for "${pcb_courtyard_outline_id}": expected non-empty array of points, got ${JSON.stringify(outline)}`
    );
    return [];
  }
  const transformedPoints = outline.map(
    (p) => applyToPoint28(transform, [p.x, p.y])
  );
  const pointsString = transformedPoints.map((p) => `${p[0]},${p[1]}`).join(" ");
  const transformedStrokeWidth = 0.05 * Math.abs(transform.a);
  const strokeColor = layer === "bottom" ? colorMap2.courtyard.bottom : colorMap2.courtyard.top;
  const attributes = {
    points: pointsString,
    class: `pcb-courtyard-outline pcb-courtyard-${layer}`,
    "data-pcb-courtyard-outline-id": pcb_courtyard_outline_id,
    "data-type": "pcb_courtyard_outline",
    "data-pcb-layer": layer,
    fill: "none",
    stroke: strokeColor,
    "stroke-width": transformedStrokeWidth.toString(),
    "stroke-linejoin": "round"
  };
  const svgObject = {
    name: "polygon",
    type: "element",
    attributes,
    value: "",
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-courtyard-circle.ts
import { applyToPoint as applyToPoint29 } from "transformation-matrix";
function createSvgObjectsFromPcbCourtyardCircle(pcbCourtyardCircle, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  const {
    center,
    radius,
    layer = "top",
    pcb_courtyard_circle_id
  } = pcbCourtyardCircle;
  if (layerFilter && layer !== layerFilter) return [];
  if (!center || typeof center.x !== "number" || typeof center.y !== "number" || typeof radius !== "number") {
    console.error(
      `[pcb_courtyard_circle] Invalid data for "${pcb_courtyard_circle_id}": expected center {x: number, y: number}, radius: number, got center=${JSON.stringify(center)}, radius=${JSON.stringify(radius)}`
    );
    return [];
  }
  const [transformedX, transformedY] = applyToPoint29(transform, [
    center.x,
    center.y
  ]);
  const transformedRadius = radius * Math.abs(transform.a);
  const transformedStrokeWidth = 0.05 * Math.abs(transform.a);
  const color = layer === "bottom" ? colorMap2.courtyard.bottom : colorMap2.courtyard.top;
  const attributes = {
    cx: transformedX.toString(),
    cy: transformedY.toString(),
    r: transformedRadius.toString(),
    class: `pcb-courtyard-circle pcb-courtyard-${layer}`,
    "data-pcb-courtyard-circle-id": pcb_courtyard_circle_id,
    "data-type": "pcb_courtyard_circle",
    "data-pcb-layer": layer
  };
  attributes.fill = "none";
  attributes.stroke = color;
  attributes["stroke-width"] = transformedStrokeWidth.toString();
  const svgObject = {
    name: "circle",
    type: "element",
    attributes,
    value: "",
    children: []
  };
  return [svgObject];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-trace.ts
import {
  distance as distance4
} from "circuit-json";
import { applyToPoint as applyToPoint32 } from "transformation-matrix";

// lib/pcb/clip-pcb-trace-segment-at-copper-pour-boundary.ts
import { distance as distance2 } from "circuit-json";
var EPSILON = 1e-9;
function clipPcbTraceSegmentAtCopperPourBoundary(segment, pour) {
  const { startIsInsideCopperPour, endIsInsideCopperPour, start, end } = segment;
  if (startIsInsideCopperPour === endIsInsideCopperPour) return segment;
  const numericStart = toNumericPoint(start);
  const numericEnd = toNumericPoint(end);
  const intersectionFractions = getBoundaryRings(pour).flatMap(
    (ring) => getRingIntersectionFractions(ring, numericStart, numericEnd)
  );
  if (intersectionFractions.length === 0) return segment;
  const intersectionFraction = endIsInsideCopperPour ? Math.min(...intersectionFractions) : Math.max(...intersectionFractions);
  const intersection = interpolatePoint(
    numericStart,
    numericEnd,
    intersectionFraction
  );
  const intersectionWidth = interpolateNumber(
    segment.startWidth,
    segment.endWidth,
    intersectionFraction
  );
  const clippedSegment = {
    ...segment,
    start: startIsInsideCopperPour ? intersection : start,
    end: endIsInsideCopperPour ? intersection : end,
    startWidth: startIsInsideCopperPour ? intersectionWidth : segment.startWidth,
    endWidth: endIsInsideCopperPour ? intersectionWidth : segment.endWidth
  };
  return areSamePoint(clippedSegment.start, clippedSegment.end) ? null : clippedSegment;
}
function interpolateNumber(start, end, fraction) {
  return start + (end - start) * fraction;
}
function getBoundaryRings(pour) {
  switch (pour.shape) {
    case "rect":
      return [getRectRing(pour)];
    case "polygon":
      return [pour.points.map(toNumericPoint)];
    case "brep":
      return [
        pour.brep_shape.outer_ring.vertices.map(toRingPoint),
        ...pour.brep_shape.inner_rings.map(
          (ring) => ring.vertices.map(toRingPoint)
        )
      ];
  }
}
function getRectRing(pour) {
  const center = toNumericPoint(pour.center);
  const halfWidth = pour.width / 2;
  const halfHeight = pour.height / 2;
  const rotationRadians = (pour.rotation ?? 0) * Math.PI / 180;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight }
  ].map((point) => ({
    x: center.x + point.x * cos - point.y * sin,
    y: center.y + point.x * sin + point.y * cos
  }));
}
function getRingIntersectionFractions(ring, traceStart, traceEnd) {
  const intersectionFractions = [];
  for (let index = 0; index < ring.length; index++) {
    const start = ring[index];
    const end = ring[(index + 1) % ring.length];
    if (!start || !end) continue;
    if (start.bulge) {
      intersectionFractions.push(
        ...getLineArcIntersectionFractions(
          traceStart,
          traceEnd,
          start,
          end,
          start.bulge
        )
      );
      continue;
    }
    const intersectionFraction = getLineSegmentIntersectionFraction(
      traceStart,
      traceEnd,
      start,
      end
    );
    if (intersectionFraction !== null) {
      intersectionFractions.push(intersectionFraction);
    }
  }
  return intersectionFractions;
}
function getLineArcIntersectionFractions(traceStart, traceEnd, arcStart, arcEnd, bulge) {
  const chordX = arcEnd.x - arcStart.x;
  const chordY = arcEnd.y - arcStart.y;
  const chordLength = Math.hypot(chordX, chordY);
  if (chordLength < EPSILON || Math.abs(bulge) < EPSILON) {
    const intersectionFraction = getLineSegmentIntersectionFraction(
      traceStart,
      traceEnd,
      arcStart,
      arcEnd
    );
    return intersectionFraction === null ? [] : [intersectionFraction];
  }
  const centerOffset = chordLength * (1 - bulge ** 2) / (4 * bulge);
  const center = {
    x: (arcStart.x + arcEnd.x) / 2 - chordY / chordLength * centerOffset,
    y: (arcStart.y + arcEnd.y) / 2 + chordX / chordLength * centerOffset
  };
  const startAngle = Math.atan2(arcStart.y - center.y, arcStart.x - center.x);
  const sweepAngle = 4 * Math.atan(bulge);
  const radius = Math.hypot(arcStart.x - center.x, arcStart.y - center.y);
  const traceVector = {
    x: traceEnd.x - traceStart.x,
    y: traceEnd.y - traceStart.y
  };
  const centerToTraceStart = {
    x: traceStart.x - center.x,
    y: traceStart.y - center.y
  };
  const quadraticA = dot(traceVector, traceVector);
  if (quadraticA < EPSILON) return [];
  const quadraticB = 2 * dot(centerToTraceStart, traceVector);
  const quadraticC = dot(centerToTraceStart, centerToTraceStart) - radius ** 2;
  const discriminant = quadraticB ** 2 - 4 * quadraticA * quadraticC;
  if (discriminant < -EPSILON) return [];
  const squareRootDiscriminant = Math.sqrt(Math.max(0, discriminant));
  return [
    (-quadraticB - squareRootDiscriminant) / (2 * quadraticA),
    (-quadraticB + squareRootDiscriminant) / (2 * quadraticA)
  ].filter((traceFraction) => {
    if (traceFraction < -EPSILON || traceFraction > 1 + EPSILON) return false;
    const intersection = interpolatePoint(traceStart, traceEnd, traceFraction);
    const intersectionAngle = Math.atan2(
      intersection.y - center.y,
      intersection.x - center.x
    );
    const angleFromArcStart = sweepAngle > 0 ? normalizePositiveAngle(intersectionAngle - startAngle) : normalizePositiveAngle(startAngle - intersectionAngle);
    return angleFromArcStart <= Math.abs(sweepAngle) + EPSILON;
  });
}
function getLineSegmentIntersectionFraction(traceStart, traceEnd, boundaryStart, boundaryEnd) {
  const traceVector = {
    x: traceEnd.x - traceStart.x,
    y: traceEnd.y - traceStart.y
  };
  const boundaryVector = {
    x: boundaryEnd.x - boundaryStart.x,
    y: boundaryEnd.y - boundaryStart.y
  };
  const denominator = cross(traceVector, boundaryVector);
  if (Math.abs(denominator) < EPSILON) return null;
  const offset = {
    x: boundaryStart.x - traceStart.x,
    y: boundaryStart.y - traceStart.y
  };
  const traceFraction = cross(offset, boundaryVector) / denominator;
  const boundaryFraction = cross(offset, traceVector) / denominator;
  if (traceFraction < -EPSILON || traceFraction > 1 + EPSILON || boundaryFraction < -EPSILON || boundaryFraction > 1 + EPSILON) {
    return null;
  }
  return Math.min(1, Math.max(0, traceFraction));
}
function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}
function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}
function normalizePositiveAngle(angle) {
  const fullTurn = 2 * Math.PI;
  const normalized = angle % fullTurn;
  return normalized < 0 ? normalized + fullTurn : normalized;
}
function interpolatePoint(start, end, fraction) {
  return {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction
  };
}
function toNumericPoint(point) {
  return {
    x: distance2.parse(point.x),
    y: distance2.parse(point.y)
  };
}
function toRingPoint(point) {
  return { ...toNumericPoint(point), bulge: point.bulge };
}
function areSamePoint(a, b) {
  const numericA = toNumericPoint(a);
  const numericB = toNumericPoint(b);
  return Math.abs(numericA.x - numericB.x) < EPSILON && Math.abs(numericA.y - numericB.y) < EPSILON;
}

// lib/pcb/get-pcb-trace-segments.ts
import {
  distance as distance3
} from "circuit-json";

// lib/pcb/get-wire-taper-polygon.ts
function hasWireTaper(point) {
  if (!point || typeof point !== "object") return false;
  return "route_type" in point && point.route_type === "wire" && ("start_width" in point || "end_width" in point || "width_interpolation_mode" in point);
}
function getWireTaperSegments(route) {
  const result = [];
  for (let i = 0; i < route.length - 1; i++) {
    const point = route[i];
    if (!hasWireTaper(point)) continue;
    const next = route[i + 1];
    if (!next) continue;
    const end = next.route_type === "through_pad" ? next.start : { x: next.x, y: next.y };
    const layer = next.route_type === "via" ? next.from_layer : next.route_type === "through_pad" ? next.start_layer : next.layer;
    if (!end || layer !== point.layer || point.width !== point.start_width)
      continue;
    const segment = {
      start: { x: point.x, y: point.y },
      end,
      start_width: point.start_width,
      end_width: point.end_width,
      width_interpolation_mode: point.width_interpolation_mode,
      layer: point.layer,
      is_inside_copper_pour: Boolean(
        point.is_inside_copper_pour && next.is_inside_copper_pour
      )
    };
    if (isValidWireTaperSegment(segment)) result.push(segment);
  }
  return result;
}
function getWireTaperPolygon(segment) {
  const { start, end, start_width: w0, end_width: w1 } = segment;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!isValidWireTaperSegment(segment)) return [];
  const delta = Math.abs(w1 - w0);
  const steps = segment.width_interpolation_mode === "linear" ? 1 : Math.max(
    1,
    Math.ceil(Math.sqrt(delta / (1e-3 + delta * 1e-6) * (3 / 8)))
  );
  const nx = -dy / length;
  const ny = dx / length;
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = w0 <= w1 ? t : 1 - t;
    const width = segment.width_interpolation_mode === "quadratic" ? Math.min(w0, w1) + delta * u * u : w0 + (w1 - w0) * t;
    const halfWidth = width / 2;
    const x = start.x + dx * t;
    const y = start.y + dy * t;
    left.push({ x: x + nx * halfWidth, y: y + ny * halfWidth });
    right.push({ x: x - nx * halfWidth, y: y - ny * halfWidth });
  }
  return [...left, ...right.reverse()];
}
function isValidWireTaperSegment(segment) {
  const { start, end, start_width: w0, end_width: w1 } = segment;
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (![start.x, start.y, end.x, end.y, length, w0, w1].every(Number.isFinite) || length <= 0 || w0 <= 0 || w1 <= 0)
    return false;
  if (segment.width_interpolation_mode !== "linear" && segment.width_interpolation_mode !== "quadratic")
    return false;
  return true;
}

// lib/pcb/get-pcb-trace-segments.ts
function getPcbTracePoints(point) {
  switch (point.route_type) {
    case "through_pad":
      return [point.start, point.end];
    default:
      return [point];
  }
}
function getPcbTraceSegments(route) {
  const segments = [];
  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i];
    const end = route[i + 1];
    if (!start || !end) continue;
    if (hasWireTaper(start)) continue;
    const startAnchor = start.route_type === "through_pad" ? start.end : start;
    const endAnchor = end.route_type === "through_pad" ? end.start : end;
    const layer = start.route_type === "wire" ? start.layer : start.route_type === "through_pad" ? start.end_layer : end.route_type === "wire" ? end.layer : end.route_type === "through_pad" ? end.start_layer : null;
    if (!layer) continue;
    if (isSamePoint(startAnchor, endAnchor)) continue;
    const startIsInsideCopperPour = isInsideCopperPour(start);
    const endIsInsideCopperPour = isInsideCopperPour(end);
    const startWidth = getTracePointWidth(start) ?? getTracePointWidth(end) ?? 0;
    const endWidth = getTracePointWidth(end) ?? startWidth;
    segments.push({
      start: startAnchor,
      end: endAnchor,
      layer,
      width: startWidth,
      startWidth,
      endWidth,
      isInsideCopperPour: startIsInsideCopperPour && endIsInsideCopperPour,
      startIsInsideCopperPour,
      endIsInsideCopperPour,
      copperPourId: startIsInsideCopperPour ? getCopperPourId(start) : endIsInsideCopperPour ? getCopperPourId(end) : void 0
    });
  }
  for (const point of route) {
    if (!point || point.route_type !== "through_pad") continue;
    for (const layer of /* @__PURE__ */ new Set([point.start_layer, point.end_layer])) {
      segments.push({
        start: point.start,
        end: point.end,
        layer,
        width: point.width,
        startWidth: point.width,
        endWidth: point.width,
        isInsideCopperPour: false,
        startIsInsideCopperPour: false,
        endIsInsideCopperPour: false
      });
    }
  }
  return segments;
}
function getTracePointWidth(point) {
  return "width" in point ? distance3.parse(point.width) : void 0;
}
function isInsideCopperPour(point) {
  return "is_inside_copper_pour" in point && point.is_inside_copper_pour === true;
}
function getCopperPourId(point) {
  if (!("copper_pour_id" in point)) return void 0;
  return point.copper_pour_id;
}
function isSamePoint(a, b) {
  const ax = distance3.parse(a.x);
  const ay = distance3.parse(a.y);
  const bx = distance3.parse(b.x);
  const by = distance3.parse(b.y);
  return ax === bx && ay === by;
}

// lib/pcb/get-interpolated-trace-polygon.ts
function getInterpolatedTracePolygon(points) {
  const left = [];
  const right = [];
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    if (!point) continue;
    const direction = getTraceDirectionAt(points, index);
    const normal = normalize3(-direction.y, direction.x);
    const offset = point.width / 2;
    left.push({
      x: point.x + normal.x * offset,
      y: point.y + normal.y * offset
    });
    right.push({
      x: point.x - normal.x * offset,
      y: point.y - normal.y * offset
    });
  }
  return left.concat(right.reverse());
}
function getTraceDirectionAt(points, index) {
  if (points.length < 2) return { x: 1, y: 0 };
  if (index <= 0) {
    return getDirection(points[0], points[1]);
  }
  if (index >= points.length - 1) {
    return getDirection(points[points.length - 2], points[points.length - 1]);
  }
  const previousDirection = getDirection(points[index - 1], points[index]);
  const nextDirection = getDirection(points[index], points[index + 1]);
  const averagedDirection = normalize3(
    previousDirection.x + nextDirection.x,
    previousDirection.y + nextDirection.y
  );
  if (averagedDirection.x !== 0 || averagedDirection.y !== 0) {
    return averagedDirection;
  }
  if (previousDirection.x !== 0 || previousDirection.y !== 0) {
    return previousDirection;
  }
  if (nextDirection.x !== 0 || nextDirection.y !== 0) {
    return nextDirection;
  }
  return { x: 1, y: 0 };
}
function getDirection(start, end) {
  if (!start || !end) return { x: 1, y: 0 };
  const direction = normalize3(end.x - start.x, end.y - start.y);
  return direction.x === 0 && direction.y === 0 ? { x: 1, y: 0 } : direction;
}
function normalize3(x, y) {
  const length = Math.hypot(x, y);
  if (length <= Number.EPSILON) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-via.ts
import { applyToPoint as applyToPoint30 } from "transformation-matrix";

// lib/pcb/svg-object-fns/create-soldermask-overlay-element.ts
function createSoldermaskOverlayElement({
  elementType,
  shapeAttributes,
  layer,
  fillColor,
  fillOpacity,
  className,
  additionalAttributes
}) {
  const baseAttributes = {
    class: className,
    fill: fillColor,
    "fill-opacity": fillOpacity,
    "data-type": "pcb_soldermask",
    "data-pcb-layer": layer,
    ...shapeAttributes,
    ...additionalAttributes
  };
  return {
    name: elementType,
    type: "element",
    value: "",
    children: [],
    attributes: baseAttributes
  };
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-via.ts
function createSvgObjectsFromPcbVia(hole, ctx) {
  const { transform, colorMap: colorMap2 } = ctx;
  const layer = ctx.layer ?? "top";
  const showSolderMask = ctx.showSolderMask && (layer === "top" || layer === "bottom");
  if (showSolderMask && !hole.layers.includes(layer)) return [];
  const boardOwnerId = ctx.boardOwnerMap?.has(hole.pcb_via_id) ? hole.pcb_via_id : hole.pcb_trace_id ?? hole.pcb_via_id;
  const board = ctx.boardOwnerMap?.get(boardOwnerId);
  const tenting = hole;
  const isTented = (layer === "top" ? tenting.tented_on_top : tenting.tented_on_bottom) ?? tenting.is_tented ?? (layer === "top" ? board?.default_via_tented_on_top : board?.default_via_tented_on_bottom);
  const [x, y] = applyToPoint30(transform, [hole.x, hole.y]);
  const scaledOuterWidth = hole.outer_diameter * Math.abs(transform.a);
  const scaledOuterHeight = hole.outer_diameter * Math.abs(transform.a);
  const scaledHoleWidth = hole.hole_diameter * Math.abs(transform.a);
  const scaledHoleHeight = hole.hole_diameter * Math.abs(transform.a);
  const outerRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2;
  const innerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2;
  const via = {
    name: "g",
    type: "element",
    value: "",
    attributes: {
      "data-type": "pcb_via",
      "data-pcb-layer": showSolderMask && isTented ? layer : "through"
    },
    children: [
      {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-outer",
          fill: colorMap2.copper[showSolderMask ? layer : "top"],
          cx: x.toString(),
          cy: y.toString(),
          r: outerRadius.toString(),
          "data-type": "pcb_via",
          "data-pcb-layer": showSolderMask ? layer : "top"
        }
      },
      {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap2.drill,
          cx: x.toString(),
          cy: y.toString(),
          r: innerRadius.toString(),
          "data-type": "pcb_via",
          "data-pcb-layer": "drill"
        }
      }
    ]
  };
  if (showSolderMask && isTented) {
    via.children.push(
      createSoldermaskOverlayElement({
        elementType: "circle",
        shapeAttributes: {
          cx: x.toString(),
          cy: y.toString(),
          r: outerRadius.toString()
        },
        layer,
        fillColor: colorMap2.soldermaskWithCopperUnderneath[layer],
        fillOpacity: "1",
        className: "pcb-via-tenting"
      })
    );
  }
  return [via];
}

// lib/pcb/svg-object-fns/get-copper-pour-shape.ts
import {
  applyToPoint as applyToPoint31,
  compose as compose4,
  rotate as rotate4,
  toString as matrixToString6,
  translate as translate4
} from "transformation-matrix";
function getCopperPourShape(pour, transform) {
  if (pour.shape === "rect") {
    const [cx, cy] = applyToPoint31(transform, [pour.center.x, pour.center.y]);
    const scaledWidth = pour.width * Math.abs(transform.a);
    const scaledHeight = pour.height * Math.abs(transform.d);
    const svgRotation = -(pour.rotation ?? 0);
    return {
      elementType: "rect",
      shapeAttributes: {
        x: (-scaledWidth / 2).toString(),
        y: (-scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        transform: matrixToString6(
          compose4(translate4(cx, cy), rotate4(svgRotation * Math.PI / 180))
        )
      }
    };
  }
  if (pour.shape === "polygon") {
    if (!pour.points || pour.points.length === 0) return null;
    const pointsString = pour.points.map((p) => applyToPoint31(transform, [p.x, p.y])).map((p) => `${p[0]},${p[1]}`).join(" ");
    return {
      elementType: "polygon",
      shapeAttributes: { points: pointsString }
    };
  }
  if (pour.shape === "brep") {
    const { brep_shape } = pour;
    let d = ringToPathD(brep_shape.outer_ring.vertices, transform);
    for (const inner_ring of brep_shape.inner_rings ?? []) {
      d += ` ${ringToPathD(inner_ring.vertices, transform)}`;
    }
    return {
      elementType: "path",
      shapeAttributes: { d, "fill-rule": "evenodd" }
    };
  }
  return null;
}

// lib/pcb/copper-pour-trace-mask.ts
function getCopperPourTraceMaskId(layer) {
  return `copper-pour-trace-mask-${layer}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}
function getCopperPourTraceMaskIdForLayer({
  layer,
  circuitJson
}) {
  for (const elm of circuitJson) {
    if (elm.type !== "pcb_copper_pour") continue;
    const pour = elm;
    if (pour.layer !== layer) continue;
    return getCopperPourTraceMaskId(layer);
  }
  return void 0;
}
function createCopperPourTraceMaskDefs({
  circuitJson,
  transform,
  svgWidth,
  svgHeight,
  usedMaskIds
}) {
  if (usedMaskIds.size === 0) return null;
  const poursByMaskId = /* @__PURE__ */ new Map();
  for (const elm of circuitJson) {
    if (elm.type !== "pcb_copper_pour") continue;
    const pour = elm;
    const maskId = getCopperPourTraceMaskId(pour.layer);
    if (!usedMaskIds.has(maskId)) continue;
    const pours = poursByMaskId.get(maskId);
    if (pours) {
      pours.push(pour);
    } else {
      poursByMaskId.set(maskId, [pour]);
    }
  }
  if (poursByMaskId.size === 0) return null;
  const masks = [];
  for (const [maskId, pours] of poursByMaskId) {
    const maskChildren = [
      {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          x: "0",
          y: "0",
          width: svgWidth.toString(),
          height: svgHeight.toString(),
          fill: "#fff"
        }
      }
    ];
    for (const pour of pours) {
      const shape = getCopperPourShape(pour, transform);
      if (!shape) continue;
      maskChildren.push({
        name: shape.elementType,
        type: "element",
        value: "",
        children: [],
        attributes: {
          ...shape.shapeAttributes,
          fill: "#000"
        }
      });
    }
    masks.push({
      name: "mask",
      type: "element",
      value: "",
      children: maskChildren,
      attributes: {
        id: maskId,
        maskUnits: "userSpaceOnUse",
        x: "0",
        y: "0",
        width: svgWidth.toString(),
        height: svgHeight.toString()
      }
    });
  }
  return {
    name: "defs",
    type: "element",
    value: "",
    children: masks,
    attributes: {
      class: "copper-pour-trace-mask-defs"
    }
  };
}
function groupCopperPourMaskedTraceObjects(objects) {
  const result = [];
  const groupsByMask = /* @__PURE__ */ new Map();
  for (const object of objects) {
    const dataType = object.attributes?.["data-type"];
    const mask = object.attributes?.mask;
    const isTrace = dataType === "pcb_trace" || dataType === "pcb_trace_soldermask";
    if (!isTrace || !mask?.includes("#copper-pour-trace-mask-")) {
      result.push(object);
      continue;
    }
    let group2 = groupsByMask.get(mask);
    if (!group2) {
      const groupObject = {
        name: "g",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-trace-mask-group",
          mask
        }
      };
      group2 = {
        object: groupObject,
        pathsByAttributes: /* @__PURE__ */ new Map()
      };
      groupsByMask.set(mask, group2);
      result.push(groupObject);
    }
    const { mask: _mask, d = "", ...attributes } = object.attributes;
    const attributesKey = JSON.stringify(attributes);
    const existingPath = group2.pathsByAttributes.get(attributesKey);
    if (existingPath) {
      existingPath.attributes.d += ` ${d}`;
      continue;
    }
    const mergedPath = {
      ...object,
      attributes: { ...attributes, d }
    };
    group2.pathsByAttributes.set(attributesKey, mergedPath);
    group2.object.children.push(mergedPath);
  }
  return result;
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-trace.ts
function createSvgObjectsFromPcbTrace(trace, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2, showSolderMask } = ctx;
  if (!trace.route || !Array.isArray(trace.route) || trace.route.length === 0)
    return [];
  const svgObjects = [];
  const standaloneViaPositionKeys = getStandaloneViaPositionKeys(ctx);
  const pourMaskIdByLayer = /* @__PURE__ */ new Map();
  const drawableSegments = [];
  for (const originalSegment of getPcbTraceSegments(trace.route)) {
    let segment = originalSegment;
    if (segment.isInsideCopperPour) {
      continue;
    }
    if (segment.copperPourId && segment.startIsInsideCopperPour !== segment.endIsInsideCopperPour) {
      const copperPour = ctx.circuitJson?.find(
        (element) => element.type === "pcb_copper_pour" && element.pcb_copper_pour_id === segment.copperPourId
      );
      if (copperPour) {
        const clippedSegment = clipPcbTraceSegmentAtCopperPourBoundary(
          segment,
          copperPour
        );
        if (!clippedSegment) continue;
        segment = clippedSegment;
      }
    }
    const layer = segment.layer;
    if (!layer) continue;
    if (layerFilter && layer !== layerFilter) continue;
    drawableSegments.push(segment);
  }
  const getPourMaskAttributes = (layer) => {
    if (!pourMaskIdByLayer.has(layer)) {
      pourMaskIdByLayer.set(
        layer,
        ctx.circuitJson ? getCopperPourTraceMaskIdForLayer({
          layer,
          circuitJson: ctx.circuitJson
        }) : void 0
      );
    }
    const pourMaskId = pourMaskIdByLayer.get(layer);
    if (pourMaskId) {
      ctx.usedCopperPourTraceMaskIds?.add(pourMaskId);
      return { mask: `url(#${pourMaskId})` };
    }
    return {};
  };
  for (const point of getWireTaperSegments(trace.route)) {
    if (layerFilter && point.layer !== layerFilter) continue;
    if (point.is_inside_copper_pour) continue;
    const polygon = getWireTaperPolygon(point).map(
      (p) => applyToPoint32(transform, p)
    );
    if (!polygon.length) continue;
    const color = showSolderMask ? colorMap2.soldermaskWithCopperUnderneath[point.layer] : layerNameToColor(point.layer, colorMap2);
    svgObjects.push({
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: showSolderMask ? "pcb-soldermask" : "pcb-trace",
        fill: color,
        stroke: "none",
        d: polygon.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z",
        "data-type": showSolderMask ? "pcb_trace_soldermask" : "pcb_trace",
        "data-route-type": "wire",
        "data-wire-taper": "true",
        "data-width-interpolation-mode": point.width_interpolation_mode,
        "data-pcb-layer": point.layer,
        ...getPourMaskAttributes(point.layer)
      }
    });
  }
  if (trace.route_thickness_mode === "interpolated") {
    for (const segments of getConnectedTraceSegmentGroups(drawableSegments)) {
      const layer = segments[0]?.layer;
      if (!layer) continue;
      const d = getInterpolatedTracePathData(segments, transform);
      if (!d) continue;
      const copperColor = layerNameToColor(layer, colorMap2);
      const maskColor = colorMap2.soldermaskWithCopperUnderneath[layer];
      svgObjects.push({
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: showSolderMask ? "pcb-soldermask" : "pcb-trace",
          fill: showSolderMask ? maskColor : copperColor,
          stroke: "none",
          d,
          "shape-rendering": "geometricPrecision",
          "data-type": showSolderMask ? "pcb_trace_soldermask" : "pcb_trace",
          "data-pcb-layer": layer,
          ...getPourMaskAttributes(layer)
        }
      });
    }
  } else {
    for (const segment of drawableSegments) {
      const startPoint = applyToPoint32(transform, [
        segment.start.x,
        segment.start.y
      ]);
      const endPoint = applyToPoint32(transform, [segment.end.x, segment.end.y]);
      const layer = segment.layer;
      const copperColor = layerNameToColor(layer, colorMap2);
      const maskColor = colorMap2.soldermaskWithCopperUnderneath[layer];
      const width = segment.width ? (segment.width * Math.abs(transform.a)).toString() : "0.3";
      const pourMaskAttributes = getPourMaskAttributes(layer);
      if (showSolderMask) {
        const maskObject = {
          name: "path",
          type: "element",
          value: "",
          children: [],
          attributes: {
            class: "pcb-soldermask",
            stroke: maskColor,
            fill: "none",
            d: `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`,
            "stroke-width": width,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "shape-rendering": "crispEdges",
            "data-type": "pcb_trace_soldermask",
            "data-pcb-layer": layer,
            ...pourMaskAttributes
          }
        };
        svgObjects.push(maskObject);
      } else {
        const maskOnlyObject = {
          name: "path",
          type: "element",
          value: "",
          children: [],
          attributes: {
            class: "pcb-trace",
            stroke: copperColor,
            fill: "none",
            d: `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`,
            "stroke-width": width,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "shape-rendering": "crispEdges",
            "data-type": "pcb_trace",
            "data-pcb-layer": layer,
            ...pourMaskAttributes
          }
        };
        svgObjects.push(maskOnlyObject);
      }
    }
  }
  for (const [index, point] of trace.route.entries()) {
    if (!point || point.route_type !== "via") continue;
    if (standaloneViaPositionKeys.has(getPositionKey(point))) continue;
    svgObjects.push(
      ...createSvgObjectsFromPcbVia(
        createSyntheticViaFromRoutePoint(trace, point, index, ctx),
        ctx
      )
    );
  }
  return svgObjects;
}
function getConnectedTraceSegmentGroups(segments) {
  const groups = [];
  for (const segment of segments) {
    const currentGroup = groups[groups.length - 1];
    const previousSegment = currentGroup?.[currentGroup.length - 1];
    if (currentGroup && previousSegment?.layer === segment.layer && areSamePosition(previousSegment.end, segment.start)) {
      currentGroup.push(segment);
    } else {
      groups.push([segment]);
    }
  }
  return groups;
}
function getInterpolatedTracePathData(segments, transform) {
  const firstSegment = segments[0];
  if (!firstSegment) return "";
  const centerLine = [
    {
      x: distance4.parse(firstSegment.start.x),
      y: distance4.parse(firstSegment.start.y),
      width: firstSegment.startWidth
    },
    ...segments.map((segment) => ({
      x: distance4.parse(segment.end.x),
      y: distance4.parse(segment.end.y),
      width: segment.endWidth
    }))
  ];
  const polygon = getInterpolatedTracePolygon(centerLine);
  const transformedPolygon = polygon.map(
    (point) => applyToPoint32(transform, [point.x, point.y])
  );
  const [firstPoint, ...remainingPoints] = transformedPolygon;
  if (!firstPoint) return "";
  return [
    `M ${firstPoint[0]} ${firstPoint[1]}`,
    ...remainingPoints.map((point) => `L ${point[0]} ${point[1]}`),
    "Z"
  ].join(" ");
}
function areSamePosition(a, b) {
  return distance4.parse(a.x) === distance4.parse(b.x) && distance4.parse(a.y) === distance4.parse(b.y);
}
function createSyntheticViaFromRoutePoint(trace, point, routeIndex, ctx) {
  const width = getAdjacentTraceWidth(trace.route, routeIndex);
  const board = ctx.boardOwnerMap?.get(trace.pcb_trace_id);
  const { holeDiameter, outerDiameter } = getRouteViaDiameters(board, width);
  return {
    type: "pcb_via",
    pcb_via_id: `${trace.pcb_trace_id}_route_via_${routeIndex}`,
    pcb_trace_id: trace.pcb_trace_id,
    subcircuit_id: trace.subcircuit_id,
    pcb_group_id: trace.pcb_group_id,
    x: point.x,
    y: point.y,
    outer_diameter: outerDiameter,
    hole_diameter: holeDiameter,
    layers: [point.from_layer, point.to_layer],
    tented_on_top: point.tented_on_top,
    tented_on_bottom: point.tented_on_bottom
  };
}
function getAdjacentTraceWidth(route, routeIndex) {
  const prevWidth = findTraceWidth(route, routeIndex, -1);
  const nextWidth = findTraceWidth(route, routeIndex, 1);
  return Math.max(prevWidth ?? 0, nextWidth ?? 0);
}
function findTraceWidth(route, startIndex, direction) {
  for (let index = startIndex + direction; index >= 0 && index < route.length; index += direction) {
    const point = route[index];
    if (hasWireTaper(point))
      return direction === -1 ? point.end_width : point.start_width;
    if (!point || !("width" in point) || typeof point.width !== "number") {
      continue;
    }
    return point.width;
  }
  return void 0;
}
function getRouteViaDiameters(board, adjacentTraceWidth) {
  const boardMinViaHoleDiameter = parseOptionalDistance(
    board?.min_via_hole_diameter
  );
  const boardMinViaPadDiameter = parseOptionalDistance(
    board?.min_via_pad_diameter
  );
  const fallbackHoleDiameter = Math.max(adjacentTraceWidth, 0.3);
  const fallbackOuterDiameter = Math.max(fallbackHoleDiameter * 2, 0.6);
  const holeDiameter = boardMinViaHoleDiameter ?? fallbackHoleDiameter;
  const outerDiameter = boardMinViaPadDiameter ?? fallbackOuterDiameter;
  return {
    holeDiameter,
    outerDiameter
  };
}
function getStandaloneViaPositionKeys(ctx) {
  return new Set(
    ctx.circuitJson?.filter((elm) => elm.type === "pcb_via").map((via) => getPositionKey(via)) ?? []
  );
}
function getPositionKey(point) {
  const x = parseOptionalDistance(point.x);
  const y = parseOptionalDistance(point.y);
  if (x !== void 0 && y !== void 0) {
    return `${x}:${y}`;
  }
  return `${String(point.x)}:${String(point.y)}`;
}
function parseOptionalDistance(value) {
  if (value === null || value === void 0) {
    return void 0;
  }
  const result = distance4.safeParse(value);
  return result.success ? result.data : void 0;
}

// lib/pcb/svg-object-fns/create-svg-objects-from-smt-pads.ts
import { applyToPoint as applyToPoint33 } from "transformation-matrix";
function createSvgObjectsFromSmtPad(pad, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2, showSolderMask } = ctx;
  if (layerFilter && pad.layer !== layerFilter) return [];
  const padDataAttributes = getPadDataAttributes(pad, ctx.circuitJson);
  const isCoveredWithSolderMask = Boolean(pad?.is_covered_with_solder_mask);
  const shouldShowSolderMask = showSolderMask && isCoveredWithSolderMask;
  const soldermaskWithCopperUnderneathColor = colorMap2.soldermaskWithCopperUnderneath[pad.layer] ?? colorMap2.soldermaskWithCopperUnderneath.top;
  const soldermaskMargin = (pad.soldermask_margin ?? 0) * Math.abs(transform.a);
  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const width = pad.width * Math.abs(transform.a);
    const height = pad.height * Math.abs(transform.d);
    const [x, y] = applyToPoint33(transform, [pad.x, pad.y]);
    const cornerRadiusValue = pad.corner_radius ?? pad.rect_border_radius ?? 0;
    const scaledBorderRadius = cornerRadiusValue * Math.abs(transform.a);
    const m = {
      left: (pad.soldermask_margin_left ?? pad.soldermask_margin ?? 0) * Math.abs(transform.a),
      right: (pad.soldermask_margin_right ?? pad.soldermask_margin ?? 0) * Math.abs(transform.a),
      top: (pad.soldermask_margin_top ?? pad.soldermask_margin ?? 0) * Math.abs(transform.a),
      bottom: (pad.soldermask_margin_bottom ?? pad.soldermask_margin ?? 0) * Math.abs(transform.a)
    };
    const isNegativeMargin = m.left < 0 || m.right < 0 || m.top < 0 || m.bottom < 0;
    const isZeroMargin = m.left === 0 && m.right === 0 && m.top === 0 && m.bottom === 0;
    if (pad.shape === "rotated_rect" && pad.ccw_rotation) {
      const padElement2 = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad",
          fill: layerNameToColor(pad.layer, colorMap2),
          x: (-width / 2).toString(),
          y: (-height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
          ...padDataAttributes,
          ...scaledBorderRadius ? {
            rx: scaledBorderRadius.toString(),
            ry: scaledBorderRadius.toString()
          } : {}
        }
      };
      if (!shouldShowSolderMask) {
        return [padElement2];
      }
      const maskWidth2 = width + m.left + m.right;
      const maskHeight2 = height + m.top + m.bottom;
      const maskBorderRadius2 = scaledBorderRadius ? scaledBorderRadius + soldermaskMargin : 0;
      if (isNegativeMargin) {
        const coveredPadElement = {
          name: "rect",
          type: "element",
          value: "",
          children: [],
          attributes: {
            class: "pcb-pad-covered",
            fill: soldermaskWithCopperUnderneathColor,
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
            "data-type": "pcb_smtpad",
            "data-pcb-layer": pad.layer,
            ...scaledBorderRadius ? {
              rx: scaledBorderRadius.toString(),
              ry: scaledBorderRadius.toString()
            } : {}
          }
        };
        const exposedOpeningElement = {
          name: "rect",
          type: "element",
          value: "",
          children: [],
          attributes: {
            class: "pcb-pad-exposed",
            fill: layerNameToColor(pad.layer, colorMap2),
            x: (-width / 2 - m.left).toString(),
            y: (-height / 2 - m.top).toString(),
            width: maskWidth2.toString(),
            height: maskHeight2.toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
            "data-type": "pcb_soldermask",
            "data-pcb-layer": pad.layer,
            ...maskBorderRadius2 > 0 ? {
              rx: maskBorderRadius2.toString(),
              ry: maskBorderRadius2.toString()
            } : {}
          }
        };
        return [coveredPadElement, exposedOpeningElement];
      }
      if (isZeroMargin) {
        const coveredPadElement = {
          name: "rect",
          type: "element",
          value: "",
          children: [],
          attributes: {
            class: "pcb-pad-covered",
            fill: soldermaskWithCopperUnderneathColor,
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
            "data-type": "pcb_smtpad",
            "data-pcb-layer": pad.layer,
            ...scaledBorderRadius ? {
              rx: scaledBorderRadius.toString(),
              ry: scaledBorderRadius.toString()
            } : {}
          }
        };
        return [coveredPadElement];
      }
      const substrateElement2 = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-soldermask-cutout",
          fill: colorMap2.substrate,
          x: (-width / 2 - m.left).toString(),
          y: (-height / 2 - m.top).toString(),
          width: maskWidth2.toString(),
          height: maskHeight2.toString(),
          transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
          ...maskBorderRadius2 > 0 ? {
            rx: maskBorderRadius2.toString(),
            ry: maskBorderRadius2.toString()
          } : {},
          "data-type": "pcb_soldermask_opening",
          "data-pcb-layer": pad.layer
        }
      };
      return [substrateElement2, padElement2];
    }
    const padElement = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-pad",
        fill: layerNameToColor(pad.layer, colorMap2),
        x: (x - width / 2).toString(),
        y: (y - height / 2).toString(),
        width: width.toString(),
        height: height.toString(),
        "data-type": "pcb_smtpad",
        "data-pcb-layer": pad.layer,
        ...padDataAttributes,
        ...scaledBorderRadius ? {
          rx: scaledBorderRadius.toString(),
          ry: scaledBorderRadius.toString()
        } : {}
      }
    };
    if (!shouldShowSolderMask) {
      return [padElement];
    }
    const maskWidth = width + m.left + m.right;
    const maskHeight = height + m.top + m.bottom;
    const maskBorderRadius = scaledBorderRadius ? scaledBorderRadius + soldermaskMargin : 0;
    if (isNegativeMargin) {
      const coveredPadElement = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
          ...scaledBorderRadius ? {
            rx: scaledBorderRadius.toString(),
            ry: scaledBorderRadius.toString()
          } : {}
        }
      };
      const exposedOpeningElement = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-exposed",
          fill: layerNameToColor(pad.layer, colorMap2),
          x: (x - width / 2 - m.left).toString(),
          y: (y - height / 2 - m.top).toString(),
          width: maskWidth.toString(),
          height: maskHeight.toString(),
          "data-type": "pcb_soldermask",
          "data-pcb-layer": pad.layer,
          ...maskBorderRadius > 0 ? {
            rx: maskBorderRadius.toString(),
            ry: maskBorderRadius.toString()
          } : {}
        }
      };
      return [coveredPadElement, exposedOpeningElement];
    }
    if (isZeroMargin) {
      const coveredPadElement = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          ...maskBorderRadius > 0 ? {
            rx: scaledBorderRadius.toString(),
            ry: scaledBorderRadius.toString()
          } : {},
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer
        }
      };
      return [coveredPadElement];
    }
    const substrateElement = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap2.substrate,
        x: (x - width / 2 - m.left).toString(),
        y: (y - height / 2 - m.top).toString(),
        width: maskWidth.toString(),
        height: maskHeight.toString(),
        ...maskBorderRadius > 0 ? {
          rx: maskBorderRadius.toString(),
          ry: maskBorderRadius.toString()
        } : {},
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": pad.layer
      }
    };
    return [substrateElement, padElement];
  }
  if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    const isRotated = pad.shape === "rotated_pill";
    const width = pad.width * Math.abs(transform.a);
    const height = pad.height * Math.abs(transform.d);
    const radius = pad.radius * Math.abs(transform.a);
    const [x, y] = applyToPoint33(transform, [pad.x, pad.y]);
    const rotationTransformAttributes = isRotated ? {
      transform: `translate(${x} ${y}) rotate(${-(pad.ccw_rotation ?? 0)})`
    } : void 0;
    const baseAttributes = {
      class: "pcb-pad",
      fill: layerNameToColor(pad.layer, colorMap2),
      x: isRotated ? (-width / 2).toString() : (x - width / 2).toString(),
      y: isRotated ? (-height / 2).toString() : (y - height / 2).toString(),
      width: width.toString(),
      height: height.toString(),
      rx: radius.toString(),
      ry: radius.toString(),
      "data-type": "pcb_smtpad",
      "data-pcb-layer": pad.layer,
      ...padDataAttributes,
      ...rotationTransformAttributes ?? {}
    };
    const padElement = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: baseAttributes
    };
    if (!shouldShowSolderMask) {
      return [padElement];
    }
    const maskWidth = width + 2 * soldermaskMargin;
    const maskHeight = height + 2 * soldermaskMargin;
    const maskRadius = radius + soldermaskMargin;
    if (soldermaskMargin < 0) {
      const coveredPadElement = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          x: isRotated ? (-width / 2).toString() : (x - width / 2).toString(),
          y: isRotated ? (-height / 2).toString() : (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          ry: radius.toString(),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
          ...rotationTransformAttributes ?? {}
        }
      };
      const exposedAttributes = {
        class: "pcb-pad-exposed",
        fill: layerNameToColor(pad.layer, colorMap2),
        x: isRotated ? (-maskWidth / 2).toString() : (x - maskWidth / 2).toString(),
        y: isRotated ? (-maskHeight / 2).toString() : (y - maskHeight / 2).toString(),
        width: maskWidth.toString(),
        height: maskHeight.toString(),
        rx: maskRadius.toString(),
        ry: maskRadius.toString(),
        "data-type": "pcb_soldermask",
        "data-pcb-layer": pad.layer,
        ...rotationTransformAttributes ?? {}
      };
      const exposedOpeningElement = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: exposedAttributes
      };
      return [coveredPadElement, exposedOpeningElement];
    }
    if (soldermaskMargin === 0) {
      const coveredPadElement = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          x: isRotated ? (-width / 2).toString() : (x - width / 2).toString(),
          y: isRotated ? (-height / 2).toString() : (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          ry: radius.toString(),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
          ...rotationTransformAttributes ?? {}
        }
      };
      return [coveredPadElement];
    }
    const substrateAttributes = {
      class: "pcb-soldermask-cutout",
      fill: colorMap2.substrate,
      x: isRotated ? (-maskWidth / 2).toString() : (x - maskWidth / 2).toString(),
      y: isRotated ? (-maskHeight / 2).toString() : (y - maskHeight / 2).toString(),
      width: maskWidth.toString(),
      height: maskHeight.toString(),
      rx: maskRadius.toString(),
      ry: maskRadius.toString(),
      "data-type": "pcb_soldermask_opening",
      "data-pcb-layer": pad.layer,
      ...rotationTransformAttributes ?? {}
    };
    const substrateElement = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: substrateAttributes
    };
    return [substrateElement, padElement];
  }
  if (pad.shape === "circle") {
    const radius = pad.radius * Math.abs(transform.a);
    const [x, y] = applyToPoint33(transform, [pad.x, pad.y]);
    const padElement = {
      name: "circle",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-pad",
        fill: layerNameToColor(pad.layer, colorMap2),
        cx: x.toString(),
        cy: y.toString(),
        r: radius.toString(),
        "data-type": "pcb_smtpad",
        "data-pcb-layer": pad.layer,
        ...padDataAttributes
      }
    };
    if (!shouldShowSolderMask) {
      return [padElement];
    }
    const maskRadius = radius + soldermaskMargin;
    if (soldermaskMargin < 0) {
      const coveredPadElement = {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer
        }
      };
      const exposedOpeningElement = {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-exposed",
          fill: layerNameToColor(pad.layer, colorMap2),
          cx: x.toString(),
          cy: y.toString(),
          r: maskRadius.toString(),
          "data-type": "pcb_soldermask",
          "data-pcb-layer": pad.layer
        }
      };
      return [coveredPadElement, exposedOpeningElement];
    }
    if (soldermaskMargin === 0) {
      const coveredPadElement = {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer
        }
      };
      return [coveredPadElement];
    }
    const substrateElement = {
      name: "circle",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap2.substrate,
        cx: x.toString(),
        cy: y.toString(),
        r: maskRadius.toString(),
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": pad.layer
      }
    };
    return [substrateElement, padElement];
  }
  if (pad.shape === "polygon") {
    const points = (pad.points ?? []).map(
      (point) => applyToPoint33(transform, [point.x, point.y])
    );
    const padElement = {
      name: "polygon",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-pad",
        fill: layerNameToColor(pad.layer, colorMap2),
        points: points.map((p) => p.join(",")).join(" "),
        "data-type": "pcb_smtpad",
        "data-pcb-layer": pad.layer,
        ...padDataAttributes
      }
    };
    if (!shouldShowSolderMask) {
      return [padElement];
    }
    let maskPoints = points;
    if (soldermaskMargin !== 0) {
      const centroidX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
      const centroidY = points.reduce((sum, p) => sum + p[1], 0) / points.length;
      maskPoints = points.map(([px, py]) => {
        const dx = px - centroidX;
        const dy = py - centroidY;
        const distance9 = Math.sqrt(dx * dx + dy * dy);
        if (distance9 === 0) return [px, py];
        const normalizedDx = dx / distance9;
        const normalizedDy = dy / distance9;
        return [
          px + normalizedDx * soldermaskMargin,
          py + normalizedDy * soldermaskMargin
        ];
      });
    }
    if (soldermaskMargin < 0) {
      const coveredPadElement = {
        name: "polygon",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          points: points.map((p) => p.join(",")).join(" "),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer
        }
      };
      const exposedOpeningElement = {
        name: "polygon",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-exposed",
          fill: layerNameToColor(pad.layer, colorMap2),
          points: maskPoints.map((p) => p.join(",")).join(" "),
          "data-type": "pcb_soldermask",
          "data-pcb-layer": pad.layer
        }
      };
      return [coveredPadElement, exposedOpeningElement];
    }
    if (soldermaskMargin === 0) {
      const coveredPadElement = {
        name: "polygon",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          points: points.map((p) => p.join(",")).join(" "),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer
        }
      };
      return [coveredPadElement];
    }
    const substrateElement = {
      name: "polygon",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap2.substrate,
        points: maskPoints.map((p) => p.join(",")).join(" "),
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": pad.layer
      }
    };
    return [substrateElement, padElement];
  }
  return [];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-board.ts
import { applyToPoint as applyToPoint35 } from "transformation-matrix";

// lib/utils/create-pcb-component-anchor-offset-indicators.ts
import { applyToPoint as applyToPoint34 } from "transformation-matrix";
var OFFSET_THRESHOLD_MM = 0.05;
var TICK_SIZE_PX = 4;
var LABEL_GAP_PX = 8;
var LABEL_FONT_SIZE_PX = 11;
var STROKE_WIDTH_PX = 1;
var ANCHOR_MARKER_SIZE_PX = 5;
var ANCHOR_MARKER_STROKE_WIDTH_PX = 1.5;
var COMPONENT_ANCHOR_MARKER_RADIUS_PX = 2;
var CONNECTOR_GROUP_GAP_PX = ANCHOR_MARKER_SIZE_PX + 2;
var CONNECTOR_COMPONENT_GAP_PX = COMPONENT_ANCHOR_MARKER_RADIUS_PX + 2;
var DIMENSION_ANCHOR_CLEARANCE_PX = ANCHOR_MARKER_SIZE_PX + TICK_SIZE_PX + 6;
var COMPONENT_GAP_PX = 15;
var COMPONENT_SIDE_GAP_PX = 10;
var DISTANCE_MULTIPLIER = 0.2;
var MAX_OFFSET_PX = 50;
function createAnchorOffsetIndicators(params) {
  const {
    groupAnchorPosition,
    componentPosition,
    transform,
    componentWidth = 0,
    componentHeight = 0,
    displayXOffset,
    displayYOffset
  } = params;
  const objects = [];
  const [screenGroupAnchorX, screenGroupAnchorY] = applyToPoint34(transform, [
    groupAnchorPosition.x,
    groupAnchorPosition.y
  ]);
  const [screenComponentX, screenComponentY] = applyToPoint34(transform, [
    componentPosition.x,
    componentPosition.y
  ]);
  const offsetX = componentPosition.x - groupAnchorPosition.x;
  const offsetY = componentPosition.y - groupAnchorPosition.y;
  const scale10 = Math.abs(transform.a);
  const screenComponentWidth = componentWidth * scale10;
  const screenComponentHeight = componentHeight * scale10;
  objects.push(createAnchorMarker(screenGroupAnchorX, screenGroupAnchorY));
  const trimmedConnector = getTrimmedConnectorLine(
    screenGroupAnchorX,
    screenGroupAnchorY,
    screenComponentX,
    screenComponentY
  );
  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: trimmedConnector.x1.toString(),
      y1: trimmedConnector.y1.toString(),
      x2: trimmedConnector.x2.toString(),
      y2: trimmedConnector.y2.toString(),
      stroke: "#ffffff",
      "stroke-width": "0.5",
      "stroke-dasharray": "3,3",
      opacity: "0.5",
      class: "anchor-offset-connector"
    },
    children: [],
    value: ""
  });
  objects.push({
    name: "circle",
    type: "element",
    attributes: {
      cx: screenComponentX.toString(),
      cy: screenComponentY.toString(),
      r: COMPONENT_ANCHOR_MARKER_RADIUS_PX.toString(),
      fill: "#ffffff",
      opacity: "0.7",
      class: "anchor-offset-component-marker"
    },
    children: [],
    value: ""
  });
  const yDistance = Math.abs(screenComponentY - screenGroupAnchorY);
  const xDistance = Math.abs(screenComponentX - screenGroupAnchorX);
  const totalDistance = Math.sqrt(xDistance * xDistance + yDistance * yDistance);
  const componentHeightOffset = screenComponentHeight / 2 + COMPONENT_GAP_PX;
  const dynamicOffset = Math.max(
    componentHeightOffset,
    Math.min(MAX_OFFSET_PX, totalDistance * DISTANCE_MULTIPLIER)
  );
  let horizontalLineY = offsetY > 0 ? screenComponentY - dynamicOffset : screenComponentY + dynamicOffset;
  const componentWidthOffset = screenComponentWidth / 2 + COMPONENT_SIDE_GAP_PX;
  let verticalLineX = offsetX > 0 ? screenComponentX + componentWidthOffset : screenComponentX - componentWidthOffset;
  if (isTooCloseToAnchor(horizontalLineY, screenGroupAnchorY) || isTooCloseToAnchor(horizontalLineY, screenComponentY)) {
    const minY = Math.min(screenGroupAnchorY, screenComponentY);
    const maxY = Math.max(screenGroupAnchorY, screenComponentY);
    const candidateAbove = minY - DIMENSION_ANCHOR_CLEARANCE_PX;
    const candidateBelow = maxY + DIMENSION_ANCHOR_CLEARANCE_PX;
    horizontalLineY = Math.abs(horizontalLineY - candidateAbove) < Math.abs(horizontalLineY - candidateBelow) ? candidateAbove : candidateBelow;
  }
  if (isTooCloseToAnchor(verticalLineX, screenGroupAnchorX) || isTooCloseToAnchor(verticalLineX, screenComponentX)) {
    const minX = Math.min(screenGroupAnchorX, screenComponentX);
    const maxX = Math.max(screenGroupAnchorX, screenComponentX);
    const candidateLeft = minX - DIMENSION_ANCHOR_CLEARANCE_PX;
    const candidateRight = maxX + DIMENSION_ANCHOR_CLEARANCE_PX;
    verticalLineX = Math.abs(verticalLineX - candidateLeft) < Math.abs(verticalLineX - candidateRight) ? candidateLeft : candidateRight;
  }
  if (Math.abs(offsetX) > OFFSET_THRESHOLD_MM) {
    objects.push(
      ...createHorizontalDimension({
        startX: screenGroupAnchorX,
        endX: screenComponentX,
        y: horizontalLineY,
        offsetMm: offsetX,
        offsetY,
        displayOffset: displayXOffset
      })
    );
  }
  if (Math.abs(offsetY) > OFFSET_THRESHOLD_MM) {
    objects.push(
      ...createVerticalDimension({
        x: verticalLineX,
        startY: screenGroupAnchorY,
        endY: screenComponentY,
        offsetMm: offsetY,
        offsetX,
        displayOffset: displayYOffset
      })
    );
  }
  return objects;
}
function getTrimmedConnectorLine(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance9 = Math.hypot(dx, dy);
  const totalTrim = CONNECTOR_GROUP_GAP_PX + CONNECTOR_COMPONENT_GAP_PX;
  if (!(distance9 > totalTrim)) return { x1, y1, x2, y2 };
  const ux = dx / distance9;
  const uy = dy / distance9;
  return {
    x1: x1 + ux * CONNECTOR_GROUP_GAP_PX,
    y1: y1 + uy * CONNECTOR_GROUP_GAP_PX,
    x2: x2 - ux * CONNECTOR_COMPONENT_GAP_PX,
    y2: y2 - uy * CONNECTOR_COMPONENT_GAP_PX
  };
}
function isTooCloseToAnchor(value, anchorValue) {
  return Math.abs(value - anchorValue) < DIMENSION_ANCHOR_CLEARANCE_PX;
}
function createAnchorMarker(x, y) {
  return {
    name: "g",
    type: "element",
    attributes: {
      class: "anchor-offset-marker",
      "data-type": "anchor_offset_marker"
    },
    children: [
      {
        name: "line",
        type: "element",
        attributes: {
          x1: x.toString(),
          y1: (y - ANCHOR_MARKER_SIZE_PX).toString(),
          x2: x.toString(),
          y2: (y + ANCHOR_MARKER_SIZE_PX).toString(),
          stroke: "#ffffff",
          "stroke-width": ANCHOR_MARKER_STROKE_WIDTH_PX.toString(),
          "stroke-linecap": "round"
        },
        children: [],
        value: ""
      },
      {
        name: "line",
        type: "element",
        attributes: {
          x1: (x - ANCHOR_MARKER_SIZE_PX).toString(),
          y1: y.toString(),
          x2: (x + ANCHOR_MARKER_SIZE_PX).toString(),
          y2: y.toString(),
          stroke: "#ffffff",
          "stroke-width": ANCHOR_MARKER_STROKE_WIDTH_PX.toString(),
          "stroke-linecap": "round"
        },
        children: [],
        value: ""
      }
    ],
    value: ""
  };
}
function createHorizontalDimension({
  startX,
  endX,
  y,
  offsetMm,
  offsetY,
  displayOffset
}) {
  const objects = [];
  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: startX.toString(),
      y1: y.toString(),
      x2: endX.toString(),
      y2: y.toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString(),
      class: "anchor-offset-dimension-x"
    },
    children: [],
    value: ""
  });
  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: startX.toString(),
      y1: (y - TICK_SIZE_PX).toString(),
      x2: startX.toString(),
      y2: (y + TICK_SIZE_PX).toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString()
    },
    children: [],
    value: ""
  });
  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: endX.toString(),
      y1: (y - TICK_SIZE_PX).toString(),
      x2: endX.toString(),
      y2: (y + TICK_SIZE_PX).toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString()
    },
    children: [],
    value: ""
  });
  const midX = (startX + endX) / 2;
  const labelY = offsetY > 0 ? y - TICK_SIZE_PX - LABEL_GAP_PX : y + TICK_SIZE_PX + LABEL_GAP_PX;
  objects.push({
    name: "text",
    type: "element",
    attributes: {
      x: midX.toString(),
      y: labelY.toString(),
      fill: "#ffffff",
      "font-size": LABEL_FONT_SIZE_PX.toString(),
      "font-family": "Arial, sans-serif",
      "text-anchor": "middle",
      "dominant-baseline": offsetY > 0 ? "baseline" : "hanging",
      class: "anchor-offset-label"
    },
    children: [
      {
        type: "text",
        value: formatOffsetLabel("X", offsetMm, displayOffset),
        name: "",
        attributes: {},
        children: []
      }
    ],
    value: ""
  });
  return objects;
}
function createVerticalDimension({
  x,
  startY,
  endY,
  offsetMm,
  offsetX,
  displayOffset
}) {
  const objects = [];
  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: x.toString(),
      y1: startY.toString(),
      x2: x.toString(),
      y2: endY.toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString(),
      class: "anchor-offset-dimension-y"
    },
    children: [],
    value: ""
  });
  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: (x - TICK_SIZE_PX).toString(),
      y1: startY.toString(),
      x2: (x + TICK_SIZE_PX).toString(),
      y2: startY.toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString()
    },
    children: [],
    value: ""
  });
  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: (x - TICK_SIZE_PX).toString(),
      y1: endY.toString(),
      x2: (x + TICK_SIZE_PX).toString(),
      y2: endY.toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString()
    },
    children: [],
    value: ""
  });
  const midY = (startY + endY) / 2;
  const labelX = offsetX < 0 ? x - TICK_SIZE_PX - 4 : x + TICK_SIZE_PX + 4;
  objects.push({
    name: "text",
    type: "element",
    attributes: {
      x: labelX.toString(),
      y: midY.toString(),
      fill: "#ffffff",
      "font-size": LABEL_FONT_SIZE_PX.toString(),
      "font-family": "Arial, sans-serif",
      "text-anchor": offsetX < 0 ? "end" : "start",
      "dominant-baseline": "middle",
      class: "anchor-offset-label"
    },
    children: [
      {
        type: "text",
        value: formatOffsetLabel("Y", offsetMm, displayOffset),
        name: "",
        attributes: {},
        children: []
      }
    ],
    value: ""
  });
  return objects;
}
function formatOffsetLabel(axis, offsetMm, displayOffset) {
  const valueStr = typeof displayOffset === "string" ? displayOffset : offsetMm.toFixed(2);
  const hasUnit = typeof valueStr === "string" && valueStr.trim().endsWith("mm");
  const unitSuffix = hasUnit ? "" : "mm";
  return `${axis}: ${valueStr}${unitSuffix}`;
}

// lib/utils/get-point-from-elm.ts
function getPointFromElm(elm) {
  const candidate = elm?.anchor_position ?? elm?.center;
  if (candidate && typeof candidate.x === "number" && typeof candidate.y === "number") {
    return { x: candidate.x, y: candidate.y };
  }
  return void 0;
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-board.ts
function createSvgObjectsFromPcbBoard(pcbBoard, ctx) {
  const { transform, colorMap: colorMap2, showSolderMask, circuitJson } = ctx;
  const {
    width,
    height,
    center,
    outline,
    position_mode,
    anchor_position: boardAnchorPosition,
    display_offset_x,
    display_offset_y
  } = pcbBoard;
  let path;
  if (outline && Array.isArray(outline) && outline.length >= 3) {
    path = outline.map((point, index) => {
      const [x, y] = applyToPoint35(transform, [point.x, point.y]);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(" ");
  } else {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const topLeft = applyToPoint35(transform, [
      center.x - halfWidth,
      center.y - halfHeight
    ]);
    const topRight = applyToPoint35(transform, [
      center.x + halfWidth,
      center.y - halfHeight
    ]);
    const bottomRight = applyToPoint35(transform, [
      center.x + halfWidth,
      center.y + halfHeight
    ]);
    const bottomLeft = applyToPoint35(transform, [
      center.x - halfWidth,
      center.y + halfHeight
    ]);
    path = `M ${topLeft[0]} ${topLeft[1]} L ${topRight[0]} ${topRight[1]} L ${bottomRight[0]} ${bottomRight[1]} L ${bottomLeft[0]} ${bottomLeft[1]}`;
  }
  path += " Z";
  const svgObjects = [];
  if (showSolderMask) {
    const layer = ctx.layer ?? "top";
    const maskLayer = layer === "bottom" ? "soldermask-bottom" : "soldermask-top";
    svgObjects.push({
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-board-soldermask",
        d: path,
        fill: colorMap2.soldermask.top,
        "fill-opacity": "0.8",
        stroke: "none",
        "data-type": "pcb_soldermask",
        "data-pcb-layer": maskLayer
      }
    });
  }
  svgObjects.push({
    name: "path",
    type: "element",
    value: "",
    children: [],
    attributes: {
      class: "pcb-board",
      d: path,
      fill: "none",
      stroke: colorMap2.boardOutline,
      "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
      "data-type": "pcb_board",
      "data-pcb-layer": "board"
    }
  });
  if (ctx.showAnchorOffsets && circuitJson && position_mode === "relative_to_panel_anchor") {
    const panel = circuitJson.find(
      (elm) => elm.type === "pcb_panel"
    );
    if (panel) {
      const panelAnchorPosition = getPointFromElm(panel);
      if (panelAnchorPosition) {
        svgObjects.push(
          ...createAnchorOffsetIndicators({
            groupAnchorPosition: panelAnchorPosition,
            componentPosition: boardAnchorPosition ?? center,
            transform,
            componentWidth: width,
            componentHeight: height,
            displayXOffset: display_offset_x,
            displayYOffset: display_offset_y
          })
        );
      }
    }
  }
  return svgObjects;
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-panel.ts
import { applyToPoint as applyToPoint36 } from "transformation-matrix";
function createSvgObjectsFromPcbPanel(pcbPanel, ctx) {
  const { transform, colorMap: colorMap2, showSolderMask } = ctx;
  const width = Number(pcbPanel.width);
  const height = Number(pcbPanel.height);
  const center = pcbPanel.center ?? { x: width / 2, y: height / 2 };
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const topLeft = applyToPoint36(transform, [
    center.x - halfWidth,
    center.y - halfHeight
  ]);
  const topRight = applyToPoint36(transform, [
    center.x + halfWidth,
    center.y - halfHeight
  ]);
  const bottomRight = applyToPoint36(transform, [
    center.x + halfWidth,
    center.y + halfHeight
  ]);
  const bottomLeft = applyToPoint36(transform, [
    center.x - halfWidth,
    center.y + halfHeight
  ]);
  const path = `M ${topLeft[0]} ${topLeft[1]} L ${topRight[0]} ${topRight[1]} L ${bottomRight[0]} ${bottomRight[1]} L ${bottomLeft[0]} ${bottomLeft[1]} Z`;
  const isCoveredWithSolderMask = pcbPanel.covered_with_solder_mask !== false;
  const shouldShowSolderMask = Boolean(
    showSolderMask && isCoveredWithSolderMask
  );
  return [
    {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-panel",
        d: path,
        fill: "none",
        stroke: colorMap2.boardOutline,
        "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
        "data-type": "pcb_panel",
        "data-pcb-layer": "board"
      }
    }
  ];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-hole.ts
import { applyToPoint as applyToPoint37 } from "transformation-matrix";
function createSvgObjectsFromPcbHole(hole, ctx) {
  const { transform, colorMap: colorMap2, showSolderMask } = ctx;
  const layer = ctx.layer ?? "top";
  const [x, y] = applyToPoint37(transform, [hole.x, hole.y]);
  const isCoveredWithSolderMask = Boolean(hole.is_covered_with_solder_mask);
  const soldermaskMargin = (hole.soldermask_margin ?? 0) * Math.abs(transform.a);
  const shouldShowSolderMask = showSolderMask && isCoveredWithSolderMask && soldermaskMargin !== 0;
  const solderMaskColor = colorMap2.soldermask.top;
  if (hole.hole_shape === "circle" || hole.hole_shape === "square") {
    const scaledDiameter = hole.hole_diameter * Math.abs(transform.a);
    const radius = scaledDiameter / 2;
    if (hole.hole_shape === "circle") {
      const holeElement2 = {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole",
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
          fill: colorMap2.drill,
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill"
        },
        children: [],
        value: ""
      };
      if (!shouldShowSolderMask) {
        return [holeElement2];
      }
      const maskRadius = radius + soldermaskMargin;
      if (soldermaskMargin < 0) {
        const coveredElement = {
          name: "circle",
          type: "element",
          value: "",
          children: [],
          attributes: {
            class: "pcb-hole-covered",
            fill: solderMaskColor,
            cx: x.toString(),
            cy: y.toString(),
            r: radius.toString(),
            "data-type": "pcb_hole",
            "data-pcb-layer": "drill"
          }
        };
        const exposedElement = {
          name: "circle",
          type: "element",
          value: "",
          children: [],
          attributes: {
            class: "pcb-hole-exposed",
            fill: colorMap2.drill,
            cx: x.toString(),
            cy: y.toString(),
            r: maskRadius.toString(),
            "data-type": "pcb_soldermask",
            "data-pcb-layer": "drill"
          }
        };
        return [coveredElement, exposedElement];
      }
      const substrateElement2 = {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-soldermask-cutout",
          fill: colorMap2.substrate,
          cx: x.toString(),
          cy: y.toString(),
          r: maskRadius.toString(),
          "data-type": "pcb_soldermask_opening",
          "data-pcb-layer": layer
        }
      };
      return [substrateElement2, holeElement2];
    }
    const holeElement = {
      name: "rect",
      type: "element",
      attributes: {
        class: "pcb-hole",
        x: (x - radius).toString(),
        y: (y - radius).toString(),
        width: scaledDiameter.toString(),
        height: scaledDiameter.toString(),
        fill: colorMap2.drill,
        "data-type": "pcb_hole",
        "data-pcb-layer": "drill"
      },
      children: [],
      value: ""
    };
    if (!shouldShowSolderMask) {
      return [holeElement];
    }
    const maskDiameter = scaledDiameter + 2 * soldermaskMargin;
    if (soldermaskMargin < 0) {
      const coveredElement = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-covered",
          fill: solderMaskColor,
          x: (x - radius).toString(),
          y: (y - radius).toString(),
          width: scaledDiameter.toString(),
          height: scaledDiameter.toString(),
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill"
        }
      };
      const exposedElement = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-exposed",
          fill: colorMap2.drill,
          x: (x - maskDiameter / 2).toString(),
          y: (y - maskDiameter / 2).toString(),
          width: maskDiameter.toString(),
          height: maskDiameter.toString(),
          "data-type": "pcb_soldermask",
          "data-pcb-layer": "drill"
        }
      };
      return [coveredElement, exposedElement];
    }
    const substrateElement = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap2.substrate,
        x: (x - maskDiameter / 2).toString(),
        y: (y - maskDiameter / 2).toString(),
        width: maskDiameter.toString(),
        height: maskDiameter.toString(),
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": layer
      }
    };
    return [substrateElement, holeElement];
  }
  if (hole.hole_shape === "oval") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a);
    const scaledHeight = hole.hole_height * Math.abs(transform.a);
    const rx = scaledWidth / 2;
    const ry = scaledHeight / 2;
    const holeElement = {
      name: "ellipse",
      type: "element",
      attributes: {
        class: "pcb-hole",
        cx: x.toString(),
        cy: y.toString(),
        rx: rx.toString(),
        ry: ry.toString(),
        fill: colorMap2.drill,
        "data-type": "pcb_hole",
        "data-pcb-layer": "drill"
      },
      children: [],
      value: ""
    };
    if (!shouldShowSolderMask) {
      return [holeElement];
    }
    const maskRx = rx + soldermaskMargin;
    const maskRy = ry + soldermaskMargin;
    if (soldermaskMargin < 0) {
      const coveredElement = {
        name: "ellipse",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-covered",
          fill: solderMaskColor,
          cx: x.toString(),
          cy: y.toString(),
          rx: rx.toString(),
          ry: ry.toString(),
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill"
        }
      };
      const exposedElement = {
        name: "ellipse",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-exposed",
          fill: colorMap2.drill,
          cx: x.toString(),
          cy: y.toString(),
          rx: maskRx.toString(),
          ry: maskRy.toString(),
          "data-type": "pcb_soldermask",
          "data-pcb-layer": "drill"
        }
      };
      return [coveredElement, exposedElement];
    }
    const substrateElement = {
      name: "ellipse",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap2.substrate,
        cx: x.toString(),
        cy: y.toString(),
        rx: maskRx.toString(),
        ry: maskRy.toString(),
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": layer
      }
    };
    return [substrateElement, holeElement];
  }
  if (hole.hole_shape === "rect") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a);
    const scaledHeight = hole.hole_height * Math.abs(transform.a);
    const holeElement = {
      name: "rect",
      type: "element",
      attributes: {
        class: "pcb-hole",
        x: (x - scaledWidth / 2).toString(),
        y: (y - scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        fill: colorMap2.drill,
        "data-type": "pcb_hole",
        "data-pcb-layer": "drill"
      },
      children: [],
      value: ""
    };
    if (!shouldShowSolderMask) {
      return [holeElement];
    }
    const maskWidth = scaledWidth + 2 * soldermaskMargin;
    const maskHeight = scaledHeight + 2 * soldermaskMargin;
    if (soldermaskMargin < 0) {
      const coveredElement = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-covered",
          fill: solderMaskColor,
          x: (x - scaledWidth / 2).toString(),
          y: (y - scaledHeight / 2).toString(),
          width: scaledWidth.toString(),
          height: scaledHeight.toString(),
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill"
        }
      };
      const exposedElement = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-exposed",
          fill: colorMap2.drill,
          x: (x - maskWidth / 2).toString(),
          y: (y - maskHeight / 2).toString(),
          width: maskWidth.toString(),
          height: maskHeight.toString(),
          "data-type": "pcb_soldermask",
          "data-pcb-layer": "drill"
        }
      };
      return [coveredElement, exposedElement];
    }
    const substrateElement = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap2.substrate,
        x: (x - maskWidth / 2).toString(),
        y: (y - maskHeight / 2).toString(),
        width: maskWidth.toString(),
        height: maskHeight.toString(),
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": layer
      }
    };
    return [substrateElement, holeElement];
  }
  if (hole.hole_shape === "pill") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a);
    const scaledHeight = hole.hole_height * Math.abs(transform.a);
    const isHorizontal = scaledWidth > scaledHeight;
    const radius = Math.min(scaledWidth, scaledHeight) / 2;
    const straightLength = Math.abs(
      isHorizontal ? scaledWidth - scaledHeight : scaledHeight - scaledWidth
    );
    const pathD = isHorizontal ? (
      // Horizontal pill (wider than tall)
      `M${x - straightLength / 2},${y - radius} h${straightLength} a${radius},${radius} 0 0 1 0,${scaledHeight} h-${straightLength} a${radius},${radius} 0 0 1 0,-${scaledHeight} z`
    ) : (
      // Vertical pill (taller than wide)
      `M${x - radius},${y - straightLength / 2} v${straightLength} a${radius},${radius} 0 0 0 ${scaledWidth},0 v-${straightLength} a${radius},${radius} 0 0 0 -${scaledWidth},0 z`
    );
    const holeElement = {
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-hole",
        fill: colorMap2.drill,
        d: pathD,
        "data-type": "pcb_hole",
        "data-pcb-layer": "drill"
      },
      children: [],
      value: ""
    };
    if (!shouldShowSolderMask) {
      return [holeElement];
    }
    const maskWidth = scaledWidth + 2 * soldermaskMargin;
    const maskHeight = scaledHeight + 2 * soldermaskMargin;
    const maskIsHorizontal = maskWidth > maskHeight;
    const maskRadius = Math.min(maskWidth, maskHeight) / 2;
    const maskStraightLength = Math.abs(
      maskIsHorizontal ? maskWidth - maskHeight : maskHeight - maskWidth
    );
    const maskPathD = maskIsHorizontal ? (
      // Horizontal pill (wider than tall)
      `M${x - maskStraightLength / 2},${y - maskRadius} h${maskStraightLength} a${maskRadius},${maskRadius} 0 0 1 0,${maskHeight} h-${maskStraightLength} a${maskRadius},${maskRadius} 0 0 1 0,-${maskHeight} z`
    ) : (
      // Vertical pill (taller than wide)
      `M${x - maskRadius},${y - maskStraightLength / 2} v${maskStraightLength} a${maskRadius},${maskRadius} 0 0 0 ${maskWidth},0 v-${maskStraightLength} a${maskRadius},${maskRadius} 0 0 0 -${maskWidth},0 z`
    );
    if (soldermaskMargin < 0) {
      const coveredElement = {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-covered",
          fill: solderMaskColor,
          d: pathD,
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill"
        }
      };
      const exposedElement = {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-exposed",
          fill: colorMap2.drill,
          d: maskPathD,
          "data-type": "pcb_soldermask",
          "data-pcb-layer": "drill"
        }
      };
      return [coveredElement, exposedElement];
    }
    const substrateElement = {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap2.substrate,
        d: maskPathD,
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": layer
      }
    };
    return [substrateElement, holeElement];
  }
  if (hole.hole_shape === "rotated_pill") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a);
    const scaledHeight = hole.hole_height * Math.abs(transform.a);
    const rotation = "ccw_rotation" in hole ? hole.ccw_rotation ?? 0 : 0;
    const isHorizontal = scaledWidth > scaledHeight;
    const radius = Math.min(scaledWidth, scaledHeight) / 2;
    const straightLength = Math.abs(
      isHorizontal ? scaledWidth - scaledHeight : scaledHeight - scaledWidth
    );
    const pathD = isHorizontal ? (
      // Horizontal pill (wider than tall)
      `M${-straightLength / 2},${-radius} h${straightLength} a${radius},${radius} 0 0 1 0,${scaledHeight} h-${straightLength} a${radius},${radius} 0 0 1 0,-${scaledHeight} z`
    ) : (
      // Vertical pill (taller than wide)
      `M${-radius},${-straightLength / 2} v${straightLength} a${radius},${radius} 0 0 0 ${scaledWidth},0 v-${straightLength} a${radius},${radius} 0 0 0 -${scaledWidth},0 z`
    );
    const holeElement = {
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-hole",
        fill: colorMap2.drill,
        d: pathD,
        transform: `translate(${x} ${y}) rotate(${-rotation})`,
        "data-type": "pcb_hole",
        "data-pcb-layer": "drill"
      },
      children: [],
      value: ""
    };
    if (!shouldShowSolderMask) {
      return [holeElement];
    }
    const maskWidth = scaledWidth + 2 * soldermaskMargin;
    const maskHeight = scaledHeight + 2 * soldermaskMargin;
    const maskIsHorizontal = maskWidth > maskHeight;
    const maskRadius = Math.min(maskWidth, maskHeight) / 2;
    const maskStraightLength = Math.abs(
      maskIsHorizontal ? maskWidth - maskHeight : maskHeight - maskWidth
    );
    const maskPathD = maskIsHorizontal ? (
      // Horizontal pill (wider than tall)
      `M${-maskStraightLength / 2},${-maskRadius} h${maskStraightLength} a${maskRadius},${maskRadius} 0 0 1 0,${maskHeight} h-${maskStraightLength} a${maskRadius},${maskRadius} 0 0 1 0,-${maskHeight} z`
    ) : (
      // Vertical pill (taller than wide)
      `M${-maskRadius},${-maskStraightLength / 2} v${maskStraightLength} a${maskRadius},${maskRadius} 0 0 0 ${maskWidth},0 v-${maskStraightLength} a${maskRadius},${maskRadius} 0 0 0 -${maskWidth},0 z`
    );
    if (soldermaskMargin < 0) {
      const coveredElement = {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-covered",
          fill: solderMaskColor,
          d: pathD,
          transform: `translate(${x} ${y}) rotate(${-rotation})`,
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill"
        }
      };
      const exposedElement = {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-exposed",
          fill: colorMap2.drill,
          d: maskPathD,
          transform: `translate(${x} ${y}) rotate(${-rotation})`,
          "data-type": "pcb_soldermask",
          "data-pcb-layer": "drill"
        }
      };
      return [coveredElement, exposedElement];
    }
    const substrateElement = {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap2.substrate,
        d: maskPathD,
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": layer
      }
    };
    return [substrateElement, holeElement];
  }
  return [];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-rats-nests.ts
import {
  getFullConnectivityMapFromCircuitJson
} from "circuit-json-to-connectivity-map";
import "svgson";
import { applyToPoint as applyToPoint38 } from "transformation-matrix";

// lib/pcb/create-svg-objects-from-pcb-rats-nest/get-element-position.ts
import { su } from "@tscircuit/circuit-json-util";
var getElementPosition = (id, circuitJson) => {
  const pcbSmtpad = su(circuitJson).pcb_smtpad.get(id);
  if (pcbSmtpad && "x" in pcbSmtpad && "y" in pcbSmtpad) {
    return { x: pcbSmtpad.x, y: pcbSmtpad.y };
  }
  const pcbPlatedHole = su(circuitJson).pcb_plated_hole.get(id);
  if (pcbPlatedHole && "x" in pcbPlatedHole && "y" in pcbPlatedHole) {
    return { x: pcbPlatedHole.x, y: pcbPlatedHole.y };
  }
  return null;
};

// lib/pcb/create-svg-objects-from-pcb-rats-nest/find-nearest-point-in-nest.ts
import "circuit-json-to-connectivity-map";
var findNearestPointInNet = (sourcePoint, netId, connectivity, circuitJson) => {
  const connectedIds = connectivity.getIdsConnectedToNet(netId);
  let nearestPoint = null;
  let minDistance = Infinity;
  for (const id of connectedIds) {
    const pos = getElementPosition(id, circuitJson);
    if (pos) {
      const dx = sourcePoint.x - pos.x;
      const dy = sourcePoint.y - pos.y;
      const distance9 = Math.sqrt(dx * dx + dy * dy);
      if (distance9 > 0 && distance9 < minDistance) {
        minDistance = distance9;
        nearestPoint = pos;
      }
    }
  }
  return nearestPoint;
};

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-rats-nests.ts
import { su as su2 } from "@tscircuit/circuit-json-util";
function createSvgObjectsForRatsNest(circuitJson, ctx) {
  const { transform } = ctx;
  const connectivity = getFullConnectivityMapFromCircuitJson(circuitJson);
  const pcbPorts = circuitJson.filter((elm) => elm.type === "pcb_port");
  const sourceTraces = circuitJson.filter((elm) => elm.type === "source_trace");
  const ratsNestLines = [];
  pcbPorts.forEach((port, index) => {
    const portId = port.pcb_port_id;
    if (!portId) return;
    const netId = connectivity.getNetConnectedToId(portId);
    if (!netId) return;
    let isInNet = false;
    const sourcePort = su2(circuitJson).source_port.getWhere({
      pcb_port_id: portId
    });
    if (sourcePort && sourcePort.source_port_id) {
      const sourcePortId = sourcePort.source_port_id;
      for (const trace of sourceTraces) {
        if (Array.isArray(trace.connected_source_port_ids) && trace.connected_source_port_ids.includes(sourcePortId) && Array.isArray(trace.connected_source_net_ids) && trace.connected_source_net_ids.length > 0) {
          isInNet = true;
          break;
        }
      }
    }
    const startPoint = { x: port.x, y: port.y };
    const nearestPoint = findNearestPointInNet(
      startPoint,
      netId,
      connectivity,
      circuitJson
    );
    if (!nearestPoint) return;
    ratsNestLines.push({
      key: `${portId}-${index}`,
      startPoint,
      endPoint: nearestPoint,
      isInNet
    });
  });
  const svgObjects = [];
  for (const line of ratsNestLines) {
    const transformedStart = applyToPoint38(transform, [
      line.startPoint.x,
      line.startPoint.y
    ]);
    const transformedEnd = applyToPoint38(transform, [
      line.endPoint.x,
      line.endPoint.y
    ]);
    const attributes = {
      x1: transformedStart[0].toString(),
      y1: transformedStart[1].toString(),
      x2: transformedEnd[0].toString(),
      y2: transformedEnd[1].toString(),
      stroke: "white",
      "stroke-width": "1",
      "stroke-dasharray": "6,6",
      "data-type": "pcb_rats_nest",
      "data-pcb-layer": "overlay"
    };
    svgObjects.push({
      name: "line",
      type: "element",
      attributes,
      value: "",
      children: []
    });
  }
  return svgObjects;
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-cutout.ts
import {
  applyToPoint as applyToPoint39,
  compose as compose5,
  rotate as rotate5,
  translate as translate5,
  toString as matrixToString7
} from "transformation-matrix";
function createSvgObjectsFromPcbCutout(cutout, ctx) {
  const { transform, colorMap: colorMap2 } = ctx;
  if (cutout.shape === "rect") {
    const rectCutout = cutout;
    const [cx, cy] = applyToPoint39(transform, [
      rectCutout.center.x,
      rectCutout.center.y
    ]);
    const scaledWidth = rectCutout.width * Math.abs(transform.a);
    const scaledHeight = rectCutout.height * Math.abs(transform.d);
    const svgRotation = -(rectCutout.rotation ?? 0);
    const { corner_radius } = rectCutout;
    const baseCornerRadius = typeof corner_radius === "number" && corner_radius > 0 ? corner_radius : 0;
    const transformedCornerRadiusX = baseCornerRadius * Math.abs(transform.a);
    const transformedCornerRadiusY = baseCornerRadius * Math.abs(transform.d);
    const attributes = {
      class: "pcb-cutout pcb-cutout-rect",
      x: (-scaledWidth / 2).toString(),
      y: (-scaledHeight / 2).toString(),
      width: scaledWidth.toString(),
      height: scaledHeight.toString(),
      fill: colorMap2.drill,
      transform: matrixToString7(
        compose5(translate5(cx, cy), rotate5(svgRotation * Math.PI / 180))
      ),
      "data-type": "pcb_cutout",
      "data-pcb-layer": "drill"
    };
    if (transformedCornerRadiusX > 0) {
      attributes.rx = transformedCornerRadiusX.toString();
    }
    if (transformedCornerRadiusY > 0) {
      attributes.ry = transformedCornerRadiusY.toString();
    }
    return [
      {
        name: "rect",
        type: "element",
        attributes,
        children: [],
        value: ""
      }
    ];
  }
  if (cutout.shape === "circle") {
    const circleCutout = cutout;
    const [cx, cy] = applyToPoint39(transform, [
      circleCutout.center.x,
      circleCutout.center.y
    ]);
    const scaledRadius = circleCutout.radius * Math.abs(transform.a);
    return [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-cutout pcb-cutout-circle",
          cx: cx.toString(),
          cy: cy.toString(),
          r: scaledRadius.toString(),
          fill: colorMap2.drill,
          "data-type": "pcb_cutout",
          "data-pcb-layer": "drill"
        },
        children: [],
        value: ""
      }
    ];
  }
  if (cutout.shape === "polygon") {
    const polygonCutout = cutout;
    if (!polygonCutout.points || polygonCutout.points.length === 0) return [];
    const transformedPoints = polygonCutout.points.map(
      (p) => applyToPoint39(transform, [p.x, p.y])
    );
    const pointsString = transformedPoints.map((p) => `${p[0]},${p[1]}`).join(" ");
    return [
      {
        name: "polygon",
        type: "element",
        attributes: {
          class: "pcb-cutout pcb-cutout-polygon",
          points: pointsString,
          fill: colorMap2.drill,
          "data-type": "pcb_cutout",
          "data-pcb-layer": "drill"
        },
        children: [],
        value: ""
      }
    ];
  }
  return [];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-cutout-path.ts
import { applyToPoint as applyToPoint40 } from "transformation-matrix";
function createSvgObjectsFromPcbCutoutPath(cutoutPath, ctx) {
  const { transform, colorMap: colorMap2 } = ctx;
  if (!cutoutPath.route || !Array.isArray(cutoutPath.route)) return [];
  const firstPoint = cutoutPath.route[0];
  const lastPoint = cutoutPath.route[cutoutPath.route.length - 1];
  const isClosed = firstPoint && lastPoint && firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y;
  const path = cutoutPath.route.slice(0, isClosed ? -1 : void 0).map((point, index) => {
    const [x, y] = applyToPoint40(transform, [point.x, point.y]);
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(" ") + (isClosed ? " Z" : "");
  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-cutout pcb-cutout-path",
        d: path,
        fill: colorMap2.drill,
        "data-type": "pcb_cutout_path",
        "data-pcb-cutout-id": cutoutPath.pcb_cutout_id,
        "data-pcb-layer": "drill"
      },
      value: "",
      children: []
    }
  ];
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-keepout.ts
import {
  applyToPoint as applyToPoint41,
  compose as compose6,
  toString as matrixToString8,
  translate as translate6
} from "transformation-matrix";
var KEEPOUT_PATTERN_ID = "pcb-keepout-pattern";
var KEEPOUT_PATTERN_SIZE = 20;
var KEEPOUT_LINE_SPACING = 5;
var KEEPOUT_BACKGROUND_COLOR = "rgba(255, 107, 107, 0.2)";
function createKeepoutPatternLines(keepoutColor) {
  const patternLines = [];
  for (let i = -KEEPOUT_PATTERN_SIZE; i <= KEEPOUT_PATTERN_SIZE; i += KEEPOUT_LINE_SPACING) {
    patternLines.push({
      name: "line",
      type: "element",
      value: "",
      attributes: {
        x1: i.toString(),
        y1: "0",
        x2: (i + KEEPOUT_PATTERN_SIZE).toString(),
        y2: KEEPOUT_PATTERN_SIZE.toString(),
        stroke: keepoutColor,
        "stroke-width": "1"
      },
      children: []
    });
  }
  return patternLines;
}
function createKeepoutPatternDefs(keepoutColor) {
  return {
    name: "defs",
    type: "element",
    value: "",
    attributes: {},
    children: [
      {
        name: "pattern",
        type: "element",
        value: "",
        attributes: {
          id: KEEPOUT_PATTERN_ID,
          width: KEEPOUT_PATTERN_SIZE.toString(),
          height: KEEPOUT_PATTERN_SIZE.toString(),
          patternUnits: "userSpaceOnUse"
        },
        children: createKeepoutPatternLines(keepoutColor)
      }
    ]
  };
}
function createKeepoutBaseAttributes(keepoutId, layer, shapeClass, description) {
  const attributes = {
    class: `pcb-keepout ${shapeClass} pcb-keepout-background`,
    "data-type": "pcb_keepout",
    "data-pcb-layer": layer,
    "data-pcb-keepout-id": keepoutId,
    stroke: "none"
  };
  if (description) {
    attributes["data-description"] = description;
  }
  return attributes;
}
function createKeepoutPatternAttributes(keepoutId, layer, shapeClass, description) {
  const attributes = {
    class: `pcb-keepout ${shapeClass} pcb-keepout-pattern`,
    fill: `url(#${KEEPOUT_PATTERN_ID})`,
    "data-type": "pcb_keepout",
    "data-pcb-layer": layer,
    "data-pcb-keepout-id": keepoutId,
    stroke: "none"
  };
  if (description) {
    attributes["data-description"] = description;
  }
  return attributes;
}
function createSvgObjectsFromPcbKeepout(keepout, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2 } = ctx;
  if (layerFilter && !keepout.layers.includes(layerFilter)) {
    return [];
  }
  const svgObjects = [];
  const keepoutColor = colorMap2.keepout;
  for (const layer of keepout.layers) {
    if (layerFilter && layer !== layerFilter) {
      continue;
    }
    if (keepout.shape === "rect") {
      const rectKeepout = keepout;
      const [cx, cy] = applyToPoint41(transform, [
        rectKeepout.center.x,
        rectKeepout.center.y
      ]);
      const scaledWidth = rectKeepout.width * Math.abs(transform.a);
      const scaledHeight = rectKeepout.height * Math.abs(transform.d);
      const baseTransform = matrixToString8(compose6(translate6(cx, cy)));
      const backgroundAttributes = {
        ...createKeepoutBaseAttributes(
          rectKeepout.pcb_keepout_id,
          layer,
          "pcb-keepout-rect",
          rectKeepout.description
        ),
        x: (-scaledWidth / 2).toString(),
        y: (-scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        fill: KEEPOUT_BACKGROUND_COLOR,
        transform: baseTransform
      };
      const patternAttributes = {
        ...createKeepoutPatternAttributes(
          rectKeepout.pcb_keepout_id,
          layer,
          "pcb-keepout-rect",
          rectKeepout.description
        ),
        x: (-scaledWidth / 2).toString(),
        y: (-scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        transform: baseTransform
      };
      svgObjects.push(
        {
          name: "rect",
          type: "element",
          attributes: backgroundAttributes,
          children: [],
          value: ""
        },
        {
          name: "rect",
          type: "element",
          attributes: patternAttributes,
          children: [],
          value: ""
        }
      );
    } else if (keepout.shape === "circle") {
      const circleKeepout = keepout;
      const [cx, cy] = applyToPoint41(transform, [
        circleKeepout.center.x,
        circleKeepout.center.y
      ]);
      const scaledRadius = circleKeepout.radius * Math.abs(transform.a);
      const backgroundAttributes = {
        ...createKeepoutBaseAttributes(
          circleKeepout.pcb_keepout_id,
          layer,
          "pcb-keepout-circle",
          circleKeepout.description
        ),
        cx: cx.toString(),
        cy: cy.toString(),
        r: scaledRadius.toString(),
        fill: KEEPOUT_BACKGROUND_COLOR
      };
      const patternAttributes = {
        ...createKeepoutPatternAttributes(
          circleKeepout.pcb_keepout_id,
          layer,
          "pcb-keepout-circle",
          circleKeepout.description
        ),
        cx: cx.toString(),
        cy: cy.toString(),
        r: scaledRadius.toString()
      };
      svgObjects.push(
        {
          name: "circle",
          type: "element",
          attributes: backgroundAttributes,
          children: [],
          value: ""
        },
        {
          name: "circle",
          type: "element",
          attributes: patternAttributes,
          children: [],
          value: ""
        }
      );
    } else if (keepout.shape === "outline") {
      const outlineKeepout = keepout;
      const path = outlineKeepout.outline.map((point, pointIndex) => {
        const [x, y] = applyToPoint41(transform, [point.x, point.y]);
        return pointIndex === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      }).join(" ");
      const scaledStrokeWidth = outlineKeepout.stroke_width * Math.abs(transform.a);
      const backgroundAttributes = {
        ...createKeepoutBaseAttributes(
          outlineKeepout.pcb_keepout_id,
          layer,
          "pcb-keepout-outline",
          outlineKeepout.description
        ),
        d: path,
        fill: "none",
        stroke: KEEPOUT_BACKGROUND_COLOR,
        "stroke-width": scaledStrokeWidth.toString(),
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      };
      const patternAttributes = {
        ...createKeepoutPatternAttributes(
          outlineKeepout.pcb_keepout_id,
          layer,
          "pcb-keepout-outline",
          outlineKeepout.description
        ),
        d: path,
        fill: "none",
        stroke: `url(#${KEEPOUT_PATTERN_ID})`,
        "stroke-width": scaledStrokeWidth.toString(),
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      };
      svgObjects.push(
        {
          name: "path",
          type: "element",
          attributes: backgroundAttributes,
          children: [],
          value: ""
        },
        {
          name: "path",
          type: "element",
          attributes: patternAttributes,
          children: [],
          value: ""
        }
      );
    }
  }
  return svgObjects;
}

// lib/pcb/svg-object-fns/create-soldermask-cutout-element.ts
function createSoldermaskCutoutElement({
  elementType,
  shapeAttributes,
  layer,
  colorMap: colorMap2,
  additionalAttributes
}) {
  const baseAttributes = {
    class: "pcb-soldermask-cutout",
    fill: colorMap2.substrate,
    "data-type": "pcb_soldermask_opening",
    "data-pcb-layer": layer,
    ...shapeAttributes,
    ...additionalAttributes
  };
  return {
    name: elementType,
    type: "element",
    value: "",
    children: [],
    attributes: baseAttributes
  };
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-copper-pour.ts
function createSvgObjectsFromPcbCopperPour(pour, ctx) {
  const { transform, layer: layerFilter, colorMap: colorMap2, showSolderMask } = ctx;
  const { layer } = pour;
  if (layerFilter && layer !== layerFilter) return [];
  const shape = getCopperPourShape(pour, transform);
  if (!shape) return [];
  const { elementType, shapeAttributes } = shape;
  const color = layerNameToColor(layer, colorMap2);
  const opacity = "0.5";
  const isCoveredWithSolderMask = pour.covered_with_solder_mask !== false;
  const maskOverlayColor = layer === "bottom" ? colorMap2.soldermaskOverCopper.bottom : colorMap2.soldermaskOverCopper.top;
  const maskOverlayOpacity = "0.9";
  const copperObject = {
    name: elementType,
    type: "element",
    value: "",
    children: [],
    attributes: {
      class: `pcb-copper-pour pcb-copper-pour-${pour.shape}`,
      ...shapeAttributes,
      fill: color,
      "fill-opacity": opacity,
      "data-type": "pcb_copper_pour",
      "data-pcb-layer": layer
    }
  };
  const soldermaskObject = showSolderMask ? isCoveredWithSolderMask ? createSoldermaskOverlayElement({
    elementType,
    shapeAttributes,
    layer,
    fillColor: maskOverlayColor,
    fillOpacity: maskOverlayOpacity,
    className: "pcb-soldermask-covered-pour"
  }) : createSoldermaskCutoutElement({
    elementType,
    shapeAttributes,
    layer,
    colorMap: colorMap2
  }) : null;
  if (!soldermaskObject) {
    return [copperObject];
  }
  const isSubstrateOnly = !isCoveredWithSolderMask && pour.pcb_copper_pour_id?.includes("substrate_only");
  if (isSubstrateOnly) {
    return [soldermaskObject];
  }
  return [copperObject, soldermaskObject];
}

// lib/pcb/svg-object-fns/convert-circuit-json-to-solder-paste-mask.ts
import { applyToPoint as applyToPoint42 } from "transformation-matrix";
function createSvgObjectsFromSolderPaste(solderPaste, ctx) {
  const { transform, layer: layerFilter } = ctx;
  if (layerFilter && solderPaste.layer !== layerFilter) return [];
  const [x, y] = applyToPoint42(transform, [solderPaste.x, solderPaste.y]);
  if (solderPaste.shape === "rect" || solderPaste.shape === "rotated_rect") {
    const width = solderPaste.width * Math.abs(transform.a);
    const height = solderPaste.height * Math.abs(transform.d);
    if (solderPaste.shape === "rotated_rect" && solderPaste.ccw_rotation) {
      return [
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-solder-paste",
            fill: solderPasteLayerNameToColor(solderPaste.layer),
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-solderPaste.ccw_rotation})`,
            "data-type": "pcb_solder_paste",
            "data-pcb-layer": solderPaste.layer
          }
        }
      ];
    }
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderPaste.layer),
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          "data-type": "pcb_solder_paste",
          "data-pcb-layer": solderPaste.layer
        }
      }
    ];
  }
  if (solderPaste.shape === "pill") {
    const width = solderPaste.width * Math.abs(transform.a);
    const height = solderPaste.height * Math.abs(transform.d);
    const radius = solderPaste.radius * Math.abs(transform.a);
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderPaste.layer),
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          "data-type": "pcb_solder_paste",
          "data-pcb-layer": solderPaste.layer
        }
      }
    ];
  }
  if (solderPaste.shape === "rotated_pill") {
    const width = solderPaste.width * Math.abs(transform.a);
    const height = solderPaste.height * Math.abs(transform.d);
    const radius = solderPaste.radius * Math.abs(transform.a);
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderPaste.layer),
          x: (-width / 2).toString(),
          y: (-height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          transform: `translate(${x} ${y}) rotate(${-solderPaste.ccw_rotation})`,
          "data-type": "pcb_solder_paste",
          "data-pcb-layer": solderPaste.layer
        }
      }
    ];
  }
  if (solderPaste.shape === "oval") {
    const width = solderPaste.width * Math.abs(transform.a);
    const height = solderPaste.height * Math.abs(transform.d);
    return [
      {
        name: "ellipse",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderPaste.layer),
          cx: x.toString(),
          cy: y.toString(),
          rx: (width / 2).toString(),
          ry: (height / 2).toString(),
          "data-type": "pcb_solder_paste",
          "data-pcb-layer": solderPaste.layer
        }
      }
    ];
  }
  if (solderPaste.shape === "circle") {
    const radius = solderPaste.radius * Math.abs(transform.a);
    return [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderPaste.layer),
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
          "data-type": "pcb_solder_paste",
          "data-pcb-layer": solderPaste.layer
        }
      }
    ];
  }
}

// lib/pcb/svg-object-fns/create-svg-objects-for-pcb-grid.ts
import "svgson";
var DEFAULT_GRID_LINE_COLOR = "rgba(255, 255, 255, 0.5)";
var GRID_PATTERN_ID = "pcb-grid-pattern";
function createSvgObjectsForPcbGrid({
  grid,
  svgWidth,
  svgHeight
}) {
  if (!grid) {
    return {};
  }
  const gridLineColor = grid.lineColor ?? DEFAULT_GRID_LINE_COLOR;
  const gridCellSize = grid.cellSize;
  const majorCellSize = grid.majorCellSize;
  const majorLineColor = grid.majorLineColor ?? gridLineColor;
  if (majorCellSize !== void 0) {
    if (!gridCellSize || gridCellSize <= 0) {
      throw new Error("grid.majorCellSize requires a positive grid.cellSize");
    }
    if (majorCellSize <= 0) {
      throw new Error(
        "grid.majorCellSize must be a positive multiple of grid.cellSize"
      );
    }
    const ratio = majorCellSize / gridCellSize;
    const nearestInteger = Math.round(ratio);
    if (!Number.isFinite(ratio) || Math.abs(ratio - nearestInteger) > 1e-6) {
      throw new Error(
        "grid.majorCellSize must be a positive multiple of grid.cellSize"
      );
    }
  }
  if (!gridCellSize || gridCellSize <= 0) {
    return {};
  }
  const hasMajorGrid = majorCellSize !== void 0;
  const patternChildren = hasMajorGrid ? createMajorGridPatternChildren(
    gridCellSize,
    majorCellSize,
    gridLineColor,
    majorLineColor
  ) : [
    {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `M ${gridCellSize} 0 L 0 0 0 ${gridCellSize}`,
        fill: "none",
        stroke: gridLineColor,
        "stroke-width": "1",
        "shape-rendering": "crispEdges"
      },
      children: []
    }
  ];
  const defs = {
    name: "defs",
    type: "element",
    value: "",
    attributes: {},
    children: [
      {
        name: "pattern",
        type: "element",
        value: "",
        attributes: {
          id: GRID_PATTERN_ID,
          width: hasMajorGrid ? majorCellSize.toString() : gridCellSize.toString(),
          height: hasMajorGrid ? majorCellSize.toString() : gridCellSize.toString(),
          patternUnits: "userSpaceOnUse"
        },
        children: patternChildren
      }
    ]
  };
  const rect = {
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      x: "0",
      y: "0",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      fill: `url(#${GRID_PATTERN_ID})`,
      "pointer-events": "none",
      "data-type": "pcb_grid",
      "data-pcb-layer": "global"
    },
    children: []
  };
  return { defs, rect };
}
function createMajorGridPatternChildren(cellSize, majorCellSize, lineColor, majorLineColor) {
  const children = [];
  const steps = Math.round(majorCellSize / cellSize);
  for (let step = 0; step < steps; step += 1) {
    const offset = Number((step * cellSize).toFixed(6));
    const offsetString = offset.toString();
    const color = step === 0 ? majorLineColor : lineColor;
    const majorSizeString = majorCellSize.toString();
    children.push({
      name: "line",
      type: "element",
      value: "",
      attributes: {
        x1: offsetString,
        y1: "0",
        x2: offsetString,
        y2: majorSizeString,
        stroke: color,
        "stroke-width": "1",
        "shape-rendering": "crispEdges"
      },
      children: []
    });
    children.push({
      name: "line",
      type: "element",
      value: "",
      attributes: {
        x1: "0",
        y1: offsetString,
        x2: majorSizeString,
        y2: offsetString,
        stroke: color,
        "stroke-width": "1",
        "shape-rendering": "crispEdges"
      },
      children: []
    });
  }
  return children;
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-component.ts
import { applyToPoint as applyToPoint43 } from "transformation-matrix";
function createSvgObjectsFromPcbComponent(component, ctx) {
  const { transform, circuitJson } = ctx;
  const { center, width, height, rotation = 0 } = component;
  const [x, y] = applyToPoint43(transform, [center.x, center.y]);
  const scaledWidth = width * Math.abs(transform.a);
  const scaledHeight = height * Math.abs(transform.d);
  const transformStr = `translate(${x}, ${y}) rotate(${-rotation}) scale(1, -1)`;
  const svgObjects = [];
  if (ctx.showAnchorOffsets && circuitJson && component.position_mode === "relative_to_group_anchor" && (component.positioned_relative_to_pcb_group_id || component.positioned_relative_to_pcb_board_id)) {
    const parentAnchorPosition = getParentAnchorPosition(component, circuitJson);
    if (parentAnchorPosition) {
      svgObjects.push(
        ...createAnchorOffsetIndicators({
          groupAnchorPosition: parentAnchorPosition,
          componentPosition: center,
          transform,
          componentWidth: width,
          componentHeight: height,
          displayXOffset: component.display_offset_x,
          displayYOffset: component.display_offset_y
        })
      );
    }
  }
  if (!ctx.colorMap.debugComponent?.fill && !ctx.colorMap.debugComponent?.stroke) {
    return svgObjects;
  }
  svgObjects.push({
    name: "g",
    type: "element",
    attributes: {
      transform: transformStr,
      "data-type": "pcb_component",
      "data-pcb-layer": component.layer ?? "top"
    },
    children: [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-component",
          x: (-scaledWidth / 2).toString(),
          y: (-scaledHeight / 2).toString(),
          width: scaledWidth.toString(),
          height: scaledHeight.toString(),
          fill: ctx.colorMap.debugComponent.fill ?? "transparent",
          stroke: ctx.colorMap.debugComponent.stroke ?? "transparent",
          "data-type": "pcb_component",
          "data-pcb-layer": component.layer ?? "top"
        }
      }
    ],
    value: ""
  });
  return svgObjects;
}
function getParentAnchorPosition(component, circuitJson) {
  if (component.positioned_relative_to_pcb_group_id) {
    const pcbGroup = circuitJson.find(
      (elm) => elm.type === "pcb_group" && elm.pcb_group_id === component.positioned_relative_to_pcb_group_id
    );
    const point = getPointFromElm(pcbGroup);
    if (point) return point;
  }
  if (component.positioned_relative_to_pcb_board_id) {
    const pcbBoard = circuitJson.find(
      (elm) => elm.type === "pcb_board" && elm.pcb_board_id === component.positioned_relative_to_pcb_board_id
    );
    const point = getPointFromElm(pcbBoard);
    if (point) return point;
  }
  return void 0;
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-group.ts
import { applyToPoint as applyToPoint44 } from "transformation-matrix";
var GROUP_COLOR_PALETTE = [
  "rgba(100, 200, 255, 0.6)",
  // light blue
  "rgba(255, 150, 100, 0.6)",
  // orange
  "rgba(100, 255, 150, 0.6)",
  // green
  "rgba(200, 100, 255, 0.6)",
  // purple
  "rgba(255, 220, 100, 0.6)",
  // yellow
  "rgba(255, 100, 200, 0.6)",
  // pink
  "rgba(100, 255, 255, 0.6)",
  // cyan
  "rgba(180, 255, 100, 0.6)"
  // lime
];
var DEFAULT_STROKE_WIDTH = 0.1;
function createSvgObjectsFromPcbGroup(pcbGroup, ctx) {
  const { transform, circuitJson } = ctx;
  const { center, width, height } = pcbGroup;
  const svgObjects = [];
  if (ctx.showAnchorOffsets && pcbGroup.position_mode === "relative_to_group_anchor" && circuitJson) {
    const parentAnchorPosition = getParentAnchorPosition2(pcbGroup, circuitJson);
    if (parentAnchorPosition) {
      svgObjects.push(
        ...createAnchorOffsetIndicators({
          groupAnchorPosition: parentAnchorPosition,
          componentPosition: pcbGroup.anchor_position ?? pcbGroup.center,
          transform,
          componentWidth: pcbGroup.width,
          componentHeight: pcbGroup.height,
          displayXOffset: pcbGroup.display_offset_x,
          displayYOffset: pcbGroup.display_offset_y
        })
      );
    }
  }
  const outline = Array.isArray(pcbGroup.outline) ? pcbGroup.outline : void 0;
  const transformedStrokeWidth = DEFAULT_STROKE_WIDTH * Math.abs(transform.a);
  const dashLength = 0.3 * Math.abs(transform.a);
  const gapLength = 0.15 * Math.abs(transform.a);
  const baseAttributes = {
    class: "pcb-group",
    fill: "none",
    stroke: getGroupColor(pcbGroup.pcb_group_id),
    "stroke-width": transformedStrokeWidth.toString(),
    "stroke-dasharray": `${dashLength} ${gapLength}`,
    "data-type": "pcb_group",
    "data-pcb-group-id": pcbGroup.pcb_group_id,
    "data-pcb-layer": "overlay"
  };
  if (pcbGroup.name) {
    baseAttributes["data-group-name"] = pcbGroup.name;
  }
  if (outline && outline.length >= 3 && outline.every(
    (point) => point && typeof point.x === "number" && typeof point.y === "number"
  )) {
    const path = outline.map((point, index) => {
      const [x, y] = applyToPoint44(transform, [point.x, point.y]);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(" ");
    svgObjects.push({
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        ...baseAttributes,
        d: `${path} Z`
      }
    });
    return svgObjects;
  }
  if (!center || typeof center.x !== "number" || typeof center.y !== "number" || typeof width !== "number" || typeof height !== "number") {
    debugPcb(
      `[pcb_group] Invalid data for "${pcbGroup.pcb_group_id}"${pcbGroup.name ? ` (name: "${pcbGroup.name}")` : ""}: expected center {x: number, y: number}, width: number, height: number, got center=${JSON.stringify(center)}, width=${JSON.stringify(width)}, height=${JSON.stringify(height)}`
    );
    return svgObjects;
  }
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const [topLeftX, topLeftY] = applyToPoint44(transform, [
    center.x - halfWidth,
    center.y + halfHeight
  ]);
  const [bottomRightX, bottomRightY] = applyToPoint44(transform, [
    center.x + halfWidth,
    center.y - halfHeight
  ]);
  const rectX = Math.min(topLeftX, bottomRightX);
  const rectY = Math.min(topLeftY, bottomRightY);
  const rectWidth = Math.abs(bottomRightX - topLeftX);
  const rectHeight = Math.abs(bottomRightY - topLeftY);
  const svgObject = {
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      ...baseAttributes,
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString()
    },
    children: []
  };
  svgObjects.push(svgObject);
  return svgObjects;
}
function getGroupColor(pcbGroupId) {
  const match = pcbGroupId.match(/(\d+)$/);
  const index = match ? Number.parseInt(match[1], 10) : 0;
  return GROUP_COLOR_PALETTE[index % GROUP_COLOR_PALETTE.length];
}
function getParentAnchorPosition2(group2, circuitJson) {
  if (group2.positioned_relative_to_pcb_group_id) {
    const pcbGroup = circuitJson.find(
      (elm) => elm.type === "pcb_group" && elm.pcb_group_id === group2.positioned_relative_to_pcb_group_id
    );
    const point = getPointFromElm(pcbGroup);
    if (point) return point;
  }
  if (group2.positioned_relative_to_pcb_board_id) {
    const pcbBoard = circuitJson.find(
      (elm) => elm.type === "pcb_board" && elm.pcb_board_id === group2.positioned_relative_to_pcb_board_id
    );
    const point = getPointFromElm(pcbBoard);
    if (point) return point;
  }
  return void 0;
}

// lib/utils/get-software-used-string.ts
function getSoftwareUsedString(circuitJson) {
  const metadata = circuitJson.find(
    (e) => e.type === "project_software_metadata" || e.type === "source_project_metadata"
  );
  return metadata?.software_used_string;
}

// package.json
var package_default = {
  name: "circuit-to-svg",
  type: "module",
  version: "0.0.436",
  repository: {
    type: "git",
    url: "https://github.com/tscircuit/circuit-to-svg.git"
  },
  description: "Convert Circuit JSON to SVG",
  main: "dist/index.js",
  files: [
    "dist"
  ],
  scripts: {
    start: "cosmos",
    prepublish: "npm run build",
    prepare: "node scripts/prepare-git.cjs",
    build: "tsup-node ./lib/index.ts --format esm --dts --sourcemap --external tscircuit",
    format: "biome format . --write",
    "format:check": "biome format .",
    cosmos: "cosmos",
    "cosmos-export": "cosmos-export"
  },
  license: "ISC",
  devDependencies: {
    "@biomejs/biome": "^1.9.4",
    "@resvg/resvg-js": "^2.6.2",
    "@tscircuit/alphabet": "^0.0.27",
    "@tscircuit/checks-latest": "npm:@tscircuit/checks@0.0.179",
    "@types/bun": "^1.2.8",
    "@types/debug": "^4.1.12",
    "@vitejs/plugin-react": "5.0.0",
    biome: "^0.3.3",
    "bun-match-svg": "^0.0.12",
    "circuit-json": "^0.0.501",
    esbuild: "^0.20.2",
    "format-si-unit": "^0.0.12",
    "performance-now": "^2.1.0",
    react: "19.1.0",
    "react-cosmos": "7.0.0",
    "react-cosmos-plugin-vite": "7.0.0",
    "react-dom": "19.1.0",
    tscircuit: "^0.0.2629",
    tsup: "^8.0.2",
    typescript: "^5.4.5",
    "vite-tsconfig-paths": "^5.0.1"
  },
  peerDependencies: {
    "@tscircuit/alphabet": "*"
  },
  dependencies: {
    "@types/node": "^22.5.5",
    "bun-types": "^1.1.40",
    "calculate-elbow": "0.0.12",
    debug: "^4.4.3",
    "svg-path-commander": "^2.1.11",
    svgson: "^5.3.1",
    "transformation-matrix": "^2.16.1"
  }
};

// lib/package-version.ts
var CIRCUIT_TO_SVG_VERSION = package_default.version;

// lib/pcb/sort-svg-objects-by-pcb-layer.ts
var TYPE_PRIORITY = {
  pcb_background: 0,
  pcb_boundary: 1,
  pcb_panel: 5,
  pcb_board: 10,
  pcb_cutout: 15,
  pcb_cutout_path: 15,
  pcb_keepout: 16,
  pcb_hole: 18,
  pcb_plated_hole_drill: 19,
  pcb_plated_hole: 20,
  pcb_trace_soldermask: 25,
  pcb_trace: 30,
  pcb_smtpad: 30,
  pcb_copper_pour: 35,
  pcb_via: 36,
  pcb_soldermask: 40,
  pcb_soldermask_opening: 25,
  pcb_solder_paste: 45,
  pcb_silkscreen_text: 50,
  pcb_silkscreen_path: 50,
  pcb_silkscreen_graphic: 50,
  pcb_silkscreen_rect: 50,
  pcb_silkscreen_circle: 50,
  pcb_silkscreen_line: 50,
  pcb_silkscreen_oval: 50,
  pcb_silkscreen_pill: 50,
  pcb_component: 60,
  pcb_pad_pin_number: 65,
  pcb_fabrication_note_text: 70,
  pcb_fabrication_note_path: 70,
  pcb_fabrication_note_rect: 70,
  pcb_fabrication_note_dimension: 70,
  pcb_note_dimension: 70,
  pcb_note_text: 70,
  pcb_note_rect: 70,
  pcb_note_path: 70,
  pcb_note_line: 70,
  pcb_bend: 70,
  pcb_trace_error: 80,
  pcb_footprint_overlap_error: 80,
  pcb_component_outside_board_error: 80,
  pcb_pad_trace_clearance_error: 80,
  pcb_via_trace_clearance_error: 80,
  pcb_connector_not_in_accessible_orientation_warning: 80,
  pcb_manual_edit_conflict_warning: 80,
  pcb_rats_nest: 85,
  pcb_debug_object: 90
};
var DEFAULT_TYPE_PRIORITY = 100;
function sortSvgObjectsByPcbLayer(objects) {
  return objects.map((object, index) => ({
    object,
    index,
    layerPriority: getLayerPriority(
      object.attributes?.["data-pcb-layer"] ?? void 0
    ),
    typePriority: getTypePriority(
      object.attributes?.["data-type"] ?? void 0
    )
  })).sort((a, b) => {
    if (a.layerPriority !== b.layerPriority) {
      return a.layerPriority - b.layerPriority;
    }
    if (a.typePriority !== b.typePriority) {
      return a.typePriority - b.typePriority;
    }
    return a.index - b.index;
  }).map(({ object }) => object);
}
function getLayerPriority(layer) {
  if (!layer) return 500;
  const normalized = layer.toLowerCase();
  if (normalized === "global") return -100;
  if (normalized === "bottom") return 4;
  if (normalized === "board") return 2;
  if (normalized === "soldermask-top" || normalized === "soldermask-bottom")
    return 3;
  if (normalized.startsWith("inner")) {
    const match = normalized.match(/\d+/);
    const layerIndex = match ? Number.parseInt(match[0], 10) : 0;
    return 5 + layerIndex;
  }
  if (normalized === "through") return 18;
  if (normalized === "top") return 17;
  if (normalized === "drill") return 30;
  if (normalized === "overlay") return 40;
  return 10;
}
function getTypePriority(type) {
  if (!type) return DEFAULT_TYPE_PRIORITY;
  return TYPE_PRIORITY[type] ?? DEFAULT_TYPE_PRIORITY;
}

// lib/pcb/create-soldermask-opening-masks.ts
function createSoldermaskOpeningMasks({
  objects,
  layer,
  width,
  height,
  showSolderMask = false
}) {
  const openings = objects.filter(
    (object) => object.attributes["data-pcb-layer"] === layer && (object.attributes.class === "pcb-pad" || object.attributes.class === "pcb-pad-exposed" || object.attributes["data-type"] === "pcb_soldermask_opening")
  );
  if (openings.length === 0) return null;
  const tenting = objects.filter((object) => object.attributes["data-type"] === "pcb_via").flatMap((object) => object.children).filter((object) => object.attributes.class === "pcb-via-tenting");
  const pours = objects.filter(
    (object) => showSolderMask && object.attributes["data-pcb-layer"] === layer && (object.attributes["data-type"] === "pcb_copper_pour" || object.attributes.class === "pcb-soldermask-covered-pour")
  );
  const padOpenings = openings.filter(
    (object) => object.attributes.class === "pcb-pad" || object.attributes.class === "pcb-pad-exposed"
  );
  const masks = [];
  for (const { targets, cutouts, maskId } of [
    {
      targets: tenting,
      cutouts: openings,
      maskId: `via-tenting-mask-${layer}`
    },
    {
      targets: pours,
      cutouts: padOpenings,
      maskId: `copper-pour-pad-opening-mask-${layer}`
    }
  ]) {
    if (targets.length === 0 || cutouts.length === 0) continue;
    for (const object of targets) {
      object.attributes.mask = `url(#${maskId})`;
    }
    masks.push(createOpeningMask(maskId, cutouts, width, height));
  }
  if (masks.length === 0) return null;
  return {
    name: "defs",
    type: "element",
    value: "",
    attributes: {},
    children: masks
  };
}
function createOpeningMask(maskId, openings, width, height) {
  return {
    name: "mask",
    type: "element",
    value: "",
    attributes: {
      id: maskId,
      maskUnits: "userSpaceOnUse",
      x: "0",
      y: "0",
      width: String(width),
      height: String(height)
    },
    children: [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          x: "0",
          y: "0",
          width: String(width),
          height: String(height),
          fill: "white"
        },
        children: []
      },
      ...openings.map((opening) => ({
        ...opening,
        attributes: { ...opening.attributes, fill: "black" }
      }))
    ]
  };
}

// lib/utils/create-error-text-overlay.ts
function createErrorTextOverlay(circuitJson, dataType = "error_text_overlay") {
  const errorElms = circuitJson.filter(
    (elm) => elm.type.endsWith("_error")
  );
  if (errorElms.length === 0) {
    return null;
  }
  const errorMessages = errorElms.map((e) => e.message).filter((m) => !!m);
  if (errorMessages.length === 0) {
    return null;
  }
  const textBlock = {
    name: "text",
    type: "element",
    value: "",
    attributes: {
      x: "10",
      y: "20",
      fill: "red",
      "font-family": "monospace",
      "font-size": "12px",
      "data-type": dataType,
      "data-layer": "global"
    },
    children: errorMessages.map((msg, i) => ({
      name: "tspan",
      type: "element",
      value: "",
      attributes: {
        x: "10",
        dy: i === 0 ? "0" : "1.2em"
      },
      children: [
        {
          type: "text",
          value: msg,
          name: "",
          attributes: {},
          children: []
        }
      ]
    }))
  };
  return textBlock;
}

// lib/pcb/get-pcb-bounds-from-circuit-json.ts
import { distance as distance5 } from "circuit-json";

// lib/pcb/get-text-center-from-anchor-position.ts
function getTextCenterFromAnchorPosition({
  anchorPosition,
  textWidth,
  textHeight,
  anchorAlignment
}) {
  switch (anchorAlignment) {
    case "top_left":
      return {
        x: anchorPosition.x + textWidth / 2,
        y: anchorPosition.y + textHeight / 2
      };
    case "top_center":
      return {
        x: anchorPosition.x,
        y: anchorPosition.y + textHeight / 2
      };
    case "top_right":
      return {
        x: anchorPosition.x - textWidth / 2,
        y: anchorPosition.y + textHeight / 2
      };
    case "center_left":
      return {
        x: anchorPosition.x + textWidth / 2,
        y: anchorPosition.y
      };
    case "center_right":
      return {
        x: anchorPosition.x - textWidth / 2,
        y: anchorPosition.y
      };
    case "bottom_left":
      return {
        x: anchorPosition.x + textWidth / 2,
        y: anchorPosition.y - textHeight / 2
      };
    case "bottom_center":
      return {
        x: anchorPosition.x,
        y: anchorPosition.y - textHeight / 2
      };
    case "bottom_right":
      return {
        x: anchorPosition.x - textWidth / 2,
        y: anchorPosition.y - textHeight / 2
      };
    case "center":
    default:
      return anchorPosition;
  }
}

// lib/pcb/get-pcb-bounds-from-circuit-json.ts
function getComprehensivePcbBounds(circuitJson) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let hasBounds = false;
  let boardMinX = Number.POSITIVE_INFINITY;
  let boardMinY = Number.POSITIVE_INFINITY;
  let boardMaxX = Number.NEGATIVE_INFINITY;
  let boardMaxY = Number.NEGATIVE_INFINITY;
  let hasBoardBounds = false;
  for (const circuitJsonElm of circuitJson) {
    if (circuitJsonElm.type === "pcb_panel") {
      const panel = circuitJsonElm;
      const width = distance5.parse(panel.width);
      const height = distance5.parse(panel.height);
      if (width === void 0 || height === void 0) {
        continue;
      }
      const center = panel.center ?? { x: width / 2, y: height / 2 };
      updateBounds({ center, width, height });
    } else if (circuitJsonElm.type === "pcb_board") {
      if (circuitJsonElm.outline && Array.isArray(circuitJsonElm.outline) && circuitJsonElm.outline.length >= 3) {
        updateBoundsToIncludeOutline(circuitJsonElm.outline);
        updateBoardBoundsToIncludeOutline(circuitJsonElm.outline);
      } else if ("center" in circuitJsonElm && "width" in circuitJsonElm && "height" in circuitJsonElm) {
        updateBounds({
          center: circuitJsonElm.center,
          width: circuitJsonElm.width,
          height: circuitJsonElm.height
        });
        updateBoardBounds({
          center: circuitJsonElm.center,
          width: circuitJsonElm.width,
          height: circuitJsonElm.height
        });
      }
    } else if (circuitJsonElm.type === "pcb_courtyard_rect") {
      updateBounds({
        center: circuitJsonElm.center,
        width: circuitJsonElm.width,
        height: circuitJsonElm.height,
        ccwRotationDegrees: circuitJsonElm.ccw_rotation
      });
    } else if (circuitJsonElm.type === "pcb_smtpad") {
      const pad = circuitJsonElm;
      if (pad.shape === "rect" || pad.shape === "pill") {
        updateBounds({
          center: { x: pad.x, y: pad.y },
          width: pad.width,
          height: pad.height
        });
      } else if (pad.shape === "rotated_rect" || pad.shape === "rotated_pill") {
        updateBounds({
          center: { x: pad.x, y: pad.y },
          width: pad.width,
          height: pad.height,
          ccwRotationDegrees: pad.ccw_rotation
        });
      } else if (pad.shape === "circle") {
        const radius = distance5.parse(pad.radius);
        if (radius !== void 0) {
          updateBounds({
            center: { x: pad.x, y: pad.y },
            width: radius * 2,
            height: radius * 2
          });
        }
      } else if (pad.shape === "polygon") {
        updateTraceBounds(pad.points);
      }
    } else if (circuitJsonElm.type === "pcb_via") {
      const outerDiameter = distance5.parse(circuitJsonElm.outer_diameter);
      updateBounds({
        center: { x: circuitJsonElm.x, y: circuitJsonElm.y },
        width: outerDiameter ?? 0,
        height: outerDiameter ?? 0
      });
    } else if (circuitJsonElm.type === "pcb_plated_hole") {
      const platedHole = circuitJsonElm;
      const holeCenter = { x: platedHole.x, y: platedHole.y };
      if (platedHole.shape === "circle") {
        const outerDiameter = distance5.parse(platedHole.outer_diameter);
        updateBounds({
          center: holeCenter,
          width: outerDiameter ?? 0,
          height: outerDiameter ?? 0
        });
      } else if (platedHole.shape === "oval" || platedHole.shape === "pill") {
        updateBounds({
          center: holeCenter,
          width: platedHole.outer_width,
          height: platedHole.outer_height
        });
      } else if (platedHole.shape === "circular_hole_with_rect_pad" || platedHole.shape === "pill_hole_with_rect_pad") {
        updateBounds({
          center: holeCenter,
          width: platedHole.rect_pad_width,
          height: platedHole.rect_pad_height
        });
      } else if (platedHole.shape === "rotated_pill_hole_with_rect_pad") {
        updateBounds({
          center: holeCenter,
          width: platedHole.rect_pad_width,
          height: platedHole.rect_pad_height,
          ccwRotationDegrees: platedHole.rect_ccw_rotation
        });
      } else if (platedHole.shape === "hole_with_polygon_pad") {
        updateTraceBounds(
          (platedHole.pad_outline ?? []).map((point) => ({
            x: platedHole.x + point.x,
            y: platedHole.y + point.y
          }))
        );
      }
    } else if (circuitJsonElm.type === "pcb_hole") {
      const hole = circuitJsonElm;
      const holeCenter = { x: hole.x, y: hole.y };
      if (hole.hole_shape === "circle" || hole.hole_shape === "square") {
        const diameter = distance5.parse(hole.hole_diameter);
        updateBounds({
          center: holeCenter,
          width: diameter ?? 0,
          height: diameter ?? 0
        });
      } else if (hole.hole_shape === "rotated_pill") {
        updateBounds({
          center: holeCenter,
          width: hole.hole_width,
          height: hole.hole_height,
          ccwRotationDegrees: hole.ccw_rotation
        });
      } else if (hole.hole_shape === "oval" || hole.hole_shape === "rect" || hole.hole_shape === "pill") {
        updateBounds({
          center: holeCenter,
          width: hole.hole_width,
          height: hole.hole_height
        });
      }
    } else if (circuitJsonElm.type === "pcb_note_line") {
      updateTraceBounds([
        { x: circuitJsonElm.x1, y: circuitJsonElm.y1 },
        { x: circuitJsonElm.x2, y: circuitJsonElm.y2 }
      ]);
    } else if ("x" in circuitJsonElm && "y" in circuitJsonElm) {
      updateBounds({
        center: { x: circuitJsonElm.x, y: circuitJsonElm.y },
        width: 0,
        height: 0
      });
    } else if ("route" in circuitJsonElm) {
      updateTraceBounds(circuitJsonElm.route);
    } else if (circuitJsonElm.type === "pcb_note_rect" || circuitJsonElm.type === "pcb_fabrication_note_rect") {
      updateBounds({
        center: circuitJsonElm.center,
        width: circuitJsonElm.width,
        height: circuitJsonElm.height
      });
    } else if (circuitJsonElm.type === "pcb_note_dimension" || circuitJsonElm.type === "pcb_fabrication_note_dimension") {
      const dimension = circuitJsonElm;
      const {
        from,
        to,
        text,
        font_size = 1,
        arrow_size,
        offset_distance,
        offset_direction
      } = dimension;
      if (!from || !to || !arrow_size) continue;
      updateBounds({ center: from, width: 0, height: 0 });
      updateBounds({ center: to, width: 0, height: 0 });
      const normalize4 = (v) => {
        const l = Math.hypot(v.x, v.y) || 1;
        return { x: v.x / l, y: v.y / l };
      };
      const direction = normalize4({ x: to.x - from.x, y: to.y - from.y });
      if (Number.isNaN(direction.x) || Number.isNaN(direction.y)) continue;
      const perpendicular = { x: -direction.y, y: direction.x };
      const hasOffsetDirection = offset_direction && typeof offset_direction.x === "number" && typeof offset_direction.y === "number";
      const normalizedOffsetDirection = hasOffsetDirection ? normalize4(offset_direction) : { x: 0, y: 0 };
      const offsetMagnitude = typeof offset_distance === "number" ? offset_distance : 0;
      const offsetVector = {
        x: normalizedOffsetDirection.x * offsetMagnitude,
        y: normalizedOffsetDirection.y * offsetMagnitude
      };
      const fromOffset = {
        x: from.x + offsetVector.x,
        y: from.y + offsetVector.y
      };
      const toOffset = { x: to.x + offsetVector.x, y: to.y + offsetVector.y };
      updateBounds({ center: fromOffset, width: 0, height: 0 });
      updateBounds({ center: toOffset, width: 0, height: 0 });
      const extensionDirection = hasOffsetDirection && (Math.abs(normalizedOffsetDirection.x) > Number.EPSILON || Math.abs(normalizedOffsetDirection.y) > Number.EPSILON) ? normalizedOffsetDirection : perpendicular;
      const extensionLength = offsetMagnitude + arrow_size;
      const fromExtEnd = {
        x: from.x + extensionDirection.x * extensionLength,
        y: from.y + extensionDirection.y * extensionLength
      };
      const toExtEnd = {
        x: to.x + extensionDirection.x * extensionLength,
        y: to.y + extensionDirection.y * extensionLength
      };
      updateBounds({ center: fromExtEnd, width: 0, height: 0 });
      updateBounds({ center: toExtEnd, width: 0, height: 0 });
      const arrowHalfWidth = arrow_size / 2;
      const fromBase = {
        x: fromOffset.x + direction.x * arrow_size,
        y: fromOffset.y + direction.y * arrow_size
      };
      const toBase = {
        x: toOffset.x - direction.x * arrow_size,
        y: toOffset.y - direction.y * arrow_size
      };
      const fromArrowP2 = {
        x: fromBase.x + perpendicular.x * arrowHalfWidth,
        y: fromBase.y + perpendicular.y * arrowHalfWidth
      };
      const fromArrowP3 = {
        x: fromBase.x - perpendicular.x * arrowHalfWidth,
        y: fromBase.y - perpendicular.y * arrowHalfWidth
      };
      updateBounds({ center: fromArrowP2, width: 0, height: 0 });
      updateBounds({ center: fromArrowP3, width: 0, height: 0 });
      const toArrowP2 = {
        x: toBase.x + perpendicular.x * arrowHalfWidth,
        y: toBase.y + perpendicular.y * arrowHalfWidth
      };
      const toArrowP3 = {
        x: toBase.x - perpendicular.x * arrowHalfWidth,
        y: toBase.y - perpendicular.y * arrowHalfWidth
      };
      updateBounds({ center: toArrowP2, width: 0, height: 0 });
      updateBounds({ center: toArrowP3, width: 0, height: 0 });
      if (text) {
        const midPoint = {
          x: (from.x + to.x) / 2 + offsetVector.x,
          y: (from.y + to.y) / 2 + offsetVector.y
        };
        const textOffset = arrow_size * 1.5;
        const textPoint = {
          x: midPoint.x + perpendicular.x * textOffset,
          y: midPoint.y + perpendicular.y * textOffset
        };
        const textWidth = text.length * font_size * 0.6;
        const textHeight = font_size;
        updateBounds({
          center: textPoint,
          width: textWidth,
          height: textHeight
        });
      }
    } else if (circuitJsonElm.type === "pcb_note_text" || circuitJsonElm.type === "pcb_fabrication_note_text") {
      updateTextBounds({
        text: circuitJsonElm.text,
        anchorPosition: circuitJsonElm.anchor_position,
        fontSize: circuitJsonElm.font_size,
        anchorAlignment: circuitJsonElm.anchor_alignment,
        ccwRotationDegrees: circuitJsonElm.type === "pcb_fabrication_note_text" ? circuitJsonElm.ccw_rotation ?? 1 : 0
      });
    } else if (circuitJsonElm.type === "pcb_cutout") {
      const cutout = circuitJsonElm;
      if (cutout.shape === "rect") {
        updateBounds({
          center: cutout.center,
          width: cutout.width,
          height: cutout.height,
          ccwRotationDegrees: cutout.rotation
        });
      } else if (cutout.shape === "circle") {
        const radius = distance5.parse(cutout.radius);
        if (radius !== void 0) {
          updateBounds({
            center: cutout.center,
            width: radius * 2,
            height: radius * 2
          });
        }
      } else if (cutout.shape === "polygon") {
        updateTraceBounds(cutout.points);
      } else if (cutout.shape === "path") {
        const cutoutPath = cutout;
        if (cutoutPath.route && Array.isArray(cutoutPath.route)) {
          updateTraceBounds(cutoutPath.route);
        }
      }
    } else if (circuitJsonElm.type === "pcb_keepout") {
      const keepout = circuitJsonElm;
      if (keepout.shape === "rect") {
        updateBounds({
          center: keepout.center,
          width: keepout.width,
          height: keepout.height
        });
      } else if (keepout.shape === "circle") {
        const radius = typeof keepout.radius === "number" ? keepout.radius : distance5.parse(keepout.radius) ?? 0;
        if (radius > 0) {
          updateBounds({
            center: keepout.center,
            width: radius * 2,
            height: radius * 2
          });
        }
      } else if (keepout.shape === "outline") {
        for (const point of keepout.outline) {
          updateBounds({
            center: point,
            width: keepout.stroke_width,
            height: keepout.stroke_width
          });
        }
      }
    } else if (circuitJsonElm.type === "pcb_silkscreen_graphic" || circuitJsonElm.type === "pcb_silkscreen_text" || circuitJsonElm.type === "pcb_silkscreen_rect" || circuitJsonElm.type === "pcb_silkscreen_circle" || circuitJsonElm.type === "pcb_silkscreen_line" || circuitJsonElm.type === "pcb_silkscreen_oval" || circuitJsonElm.type === "pcb_silkscreen_pill") {
      updateSilkscreenBounds(circuitJsonElm);
    } else if (circuitJsonElm.type === "pcb_copper_text") {
      updateBounds({
        center: circuitJsonElm.anchor_position,
        width: 0,
        height: 0
      });
    } else if (circuitJsonElm.type === "pcb_copper_pour") {
      if (circuitJsonElm.shape === "rect") {
        updateBounds({
          center: circuitJsonElm.center,
          width: circuitJsonElm.width,
          height: circuitJsonElm.height,
          ccwRotationDegrees: circuitJsonElm.rotation
        });
      } else if (circuitJsonElm.shape === "polygon") {
        updateTraceBounds(circuitJsonElm.points);
      } else if (circuitJsonElm.shape === "brep") {
        updateTraceBounds(circuitJsonElm.brep_shape.outer_ring.vertices);
      }
    }
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    boardMinX,
    boardMinY,
    boardMaxX,
    boardMaxY,
    hasBounds,
    hasBoardBounds
  };
  function updateBounds({
    center,
    width,
    height,
    ccwRotationDegrees
  }) {
    if (!center) return;
    const centerX = distance5.parse(center.x);
    const centerY = distance5.parse(center.y);
    if (centerX === void 0 || centerY === void 0) return;
    const numericWidth = distance5.parse(width) ?? 0;
    const numericHeight = distance5.parse(height) ?? 0;
    let halfWidth = numericWidth / 2;
    let halfHeight = numericHeight / 2;
    if (typeof ccwRotationDegrees === "number" && ccwRotationDegrees !== 0) {
      const angleRadians = ccwRotationDegrees * Math.PI / 180;
      const absCos = Math.abs(Math.cos(angleRadians));
      const absSin = Math.abs(Math.sin(angleRadians));
      const rotatedHalfWidth = halfWidth * absCos + halfHeight * absSin;
      const rotatedHalfHeight = halfWidth * absSin + halfHeight * absCos;
      halfWidth = rotatedHalfWidth;
      halfHeight = rotatedHalfHeight;
    }
    minX = Math.min(minX, centerX - halfWidth);
    minY = Math.min(minY, centerY - halfHeight);
    maxX = Math.max(maxX, centerX + halfWidth);
    maxY = Math.max(maxY, centerY + halfHeight);
    hasBounds = true;
  }
  function updateBoardBounds({
    center,
    width,
    height
  }) {
    if (!center) return;
    const centerX = distance5.parse(center.x);
    const centerY = distance5.parse(center.y);
    if (centerX === void 0 || centerY === void 0) return;
    const numericWidth = distance5.parse(width) ?? 0;
    const numericHeight = distance5.parse(height) ?? 0;
    const halfWidth = numericWidth / 2;
    const halfHeight = numericHeight / 2;
    boardMinX = Math.min(boardMinX, centerX - halfWidth);
    boardMinY = Math.min(boardMinY, centerY - halfHeight);
    boardMaxX = Math.max(boardMaxX, centerX + halfWidth);
    boardMaxY = Math.max(boardMaxY, centerY + halfHeight);
    hasBounds = true;
    hasBoardBounds = true;
  }
  function updateBoundsToIncludeOutline(outline) {
    let updated = false;
    for (const point of outline) {
      const x = distance5.parse(point.x);
      const y = distance5.parse(point.y);
      if (x === void 0 || y === void 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      updated = true;
    }
    if (updated) {
      hasBounds = true;
    }
  }
  function updateBoardBoundsToIncludeOutline(outline) {
    let updated = false;
    for (const point of outline) {
      const x = distance5.parse(point.x);
      const y = distance5.parse(point.y);
      if (x === void 0 || y === void 0) continue;
      boardMinX = Math.min(boardMinX, x);
      boardMinY = Math.min(boardMinY, y);
      boardMaxX = Math.max(boardMaxX, x);
      boardMaxY = Math.max(boardMaxY, y);
      updated = true;
    }
    if (updated) {
      hasBounds = true;
      hasBoardBounds = true;
    }
  }
  function updateTraceBounds(route) {
    let updated = false;
    const points = [
      ...route.flatMap(getTracePoints),
      ...getWireTaperSegments(route).flatMap(getWireTaperPolygon)
    ];
    for (const point of points) {
      for (const anchor of [point]) {
        const x = distance5.parse(anchor.x);
        const y = distance5.parse(anchor.y);
        if (x === void 0 || y === void 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        updated = true;
      }
    }
    if (updated) {
      hasBounds = true;
    }
  }
  function getTracePoints(point) {
    return "route_type" in point ? getPcbTracePoints(point) : [point];
  }
  function updateTextBounds({
    text,
    anchorPosition,
    fontSize = 1,
    anchorAlignment = "center",
    ccwRotationDegrees = 0
  }) {
    if (!text || !anchorPosition) return;
    const lines = text.split("\n");
    const maxLineLength = Math.max(...lines.map((line) => line.length), 0);
    const textWidth = maxLineLength * fontSize * 0.6;
    const textHeight = Math.max(lines.length, 1) * fontSize;
    const center = getTextCenterFromAnchorPosition({
      anchorPosition,
      textWidth,
      textHeight,
      anchorAlignment
    });
    updateBounds({
      center,
      width: textWidth,
      height: textHeight,
      ccwRotationDegrees
    });
  }
  function updateSilkscreenBounds(item) {
    if (item.type === "pcb_silkscreen_text") {
      updateBounds({ center: item.anchor_position, width: 0, height: 0 });
    } else if (item.type === "pcb_silkscreen_graphic") {
      for (const vertex of item.brep_shape.outer_ring.vertices) {
        updateBounds({
          center: { x: vertex.x, y: vertex.y },
          width: 0,
          height: 0
        });
      }
      for (const innerRing of item.brep_shape.inner_rings ?? []) {
        for (const vertex of innerRing.vertices) {
          updateBounds({
            center: { x: vertex.x, y: vertex.y },
            width: 0,
            height: 0
          });
        }
      }
    } else if (item.type === "pcb_silkscreen_path") {
      updateTraceBounds(item.route);
    } else if (item.type === "pcb_silkscreen_rect") {
      updateBounds({
        center: item.center,
        width: item.width,
        height: item.height,
        ccwRotationDegrees: item.ccw_rotation
      });
    } else if (item.type === "pcb_silkscreen_circle") {
      const radius = distance5.parse(item.radius);
      if (radius !== void 0) {
        updateBounds({
          center: item.center,
          width: radius * 2,
          height: radius * 2
        });
      }
    } else if (item.type === "pcb_silkscreen_line") {
      updateBounds({ center: { x: item.x1, y: item.y1 }, width: 0, height: 0 });
      updateBounds({ center: { x: item.x2, y: item.y2 }, width: 0, height: 0 });
    } else if (item.type === "pcb_silkscreen_oval") {
      const radiusX = distance5.parse(item.radius_x);
      const radiusY = distance5.parse(item.radius_y);
      if (radiusX !== void 0 && radiusY !== void 0) {
        updateBounds({
          center: item.center,
          width: radiusX * 2,
          height: radiusY * 2
        });
      }
    } else if (item.type === "pcb_silkscreen_pill") {
      updateBounds({
        center: item.center,
        width: item.width,
        height: item.height,
        ccwRotationDegrees: item.ccw_rotation
      });
    } else if (item.type === "pcb_cutout") {
      const cutout = item;
      if (cutout.shape === "rect") {
        updateBounds({
          center: cutout.center,
          width: cutout.width,
          height: cutout.height,
          ccwRotationDegrees: cutout.rotation
        });
      } else if (cutout.shape === "circle") {
        const radius = distance5.parse(cutout.radius);
        if (radius !== void 0) {
          updateBounds({
            center: cutout.center,
            width: radius * 2,
            height: radius * 2
          });
        }
      } else if (cutout.shape === "polygon") {
        updateTraceBounds(cutout.points);
      } else if (cutout.shape === "path") {
        const cutoutPath = cutout;
        if (cutoutPath.route && Array.isArray(cutoutPath.route)) {
          updateTraceBounds(cutoutPath.route);
        }
      }
    }
  }
}

// lib/utils/get-viewport-bounds.ts
import { distance as distance6 } from "circuit-json";
var getViewportBounds = ({
  circuitJson,
  drawPaddingOutsideBoard,
  baseBounds,
  viewportOptions
}) => {
  let padding = drawPaddingOutsideBoard ? 1 : 0;
  let boundsMinX = drawPaddingOutsideBoard || !baseBounds.hasBoardBounds ? baseBounds.minX : baseBounds.boardMinX;
  let boundsMinY = drawPaddingOutsideBoard || !baseBounds.hasBoardBounds ? baseBounds.minY : baseBounds.boardMinY;
  let boundsMaxX = drawPaddingOutsideBoard || !baseBounds.hasBoardBounds ? baseBounds.maxX : baseBounds.boardMaxX;
  let boundsMaxY = drawPaddingOutsideBoard || !baseBounds.hasBoardBounds ? baseBounds.maxY : baseBounds.boardMaxY;
  let hasPanelBounds = false;
  let panelMinX = Number.POSITIVE_INFINITY;
  let panelMinY = Number.POSITIVE_INFINITY;
  let panelMaxX = Number.NEGATIVE_INFINITY;
  let panelMaxY = Number.NEGATIVE_INFINITY;
  const panelBoundsById = /* @__PURE__ */ new Map();
  const boardBoundsById = /* @__PURE__ */ new Map();
  for (const elm of circuitJson) {
    if (elm.type === "pcb_panel") {
      const panel = elm;
      const panelBounds = rectBounds(panel.center, panel.width, panel.height);
      if (!panelBounds) continue;
      panelMinX = Math.min(panelMinX, panelBounds.minX);
      panelMinY = Math.min(panelMinY, panelBounds.minY);
      panelMaxX = Math.max(panelMaxX, panelBounds.maxX);
      panelMaxY = Math.max(panelMaxY, panelBounds.maxY);
      hasPanelBounds = true;
      if (panel.pcb_panel_id) {
        panelBoundsById.set(panel.pcb_panel_id, panelBounds);
      }
    } else if (elm.type === "pcb_board") {
      const board = elm;
      const outlineBounds = getOutlineBounds(board.outline);
      const boardBounds = outlineBounds ?? rectBounds(board.center, board.width, board.height);
      if (boardBounds && board.pcb_board_id) {
        boardBoundsById.set(board.pcb_board_id, boardBounds);
      }
    }
  }
  if (viewportOptions?.viewport) {
    const { minX, minY, maxX, maxY } = viewportOptions.viewport;
    boundsMinX = minX;
    boundsMinY = minY;
    boundsMaxX = maxX;
    boundsMaxY = maxY;
    padding = 0;
  } else if (viewportOptions?.viewportTarget?.pcb_panel_id) {
    const panelBounds = panelBoundsById.get(
      viewportOptions.viewportTarget.pcb_panel_id
    );
    if (!panelBounds) {
      throw new Error(
        `Viewport target panel '${viewportOptions.viewportTarget.pcb_panel_id}' not found`
      );
    }
    boundsMinX = panelBounds.minX;
    boundsMinY = panelBounds.minY;
    boundsMaxX = panelBounds.maxX;
    boundsMaxY = panelBounds.maxY;
    padding = 0;
  } else if (viewportOptions?.viewportTarget?.pcb_board_id) {
    const boardBounds = boardBoundsById.get(
      viewportOptions.viewportTarget.pcb_board_id
    );
    if (!boardBounds) {
      throw new Error(
        `Viewport target board '${viewportOptions.viewportTarget.pcb_board_id}' not found`
      );
    }
    boundsMinX = boardBounds.minX;
    boundsMinY = boardBounds.minY;
    boundsMaxX = boardBounds.maxX;
    boundsMaxY = boardBounds.maxY;
    padding = 0;
  } else if (hasPanelBounds) {
    boundsMinX = panelMinX;
    boundsMinY = panelMinY;
    boundsMaxX = panelMaxX;
    boundsMaxY = panelMaxY;
  }
  return { boundsMinX, boundsMinY, boundsMaxX, boundsMaxY, padding };
};
function rectBounds(center, width, height) {
  if (!center || width === void 0 || height === void 0) return;
  const cx = distance6.parse(center.x);
  const cy = distance6.parse(center.y);
  if (cx === void 0 || cy === void 0) return;
  const numericWidth = distance6.parse(width);
  const numericHeight = distance6.parse(height);
  if (numericWidth === void 0 || numericHeight === void 0) return;
  const halfW = numericWidth / 2;
  const halfH = numericHeight / 2;
  return {
    minX: cx - halfW,
    minY: cy - halfH,
    maxX: cx + halfW,
    maxY: cy + halfH
  };
}
function getOutlineBounds(outline) {
  if (!outline || outline.length < 3) return;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const pt of outline) {
    const x = distance6.parse(pt.x);
    const y = distance6.parse(pt.y);
    if (x === void 0 || y === void 0) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
  if (!Number.isFinite(maxX) || !Number.isFinite(maxY)) return;
  return { minX, minY, maxX, maxY };
}

// lib/pcb/svg-object-fns/create-svg-object-from-pcb-pad-pin-number.ts
import { applyToPoint as applyToPoint45 } from "transformation-matrix";
var MAX_FONT_SIZE = 0.5;
var FONT_HEIGHT_RATIO = 0.42;
var FONT_WIDTH_RATIO = 0.58;
var HORIZONTAL_PADDING_RATIO = 0.75;
function createSvgObjectFromPcbPadPinNumber(pad, ctx) {
  if (!ctx.showPinNumbers) return [];
  if (pad.type === "pcb_smtpad") {
    if (ctx.layer && pad.layer !== ctx.layer) return [];
  } else if (ctx.layer && !pad.layers.includes(ctx.layer)) {
    return [];
  }
  const pinNumber = getPadPinNumber(pad, ctx.circuitJson);
  if (!pinNumber) return [];
  const geometry = getPadTextGeometry(pad);
  if (!geometry || geometry.width <= 0 || geometry.height <= 0) return [];
  const scaleFactor = Math.abs(ctx.transform.a);
  const fontSizeInCircuitUnits = Math.min(
    MAX_FONT_SIZE,
    geometry.height * FONT_HEIGHT_RATIO,
    geometry.width * HORIZONTAL_PADDING_RATIO / (pinNumber.length * FONT_WIDTH_RATIO)
  );
  if (fontSizeInCircuitUnits <= 0) return [];
  const [x, y] = applyToPoint45(ctx.transform, [
    geometry.centerX,
    geometry.centerY
  ]);
  const layer = pad.type === "pcb_smtpad" ? pad.layer : "through";
  const transform = geometry.ccwRotation ? `rotate(${-geometry.ccwRotation} ${x} ${y})` : void 0;
  return [
    {
      name: "text",
      type: "element",
      value: "",
      attributes: {
        class: "pcb-pad-pin-number",
        x: x.toString(),
        y: y.toString(),
        fill: "#b0b0b0",
        "font-family": "Arial, sans-serif",
        "font-size": (fontSizeInCircuitUnits * scaleFactor).toString(),
        "font-weight": "500",
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "pointer-events": "none",
        "data-type": "pcb_pad_pin_number",
        "data-pcb-layer": layer,
        "data-pin-number": pinNumber,
        ...transform ? { transform } : {}
      },
      children: [
        {
          type: "text",
          value: pinNumber,
          name: "",
          attributes: {},
          children: []
        }
      ]
    }
  ];
}
function getPadTextGeometry(pad) {
  if (pad.type === "pcb_smtpad") {
    if (pad.shape === "polygon") {
      return getPolygonGeometry(pad.points);
    }
    if (pad.shape === "circle") {
      return {
        centerX: pad.x,
        centerY: pad.y,
        width: pad.radius * 2,
        height: pad.radius * 2,
        ccwRotation: 0
      };
    }
    return {
      centerX: pad.x,
      centerY: pad.y,
      width: pad.width,
      height: pad.height,
      ccwRotation: pad.shape === "rotated_rect" || pad.shape === "rotated_pill" ? pad.ccw_rotation : 0
    };
  }
  if (pad.shape === "circle") {
    return {
      centerX: pad.x,
      centerY: pad.y,
      width: pad.outer_diameter,
      height: pad.outer_diameter,
      ccwRotation: 0
    };
  }
  if (pad.shape === "oval" || pad.shape === "pill") {
    return {
      centerX: pad.x,
      centerY: pad.y,
      width: pad.outer_width,
      height: pad.outer_height,
      ccwRotation: pad.ccw_rotation
    };
  }
  if (pad.shape === "hole_with_polygon_pad") {
    const polygonGeometry = getPolygonGeometry(pad.pad_outline);
    if (!polygonGeometry) return void 0;
    return {
      ...polygonGeometry,
      centerX: pad.x + polygonGeometry.centerX,
      centerY: pad.y + polygonGeometry.centerY,
      ccwRotation: 0
    };
  }
  if ("rect_pad_width" in pad) {
    return {
      centerX: pad.x,
      centerY: pad.y,
      width: pad.rect_pad_width,
      height: pad.rect_pad_height,
      ccwRotation: pad.shape === "rotated_pill_hole_with_rect_pad" ? pad.rect_ccw_rotation : pad.shape === "circular_hole_with_rect_pad" ? pad.rect_ccw_rotation ?? 0 : 0
    };
  }
  return void 0;
}
function getPolygonGeometry(points) {
  if (points.length === 0) return void 0;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
    ccwRotation: 0
  };
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-component-warning.ts
import { applyToPoint as applyToPoint46 } from "transformation-matrix";
var WARNING_COLOR = "rgb(255, 208, 66)";
function annotateWarning(objects, warning) {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...object.attributes ?? {},
      "data-type": warning.type,
      "data-pcb-layer": "overlay"
    }
  }));
}
function createSvgObjectsFromPcbComponentWarning(warning, circuitJson, ctx) {
  if (!ctx.shouldDrawWarnings) return [];
  const component = circuitJson.find(
    (element) => element.type === "pcb_component" && element.pcb_component_id === warning.pcb_component_id
  );
  if (!component) return [];
  const rotationRadians = (component.rotation ?? 0) * Math.PI / 180;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  const halfWidth = component.width / 2;
  const halfHeight = component.height / 2;
  const corners = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight }
  ].map(
    (corner) => applyToPoint46(ctx.transform, {
      x: component.center.x + corner.x * cos - corner.y * sin,
      y: component.center.y + corner.x * sin + corner.y * cos
    })
  );
  const x = Math.min(...corners.map((corner) => corner.x));
  const y = Math.min(...corners.map((corner) => corner.y));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const maxY = Math.max(...corners.map((corner) => corner.y));
  const width = maxX - x;
  const height = maxY - y;
  const centerX = x + width / 2;
  return annotateWarning(
    [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          x: x.toString(),
          y: y.toString(),
          width: width.toString(),
          height: height.toString(),
          fill: "none",
          stroke: WARNING_COLOR,
          "stroke-width": "2",
          "stroke-dasharray": "6,3"
        },
        children: []
      },
      {
        name: "text",
        type: "element",
        value: "",
        attributes: {
          x: centerX.toString(),
          y: (y - 10).toString(),
          fill: WARNING_COLOR,
          "font-family": "sans-serif",
          "font-size": "12",
          "font-weight": "600",
          "text-anchor": "middle"
        },
        children: [
          {
            type: "text",
            name: "",
            value: warning.message,
            attributes: {},
            children: []
          }
        ]
      }
    ],
    warning
  );
}

// lib/pcb/svg-object-fns/create-svg-objects-from-pcb-debug-object.ts
import { applyToPoint as applyToPoint47 } from "transformation-matrix";
var DEBUG_COLOR = "#ff4d4d";
var textNode = (value) => ({
  type: "text",
  value,
  name: "",
  attributes: {},
  children: []
});
var createLabel = ({
  label,
  x,
  y,
  style,
  anchor = "start"
}) => label ? [
  {
    name: "text",
    type: "element",
    value: "",
    attributes: {
      x: x.toString(),
      y: y.toString(),
      fill: DEBUG_COLOR,
      "font-family": "monospace",
      "font-size": style.fontSize.toString(),
      "font-weight": "600",
      "text-anchor": anchor
    },
    children: [textNode(label)]
  }
] : [];
var getCommonAttributes = (debugObject) => ({
  "data-type": "pcb_debug_object",
  "data-pcb-layer": "overlay",
  "data-pcb-debug-object-id": debugObject.pcb_debug_object_id,
  "data-debug-shape": debugObject.shape
});
function createSvgObjectsFromPcbDebugObject({
  debugObject,
  transform,
  style,
  labelStackIndex = 0
}) {
  const commonAttributes = getCommonAttributes(debugObject);
  const strokeAttributes = {
    fill: "none",
    stroke: DEBUG_COLOR,
    "stroke-width": style.strokeWidth.toString(),
    "stroke-dasharray": `${style.dashLength},${style.dashLength}`
  };
  if (debugObject.shape === "rect") {
    const firstCorner = applyToPoint47(transform, [
      debugObject.center.x - debugObject.size.width / 2,
      debugObject.center.y - debugObject.size.height / 2
    ]);
    const secondCorner = applyToPoint47(transform, [
      debugObject.center.x + debugObject.size.width / 2,
      debugObject.center.y + debugObject.size.height / 2
    ]);
    const left = Math.min(firstCorner[0], secondCorner[0]);
    const top = Math.min(firstCorner[1], secondCorner[1]);
    const width = Math.abs(secondCorner[0] - firstCorner[0]);
    const height = Math.abs(secondCorner[1] - firstCorner[1]);
    return [
      {
        name: "g",
        type: "element",
        value: "",
        attributes: commonAttributes,
        children: [
          {
            name: "rect",
            type: "element",
            value: "",
            attributes: {
              x: left.toString(),
              y: top.toString(),
              width: width.toString(),
              height: height.toString(),
              ...strokeAttributes
            },
            children: []
          },
          ...createLabel({
            label: debugObject.label,
            x: left,
            y: top - style.labelGap - labelStackIndex * (style.fontSize + style.labelGap),
            style
          })
        ]
      }
    ];
  }
  if (debugObject.shape === "line") {
    const [startX, startY] = applyToPoint47(transform, [
      debugObject.start.x,
      debugObject.start.y
    ]);
    const [endX, endY] = applyToPoint47(transform, [
      debugObject.end.x,
      debugObject.end.y
    ]);
    return [
      {
        name: "g",
        type: "element",
        value: "",
        attributes: commonAttributes,
        children: [
          {
            name: "line",
            type: "element",
            value: "",
            attributes: {
              x1: startX.toString(),
              y1: startY.toString(),
              x2: endX.toString(),
              y2: endY.toString(),
              ...strokeAttributes
            },
            children: []
          },
          ...createLabel({
            label: debugObject.label,
            x: (startX + endX) / 2,
            y: (startY + endY) / 2 - style.labelGap,
            style,
            anchor: "middle"
          })
        ]
      }
    ];
  }
  const [centerX, centerY] = applyToPoint47(transform, [
    debugObject.center.x,
    debugObject.center.y
  ]);
  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: commonAttributes,
      children: [
        {
          name: "circle",
          type: "element",
          value: "",
          attributes: {
            cx: centerX.toString(),
            cy: centerY.toString(),
            r: style.pointRadius.toString(),
            ...strokeAttributes
          },
          children: []
        },
        ...createLabel({
          label: debugObject.label,
          x: centerX + style.pointRadius + style.labelGap,
          y: centerY - style.pointRadius,
          style
        })
      ]
    }
  ];
}

// lib/pcb/create-board-owner-map.ts
function createBoardOwnerMap(circuitJson) {
  const boardOwnerMap = /* @__PURE__ */ new Map();
  const parentById = /* @__PURE__ */ new Map();
  const boards = circuitJson.filter(
    (element) => element.type === "pcb_board"
  );
  for (const element of circuitJson) {
    switch (element.type) {
      case "source_group":
        parentById.set(
          element.source_group_id,
          element.subcircuit_id ?? element.parent_subcircuit_id ?? element.parent_source_group_id
        );
        if (element.is_subcircuit && element.subcircuit_id) {
          parentById.set(
            element.subcircuit_id,
            element.parent_subcircuit_id ?? element.parent_source_group_id
          );
        }
        break;
      case "pcb_group":
        parentById.set(
          element.pcb_group_id,
          element.subcircuit_id ?? element.source_group_id
        );
        break;
      case "pcb_component":
        parentById.set(
          element.pcb_component_id,
          element.subcircuit_id ?? element.pcb_group_id
        );
        break;
      case "pcb_trace":
        parentById.set(
          element.pcb_trace_id,
          element.subcircuit_id ?? element.pcb_group_id ?? element.pcb_component_id
        );
        break;
      case "pcb_via":
        parentById.set(
          element.pcb_via_id,
          element.subcircuit_id ?? element.pcb_group_id ?? element.pcb_trace_id
        );
        break;
    }
  }
  for (const board of boards) {
    boardOwnerMap.set(board.pcb_board_id, board);
    if (board.subcircuit_id) boardOwnerMap.set(board.subcircuit_id, board);
  }
  const resolving = /* @__PURE__ */ new Set();
  function resolveBoard(id) {
    if (boardOwnerMap.has(id)) return boardOwnerMap.get(id);
    if (resolving.has(id) || !parentById.has(id)) return void 0;
    resolving.add(id);
    const parentId = parentById.get(id);
    const board = parentId ? resolveBoard(parentId) : boards.length === 1 ? boards[0] : void 0;
    boardOwnerMap.set(id, board);
    resolving.delete(id);
    return board;
  }
  for (const id of parentById.keys()) resolveBoard(id);
  return boardOwnerMap;
}

// lib/pcb/convert-circuit-json-to-pcb-svg.ts
function convertCircuitJsonToPcbSvg(circuitJson, options) {
  if (options?.showFabricationNotes === false) {
    circuitJson = circuitJson.filter(
      (element) => !element.type.startsWith("pcb_fabrication_note_")
    );
  }
  const xRayActive = Boolean(options?.xRayElementIds?.length);
  if (xRayActive && options?.hiddenLayerOpacity !== void 0 && (!Number.isFinite(options.hiddenLayerOpacity) || options.hiddenLayerOpacity < 0 || options.hiddenLayerOpacity > 1))
    throw new Error("hiddenLayerOpacity must be between 0 and 1");
  const drawPaddingOutsideBoard = !xRayActive && (options?.drawPaddingOutsideBoard ?? true);
  const layer = options?.layer;
  const colorOverrides = options?.colorOverrides;
  const copperColors = {
    ...DEFAULT_PCB_COLOR_MAP.copper
  };
  if (colorOverrides?.copper) {
    for (const [layerName, color] of Object.entries(colorOverrides.copper)) {
      if (color !== void 0) {
        copperColors[layerName] = color;
      }
    }
  }
  const colorMap2 = {
    copper: copperColors,
    drill: colorOverrides?.drill ?? DEFAULT_PCB_COLOR_MAP.drill,
    silkscreen: {
      top: colorOverrides?.silkscreen?.top ?? DEFAULT_PCB_COLOR_MAP.silkscreen.top,
      bottom: colorOverrides?.silkscreen?.bottom ?? DEFAULT_PCB_COLOR_MAP.silkscreen.bottom
    },
    boardOutline: colorOverrides?.boardOutline ?? DEFAULT_PCB_COLOR_MAP.boardOutline,
    soldermask: {
      top: colorOverrides?.soldermask?.top ?? DEFAULT_PCB_COLOR_MAP.soldermask.top,
      bottom: colorOverrides?.soldermask?.bottom ?? DEFAULT_PCB_COLOR_MAP.soldermask.bottom
    },
    soldermaskOverCopper: {
      top: colorOverrides?.soldermaskOverCopper?.top ?? DEFAULT_PCB_COLOR_MAP.soldermaskOverCopper.top,
      bottom: colorOverrides?.soldermaskOverCopper?.bottom ?? DEFAULT_PCB_COLOR_MAP.soldermaskOverCopper.bottom
    },
    soldermaskWithCopperUnderneath: {
      top: colorOverrides?.soldermaskWithCopperUnderneath?.top ?? DEFAULT_PCB_COLOR_MAP.soldermaskWithCopperUnderneath.top,
      bottom: colorOverrides?.soldermaskWithCopperUnderneath?.bottom ?? DEFAULT_PCB_COLOR_MAP.soldermaskWithCopperUnderneath.bottom
    },
    substrate: colorOverrides?.substrate ?? DEFAULT_PCB_COLOR_MAP.substrate,
    courtyard: {
      top: colorOverrides?.courtyard?.top ?? DEFAULT_PCB_COLOR_MAP.courtyard.top,
      bottom: colorOverrides?.courtyard?.bottom ?? DEFAULT_PCB_COLOR_MAP.courtyard.bottom
    },
    keepout: colorOverrides?.keepout ?? DEFAULT_PCB_COLOR_MAP.keepout,
    debugComponent: {
      fill: colorOverrides?.debugComponent?.fill ?? DEFAULT_PCB_COLOR_MAP.debugComponent.fill,
      stroke: colorOverrides?.debugComponent?.stroke ?? DEFAULT_PCB_COLOR_MAP.debugComponent.stroke
    }
  };
  const circuitJsonForBounds = options?.showCourtyards ? circuitJson : circuitJson.filter((element) => element.type !== "pcb_courtyard_rect");
  const {
    minX,
    minY,
    maxX,
    maxY,
    boardMinX,
    boardMinY,
    boardMaxX,
    boardMaxY,
    hasBoardBounds
  } = getComprehensivePcbBounds(circuitJsonForBounds);
  const { boundsMinX, boundsMinY, boundsMaxX, boundsMaxY, padding } = getViewportBounds({
    circuitJson,
    drawPaddingOutsideBoard,
    baseBounds: {
      minX,
      minY,
      maxX,
      maxY,
      boardMinX,
      boardMinY,
      boardMaxX,
      boardMaxY,
      hasBoardBounds
    },
    viewportOptions: {
      viewport: options?.viewport,
      viewportTarget: options?.viewportTarget
    }
  });
  const circuitWidth = boundsMaxX - boundsMinX + 2 * padding;
  const circuitHeight = boundsMaxY - boundsMinY + 2 * padding;
  let svgWidth = options?.width ?? 800;
  let svgHeight = options?.height ?? 600;
  if (options?.matchBoardAspectRatio) {
    const viewportWidth = boundsMaxX - boundsMinX;
    const viewportHeight = boundsMaxY - boundsMinY;
    if (viewportWidth > 0 && viewportHeight > 0) {
      const aspect = viewportWidth / viewportHeight;
      if (options?.width && !options?.height) {
        svgHeight = options.width / aspect;
      } else if (options?.height && !options?.width) {
        svgWidth = options.height * aspect;
      } else {
        svgHeight = svgWidth / aspect;
      }
    }
  }
  const paths = [];
  for (const circuitJsonElm of circuitJson) {
    if ("route" in circuitJsonElm && circuitJsonElm.route !== void 0) {
      paths.push(circuitJsonElm.route);
    }
  }
  const scaleX = svgWidth / circuitWidth;
  const scaleY = svgHeight / circuitHeight;
  const scaleFactor = Math.min(scaleX, scaleY);
  const offsetX = (svgWidth - circuitWidth * scaleFactor) / 2;
  const offsetY = (svgHeight - circuitHeight * scaleFactor) / 2;
  const transform = compose7(
    translate7(
      offsetX - boundsMinX * scaleFactor + padding * scaleFactor,
      svgHeight - offsetY + boundsMinY * scaleFactor - padding * scaleFactor
    ),
    scale3(scaleFactor, -scaleFactor)
    // Flip in y-direction
  );
  const viewportScale = Math.min(svgWidth, svgHeight);
  const debugStrokeWidth = Math.max(1, Math.min(2, viewportScale * 2e-3));
  const debugFontSize = Math.max(10, Math.min(18, viewportScale * 0.02));
  const ctx = {
    transform,
    layer,
    shouldDrawErrors: options?.shouldDrawErrors,
    shouldDrawWarnings: options?.shouldDrawWarnings,
    showCourtyards: options?.showCourtyards,
    showPcbGroups: options?.showPcbGroups,
    drawPaddingOutsideBoard,
    colorMap: colorMap2,
    showSolderMask: options?.showSolderMask,
    showSolderPaste: options?.showSolderPaste,
    showPcbNotes: options?.showPcbNotes ?? true,
    showBendLines: options?.showBendLines,
    showDebugObjects: options?.showDebugObjects,
    debugObjectStyle: {
      fontSize: debugFontSize,
      strokeWidth: debugStrokeWidth,
      dashLength: debugStrokeWidth * 4,
      labelGap: debugFontSize * 0.35,
      pointRadius: debugStrokeWidth * 3
    },
    showAnchorOffsets: options?.showAnchorOffsets,
    showPinNumbers: options?.showPinNumbers,
    circuitJson,
    boardOwnerMap: createBoardOwnerMap(circuitJson),
    usedCopperPourTraceMaskIds: /* @__PURE__ */ new Set()
  };
  let unsortedSvgObjects = xRayActive ? [] : circuitJson.flatMap((elm) => createSvgObjects({ elm, circuitJson, ctx }));
  let strokeWidth = String(0.05 * scaleFactor);
  for (const element of circuitJson) {
    if ("stroke_width" in element) {
      strokeWidth = String(scaleFactor * element.stroke_width);
      break;
    }
  }
  if (!xRayActive && options?.shouldDrawRatsNest) {
    const ratsNestObjects = createSvgObjectsForRatsNest(circuitJson, ctx);
    unsortedSvgObjects = [...unsortedSvgObjects, ...ratsNestObjects];
  }
  const svgObjects = xRayActive ? createXRaySvgObjects({
    circuitJson,
    ctx,
    selectedIds: options.xRayElementIds,
    hiddenOpacity: options?.hiddenLayerOpacity ?? 0.2,
    width: svgWidth,
    height: svgHeight,
    create: (elm, context) => createSvgObjects({ elm, circuitJson, ctx: context })
  }) : groupCopperPourMaskedTraceObjects(
    sortSvgObjectsByPcbLayer(unsortedSvgObjects)
  );
  const children = [
    {
      name: "style",
      type: "element",
      value: "",
      attributes: {},
      children: [
        {
          type: "text",
          value: "",
          name: "",
          attributes: {},
          children: []
        }
      ]
    }
  ];
  const gridObjects = createSvgObjectsForPcbGrid({
    grid: xRayActive ? void 0 : options?.grid,
    svgWidth,
    svgHeight
  });
  if (gridObjects.defs) {
    children.push(gridObjects.defs);
  }
  const hasKeepouts = circuitJson.some((elm) => elm.type === "pcb_keepout");
  if (hasKeepouts) {
    children.push(
      createKeepoutPatternDefs(
        colorMap2.keepout ?? DEFAULT_PCB_COLOR_MAP.keepout
      )
    );
  }
  const copperPourTraceMaskDefs = createCopperPourTraceMaskDefs({
    circuitJson,
    transform,
    svgWidth,
    svgHeight,
    usedMaskIds: ctx.usedCopperPourTraceMaskIds
  });
  if (copperPourTraceMaskDefs) {
    children.push(copperPourTraceMaskDefs);
  }
  const soldermaskOpeningMasks = createSoldermaskOpeningMasks({
    showSolderMask: ctx.showSolderMask,
    objects: unsortedSvgObjects,
    layer: layer ?? "top",
    width: svgWidth,
    height: svgHeight
  });
  if (soldermaskOpeningMasks) {
    children.push(soldermaskOpeningMasks);
  }
  children.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "boundary",
      x: "0",
      y: "0",
      fill: options?.backgroundColor ?? "#000",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      "data-type": "pcb_background",
      "data-pcb-layer": "global"
    },
    children: []
  });
  if (drawPaddingOutsideBoard) {
    children.push(
      createSvgObjectFromPcbBoundary(transform, minX, minY, maxX, maxY)
    );
  }
  children.push(...svgObjects);
  if (gridObjects.rect) {
    children.push(gridObjects.rect);
  }
  if (!xRayActive && options?.showErrorsInTextOverlay) {
    const errorOverlay = createErrorTextOverlay(
      circuitJson,
      "pcb_error_text_overlay"
    );
    if (errorOverlay) {
      children.push(errorOverlay);
    }
  }
  const softwareUsedString = getSoftwareUsedString(circuitJson);
  const version = CIRCUIT_TO_SVG_VERSION;
  const svgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      ...softwareUsedString && {
        "data-software-used-string": softwareUsedString
      },
      ...options?.includeVersion && {
        "data-circuit-to-svg-version": version
      }
    },
    value: "",
    children: children.filter((child) => child !== null)
  };
  try {
    return stringifySvg(svgObject);
  } catch (error) {
    console.error("Error stringifying SVG object:", error);
    throw error;
  }
}
function createSvgObjects({
  elm,
  circuitJson,
  ctx
}) {
  switch (elm.type) {
    case "pcb_debug_object":
      return ctx.showDebugObjects ? createSvgObjectsFromPcbDebugObject({
        debugObject: elm,
        transform: ctx.transform,
        style: ctx.debugObjectStyle,
        labelStackIndex: elm.shape === "rect" ? circuitJson.slice(0, circuitJson.indexOf(elm)).filter(
          (other) => other.type === "pcb_debug_object" && other.shape === "rect" && other.center.x === elm.center.x && other.center.y === elm.center.y && other.size.width === elm.size.width && other.size.height === elm.size.height
        ).length : 0
      }) : [];
    case "pcb_trace_error":
      return createSvgObjectsFromPcbTraceError(elm, circuitJson, ctx).filter(
        Boolean
      );
    case "pcb_footprint_overlap_error":
      return createSvgObjectsFromPcbFootprintOverlapError(
        elm,
        circuitJson,
        ctx
      ).filter(Boolean);
    case "pcb_courtyard_overlap_error":
      return createSvgObjectsFromPcbCourtyardOverlapError(
        elm,
        circuitJson,
        ctx
      ).filter(Boolean);
    case "pcb_component_outside_board_error":
      return createSvgObjectsFromPcbComponentOutsideBoardError(
        elm,
        circuitJson,
        ctx
      ).filter(Boolean);
    case "pcb_pad_trace_clearance_error":
    case "pcb_via_trace_clearance_error":
      return createSvgObjectsFromPcbTraceClearanceError(
        elm,
        circuitJson,
        ctx
      ).filter(Boolean);
    case "pcb_connector_not_in_accessible_orientation_warning":
    case "pcb_manual_edit_conflict_warning":
      return createSvgObjectsFromPcbComponentWarning(elm, circuitJson, ctx);
    case "pcb_component":
      return createSvgObjectsFromPcbComponent(elm, ctx).filter(Boolean);
    case "pcb_trace":
      return createSvgObjectsFromPcbTrace(elm, ctx);
    case "pcb_copper_pour":
      return createSvgObjectsFromPcbCopperPour(elm, ctx);
    case "pcb_plated_hole":
      return [
        ...createSvgObjectsFromPcbPlatedHole(elm, ctx).filter(Boolean),
        ...createSvgObjectFromPcbPadPinNumber(elm, ctx)
      ];
    case "pcb_hole":
      return createSvgObjectsFromPcbHole(elm, ctx);
    case "pcb_smtpad":
      return [
        ...createSvgObjectsFromSmtPad(elm, ctx),
        ...createSvgObjectFromPcbPadPinNumber(elm, ctx)
      ];
    case "pcb_solder_paste":
      return ctx.showSolderPaste ? createSvgObjectsFromSolderPaste(elm, ctx) : [];
    case "pcb_silkscreen_text":
      return createSvgObjectsFromPcbSilkscreenText(elm, ctx);
    case "pcb_silkscreen_rect":
      return createSvgObjectsFromPcbSilkscreenRect(elm, ctx);
    case "pcb_silkscreen_circle":
      return createSvgObjectsFromPcbSilkscreenCircle(elm, ctx);
    case "pcb_silkscreen_line":
      return createSvgObjectsFromPcbSilkscreenLine(elm, ctx);
    case "pcb_silkscreen_pill":
      return createSvgObjectsFromPcbSilkscreenPill(elm, ctx);
    case "pcb_silkscreen_oval":
      return createSvgObjectsFromPcbSilkscreenOval(elm, ctx);
    case "pcb_copper_text":
      return createSvgObjectsFromPcbCopperText(elm, ctx);
    case "pcb_courtyard_rect":
      if (!ctx.showCourtyards) return [];
      return createSvgObjectsFromPcbCourtyardRect(elm, ctx);
    case "pcb_courtyard_polygon":
      if (!ctx.showCourtyards) return [];
      return createSvgObjectsFromPcbCourtyardPolygon(elm, ctx);
    case "pcb_courtyard_circle":
      if (!ctx.showCourtyards) return [];
      return createSvgObjectsFromPcbCourtyardCircle(elm, ctx);
    case "pcb_courtyard_outline":
      if (!ctx.showCourtyards) return [];
      return createSvgObjectsFromPcbCourtyardOutline(elm, ctx);
    case "pcb_fabrication_note_path":
      return createSvgObjectsFromPcbFabricationNotePath(elm, ctx);
    case "pcb_fabrication_note_text":
      return createSvgObjectsFromPcbFabricationNoteText(elm, ctx);
    case "pcb_fabrication_note_rect":
      return createSvgObjectsFromPcbFabricationNoteRect(elm, ctx);
    case "pcb_fabrication_note_dimension":
      return createSvgObjectsFromPcbFabricationNoteDimension(elm, ctx);
    case "pcb_note_dimension":
      if (!ctx.showPcbNotes) return [];
      return createSvgObjectsFromPcbNoteDimension(elm, ctx);
    case "pcb_note_text":
      if (!ctx.showPcbNotes) return [];
      return createSvgObjectsFromPcbNoteText(elm, ctx);
    case "pcb_note_rect":
      if (!ctx.showPcbNotes) return [];
      return createSvgObjectsFromPcbNoteRect(elm, ctx);
    case "pcb_note_path":
      if (!ctx.showPcbNotes) return [];
      return createSvgObjectsFromPcbNotePath(elm, ctx);
    case "pcb_note_line":
      if (!ctx.showPcbNotes) return [];
      return createSvgObjectsFromPcbNoteLine(elm, ctx);
    case "pcb_bend":
      if (!ctx.showBendLines) return [];
      return createSvgObjectsFromPcbBend(elm, ctx);
    case "pcb_silkscreen_path":
      return createSvgObjectsFromPcbSilkscreenPath(elm, ctx);
    case "pcb_silkscreen_graphic":
      return createSvgObjectsFromPcbSilkscreenGraphic(elm, ctx);
    case "pcb_panel":
      return ctx.drawPaddingOutsideBoard ? createSvgObjectsFromPcbPanel(elm, ctx) : [];
    case "pcb_board":
      return ctx.drawPaddingOutsideBoard ? createSvgObjectsFromPcbBoard(elm, ctx) : [];
    case "pcb_via":
      return createSvgObjectsFromPcbVia(elm, ctx);
    case "pcb_cutout":
      const cutout = elm;
      if (cutout.shape === "path") {
        return createSvgObjectsFromPcbCutoutPath(cutout, ctx);
      }
      return createSvgObjectsFromPcbCutout(elm, ctx);
    case "pcb_keepout":
      return createSvgObjectsFromPcbKeepout(elm, ctx);
    case "pcb_group":
      return ctx.showPcbGroups ? createSvgObjectsFromPcbGroup(elm, ctx) : [];
    default:
      return [];
  }
}
function createSvgObjectFromPcbBoundary(transform, minX, minY, maxX, maxY) {
  const [x1, y1] = applyToPoint48(transform, [minX, minY]);
  const [x2, y2] = applyToPoint48(transform, [maxX, maxY]);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  return {
    name: "rect",
    type: "element",
    value: "",
    children: [],
    attributes: {
      class: "pcb-boundary",
      fill: "none",
      stroke: "#fff",
      "stroke-width": "0.3",
      x: x.toString(),
      y: y.toString(),
      width: width.toString(),
      height: height.toString(),
      "data-type": "pcb_boundary",
      "data-pcb-layer": "global"
    }
  };
}
var circuitJsonToPcbSvg = convertCircuitJsonToPcbSvg;

// lib/assembly/convert-circuit-json-to-assembly-svg.ts
import "svgson";
import { su as su3 } from "@tscircuit/circuit-json-util";
import {
  applyToPoint as applyToPoint55,
  compose as compose8,
  scale as scale4,
  translate as translate8
} from "transformation-matrix";

// lib/assembly/svg-object-fns/create-svg-objects-from-assembly-board.ts
import { applyToPoint as applyToPoint49 } from "transformation-matrix";
var DEFAULT_BOARD_STYLE = {
  fill: "none",
  stroke: "rgb(0,0,0)",
  strokeOpacity: "0.8",
  strokeWidthFactor: 0.2
};
function createSvgObjectsFromAssemblyBoard(pcbBoard, transform, style = {}) {
  const { width, height, center, outline } = pcbBoard;
  let path;
  if (outline && Array.isArray(outline) && outline.length >= 3) {
    path = outline.map((point, index) => {
      const [x, y] = applyToPoint49(transform, [point.x, point.y]);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(" ");
  } else {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const topLeft = applyToPoint49(transform, [
      center.x - halfWidth,
      center.y - halfHeight
    ]);
    const topRight = applyToPoint49(transform, [
      center.x + halfWidth,
      center.y - halfHeight
    ]);
    const bottomRight = applyToPoint49(transform, [
      center.x + halfWidth,
      center.y + halfHeight
    ]);
    const bottomLeft = applyToPoint49(transform, [
      center.x - halfWidth,
      center.y + halfHeight
    ]);
    path = `M ${topLeft[0]} ${topLeft[1]} L ${topRight[0]} ${topRight[1]} L ${bottomRight[0]} ${bottomRight[1]} L ${bottomLeft[0]} ${bottomLeft[1]}`;
  }
  path += " Z";
  return [
    {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-board",
        d: path,
        fill: style.fill ?? DEFAULT_BOARD_STYLE.fill,
        stroke: style.stroke ?? DEFAULT_BOARD_STYLE.stroke,
        "stroke-opacity": style.strokeOpacity ?? DEFAULT_BOARD_STYLE.strokeOpacity,
        "stroke-width": ((style.strokeWidthFactor ?? DEFAULT_BOARD_STYLE.strokeWidthFactor) * Math.abs(transform.a)).toString()
      }
    }
  ];
}

// lib/assembly/svg-object-fns/create-svg-objects-from-assembly-component.ts
import { applyToPoint as applyToPoint51 } from "transformation-matrix";

// lib/utils/get-sch-font-size.ts
import "transformation-matrix";
var fontSizeMap = {
  pin_number: 0.15,
  negated_pin_number: 0.15 * 0.8,
  reference_designator: 0.18,
  manufacturer_number: 0.18,
  net_label: 0.18,
  error: 0.05
};
var getSchMmFontSize = (textType, fontSize) => {
  return fontSize ?? fontSizeMap[textType];
};
var getSchScreenFontSize = (transform, textType, fontSize) => {
  return Math.abs(transform.a) * getSchMmFontSize(textType, fontSize);
};

// lib/assembly/svg-object-fns/create-svg-objects-from-assembly-component.ts
function createSvgObjectsFromAssemblyComponent(params, ctx) {
  const { elm, portPosition, name, arePinsInterchangeable } = params;
  const { transform } = ctx;
  const { center, width, height, rotation = 0, layer = "top" } = elm;
  if (!center || typeof width !== "number" || typeof height !== "number")
    return null;
  const [x, y] = applyToPoint51(transform, [center.x, center.y]);
  const [pinX, pinY] = applyToPoint51(transform, [portPosition.x, portPosition.y]);
  const scaledWidth = width * Math.abs(transform.a);
  const scaledHeight = height * Math.abs(transform.d);
  const isTopLayer = layer === "top";
  const isPinTop = pinY > y;
  const isPinLeft = pinX < x;
  const children = [
    createComponentPath(scaledWidth, scaledHeight, rotation, layer),
    createComponentLabel(scaledWidth, scaledHeight, name ?? "", transform)
  ];
  if (!arePinsInterchangeable) {
    children.push(
      createPin1Indicator(
        scaledWidth,
        scaledHeight,
        rotation,
        layer,
        isPinTop,
        isPinLeft
      )
    );
  }
  return {
    name: "g",
    type: "element",
    value: "",
    attributes: {
      transform: `translate(${x}, ${y}) scale(1, -1)`
    },
    children
  };
}
function createComponentPath(scaledWidth, scaledHeight, rotation, layer) {
  const w = scaledWidth / 2;
  const h = scaledHeight / 2;
  const strokeWidth = 0.8;
  const path = getRectPathData(w, h, rotation);
  return {
    name: "path",
    type: "element",
    attributes: {
      class: "assembly-component",
      d: path,
      "stroke-width": strokeWidth.toFixed(2),
      transform: `rotate(${-rotation})`,
      "stroke-dasharray": layer === "bottom" ? "2,2" : ""
    },
    value: "",
    children: []
  };
}
function createComponentLabel(scaledWidth, scaledHeight, name, transform) {
  const size = Math.min(scaledWidth, scaledHeight);
  const minFontSize = 3;
  const maxFontSize = 58;
  const fontScale = 0.8;
  const fontSize = Math.min(
    maxFontSize,
    Math.max(minFontSize, size * fontScale)
  );
  const isTall = scaledHeight > scaledWidth;
  return {
    name: "text",
    type: "element",
    attributes: {
      x: "0",
      y: "0",
      class: "assembly-component-label",
      "text-anchor": "middle",
      dy: ".10em",
      style: "pointer-events: none",
      "font-size": `${fontSize.toFixed(1)}px`,
      transform: isTall ? "rotate(90) scale(1, -1)" : "scale(1, -1)"
    },
    children: [
      {
        type: "text",
        value: name || "",
        name: "",
        attributes: {},
        children: []
      }
    ],
    value: ""
  };
}
function createPin1Indicator(scaledWidth, scaledHeight, rotation, layer, isPinTop, isPinLeft) {
  const w = scaledWidth / 2;
  const h = scaledHeight / 2;
  const indicatorSize = Math.min(w, h) * 0.5;
  let points;
  if (isPinTop && isPinLeft) {
    points = [
      [-w, -h],
      // Corner point
      [-w + indicatorSize, -h],
      // Point along top edge
      [-w, -h + indicatorSize]
      // Point along left edge
    ];
  } else if (isPinTop && !isPinLeft) {
    points = [
      [w, -h],
      // Corner point
      [w - indicatorSize, -h],
      // Point along top edge
      [w, -h + indicatorSize]
      // Point along right edge
    ];
  } else if (!isPinTop && isPinLeft) {
    points = [
      [-w, h],
      // Corner point
      [-w + indicatorSize, h],
      // Point along bottom edge
      [-w, h - indicatorSize]
      // Point along left edge
    ];
  } else {
    points = [
      [w, h],
      // Corner point
      [w - indicatorSize, h],
      // Point along bottom edge
      [w, h - indicatorSize]
      // Point along right edge
    ];
  }
  const pointsString = points.map((p) => p.join(",")).join(" ");
  return {
    name: "polygon",
    type: "element",
    attributes: {
      class: "assembly-pin1-indicator",
      points: pointsString,
      fill: "#333",
      stroke: "none",
      transform: `rotate(${-rotation})`
    },
    value: "",
    children: []
  };
}
function getRectPathData(w, h, rotation) {
  const rotatePoint = (x, y, angle) => {
    const rad = Math.PI / 180 * angle;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return [x * cos - y * sin, x * sin + y * cos];
  };
  const corners = [
    [-w, -h],
    [w, -h],
    [w, h],
    [-w, h]
  ];
  const rotatedCorners = corners.map(([x, y]) => rotatePoint(x, y, rotation));
  const path = rotatedCorners.map(([x, y], i) => i === 0 ? `M${x},${y}` : `L${x},${y}`).join(" ");
  return `${path} Z`;
}

// lib/assembly/svg-object-fns/create-svg-objects-from-assembly-hole.ts
import { applyToPoint as applyToPoint52 } from "transformation-matrix";
var HOLE_COLOR2 = "rgb(190, 190, 190)";
function createSvgObjectsFromAssemblyHole(hole, ctx) {
  const { transform } = ctx;
  const [x, y] = applyToPoint52(transform, [hole.x, hole.y]);
  if (hole.hole_shape === "circle" || hole.hole_shape === "square") {
    const scaledDiameter = hole.hole_diameter * Math.abs(transform.a);
    const radius = scaledDiameter / 2;
    if (hole.hole_shape === "circle") {
      return [
        {
          name: "circle",
          type: "element",
          attributes: {
            class: "assembly-hole",
            cx: x.toString(),
            cy: y.toString(),
            r: radius.toString(),
            fill: HOLE_COLOR2
          },
          children: [],
          value: ""
        }
      ];
    }
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "assembly-hole",
          x: (x - radius).toString(),
          y: (y - radius).toString(),
          width: scaledDiameter.toString(),
          height: scaledDiameter.toString(),
          fill: HOLE_COLOR2
        },
        children: [],
        value: ""
      }
    ];
  }
  if (hole.hole_shape === "oval") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a);
    const scaledHeight = hole.hole_height * Math.abs(transform.a);
    const rx = scaledWidth / 2;
    const ry = scaledHeight / 2;
    return [
      {
        name: "ellipse",
        type: "element",
        attributes: {
          class: "assembly-hole",
          cx: x.toString(),
          cy: y.toString(),
          rx: rx.toString(),
          ry: ry.toString(),
          fill: HOLE_COLOR2
        },
        children: [],
        value: ""
      }
    ];
  }
  return [];
}

// lib/assembly/svg-object-fns/create-svg-objects-from-assembly-plated-hole.ts
import { applyToPoint as applyToPoint53 } from "transformation-matrix";
var PAD_COLOR = "rgb(210, 210, 210)";
var HOLE_COLOR3 = "rgb(190, 190, 190)";
function createSvgObjectsFromAssemblyPlatedHole(hole, ctx) {
  const { transform } = ctx;
  const [x, y] = applyToPoint53(transform, [hole.x, hole.y]);
  if (hole.shape === "pill") {
    const scaledOuterWidth = hole.outer_width * Math.abs(transform.a);
    const scaledOuterHeight = hole.outer_height * Math.abs(transform.a);
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a);
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a);
    const outerRadiusX = scaledOuterWidth / 2;
    const straightLength = scaledOuterHeight - scaledOuterWidth;
    const innerRadiusX = scaledHoleWidth / 2;
    return [
      {
        name: "g",
        type: "element",
        children: [
          // Outer pill shape
          {
            name: "path",
            type: "element",
            attributes: {
              class: "assembly-hole-outer",
              fill: PAD_COLOR,
              d: `M${x - outerRadiusX},${y - straightLength / 2} v${straightLength} a${outerRadiusX},${outerRadiusX} 0 0 0 ${scaledOuterWidth},0 v-${straightLength} a${outerRadiusX},${outerRadiusX} 0 0 0 -${scaledOuterWidth},0 z`
            },
            value: "",
            children: []
          },
          // Inner pill shape
          {
            name: "path",
            type: "element",
            attributes: {
              class: "assembly-hole-inner",
              fill: HOLE_COLOR3,
              d: `M${x - innerRadiusX},${y - (scaledHoleHeight - scaledHoleWidth) / 2} v${scaledHoleHeight - scaledHoleWidth} a${innerRadiusX},${innerRadiusX} 0 0 0 ${scaledHoleWidth},0 v-${scaledHoleHeight - scaledHoleWidth} a${innerRadiusX},${innerRadiusX} 0 0 0 -${scaledHoleWidth},0 z`
            },
            value: "",
            children: []
          }
        ],
        value: "",
        attributes: {}
      }
    ];
  }
  if (hole.shape === "circle") {
    const scaledOuterWidth = hole.outer_diameter * Math.abs(transform.a);
    const scaledOuterHeight = hole.outer_diameter * Math.abs(transform.a);
    const scaledHoleWidth = hole.hole_diameter * Math.abs(transform.a);
    const scaledHoleHeight = hole.hole_diameter * Math.abs(transform.a);
    const outerRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2;
    const innerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2;
    return [
      {
        name: "g",
        type: "element",
        children: [
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "assembly-hole-outer",
              fill: PAD_COLOR,
              cx: x.toString(),
              cy: y.toString(),
              r: outerRadius.toString()
            },
            value: "",
            children: []
          },
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "assembly-hole-inner",
              fill: HOLE_COLOR3,
              cx: x.toString(),
              cy: y.toString(),
              r: innerRadius.toString()
            },
            value: "",
            children: []
          }
        ],
        value: "",
        attributes: {}
      }
    ];
  }
  if (hole.shape === "circular_hole_with_rect_pad") {
    const circularHole = hole;
    const scaledHoleDiameter = circularHole.hole_diameter * Math.abs(transform.a);
    const scaledRectPadWidth = circularHole.rect_pad_width * Math.abs(transform.a);
    const scaledRectPadHeight = circularHole.rect_pad_height * Math.abs(transform.a);
    const scaledRectBorderRadius = (circularHole.rect_border_radius ?? 0) * Math.abs(transform.a);
    const rectCcwRotation = circularHole.rect_ccw_rotation ?? 0;
    const holeRadius = scaledHoleDiameter / 2;
    const [holeCx, holeCy] = applyToPoint53(transform, [
      circularHole.x + circularHole.hole_offset_x,
      circularHole.y + circularHole.hole_offset_y
    ]);
    return [
      {
        name: "g",
        type: "element",
        children: [
          // Rectangular pad (outer shape)
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "assembly-hole-outer-pad",
              fill: PAD_COLOR,
              ...rectCcwRotation ? {
                x: (-scaledRectPadWidth / 2).toString(),
                y: (-scaledRectPadHeight / 2).toString(),
                transform: `translate(${x} ${y}) rotate(${-rectCcwRotation})`
              } : {
                x: (x - scaledRectPadWidth / 2).toString(),
                y: (y - scaledRectPadHeight / 2).toString()
              },
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
              ...scaledRectBorderRadius ? {
                rx: scaledRectBorderRadius.toString(),
                ry: scaledRectBorderRadius.toString()
              } : {}
            },
            value: "",
            children: []
          },
          // Circular hole inside the rectangle
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "assembly-hole-inner",
              fill: HOLE_COLOR3,
              cx: holeCx.toString(),
              cy: holeCy.toString(),
              r: holeRadius.toString()
            },
            value: "",
            children: []
          }
        ],
        value: "",
        attributes: {}
      }
    ];
  }
  if (hole.shape === "pill_hole_with_rect_pad") {
    const pillHole = hole;
    const scaledRectPadWidth = pillHole.rect_pad_width * Math.abs(transform.a);
    const scaledRectPadHeight = pillHole.rect_pad_height * Math.abs(transform.a);
    const scaledRectBorderRadius = (pillHole.rect_border_radius ?? 0) * Math.abs(transform.a);
    const scaledHoleHeight = pillHole.hole_height * Math.abs(transform.a);
    const scaledHoleWidth = pillHole.hole_width * Math.abs(transform.a);
    const pillHoleWithOffsets = pillHole;
    const holeOffsetX = pillHoleWithOffsets.hole_offset_x ?? 0;
    const holeOffsetY = pillHoleWithOffsets.hole_offset_y ?? 0;
    const [holeCenterX, holeCenterY] = applyToPoint53(transform, [
      pillHole.x + holeOffsetX,
      pillHole.y + holeOffsetY
    ]);
    const holeRadius = Math.min(scaledHoleHeight, scaledHoleWidth) / 2;
    return [
      {
        name: "g",
        type: "element",
        children: [
          // Rectangular pad (outer shape)
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "assembly-hole-outer-pad",
              fill: PAD_COLOR,
              x: (x - scaledRectPadWidth / 2).toString(),
              y: (y - scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
              ...scaledRectBorderRadius ? {
                rx: scaledRectBorderRadius.toString(),
                ry: scaledRectBorderRadius.toString()
              } : {}
            },
            value: "",
            children: []
          },
          // pill hole inside the rectangle
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "assembly-hole-inner",
              fill: HOLE_COLOR3,
              x: (holeCenterX - scaledHoleWidth / 2).toString(),
              y: (holeCenterY - scaledHoleHeight / 2).toString(),
              width: scaledHoleWidth.toString(),
              height: scaledHoleHeight.toString(),
              rx: holeRadius.toString(),
              ry: holeRadius.toString()
            },
            value: "",
            children: []
          }
        ],
        value: "",
        attributes: {}
      }
    ];
  }
  if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    const rotatedHole = hole;
    const scaledRectPadWidth = rotatedHole.rect_pad_width * Math.abs(transform.a);
    const scaledRectPadHeight = rotatedHole.rect_pad_height * Math.abs(transform.a);
    const scaledRectBorderRadius = (rotatedHole.rect_border_radius ?? 0) * Math.abs(transform.a);
    const scaledHoleHeight = rotatedHole.hole_height * Math.abs(transform.a);
    const scaledHoleWidth = rotatedHole.hole_width * Math.abs(transform.a);
    const rotatedHoleWithOffsets = rotatedHole;
    const holeOffsetX = rotatedHoleWithOffsets.hole_offset_x ?? 0;
    const holeOffsetY = rotatedHoleWithOffsets.hole_offset_y ?? 0;
    const [holeCenterX, holeCenterY] = applyToPoint53(transform, [
      rotatedHole.x + holeOffsetX,
      rotatedHole.y + holeOffsetY
    ]);
    const holeRadius = Math.min(scaledHoleHeight, scaledHoleWidth) / 2;
    return [
      {
        name: "g",
        type: "element",
        children: [
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "assembly-hole-outer-pad",
              fill: PAD_COLOR,
              x: (-scaledRectPadWidth / 2).toString(),
              y: (-scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
              transform: `translate(${x} ${y}) rotate(${-rotatedHole.rect_ccw_rotation})`,
              ...scaledRectBorderRadius ? {
                rx: scaledRectBorderRadius.toString(),
                ry: scaledRectBorderRadius.toString()
              } : {}
            },
            value: "",
            children: []
          },
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "assembly-hole-inner",
              fill: HOLE_COLOR3,
              x: (-scaledHoleWidth / 2).toString(),
              y: (-scaledHoleHeight / 2).toString(),
              width: scaledHoleWidth.toString(),
              height: scaledHoleHeight.toString(),
              rx: holeRadius.toString(),
              ry: holeRadius.toString(),
              transform: `translate(${holeCenterX} ${holeCenterY}) rotate(${-rotatedHole.hole_ccw_rotation})`
            },
            value: "",
            children: []
          }
        ],
        value: "",
        attributes: {}
      }
    ];
  }
  return [];
}

// lib/assembly/svg-object-fns/create-svg-objects-from-assembly-smt-pad.ts
import { applyToPoint as applyToPoint54 } from "transformation-matrix";
var PAD_COLOR2 = "rgb(210, 210, 210)";
function createSvgObjectsFromAssemblySmtPad(pad, ctx) {
  const { transform } = ctx;
  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const width = pad.width * Math.abs(transform.a);
    const height = pad.height * Math.abs(transform.d);
    const [x, y] = applyToPoint54(transform, [pad.x, pad.y]);
    const scaledBorderRadius = (pad.rect_border_radius ?? 0) * Math.abs(transform.a);
    if (pad.shape === "rotated_rect" && pad.ccw_rotation) {
      return [
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "assembly-pad",
            fill: PAD_COLOR2,
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
            "data-layer": pad.layer,
            ...scaledBorderRadius ? {
              rx: scaledBorderRadius.toString(),
              ry: scaledBorderRadius.toString()
            } : {}
          },
          value: "",
          children: []
        }
      ];
    }
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "assembly-pad",
          fill: PAD_COLOR2,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          "data-layer": pad.layer,
          ...scaledBorderRadius ? {
            rx: scaledBorderRadius.toString(),
            ry: scaledBorderRadius.toString()
          } : {}
        },
        value: "",
        children: []
      }
    ];
  }
  if (pad.shape === "pill") {
    const width = pad.width * Math.abs(transform.a);
    const height = pad.height * Math.abs(transform.d);
    const radius = pad.radius * Math.abs(transform.a);
    const [x, y] = applyToPoint54(transform, [pad.x, pad.y]);
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "assembly-pad",
          fill: PAD_COLOR2,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          ry: radius.toString(),
          "data-layer": pad.layer
        },
        value: "",
        children: []
      }
    ];
  }
  if (pad.shape === "circle") {
    const radius = pad.radius * Math.abs(transform.a);
    const [x, y] = applyToPoint54(transform, [pad.x, pad.y]);
    return [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "assembly-pad",
          fill: PAD_COLOR2,
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
          "data-layer": pad.layer
        },
        value: "",
        children: []
      }
    ];
  }
  if (pad.shape === "polygon") {
    const points = (pad.points ?? []).map(
      (point) => applyToPoint54(transform, [point.x, point.y])
    );
    return [
      {
        name: "polygon",
        type: "element",
        attributes: {
          class: "assembly-pad",
          fill: PAD_COLOR2,
          points: points.map((p) => p.join(",")).join(" "),
          "data-layer": pad.layer
        },
        value: "",
        children: []
      }
    ];
  }
  return [];
}

// lib/assembly/convert-circuit-json-to-assembly-svg.ts
var OBJECT_ORDER = [
  "pcb_component",
  "pcb_smtpad",
  "pcb_hole",
  "pcb_plated_hole",
  "pcb_board"
];
function convertCircuitJsonToAssemblySvg(soup, options) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const item of soup) {
    if (item.type === "pcb_board") {
      const center = item.center;
      const width = item.width || 0;
      const height = item.height || 0;
      minX = Math.min(minX, center.x - width / 2);
      minY = Math.min(minY, center.y - height / 2);
      maxX = Math.max(maxX, center.x + width / 2);
      maxY = Math.max(maxY, center.y + height / 2);
    }
  }
  const padding = 1;
  const circuitWidth = maxX - minX + 2 * padding;
  const circuitHeight = maxY - minY + 2 * padding;
  const svgWidth = options?.width ?? 800;
  const svgHeight = options?.height ?? 600;
  const scaleX = svgWidth / circuitWidth;
  const scaleY = svgHeight / circuitHeight;
  const scaleFactor = Math.min(scaleX, scaleY);
  const offsetX = (svgWidth - circuitWidth * scaleFactor) / 2;
  const offsetY = (svgHeight - circuitHeight * scaleFactor) / 2;
  const transform = compose8(
    translate8(
      offsetX - minX * scaleFactor + padding * scaleFactor,
      svgHeight - offsetY + minY * scaleFactor - padding * scaleFactor
    ),
    scale4(scaleFactor, -scaleFactor)
    // Flip in y-direction
  );
  const ctx = { transform };
  const svgObjects = soup.sort(
    (a, b) => (OBJECT_ORDER.indexOf(b.type) ?? 9999) - (OBJECT_ORDER.indexOf(a.type) ?? 9999)
  ).flatMap((item) => createSvgObjects2(item, ctx, soup));
  const softwareUsedString = getSoftwareUsedString(soup);
  const version = CIRCUIT_TO_SVG_VERSION;
  const children = [
    {
      name: "style",
      type: "element",
      children: [
        {
          type: "text",
          value: `
              .assembly-component { 
                fill: none; 
                stroke: #000; 
              }
              .assembly-board { 
                fill: #f2f2f2; 
                stroke: rgb(0,0,0); 
                stroke-opacity: 0.8;
              }
              .assembly-component-label { 
                fill: #000; 
                font-family: Arial, serif;
                font-weight: bold;
                dominant-baseline: middle;
                text-anchor: middle;
              }
              .assembly-boundary { 
                fill: none; 
                stroke: #fff;
                stroke-width: 0.2; 
              }
            `,
          name: "",
          attributes: {},
          children: []
        }
      ],
      value: "",
      attributes: {}
    },
    {
      name: "rect",
      type: "element",
      attributes: {
        fill: "#fff",
        x: "0",
        y: "0",
        width: svgWidth.toString(),
        height: svgHeight.toString()
      },
      value: "",
      children: []
    },
    createSvgObjectFromAssemblyBoundary(transform, minX, minY, maxX, maxY),
    ...svgObjects
  ].filter((child) => child !== null);
  if (options?.showErrorsInTextOverlay) {
    const errorOverlay = createErrorTextOverlay(soup);
    if (errorOverlay) {
      children.push(errorOverlay);
    }
  }
  const svgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      ...softwareUsedString && {
        "data-software-used-string": softwareUsedString
      },
      ...options?.includeVersion && {
        "data-circuit-to-svg-version": version
      }
    },
    value: "",
    children
  };
  return stringifySvg(svgObject);
}
function createSvgObjects2(elm, ctx, soup) {
  const sourceComponents = su3(soup).source_component.list();
  switch (elm.type) {
    case "pcb_board":
      return createSvgObjectsFromAssemblyBoard(elm, ctx.transform);
    case "pcb_component": {
      const sourceComponent = sourceComponents.find(
        (item) => item.source_component_id === elm.source_component_id
      );
      const ports = su3(soup).pcb_port.list().filter((port) => port.pcb_component_id === elm.pcb_component_id);
      const firstPort = ports[0];
      if (sourceComponent && firstPort) {
        const arePinsInterchangeable = sourceComponent.are_pins_interchangeable;
        const obj = createSvgObjectsFromAssemblyComponent(
          {
            elm,
            portPosition: { x: firstPort.x, y: firstPort.y },
            name: sourceComponent.name,
            arePinsInterchangeable
          },
          ctx
        );
        return obj ? [obj] : [];
      }
      return [];
    }
    case "pcb_smtpad":
      return createSvgObjectsFromAssemblySmtPad(elm, ctx);
    case "pcb_hole":
      return createSvgObjectsFromAssemblyHole(elm, ctx);
    case "pcb_plated_hole":
      return createSvgObjectsFromAssemblyPlatedHole(elm, ctx);
    default:
      return [];
  }
}
function createSvgObjectFromAssemblyBoundary(transform, minX, minY, maxX, maxY) {
  const [x1, y1] = applyToPoint55(transform, [minX, minY]);
  const [x2, y2] = applyToPoint55(transform, [maxX, maxY]);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  return {
    name: "rect",
    type: "element",
    value: "",
    children: [],
    attributes: {
      class: "assembly-boundary",
      x: x.toString(),
      y: y.toString(),
      width: width.toString(),
      height: height.toString()
    }
  };
}

// lib/pinout/convert-circuit-json-to-pinout-svg.ts
import "svgson";
import {
  compose as compose9,
  scale as matrixScale,
  translate as translate9
} from "transformation-matrix";

// lib/pinout/svg-object-fns/create-svg-objects-from-pinout-board.ts
import { applyToPoint as applyToPoint56 } from "transformation-matrix";
import { su as su4 } from "@tscircuit/circuit-json-util";
var BOARD_FILL_COLOR = "rgb(26, 115, 143)";
var BOARD_STROKE_COLOR = "rgba(0,0,0,0.9)";
function createSvgObjectsFromPinoutBoard(pcbBoard, ctx) {
  const { transform, soup } = ctx;
  const { width, height, center, outline } = pcbBoard;
  const sourceBoard = soup.find(
    (elm) => elm.type === "source_board" && elm.title
  );
  const title = sourceBoard?.title;
  let path;
  if (outline && Array.isArray(outline) && outline.length >= 3) {
    path = outline.map((point, index) => {
      const [x, y] = applyToPoint56(transform, [point.x, point.y]);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(" ");
  } else {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const topLeft = applyToPoint56(transform, [
      center.x - halfWidth,
      center.y - halfHeight
    ]);
    const topRight = applyToPoint56(transform, [
      center.x + halfWidth,
      center.y - halfHeight
    ]);
    const bottomRight = applyToPoint56(transform, [
      center.x + halfWidth,
      center.y + halfHeight
    ]);
    const bottomLeft = applyToPoint56(transform, [
      center.x - halfWidth,
      center.y + halfHeight
    ]);
    path = `M ${topLeft[0]} ${topLeft[1]} L ${topRight[0]} ${topRight[1]} L ${bottomRight[0]} ${bottomRight[1]} L ${bottomLeft[0]} ${bottomLeft[1]}`;
  }
  path += " Z";
  const cutlery = su4(soup).pcb_cutout.list();
  for (const cutout of cutlery) {
    if (cutout.shape === "rect") {
      const { x, y, width: width2, height: height2 } = cutout.center ? (() => {
        const { x: x2, y: y2 } = cutout.center;
        const { width: width3, height: height3 } = cutout;
        return { x: x2, y: y2, width: width3, height: height3 };
      })() : { x: 0, y: 0, width: 0, height: 0 };
      const halfWidth = width2 / 2;
      const halfHeight = height2 / 2;
      const [tl, tr, br, bl] = [
        applyToPoint56(transform, [x - halfWidth, y - halfHeight]),
        applyToPoint56(transform, [x + halfWidth, y - halfHeight]),
        applyToPoint56(transform, [x + halfWidth, y + halfHeight]),
        applyToPoint56(transform, [x - halfWidth, y + halfHeight])
      ];
      path += ` M ${tl[0]} ${tl[1]} L ${tr[0]} ${tr[1]} L ${br[0]} ${br[1]} L ${bl[0]} ${bl[1]} Z`;
    } else if (cutout.shape === "circle") {
    }
  }
  const svgObjects = [
    {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pinout-board",
        d: path,
        fill: BOARD_FILL_COLOR,
        stroke: BOARD_STROKE_COLOR,
        "fill-rule": "evenodd",
        "stroke-opacity": "0.8",
        "stroke-width": (0.2 * Math.abs(transform.a)).toString()
      }
    }
  ];
  if (title) {
    const titleX = ctx.svgWidth / 2;
    const titleY = 30;
    svgObjects.push({
      name: "text",
      type: "element",
      value: "",
      children: [
        { name: "", type: "text", value: title, attributes: {}, children: [] }
      ],
      attributes: {
        x: titleX.toString(),
        y: titleY.toString(),
        "text-anchor": "middle",
        "font-size": "18px",
        "font-weight": "bold",
        "font-family": "Arial, sans-serif",
        fill: "black",
        class: "pinout-board-title"
      }
    });
  }
  return svgObjects;
}

// lib/pinout/svg-object-fns/create-svg-objects-from-pinout-component.ts
import { su as su5 } from "@tscircuit/circuit-json-util";
import { applyToPoint as applyToPoint57 } from "transformation-matrix";
var COMPONENT_FILL_COLOR = "rgba(120, 120, 120, 0.6)";
var COMPONENT_LABEL_COLOR = "rgba(255, 255, 255, 0.9)";
function createSvgObjectsFromPinoutComponent(elm, ctx) {
  const { transform, soup } = ctx;
  const { center, width, height, rotation = 0, source_component_id } = elm;
  const sourceComponent = su5(soup).source_component.get(source_component_id);
  if (!center || typeof width !== "number" || typeof height !== "number" || width === 0 || height === 0) {
    return [];
  }
  const [x, y] = applyToPoint57(transform, [center.x, center.y]);
  const scaledWidth = width * Math.abs(transform.a);
  const scaledHeight = height * Math.abs(transform.d);
  const transformStr = `translate(${x}, ${y})`;
  const children = [
    {
      name: "rect",
      type: "element",
      attributes: {
        class: "pinout-component-box",
        x: (-scaledWidth / 2).toString(),
        y: (-scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        fill: COMPONENT_FILL_COLOR,
        transform: `rotate(${rotation}deg)`
      },
      value: "",
      children: []
    }
  ];
  if (sourceComponent?.name) {
    const labelFontSize = Math.min(scaledWidth, scaledHeight) * 0.4;
    children.push({
      name: "text",
      type: "element",
      attributes: {
        x: "0",
        y: "0",
        fill: COMPONENT_LABEL_COLOR,
        "font-size": `${labelFontSize}px`,
        "font-family": "sans-serif",
        "text-anchor": "middle",
        "dominant-baseline": "middle"
      },
      children: [
        {
          type: "text",
          value: sourceComponent.name,
          name: "",
          attributes: {},
          children: []
        }
      ],
      value: ""
    });
  }
  return [
    {
      name: "g",
      type: "element",
      attributes: {
        transform: transformStr
      },
      children,
      value: ""
    }
  ];
}

// lib/pinout/svg-object-fns/create-svg-objects-from-pinout-hole.ts
import { applyToPoint as applyToPoint58 } from "transformation-matrix";
var HOLE_COLOR4 = "rgb(50, 50, 50)";
function createSvgObjectsFromPinoutHole(hole, ctx) {
  const { transform } = ctx;
  const [x, y] = applyToPoint58(transform, [hole.x, hole.y]);
  if (hole.hole_shape === "circle" || hole.hole_shape === "square") {
    const scaledDiameter = hole.hole_diameter * Math.abs(transform.a);
    const radius = scaledDiameter / 2;
    if (hole.hole_shape === "circle") {
      return [
        {
          name: "circle",
          type: "element",
          attributes: {
            class: "pinout-hole",
            cx: x.toString(),
            cy: y.toString(),
            r: radius.toString(),
            fill: HOLE_COLOR4
          },
          children: [],
          value: ""
        }
      ];
    }
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pinout-hole",
          x: (x - radius).toString(),
          y: (y - radius).toString(),
          width: scaledDiameter.toString(),
          height: scaledDiameter.toString(),
          fill: HOLE_COLOR4
        },
        children: [],
        value: ""
      }
    ];
  }
  if (hole.hole_shape === "oval") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a);
    const scaledHeight = hole.hole_height * Math.abs(transform.a);
    const rx = scaledWidth / 2;
    const ry = scaledHeight / 2;
    return [
      {
        name: "ellipse",
        type: "element",
        attributes: {
          class: "pinout-hole",
          cx: x.toString(),
          cy: y.toString(),
          rx: rx.toString(),
          ry: ry.toString(),
          fill: HOLE_COLOR4
        },
        children: [],
        value: ""
      }
    ];
  }
  return [];
}

// lib/pinout/svg-object-fns/create-svg-objects-from-pinout-plated-hole.ts
import { applyToPoint as applyToPoint59 } from "transformation-matrix";
var PAD_COLOR3 = "rgb(218, 165, 32)";
var HOLE_COLOR5 = "rgb(40, 40, 40)";
function createSvgObjectsFromPinoutPlatedHole(hole, ctx) {
  const { transform } = ctx;
  const [x, y] = applyToPoint59(transform, [hole.x, hole.y]);
  if (hole.shape === "pill") {
    const scaledOuterWidth = hole.outer_width * Math.abs(transform.a);
    const scaledOuterHeight = hole.outer_height * Math.abs(transform.a);
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a);
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a);
    const outerRadiusX = scaledOuterWidth / 2;
    const straightLength = scaledOuterHeight - scaledOuterWidth;
    const innerRadiusX = scaledHoleWidth / 2;
    return [
      {
        name: "g",
        type: "element",
        children: [
          // Outer pill shape
          {
            name: "path",
            type: "element",
            attributes: {
              class: "pinout-hole-outer",
              fill: PAD_COLOR3,
              d: `M${x - outerRadiusX},${y - straightLength / 2} v${straightLength} a${outerRadiusX},${outerRadiusX} 0 0 0 ${scaledOuterWidth},0 v-${straightLength} a${outerRadiusX},${outerRadiusX} 0 0 0 -${scaledOuterWidth},0 z`
            },
            value: "",
            children: []
          },
          // Inner pill shape
          {
            name: "path",
            type: "element",
            attributes: {
              class: "pinout-hole-inner",
              fill: HOLE_COLOR5,
              d: `M${x - innerRadiusX},${y - (scaledHoleHeight - scaledHoleWidth) / 2} v${scaledHoleHeight - scaledHoleWidth} a${innerRadiusX},${innerRadiusX} 0 0 0 ${scaledHoleWidth},0 v-${scaledHoleHeight - scaledHoleWidth} a${innerRadiusX},${innerRadiusX} 0 0 0 -${scaledHoleWidth},0 z`
            },
            value: "",
            children: []
          }
        ],
        value: "",
        attributes: {}
      }
    ];
  }
  if (hole.shape === "circle") {
    const scaledOuterWidth = hole.outer_diameter * Math.abs(transform.a);
    const scaledOuterHeight = hole.outer_diameter * Math.abs(transform.a);
    const scaledHoleWidth = hole.hole_diameter * Math.abs(transform.a);
    const scaledHoleHeight = hole.hole_diameter * Math.abs(transform.a);
    const outerRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2;
    const innerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2;
    return [
      {
        name: "g",
        type: "element",
        children: [
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "pinout-hole-outer",
              fill: PAD_COLOR3,
              cx: x.toString(),
              cy: y.toString(),
              r: outerRadius.toString()
            },
            value: "",
            children: []
          },
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "pinout-hole-inner",
              fill: HOLE_COLOR5,
              cx: x.toString(),
              cy: y.toString(),
              r: innerRadius.toString()
            },
            value: "",
            children: []
          }
        ],
        value: "",
        attributes: {}
      }
    ];
  }
  if (hole.shape === "circular_hole_with_rect_pad") {
    const scaledHoleDiameter = hole.hole_diameter * Math.abs(transform.a);
    const scaledRectPadWidth = hole.rect_pad_width * Math.abs(transform.a);
    const scaledRectPadHeight = hole.rect_pad_height * Math.abs(transform.a);
    const holeRadius = scaledHoleDiameter / 2;
    return [
      {
        name: "g",
        type: "element",
        children: [
          // Rectangular pad (outer shape)
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pinout-hole-outer-pad",
              fill: PAD_COLOR3,
              x: (x - scaledRectPadWidth / 2).toString(),
              y: (y - scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString()
            },
            value: "",
            children: []
          },
          // Circular hole inside the rectangle
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "pinout-hole-inner",
              fill: HOLE_COLOR5,
              cx: x.toString(),
              cy: y.toString(),
              r: holeRadius.toString()
            },
            value: "",
            children: []
          }
        ],
        value: "",
        attributes: {}
      }
    ];
  }
  if (hole.shape === "pill_hole_with_rect_pad") {
    const scaledRectPadWidth = hole.rect_pad_width * Math.abs(transform.a);
    const scaledRectPadHeight = hole.rect_pad_height * Math.abs(transform.a);
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a);
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a);
    const holeRadius = Math.min(scaledHoleHeight, scaledHoleWidth) / 2;
    return [
      {
        name: "g",
        type: "element",
        children: [
          // Rectangular pad (outer shape)
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pinout-hole-outer-pad",
              fill: PAD_COLOR3,
              x: (x - scaledRectPadWidth / 2).toString(),
              y: (y - scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString()
            },
            value: "",
            children: []
          },
          // pill hole inside the rectangle
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pinout-hole-inner",
              fill: HOLE_COLOR5,
              x: (x - scaledHoleWidth / 2).toString(),
              y: (y - scaledHoleHeight / 2).toString(),
              width: scaledHoleWidth.toString(),
              height: scaledHoleHeight.toString(),
              rx: holeRadius.toString(),
              ry: holeRadius.toString()
            },
            value: "",
            children: []
          }
        ],
        value: "",
        attributes: {}
      }
    ];
  }
  if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    const scaledRectPadWidth = hole.rect_pad_width * Math.abs(transform.a);
    const scaledRectPadHeight = hole.rect_pad_height * Math.abs(transform.a);
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a);
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a);
    const holeRadius = Math.min(scaledHoleHeight, scaledHoleWidth) / 2;
    return [
      {
        name: "g",
        type: "element",
        children: [
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pinout-hole-outer-pad",
              fill: PAD_COLOR3,
              x: (-scaledRectPadWidth / 2).toString(),
              y: (-scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
              transform: `translate(${x} ${y}) rotate(${-hole.rect_ccw_rotation})`
            },
            value: "",
            children: []
          },
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pinout-hole-inner",
              fill: HOLE_COLOR5,
              x: (-scaledHoleWidth / 2).toString(),
              y: (-scaledHoleHeight / 2).toString(),
              width: scaledHoleWidth.toString(),
              height: scaledHoleHeight.toString(),
              rx: holeRadius.toString(),
              ry: holeRadius.toString(),
              transform: `translate(${x} ${y}) rotate(${-hole.hole_ccw_rotation})`
            },
            value: "",
            children: []
          }
        ],
        value: "",
        attributes: {}
      }
    ];
  }
  return [];
}

// lib/pinout/svg-object-fns/create-svg-objects-from-pinout-smt-pad.ts
import { applyToPoint as applyToPoint60 } from "transformation-matrix";
var PAD_COLOR4 = "rgb(218, 165, 32)";
function createSvgObjectsFromPinoutSmtPad(pad, ctx) {
  const { transform } = ctx;
  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const width = pad.width * Math.abs(transform.a);
    const height = pad.height * Math.abs(transform.d);
    const [x, y] = applyToPoint60(transform, [pad.x, pad.y]);
    if (pad.shape === "rotated_rect" && pad.ccw_rotation) {
      return [
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "pinout-pad",
            fill: PAD_COLOR4,
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
            "data-layer": pad.layer
          },
          value: "",
          children: []
        }
      ];
    }
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pinout-pad",
          fill: PAD_COLOR4,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          "data-layer": pad.layer
        },
        value: "",
        children: []
      }
    ];
  }
  if (pad.shape === "pill") {
    const width = pad.width * Math.abs(transform.a);
    const height = pad.height * Math.abs(transform.d);
    const radius = pad.radius * Math.abs(transform.a);
    const [x, y] = applyToPoint60(transform, [pad.x, pad.y]);
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pinout-pad",
          fill: PAD_COLOR4,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          ry: radius.toString(),
          "data-layer": pad.layer
        },
        value: "",
        children: []
      }
    ];
  }
  if (pad.shape === "circle") {
    const radius = pad.radius * Math.abs(transform.a);
    const [x, y] = applyToPoint60(transform, [pad.x, pad.y]);
    return [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pinout-pad",
          fill: PAD_COLOR4,
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
          "data-layer": pad.layer
        },
        value: "",
        children: []
      }
    ];
  }
  if (pad.shape === "polygon") {
    const points = (pad.points ?? []).map(
      (point) => applyToPoint60(transform, [point.x, point.y])
    );
    return [
      {
        name: "polygon",
        type: "element",
        attributes: {
          class: "pinout-pad",
          fill: PAD_COLOR4,
          points: points.map((p) => p.join(",")).join(" "),
          "data-layer": pad.layer
        },
        value: "",
        children: []
      }
    ];
  }
  return [];
}

// lib/pinout/svg-object-fns/create-svg-objects-from-pinout-port.ts
import { applyToPoint as applyToPoint61 } from "transformation-matrix";
import { calculateElbow } from "calculate-elbow";

// lib/pinout/svg-object-fns/pinout-label-box.ts
function createPinoutLabelBox(params) {
  const {
    rectX,
    rectY,
    rectWidth,
    rectHeight,
    textX,
    textY,
    text,
    fontSize,
    labelBackground,
    labelColor,
    rx = 4,
    ry = 4,
    fontFamily = "Arial, sans-serif",
    fontWeight = "bold",
    textAnchor = "middle",
    dominantBaseline = "middle"
  } = params;
  return [
    {
      name: "rect",
      type: "element",
      attributes: {
        x: rectX.toString(),
        y: rectY.toString(),
        width: rectWidth.toString(),
        height: rectHeight.toString(),
        fill: labelBackground,
        rx: typeof rx === "number" ? rx.toString() : rx,
        ry: typeof ry === "number" ? ry.toString() : ry,
        stroke: "none"
      },
      children: [],
      value: ""
    },
    {
      name: "text",
      type: "element",
      attributes: {
        x: textX.toString(),
        y: textY.toString(),
        fill: labelColor,
        "font-size": `${fontSize}px`,
        "font-family": fontFamily,
        "font-weight": fontWeight,
        "text-anchor": textAnchor,
        "dominant-baseline": dominantBaseline
      },
      children: [
        {
          type: "text",
          value: text,
          name: "",
          attributes: {},
          children: []
        }
      ],
      value: ""
    }
  ];
}

// lib/pinout/svg-object-fns/create-svg-objects-from-pinout-port.ts
var LABEL_COLOR = "rgb(255, 255, 255)";
var LABEL_BACKGROUND = "rgb(0, 0, 0)";
var LINE_COLOR = "rgba(0, 0, 0, 0.6)";
var PIN_NUMBER_BACKGROUND = "rgb(200, 200, 200)";
var PIN_NUMBER_COLOR = "rgb(0, 0, 0)";
function createSvgObjectsFromPinoutPort(pcb_port, ctx) {
  const label_info = ctx.label_positions.get(pcb_port.pcb_port_id);
  if (!label_info) return [];
  const { text: label, aliases, elbow_end, label_pos, edge } = label_info;
  const [port_x, port_y] = applyToPoint61(ctx.transform, [pcb_port.x, pcb_port.y]);
  const start_facing_direction = edge === "left" ? "x-" : edge === "right" ? "x+" : edge === "top" ? "y-" : "y+";
  const end_facing_direction = edge === "left" ? "x+" : edge === "right" ? "x-" : edge === "top" ? "y+" : "y-";
  const elbow_path = calculateElbow(
    {
      x: port_x,
      y: port_y,
      facingDirection: start_facing_direction
    },
    {
      x: elbow_end.x,
      y: elbow_end.y,
      facingDirection: end_facing_direction
    },
    {}
  );
  const numberMatch = /^pin(\d+)$/i.exec(label);
  const tokensWithStyle = [
    {
      text: numberMatch ? numberMatch[1] : label,
      bg: numberMatch ? PIN_NUMBER_BACKGROUND : LABEL_BACKGROUND,
      color: numberMatch ? PIN_NUMBER_COLOR : LABEL_COLOR
    },
    ...aliases.map((t) => ({
      text: t,
      bg: LABEL_BACKGROUND,
      color: LABEL_COLOR
    }))
  ];
  const pxPerMm = Math.abs(ctx.transform.a);
  const labelScale = ctx.styleScale ?? 1;
  const LABEL_RECT_HEIGHT_MM = 1.6 * labelScale;
  const rectHeight = LABEL_RECT_HEIGHT_MM * pxPerMm;
  const STROKE_WIDTH_MM = Math.max(0.08, 0.25 * labelScale);
  const CORNER_RADIUS_MM = 0.3 * labelScale;
  const cornerRadius = CORNER_RADIUS_MM * pxPerMm;
  const strokeWidthPx = STROKE_WIDTH_MM * pxPerMm;
  const end_point = {
    x: label_pos.x + (edge === "left" ? -strokeWidthPx / 2 : strokeWidthPx / 2),
    y: label_pos.y
  };
  const line_points = [...elbow_path, end_point].map((p) => `${p.x},${p.y}`).join(" ");
  const fontSize = rectHeight * (11 / 21);
  const bgPadding = (rectHeight - fontSize) / 2;
  const gap = bgPadding;
  const tokenRects = tokensWithStyle.map(({ text, bg, color }) => {
    const safeText = text ?? "";
    const textWidth = safeText.length * fontSize * 0.6;
    const rectWidth = textWidth + 2 * bgPadding;
    return { text: safeText, rectWidth, bg, color };
  });
  const text_y = label_pos.y;
  const objects = [
    {
      name: "polyline",
      type: "element",
      attributes: {
        points: line_points,
        stroke: LINE_COLOR,
        "stroke-width": (STROKE_WIDTH_MM * pxPerMm).toString(),
        fill: "none"
      },
      children: [],
      value: ""
    }
  ];
  if (edge === "left") {
    let currentX = label_pos.x;
    for (const { text, rectWidth, bg, color } of tokenRects) {
      const rectX = currentX - rectWidth;
      const text_x = rectX + rectWidth / 2;
      objects.push(
        ...createPinoutLabelBox({
          rectX,
          rectY: text_y - rectHeight / 2,
          rectWidth,
          rectHeight,
          textX: text_x,
          textY: text_y,
          text,
          fontSize,
          labelBackground: bg,
          labelColor: color,
          rx: cornerRadius,
          ry: cornerRadius
        })
      );
      currentX = rectX - gap;
    }
  } else if (edge === "right") {
    let currentX = label_pos.x;
    for (const { text, rectWidth, bg, color } of tokenRects) {
      const rectX = currentX;
      const text_x = rectX + rectWidth / 2;
      objects.push(
        ...createPinoutLabelBox({
          rectX,
          rectY: text_y - rectHeight / 2,
          rectWidth,
          rectHeight,
          textX: text_x,
          textY: text_y,
          text,
          fontSize,
          labelBackground: bg,
          labelColor: color,
          rx: cornerRadius,
          ry: cornerRadius
        })
      );
      currentX = rectX + rectWidth + gap;
    }
  } else {
    const totalWidth = tokenRects.reduce((acc, t) => acc + t.rectWidth, 0) + gap * Math.max(0, tokenRects.length - 1);
    let currentX = label_pos.x - totalWidth / 2;
    for (const { text, rectWidth, bg, color } of tokenRects) {
      const rectX = currentX;
      const text_x = rectX + rectWidth / 2;
      objects.push(
        ...createPinoutLabelBox({
          rectX,
          rectY: text_y - rectHeight / 2,
          rectWidth,
          rectHeight,
          textX: text_x,
          textY: text_y,
          text,
          fontSize,
          labelBackground: bg,
          labelColor: color,
          rx: cornerRadius,
          ry: cornerRadius
        })
      );
      currentX = rectX + rectWidth + gap;
    }
  }
  return objects;
}

// lib/pinout/calculate-label-positions.ts
import { applyToPoint as applyToPoint62 } from "transformation-matrix";

// lib/pinout/constants.ts
var LABEL_RECT_HEIGHT_BASE_MM = 1.6;
var FONT_HEIGHT_RATIO2 = 11 / 21;
var CHAR_WIDTH_FACTOR = 0.6;
var STAGGER_OFFSET_MIN = 0.1;
var STAGGER_OFFSET_PER_PIN = 0.1;
var STAGGER_OFFSET_STEP = 3;
var ALIGNED_OFFSET_MARGIN = 0.1;
var GROUP_SEPARATION_MM = 0.8;

// lib/pinout/calculate-label-positions.ts
function calculateVerticalEdgeLabels(edge, pinout_labels, {
  transform,
  soup,
  board_bounds,
  svgHeight,
  styleScale
}, label_positions) {
  const x_coords = pinout_labels.map((l) => l.pcb_port.x);
  const counts = {};
  for (const x of x_coords) {
    const rounded = x.toFixed(1);
    counts[rounded] = (counts[rounded] || 0) + 1;
  }
  let edge_ports;
  if (Object.keys(counts).length > 1 && pinout_labels.length > 2) {
    const sorted_x_groups = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const primary_x = parseFloat(sorted_x_groups[0][0]);
    const primary_pins = pinout_labels.filter(
      (l) => Math.abs(l.pcb_port.x - primary_x) < 0.2
    );
    const other_pins = pinout_labels.filter(
      (l) => Math.abs(l.pcb_port.x - primary_x) >= 0.2
    );
    const mapToEdgePort = (pinout_label) => ({
      pcb_port: pinout_label.pcb_port,
      y: applyToPoint62(transform, [
        pinout_label.pcb_port.x,
        pinout_label.pcb_port.y
      ])[1],
      aliases: pinout_label.aliases
    });
    primary_pins.sort((a, b) => b.pcb_port.y - a.pcb_port.y);
    other_pins.sort((a, b) => b.pcb_port.y - a.pcb_port.y);
    const max_y_primary = primary_pins.length > 0 ? Math.max(...primary_pins.map((p) => p.pcb_port.y)) : -Infinity;
    const max_y_other = other_pins.length > 0 ? Math.max(...other_pins.map((p) => p.pcb_port.y)) : -Infinity;
    const combined_pins = max_y_other > max_y_primary ? [...other_pins, ...primary_pins] : [...primary_pins, ...other_pins];
    edge_ports = combined_pins.map(mapToEdgePort);
  } else {
    edge_ports = pinout_labels.map((pinout_label) => ({
      pcb_port: pinout_label.pcb_port,
      y: applyToPoint62(transform, [
        pinout_label.pcb_port.x,
        pinout_label.pcb_port.y
      ])[1],
      aliases: pinout_label.aliases
    })).sort((a, b) => a.y - b.y);
  }
  if (edge_ports.length === 0) return;
  const board_edge_x = applyToPoint62(transform, [
    edge === "left" ? board_bounds.minX : board_bounds.maxX,
    0
  ])[0];
  const num_labels = edge_ports.length;
  const x_coords_counts = {};
  for (const pl of pinout_labels) {
    const rounded = pl.pcb_port.x.toFixed(1);
    x_coords_counts[rounded] = (x_coords_counts[rounded] || 0) + 1;
  }
  let main_group_pin_port_ids = /* @__PURE__ */ new Set();
  if (Object.keys(x_coords_counts).length > 1 && pinout_labels.length > 2) {
    const sorted_x_groups = Object.entries(x_coords_counts).sort(
      (a, b) => b[1] - a[1]
    );
    const primary_x = parseFloat(sorted_x_groups[0][0]);
    const primary_pins = pinout_labels.filter(
      (l) => Math.abs(l.pcb_port.x - primary_x) < 0.2
    );
    main_group_pin_port_ids = new Set(
      primary_pins.map((p) => p.pcb_port.pcb_port_id)
    );
  }
  const main_group_indices = edge_ports.map((ep, i) => {
    if (main_group_pin_port_ids.has(ep.pcb_port.pcb_port_id)) {
      return i;
    }
    return -1;
  }).filter((i) => i !== -1);
  const geometric_middle_index = (num_labels - 1) / 2;
  const pxPerMm = Math.abs(transform.a);
  const label_rect_height = LABEL_RECT_HEIGHT_BASE_MM * styleScale * pxPerMm;
  const BASE_GAP_MM = 0.3;
  const label_margin = Math.max(
    0.2 * pxPerMm,
    BASE_GAP_MM * styleScale * pxPerMm
  );
  const group_gap_px = GROUP_SEPARATION_MM * styleScale * pxPerMm;
  const stagger_offset_base = (STAGGER_OFFSET_MIN + num_labels * STAGGER_OFFSET_PER_PIN) * styleScale * pxPerMm;
  const max_stagger_offset = stagger_offset_base + geometric_middle_index * (STAGGER_OFFSET_STEP * styleScale * pxPerMm);
  const aligned_label_offset = max_stagger_offset + ALIGNED_OFFSET_MARGIN * styleScale * pxPerMm;
  const num_other_pins = num_labels - main_group_indices.length;
  const num_pins_to_stack = main_group_indices.length === 0 ? num_labels : num_other_pins;
  const stack_total_height = num_pins_to_stack * label_rect_height + Math.max(0, num_pins_to_stack - 1) * label_margin;
  let current_y;
  if (main_group_indices.length > 0 && num_other_pins > 0) {
    const main_group_y_coords = main_group_indices.map((i) => edge_ports[i].y);
    const min_main_group_y = Math.min(...main_group_y_coords);
    const max_main_group_y = Math.max(...main_group_y_coords);
    const main_group_top_extent = min_main_group_y - label_rect_height / 2;
    const main_group_bottom_extent = max_main_group_y + label_rect_height / 2;
    const other_pin_indices = edge_ports.map((_, index) => index).filter((index) => !main_group_indices.includes(index));
    const others_are_above = other_pin_indices[0] < main_group_indices[0];
    if (others_are_above) {
      const stack_bottom_edge = main_group_top_extent - (label_margin * 2 + group_gap_px);
      current_y = stack_bottom_edge - stack_total_height + label_rect_height / 2;
    } else {
      const stack_top_edge = main_group_bottom_extent + (label_margin * 2 + group_gap_px);
      current_y = stack_top_edge + label_rect_height / 2;
    }
  } else {
    current_y = (svgHeight - stack_total_height) / 2 + label_rect_height / 2;
  }
  const is_all_main_group = main_group_indices.length === num_labels;
  edge_ports.forEach(({ pcb_port, aliases }, i) => {
    let stagger_rank;
    if (main_group_indices.length > 0) {
      if (main_group_indices.includes(i)) {
        stagger_rank = geometric_middle_index;
      } else {
        const min_lg_idx = Math.min(...main_group_indices);
        const max_lg_idx = Math.max(...main_group_indices);
        let dist_from_main_group;
        if (i < min_lg_idx) {
          dist_from_main_group = min_lg_idx - i;
        } else {
          dist_from_main_group = i - max_lg_idx;
        }
        stagger_rank = geometric_middle_index - dist_from_main_group;
      }
    } else {
      const dist_from_middle = Math.abs(i - geometric_middle_index);
      stagger_rank = geometric_middle_index - dist_from_middle;
    }
    const stagger_offset = stagger_offset_base + stagger_rank * (STAGGER_OFFSET_STEP * styleScale * pxPerMm);
    const sign = edge === "left" ? -1 : 1;
    const is_main_group_pin = main_group_indices.includes(i);
    const y_pos = is_all_main_group ? edge_ports[i].y : main_group_indices.length > 0 && is_main_group_pin ? edge_ports[i].y : current_y;
    const elbow_end = {
      x: board_edge_x + sign * stagger_offset,
      y: y_pos
    };
    const label_pos = {
      x: board_edge_x + sign * aligned_label_offset,
      y: y_pos
    };
    label_positions.set(pcb_port.pcb_port_id, {
      text: aliases[0],
      aliases: aliases.slice(1),
      elbow_end,
      label_pos,
      edge
    });
    if (!(main_group_indices.length > 0 && is_main_group_pin)) {
      current_y += label_rect_height + label_margin;
    }
  });
}
var calculateLabelPositions = ({
  left_labels,
  right_labels,
  transform,
  soup,
  board_bounds,
  svgWidth,
  svgHeight,
  styleScale
}) => {
  const label_positions = /* @__PURE__ */ new Map();
  const shared_params = { transform, soup, board_bounds };
  calculateVerticalEdgeLabels(
    "left",
    left_labels,
    {
      ...shared_params,
      svgHeight,
      styleScale
    },
    label_positions
  );
  calculateVerticalEdgeLabels(
    "right",
    right_labels,
    {
      ...shared_params,
      svgHeight,
      styleScale
    },
    label_positions
  );
  return label_positions;
};

// lib/pinout/pinout-utils.ts
import { su as su6 } from "@tscircuit/circuit-json-util";
function getPortLabelInfo(port, soup) {
  const source_port = su6(soup).source_port.get(port.source_port_id);
  if (!source_port) return null;
  const eligible_hints = source_port.port_hints?.filter(
    (h) => !/^\d+$/.test(h) && !["left", "right", "top", "bottom"].includes(h)
  ) ?? [];
  let label = eligible_hints[0];
  if (!label) label = source_port.name;
  if (!label) return null;
  const aliases = eligible_hints.filter((h) => h !== label);
  return { text: label, aliases };
}
function getClosestEdge(port_pos_real, board_bounds) {
  const dists = {
    left: port_pos_real.x - board_bounds.minX,
    right: board_bounds.maxX - port_pos_real.x,
    top: board_bounds.maxY - port_pos_real.y,
    bottom: port_pos_real.y - board_bounds.minY
  };
  let closest_edge = "left";
  let min_dist = dists.left;
  if (dists.right < min_dist) {
    min_dist = dists.right;
    closest_edge = "right";
  }
  if (dists.top < min_dist) {
    min_dist = dists.top;
    closest_edge = "top";
  }
  if (dists.bottom < min_dist) {
    min_dist = dists.bottom;
    closest_edge = "bottom";
  }
  return closest_edge;
}

// lib/pinout/convert-circuit-json-to-pinout-svg.ts
var OBJECT_ORDER2 = [
  "pcb_board",
  "pcb_smtpad",
  "pcb_hole",
  "pcb_plated_hole",
  "pcb_component",
  "pcb_port"
];
function convertCircuitJsonToPinoutSvg(soup, options) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const item of soup) {
    if (item.type === "pcb_board") {
      if ("outline" in item && item.outline && Array.isArray(item.outline) && item.outline.length > 0) {
        for (const point of item.outline) {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      } else {
        const center = item.center;
        const width = item.width || 0;
        const height = item.height || 0;
        minX = Math.min(minX, center.x - width / 2);
        minY = Math.min(minY, center.y - height / 2);
        maxX = Math.max(maxX, center.x + width / 2);
        maxY = Math.max(maxY, center.y + height / 2);
      }
    }
  }
  const paddingMm = 2;
  let svgWidth = options?.width ?? 1200;
  let svgHeight = options?.height ?? 768;
  const boardTitle = soup.find(
    (e) => e.type === "source_board" && !!e.title
  )?.title;
  const board_bounds = { minX, minY, maxX, maxY };
  const pinout_ports = soup.filter(
    (elm) => elm.type === "pcb_port" && elm.is_board_pinout
  );
  const pinout_labels = [];
  for (const pcb_port of pinout_ports) {
    const label_info = getPortLabelInfo(pcb_port, soup);
    if (!label_info) continue;
    const edge = getClosestEdge({ x: pcb_port.x, y: pcb_port.y }, board_bounds);
    pinout_labels.push({
      pcb_port,
      aliases: [label_info.text, ...label_info.aliases],
      edge
    });
  }
  const left_labels = pinout_labels.filter((p) => p.edge === "left");
  const right_labels = pinout_labels.filter((p) => p.edge === "right");
  const top_labels = pinout_labels.filter((p) => p.edge === "top");
  const bottom_labels = pinout_labels.filter((p) => p.edge === "bottom");
  const boardCenterX = (minX + maxX) / 2;
  if (top_labels.length > 0) {
    const top_left_count = top_labels.filter(
      (p) => p.pcb_port.x < boardCenterX
    ).length;
    if (top_left_count > top_labels.length / 2) {
      left_labels.push(...top_labels);
    } else {
      right_labels.push(...top_labels);
    }
  }
  if (bottom_labels.length > 0) {
    const bottom_left_count = bottom_labels.filter(
      (p) => p.pcb_port.x < boardCenterX
    ).length;
    if (bottom_left_count > bottom_labels.length / 2) {
      left_labels.push(...bottom_labels);
    } else {
      right_labels.push(...bottom_labels);
    }
  }
  const smtPads = soup.filter((e) => e.type === "pcb_smtpad");
  const padMinorDimensionsMm = smtPads.map((p) => {
    if (typeof p.height === "number")
      return p.height;
    if (typeof p.radius === "number")
      return p.radius * 2;
    return void 0;
  }).filter((v) => Number.isFinite(v));
  const averagePadMinorMm = padMinorDimensionsMm.length ? padMinorDimensionsMm.reduce((a, b) => a + b, 0) / padMinorDimensionsMm.length : void 0;
  const BASELINE_PAD_MINOR_MM = 1;
  const styleScale = averagePadMinorMm ? Math.max(0.5, Math.min(1, averagePadMinorMm / BASELINE_PAD_MINOR_MM)) : 1;
  const LABEL_RECT_HEIGHT_MM = LABEL_RECT_HEIGHT_BASE_MM * styleScale;
  function tokenize(label) {
    const tokens = [...label.aliases ?? []];
    if (tokens.length === 0) return tokens;
    const m = /^pin(\d+)$/i.exec(tokens[0]);
    if (m) tokens[0] = m[1];
    return tokens;
  }
  function getTotalTokenWidthMm(tokens) {
    if (tokens.length === 0) return 0;
    const rectHeightMm = LABEL_RECT_HEIGHT_MM;
    const fontSizeMm = rectHeightMm * FONT_HEIGHT_RATIO2;
    const bgPaddingMm = (rectHeightMm - fontSizeMm) / 2;
    const gapMm = bgPaddingMm;
    const tokenWidthsMm = tokens.map((t) => {
      const safe = t ?? "";
      const textWidthMm = safe.length * fontSizeMm * CHAR_WIDTH_FACTOR;
      return textWidthMm + 2 * bgPaddingMm;
    });
    const totalWidthMm = tokenWidthsMm.reduce((a, b) => a + b, 0) + gapMm * Math.max(0, tokens.length - 1);
    return totalWidthMm;
  }
  function getAlignedOffsetMm(count) {
    if (count <= 0) return 0;
    const geometric_middle_index = (count - 1) / 2;
    const stagger_base = (STAGGER_OFFSET_MIN + count * STAGGER_OFFSET_PER_PIN) * styleScale;
    const max_stagger = stagger_base + geometric_middle_index * (STAGGER_OFFSET_STEP * styleScale);
    return max_stagger + ALIGNED_OFFSET_MARGIN * styleScale;
  }
  const leftMaxLabelWidthMm = Math.max(
    0,
    ...left_labels.map((l) => getTotalTokenWidthMm(tokenize(l)))
  );
  const rightMaxLabelWidthMm = Math.max(
    0,
    ...right_labels.map((l) => getTotalTokenWidthMm(tokenize(l)))
  );
  const extraLeftMm = getAlignedOffsetMm(left_labels.length) + leftMaxLabelWidthMm;
  const extraRightMm = getAlignedOffsetMm(right_labels.length) + rightMaxLabelWidthMm;
  const expandedMinX = minX - extraLeftMm;
  const expandedMaxX = maxX + extraRightMm;
  const circuitWidth = expandedMaxX - expandedMinX + 2 * paddingMm;
  const circuitHeight = maxY - minY + 2 * paddingMm;
  const pxPerMmX = svgWidth / circuitWidth;
  const pxPerMmY = svgHeight / circuitHeight;
  const pxPerMm = Math.min(pxPerMmX, pxPerMmY);
  const offsetX = (svgWidth - circuitWidth * pxPerMm) / 2;
  const offsetY = (svgHeight - circuitHeight * pxPerMm) / 2;
  const transform = compose9(
    translate9(
      offsetX - expandedMinX * pxPerMm + paddingMm * pxPerMm,
      svgHeight - offsetY + minY * pxPerMm - paddingMm * pxPerMm
    ),
    matrixScale(pxPerMm, -pxPerMm)
  );
  const label_positions = calculateLabelPositions({
    left_labels,
    right_labels,
    transform,
    soup,
    board_bounds,
    svgWidth,
    svgHeight,
    styleScale
  });
  const ctx = {
    transform,
    soup,
    board_bounds,
    styleScale,
    label_positions,
    svgWidth,
    svgHeight
  };
  const svgObjects = soup.sort(
    (a, b) => (OBJECT_ORDER2.indexOf(a.type) ?? 9999) - (OBJECT_ORDER2.indexOf(b.type) ?? 9999)
  ).flatMap((item) => createSvgObjects3(item, ctx, soup));
  const softwareUsedString = getSoftwareUsedString(soup);
  const version = CIRCUIT_TO_SVG_VERSION;
  const children = [
    {
      name: "rect",
      type: "element",
      attributes: {
        fill: "rgb(255, 255, 255)",
        x: "0",
        y: "0",
        width: svgWidth.toString(),
        height: svgHeight.toString()
      },
      value: "",
      children: []
    },
    ...svgObjects
  ].filter((child) => child !== null);
  if (options?.showErrorsInTextOverlay) {
    const errorOverlay = createErrorTextOverlay(soup);
    if (errorOverlay) {
      children.push(errorOverlay);
    }
  }
  const svgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      ...softwareUsedString && {
        "data-software-used-string": softwareUsedString
      },
      ...options?.includeVersion && {
        "data-circuit-to-svg-version": version
      }
    },
    value: "",
    children
  };
  return stringifySvg(svgObject);
}
function createSvgObjects3(elm, ctx, soup) {
  switch (elm.type) {
    case "pcb_board":
      return createSvgObjectsFromPinoutBoard(elm, ctx);
    case "pcb_component":
      return createSvgObjectsFromPinoutComponent(elm, ctx);
    case "pcb_smtpad":
      return createSvgObjectsFromPinoutSmtPad(elm, ctx);
    case "pcb_hole":
      return createSvgObjectsFromPinoutHole(elm, ctx);
    case "pcb_plated_hole":
      return createSvgObjectsFromPinoutPlatedHole(elm, ctx);
    case "pcb_port":
      if (elm.is_board_pinout) {
        return createSvgObjectsFromPinoutPort(elm, ctx);
      }
      return [];
    default:
      return [];
  }
}

// lib/sch/convert-circuit-json-to-schematic-svg.ts
import {
  applyToPoint as applyToPoint91,
  fromTriangles,
  toSVG
} from "transformation-matrix";

// lib/sch/draw-schematic-grid.ts
import { applyToPoint as applyToPoint63 } from "transformation-matrix";
function drawSchematicGrid(params) {
  const { minX, minY, maxX, maxY } = params.bounds;
  const cellSize = params.cellSize ?? 1;
  const labelCells = params.labelCells ?? false;
  const gridLines = [];
  const transformPoint = (x, y) => {
    const [transformedX, transformedY] = applyToPoint63(params.transform, [x, y]);
    return { x: transformedX, y: transformedY };
  };
  for (let x = Math.floor(minX); x <= Math.ceil(maxX); x += cellSize) {
    const start = transformPoint(x, minY);
    const end = transformPoint(x, maxY);
    gridLines.push({
      name: "line",
      type: "element",
      attributes: {
        x1: start.x.toString(),
        y1: start.y.toString(),
        x2: end.x.toString(),
        y2: end.y.toString(),
        stroke: colorMap.schematic.grid,
        "stroke-width": (0.01 * Math.abs(params.transform.a)).toString(),
        "stroke-opacity": "0.5"
      }
    });
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y += cellSize) {
    const start = transformPoint(minX, y);
    const end = transformPoint(maxX, y);
    gridLines.push({
      name: "line",
      type: "element",
      attributes: {
        x1: start.x.toString(),
        y1: start.y.toString(),
        x2: end.x.toString(),
        y2: end.y.toString(),
        stroke: colorMap.schematic.grid,
        "stroke-width": (0.01 * Math.abs(params.transform.a)).toString(),
        "stroke-opacity": "0.5"
      }
    });
  }
  if (labelCells) {
    const formatPoint = (x, y) => {
      if (cellSize <= 0.1) return `${x.toFixed(1)},${y.toFixed(1)}`;
      return `${x},${y}`;
    };
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x += cellSize) {
      for (let y = Math.floor(minY); y <= Math.ceil(maxY); y += cellSize) {
        const point = transformPoint(x, y);
        gridLines.push({
          name: "text",
          type: "element",
          attributes: {
            x: (point.x - 2.5).toString(),
            y: (point.y - 5).toString(),
            fill: colorMap.schematic.grid,
            "font-size": (cellSize / 5 * Math.abs(params.transform.a)).toString(),
            "fill-opacity": "0.5",
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            "font-family": "sans-serif"
          },
          children: [
            {
              type: "text",
              value: formatPoint(x, y),
              name: "",
              attributes: {},
              children: []
            }
          ]
        });
      }
    }
  }
  return {
    name: "g",
    value: "",
    type: "element",
    attributes: { class: "grid sch-grid" },
    children: gridLines
  };
}

// lib/sch/draw-schematic-labeled-points.ts
import { applyToPoint as applyToPoint64 } from "transformation-matrix";
function drawSchematicLabeledPoints(params) {
  const { points, transform } = params;
  const labeledPointsGroup = [];
  for (const point of points) {
    const [x1, y1] = applyToPoint64(transform, [point.x - 0.1, point.y - 0.1]);
    const [x2, y2] = applyToPoint64(transform, [point.x + 0.1, point.y + 0.1]);
    const [x3, y3] = applyToPoint64(transform, [point.x - 0.1, point.y + 0.1]);
    const [x4, y4] = applyToPoint64(transform, [point.x + 0.1, point.y - 0.1]);
    labeledPointsGroup.push({
      name: "path",
      type: "element",
      attributes: {
        d: `M${x1},${y1} L${x2},${y2} M${x3},${y3} L${x4},${y4}`,
        stroke: colorMap.schematic.grid,
        "stroke-width": (0.02 * Math.abs(transform.a)).toString(),
        "stroke-opacity": "0.7"
      }
    });
    const [labelX, labelY] = applyToPoint64(transform, [
      point.x + 0.15,
      point.y - 0.15
    ]);
    labeledPointsGroup.push({
      name: "text",
      type: "element",
      attributes: {
        x: labelX.toString(),
        y: labelY.toString(),
        fill: colorMap.schematic.grid,
        "font-size": (0.1 * Math.abs(transform.a)).toString(),
        "fill-opacity": "0.7",
        "text-anchor": "start",
        "font-family": "sans-serif",
        "dominant-baseline": "middle"
      },
      children: [
        {
          type: "text",
          value: point.label || `(${point.x},${point.y})`,
          name: "",
          attributes: {},
          children: []
        }
      ]
    });
  }
  return {
    name: "g",
    value: "",
    type: "element",
    attributes: { class: "labeled-points sch-labeled-points" },
    children: labeledPointsGroup
  };
}

// lib/sch/get-default-schematic-sheet.ts
function getDefaultSchematicSheet(schematicSheets) {
  return schematicSheets.reduce(
    (bestSheet, sheet) => {
      if (!bestSheet) return sheet;
      if (sheet.sheet_index === void 0) return bestSheet;
      if (bestSheet.sheet_index === void 0) return sheet;
      return sheet.sheet_index < bestSheet.sheet_index ? sheet : bestSheet;
    },
    void 0
  );
}

// lib/sch/arial-text-metrics.ts
var arialTextMetrics = {
  "0": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  "1": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -3,
    right: 9
  },
  "2": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  "3": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  "4": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 12
  },
  "5": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  "6": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  "7": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  "8": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  "9": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  " ": {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 0
  },
  "!": {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 5
  },
  '"': {
    width: 9,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 7
  },
  "#": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 13
  },
  $: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  "%": {
    width: 21,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 20
  },
  "&": {
    width: 16,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 15
  },
  "'": {
    width: 5,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 3
  },
  "(": {
    width: 8,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 7
  },
  ")": {
    width: 8,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 7
  },
  "*": {
    width: 9,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 8
  },
  "+": {
    width: 14,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 13
  },
  ",": {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 5
  },
  "-": {
    width: 8,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 7
  },
  ".": {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 5
  },
  "/": {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 7
  },
  ":": {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 5
  },
  ";": {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 5
  },
  "<": {
    width: 14,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 13
  },
  "=": {
    width: 14,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 13
  },
  ">": {
    width: 14,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 13
  },
  "?": {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  "@": {
    width: 24,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 23
  },
  A: {
    width: 16,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 16
  },
  B: {
    width: 16,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 15
  },
  C: {
    width: 17,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 16
  },
  D: {
    width: 17,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 16
  },
  E: {
    width: 16,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 15
  },
  F: {
    width: 15,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 14
  },
  G: {
    width: 19,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 17
  },
  H: {
    width: 17,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 15
  },
  I: {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 5
  },
  J: {
    width: 12,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 10
  },
  K: {
    width: 16,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 16
  },
  L: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 12
  },
  M: {
    width: 20,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 18
  },
  N: {
    width: 17,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 15
  },
  O: {
    width: 19,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 18
  },
  P: {
    width: 16,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 15
  },
  Q: {
    width: 19,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 18
  },
  R: {
    width: 17,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 17
  },
  S: {
    width: 16,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 15
  },
  T: {
    width: 15,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 14
  },
  U: {
    width: 17,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 15
  },
  V: {
    width: 16,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 16
  },
  W: {
    width: 23,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 22
  },
  X: {
    width: 16,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 16
  },
  Y: {
    width: 16,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 16
  },
  Z: {
    width: 15,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 14
  },
  "[": {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 6
  },
  "\\": {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 7
  },
  "]": {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 5
  },
  "^": {
    width: 11,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 11
  },
  _: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 14
  },
  "`": {
    width: 8,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 5
  },
  a: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  b: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 12
  },
  c: {
    width: 12,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  d: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  e: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  f: {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 8
  },
  g: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  h: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 12
  },
  i: {
    width: 5,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 4
  },
  j: {
    width: 5,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 1,
    right: 4
  },
  k: {
    width: 12,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 12
  },
  l: {
    width: 5,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 4
  },
  m: {
    width: 20,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 18
  },
  n: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 12
  },
  o: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  p: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 12
  },
  q: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 12
  },
  r: {
    width: 8,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 8
  },
  s: {
    width: 12,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 11
  },
  t: {
    width: 7,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 6
  },
  u: {
    width: 13,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 12
  },
  v: {
    width: 12,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 12
  },
  w: {
    width: 17,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 17
  },
  x: {
    width: 12,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 12
  },
  y: {
    width: 12,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 12
  },
  z: {
    width: 12,
    height: 27,
    ascent: 22,
    descent: 5,
    left: 0,
    right: 11
  },
  "{": {
    width: 8,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 7
  },
  "|": {
    width: 6,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -2,
    right: 4
  },
  "}": {
    width: 8,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 7
  },
  "~": {
    width: 14,
    height: 27,
    ascent: 22,
    descent: 5,
    left: -1,
    right: 13
  }
};

// lib/sch/estimate-text-width.ts
var estimateTextWidth = (text) => {
  if (!text) return 0;
  let totalWidth = 0;
  for (const char of text) {
    const metrics = arialTextMetrics[char];
    if (metrics) {
      totalWidth += metrics.width;
    } else {
      totalWidth += arialTextMetrics["?"].width;
    }
  }
  return totalWidth / 27;
};

// lib/utils/net-label-superscript.ts
var SUPERSCRIPT_SCALE = 0.65;
var SUPERSCRIPT_GAP = 0.08;
function getNetLabelTextWidth(label) {
  return estimateTextWidth(label.text || "") + (label.display_superscript ? SUPERSCRIPT_GAP + estimateTextWidth(label.display_superscript) * SUPERSCRIPT_SCALE : 0);
}
function createNetLabelTextChildren(text, superscript, fontSizePx, dominantBaseline = "central") {
  const children = [
    {
      type: "text",
      value: text,
      name: "",
      attributes: {},
      children: []
    }
  ];
  if (superscript) {
    children.push({
      type: "element",
      name: "tspan",
      value: "",
      attributes: {
        class: "sch-net-label-superscript",
        "font-size": `${fontSizePx * SUPERSCRIPT_SCALE}px`,
        dx: `${fontSizePx * SUPERSCRIPT_GAP}`,
        // Ideographic anchoring moves smaller glyphs downward; compensate
        // so power-symbol suffixes rise like centrally anchored label text.
        dy: `${-fontSizePx * (dominantBaseline === "ideographic" ? 0.5 : 0.25)}`
      },
      children: [
        {
          type: "text",
          value: superscript,
          name: "",
          attributes: {},
          children: []
        }
      ]
    });
  }
  return children;
}

// lib/utils/get-unit-vector-from-outside-to-edge.ts
var getUnitVectorFromOutsideToEdge = (side) => {
  switch (side) {
    case "top":
      return { x: 0, y: -1 };
    case "bottom":
      return { x: 0, y: 1 };
    case "left":
      return { x: 1, y: 0 };
    case "right":
      return { x: -1, y: 0 };
  }
  throw new Error(`Invalid side: ${side}`);
};

// lib/utils/net-label-utils.ts
import "transformation-matrix";
import "schematic-symbols";
var ARROW_POINT_WIDTH_FSR = 0.3;
var END_PADDING_FSR = 0.3;
var END_PADDING_EXTRA_PER_CHARACTER_FSR = 0.06;
var NET_LABEL_HEIGHT_MM = 0.2;
var getNetLabelDataAttributes = (schNetLabel) => ({
  "data-circuit-json-type": "schematic_net_label",
  "data-schematic-net-label-id": schNetLabel.schematic_net_label_id
});
var ninePointAnchorToTextAnchor = {
  top_left: "start",
  top_right: "end",
  middle_left: "start",
  middle_right: "end",
  bottom_left: "start",
  bottom_right: "end",
  center: "middle",
  middle_top: "middle",
  middle_bottom: "middle"
};
var ninePointAnchorToDominantBaseline = {
  top_left: "hanging",
  top_right: "hanging",
  bottom_left: "ideographic",
  bottom_right: "ideographic",
  center: "middle",
  middle_left: "middle",
  middle_right: "middle",
  middle_top: "hanging",
  middle_bottom: "ideographic"
};
function getPathRotation(anchorSide) {
  const rotationMap = {
    left: 180,
    top: 90,
    bottom: -90,
    right: 0
  };
  return rotationMap[anchorSide] ?? 0;
}
function calculateAnchorPosition(schNetLabel, fontSizeMm, textWidthFSR) {
  const fullWidthFsr = textWidthFSR + ARROW_POINT_WIDTH_FSR * 2 + END_PADDING_EXTRA_PER_CHARACTER_FSR * schNetLabel.text.length + END_PADDING_FSR;
  const realTextGrowthVec = getUnitVectorFromOutsideToEdge(
    schNetLabel.anchor_side
  );
  return schNetLabel.anchor_position ?? {
    x: schNetLabel.center.x - realTextGrowthVec.x * fullWidthFsr * fontSizeMm / 2,
    y: schNetLabel.center.y - realTextGrowthVec.y * fullWidthFsr * fontSizeMm / 2
  };
}

// lib/utils/match-sch-ports-with-symbol-ports.ts
var getAngularDifference = (angle1, angle2) => {
  const a1 = angle1 < 0 ? angle1 + 2 * Math.PI : angle1;
  const a2 = angle2 < 0 ? angle2 + 2 * Math.PI : angle2;
  let diff = Math.abs(a1 - a2);
  if (diff > Math.PI) {
    diff = 2 * Math.PI - diff;
  }
  return diff;
};
var matchSchPortsToSymbolPorts = ({
  schPorts,
  symbol,
  schComponent
}) => {
  const schPortAngles = schPorts.map((port) => {
    const dx = port.center.x - schComponent.center.x;
    const dy = port.center.y - schComponent.center.y;
    return {
      port,
      angle: Math.atan2(dy, dx)
    };
  });
  const symbolPortAngles = symbol.ports.map((port) => {
    const dx = port.x - symbol.center.x;
    const dy = port.y - symbol.center.y;
    return {
      port,
      angle: Math.atan2(dy, dx)
    };
  });
  schPortAngles.sort((a, b) => a.angle - b.angle);
  symbolPortAngles.sort((a, b) => a.angle - b.angle);
  const matches = [];
  const usedSymbolPorts = /* @__PURE__ */ new Set();
  for (const schPortAngle of schPortAngles) {
    let bestMatch = null;
    for (const symbolPortAngle of symbolPortAngles) {
      if (usedSymbolPorts.has(symbolPortAngle.port)) continue;
      const angleDiff = getAngularDifference(
        schPortAngle.angle,
        symbolPortAngle.angle
      );
      if (bestMatch === null || angleDiff < bestMatch.angleDiff) {
        bestMatch = {
          symbolPort: symbolPortAngle.port,
          angleDiff
        };
      }
    }
    if (bestMatch && bestMatch.angleDiff < Math.PI / 4) {
      matches.push({
        schPort: schPortAngle.port,
        symbolPort: bestMatch.symbolPort
      });
      usedSymbolPorts.add(bestMatch.symbolPort);
    }
  }
  return matches;
};

// lib/utils/point-pairs-to-matrix.ts
import { compose as compose10, scale as scale5, translate as translate10 } from "transformation-matrix";
function pointPairsToMatrix(a1, a2, b1, b2) {
  const originalDistance = Math.sqrt((b1.x - a1.x) ** 2 + (b1.y - a1.y) ** 2);
  const transformedDistance = Math.sqrt((b2.x - a2.x) ** 2 + (b2.y - a2.y) ** 2);
  const a = transformedDistance / originalDistance;
  const tx = a2.x - a * a1.x;
  const ty = a2.y - a * a1.y;
  const translateMatrix = translate10(tx, ty);
  const scaleMatrix = scale5(a, a);
  return compose10(translateMatrix, scaleMatrix);
}

// lib/sch/get-schematic-symbol-text-bounds.ts
import { symbols } from "schematic-symbols";
import { applyToPoint as applyToPoint65 } from "transformation-matrix";
function getSchematicSymbolTextBounds(circuitJson) {
  const components = [];
  const schematicPortsByComponentId = /* @__PURE__ */ new Map();
  const sourceComponentsById = /* @__PURE__ */ new Map();
  let combinedBounds = null;
  for (const element of circuitJson) {
    if (element.type === "schematic_component") {
      components.push(element);
    } else if (element.type === "schematic_port" && element.schematic_component_id) {
      const componentPorts = schematicPortsByComponentId.get(element.schematic_component_id) ?? [];
      componentPorts.push(element);
      schematicPortsByComponentId.set(
        element.schematic_component_id,
        componentPorts
      );
    } else if (element.type === "source_component") {
      sourceComponentsById.set(element.source_component_id, element);
    }
  }
  for (const component of components) {
    const componentBounds = getComponentSymbolTextBounds({
      component,
      schematicPorts: schematicPortsByComponentId.get(component.schematic_component_id) ?? [],
      sourceComponent: component.source_component_id ? sourceComponentsById.get(component.source_component_id) : void 0
    });
    if (!componentBounds) continue;
    combinedBounds = combinedBounds ? combineBounds(combinedBounds, componentBounds) : componentBounds;
  }
  return combinedBounds;
}
function getComponentSymbolTextBounds({
  component,
  schematicPorts,
  sourceComponent
}) {
  if (!component.symbol_name) return null;
  const symbol = symbols[component.symbol_name];
  if (!symbol) return null;
  const matchedPorts = matchSchPortsToSymbolPorts({
    schPorts: schematicPorts,
    symbol,
    schComponent: component
  });
  if (!matchedPorts[0]) return null;
  const symbolToRealTransform = pointPairsToMatrix(
    matchedPorts[1]?.symbolPort ?? symbol.center,
    matchedPorts[1]?.schPort.center ?? component.center,
    matchedPorts[0].symbolPort,
    matchedPorts[0].schPort.center
  );
  let combinedBounds = null;
  for (const primitive of symbol.primitives) {
    if (primitive.type !== "text") continue;
    const text = getRenderedText({
      primitive,
      component,
      sourceComponent
    });
    if (!text) continue;
    const anchorPosition = applyToPoint65(symbolToRealTransform, primitive);
    const fontSize = getSchMmFontSize("reference_designator");
    const textBounds = getTextBoundsFromAnchor({
      x: anchorPosition.x,
      y: anchorPosition.y,
      width: estimateTextWidth(text) * fontSize,
      height: fontSize,
      anchor: primitive.anchor
    });
    combinedBounds = combinedBounds ? combineBounds(combinedBounds, textBounds) : textBounds;
  }
  return combinedBounds;
}
function getRenderedText({
  primitive,
  component,
  sourceComponent
}) {
  if (primitive.text === "{REF}") {
    return sourceComponent?.display_name ?? sourceComponent?.name ?? "";
  }
  if (primitive.text === "{VAL}") {
    return component.symbol_display_value ?? "";
  }
  return "";
}
function getTextBoundsFromAnchor({
  x,
  y,
  width,
  height,
  anchor
}) {
  let minX = x;
  let maxX = x;
  let minY = y - height / 2;
  let maxY = y + height / 2;
  if (anchor.includes("left")) {
    maxX = x + width;
  } else if (anchor.includes("right")) {
    minX = x - width;
  } else {
    minX = x - width / 2;
    maxX = x + width / 2;
  }
  if (anchor.includes("top")) {
    minY = y - height;
    maxY = y;
  } else if (anchor.includes("bottom")) {
    minY = y;
    maxY = y + height;
  }
  return { minX, minY, maxX, maxY };
}
function combineBounds(first, second) {
  return {
    minX: Math.min(first.minX, second.minX),
    minY: Math.min(first.minY, second.minY),
    maxX: Math.max(first.maxX, second.maxX),
    maxY: Math.max(first.maxY, second.maxY)
  };
}

// lib/sch/get-table-dimensions.ts
var getTableDimensions = (schematicTable, circuitJson) => {
  if (schematicTable.column_widths && schematicTable.column_widths.length > 0 && schematicTable.row_heights && schematicTable.row_heights.length > 0) {
    const unitToMm = (v) => {
      if (typeof v === "number") return v;
      if (v.endsWith("mm")) return parseFloat(v);
      if (v.endsWith("in")) return parseFloat(v) * 25.4;
      return parseFloat(v);
    };
    return {
      column_widths: schematicTable.column_widths.map(unitToMm),
      row_heights: schematicTable.row_heights.map(unitToMm)
    };
  }
  const cells = circuitJson.filter(
    (elm) => elm.type === "schematic_table_cell" && elm.schematic_table_id === schematicTable.schematic_table_id
  );
  if (cells.length === 0) {
    return { column_widths: [], row_heights: [] };
  }
  const numColumns = cells.reduce((max, c) => Math.max(max, c.end_column_index), -1) + 1;
  const numRows = cells.reduce((max, c) => Math.max(max, c.end_row_index), -1) + 1;
  const { cell_padding = 0.2 } = schematicTable;
  const column_widths = new Array(numColumns).fill(0);
  const row_heights = new Array(numRows).fill(0);
  const cell_widths = {};
  const cell_heights = {};
  for (const cell of cells) {
    const fontSizeMm = getSchMmFontSize("reference_designator", cell.font_size);
    const textWidthMm = estimateTextWidth(cell.text ?? "") * fontSizeMm;
    const requiredWidth = textWidthMm + 2 * cell_padding;
    const requiredHeight = fontSizeMm * 1.2 + 2 * cell_padding;
    const key = `${cell.start_row_index}-${cell.start_column_index}`;
    cell_widths[key] = requiredWidth;
    cell_heights[key] = requiredHeight;
  }
  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numColumns; j++) {
      const key = `${i}-${j}`;
      if (cell_widths[key] && cell_widths[key] > column_widths[j]) {
        column_widths[j] = cell_widths[key];
      }
      if (cell_heights[key] && cell_heights[key] > row_heights[i]) {
        row_heights[i] = cell_heights[key];
      }
    }
  }
  for (const cell of cells) {
    if (cell.start_column_index === cell.end_column_index && cell.start_row_index === cell.end_row_index)
      continue;
    const key = `${cell.start_row_index}-${cell.start_column_index}`;
    const requiredWidth = cell_widths[key];
    const requiredHeight = cell_heights[key];
    if (requiredWidth === void 0 || requiredHeight === void 0) continue;
    let currentWidth = 0;
    for (let i = cell.start_column_index; i <= cell.end_column_index; i++) {
      currentWidth += column_widths[i];
    }
    if (requiredWidth > currentWidth) {
      const diff = requiredWidth - currentWidth;
      const extraPerColumn = diff / (cell.end_column_index - cell.start_column_index + 1);
      for (let i = cell.start_column_index; i <= cell.end_column_index; i++) {
        column_widths[i] += extraPerColumn;
      }
    }
    let currentHeight = 0;
    for (let i = cell.start_row_index; i <= cell.end_row_index; i++) {
      currentHeight += row_heights[i];
    }
    if (requiredHeight > currentHeight) {
      const diff = requiredHeight - currentHeight;
      const extraPerRow = diff / (cell.end_row_index - cell.start_row_index + 1);
      for (let i = cell.start_row_index; i <= cell.end_row_index; i++) {
        row_heights[i] += extraPerRow;
      }
    }
  }
  return { column_widths, row_heights };
};

// lib/sch/schematic-sheet-utils.ts
var KICAD_RESISTOR_PIN_SPAN_MM = 10.16;
var TSCIRCUIT_RESISTOR_PIN_SPAN = 1.1;
var SCHEMATIC_UNIT_TO_MM = KICAD_RESISTOR_PIN_SPAN_MM / TSCIRCUIT_RESISTOR_PIN_SPAN;
var DEFAULT_SCHEMATIC_SHEET_WIDTH = 297 / SCHEMATIC_UNIT_TO_MM;
var DEFAULT_SCHEMATIC_SHEET_HEIGHT = 210 / SCHEMATIC_UNIT_TO_MM;
var SCHEMATIC_SHEET_GAP = 20 / SCHEMATIC_UNIT_TO_MM;
var SCHEMATIC_SHEET_INNER_MARGIN = 5 / SCHEMATIC_UNIT_TO_MM;
function getSchematicSheetLayout(schematicSheet = {}) {
  const center = schematicSheet.center ?? { x: 0, y: 0 };
  const width = schematicSheet.sheet_width === void 0 ? DEFAULT_SCHEMATIC_SHEET_WIDTH : schematicSheet.sheet_width / SCHEMATIC_UNIT_TO_MM;
  const height = schematicSheet.sheet_height === void 0 ? DEFAULT_SCHEMATIC_SHEET_HEIGHT : schematicSheet.sheet_height / SCHEMATIC_UNIT_TO_MM;
  const minX = center.x - width / 2;
  const maxX = center.x + width / 2;
  const minY = center.y - height / 2;
  const maxY = center.y + height / 2;
  return {
    center,
    width,
    height,
    minX,
    maxX,
    minY,
    maxY,
    innerMinX: minX + SCHEMATIC_SHEET_INNER_MARGIN,
    innerMaxX: maxX - SCHEMATIC_SHEET_INNER_MARGIN,
    innerMinY: minY + SCHEMATIC_SHEET_INNER_MARGIN,
    innerMaxY: maxY - SCHEMATIC_SHEET_INNER_MARGIN
  };
}

// lib/sch/get-schematic-bounds-from-circuit-json.ts
function getSchematicBoundsFromCircuitJson(circuitJson, padding = 0.5) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const portSize = 0.2;
  for (const item of circuitJson) {
    if (item.type === "schematic_sheet") {
      const layout = getSchematicSheetLayout(item);
      updateBounds(
        layout.center,
        { width: layout.width, height: layout.height },
        0
      );
    } else if (item.type === "schematic_component") {
      updateBounds(item.center, item.size, 0);
    } else if (item.type === "schematic_port") {
      updateBounds(item.center, { width: portSize, height: portSize }, 0);
    } else if (item.type === "schematic_debug_object") {
      if (item.shape === "rect") {
        updateBounds(item.center, item.size, 0);
      } else if (item.shape === "line") {
        updateBounds(item.start, { width: 0.1, height: 0.1 }, 0);
        updateBounds(item.end, { width: 0.1, height: 0.1 }, 0);
      }
    } else if (item.type === "schematic_net_label") {
      const fontSizeMm = getSchMmFontSize("net_label");
      const textWidth = getNetLabelTextWidth(item);
      const fullWidthFsr = textWidth + ARROW_POINT_WIDTH_FSR * 2 + END_PADDING_EXTRA_PER_CHARACTER_FSR * (item.text?.length || 0) + END_PADDING_FSR;
      const width = fullWidthFsr * fontSizeMm;
      const height = NET_LABEL_HEIGHT_MM;
      const rotation = getPathRotation(item.anchor_side) / 180 * Math.PI;
      const anchorPosition = calculateAnchorPosition(
        item,
        fontSizeMm,
        textWidth
      );
      const growthVec = getUnitVectorFromOutsideToEdge(item.anchor_side);
      const center = {
        x: anchorPosition.x + growthVec.x * width / 2,
        y: anchorPosition.y + growthVec.y * width / 2
      };
      updateBounds(center, { width, height }, rotation);
    } else if (item.type === "schematic_trace") {
      for (const edge of item.edges) {
        updateBounds(edge.from, { width: 0.1, height: 0.1 }, 0);
        updateBounds(edge.to, { width: 0.1, height: 0.1 }, 0);
      }
    } else if (item.type === "schematic_text") {
      const textType = "reference_designator";
      const fontSize = getSchMmFontSize(textType, item.font_size) ?? 0.18;
      const text = item.text ?? "";
      const superscript = item.display_superscript;
      if (superscript) {
        const lines = text.split("\n");
        const width = Math.max(
          ...lines.map(
            (line, index) => getNetLabelTextWidth({
              text: line,
              display_superscript: index === lines.length - 1 ? superscript : void 0
            })
          )
        ) * fontSize;
        const anchor = item.anchor;
        const offsetX = anchor === "left" || anchor.endsWith("_left") ? width / 2 : anchor === "right" || anchor.endsWith("_right") ? -width / 2 : 0;
        const top = anchor === "top" || anchor.startsWith("top_") ? 0 : anchor === "bottom" || anchor.startsWith("bottom_") ? -fontSize : -fontSize / 2;
        const height = (lines.length + 0.3) * fontSize;
        const offsetY = -(top - 0.3 * fontSize + height / 2);
        const rotation = -(item.rotation ?? 0) * Math.PI / 180;
        updateBounds(
          {
            x: item.position.x + offsetX * Math.cos(rotation) - offsetY * Math.sin(rotation),
            y: item.position.y + offsetX * Math.sin(rotation) + offsetY * Math.cos(rotation)
          },
          { width, height },
          rotation
        );
      } else {
        const width = text.length * fontSize;
        const height = fontSize;
        updateBounds(item.position, { width, height }, item.rotation ?? 0);
      }
    } else if (item.type === "schematic_voltage_probe") {
      updateBounds(item.position, { width: 0.2, height: 0.4 }, 0);
      if (item.name) {
        const fontSize = getSchMmFontSize("net_label");
        const textWidth = estimateTextWidth(item.name) * fontSize;
        const textHeight = fontSize;
        const labelOffset = 0.3;
        const alignment = item.label_alignment ?? "top_right";
        let labelCenterX = item.position.x;
        let labelCenterY = item.position.y;
        if (alignment.includes("top")) {
          labelCenterY += labelOffset + textHeight / 2;
        } else if (alignment.includes("bottom")) {
          labelCenterY -= labelOffset + textHeight / 2;
        }
        if (alignment.includes("right")) {
          labelCenterX += labelOffset + textWidth / 2;
        } else if (alignment.includes("left")) {
          labelCenterX -= labelOffset + textWidth / 2;
        }
        updateBounds(
          { x: labelCenterX, y: labelCenterY },
          { width: textWidth, height: textHeight },
          0
        );
      }
    } else if (item.type === "schematic_box") {
      updateBounds(
        {
          x: item.x + item.width / 2,
          y: item.y + item.height / 2
        },
        { width: item.width, height: item.height },
        0
      );
    } else if (item.type === "schematic_table") {
      const { column_widths, row_heights } = getTableDimensions(
        item,
        circuitJson
      );
      const totalWidth = column_widths.reduce((a, b) => a + b, 0);
      const totalHeight = row_heights.reduce((a, b) => a + b, 0);
      const anchor = item.anchor ?? "center";
      let topLeftX = item.anchor_position.x;
      let topLeftY = item.anchor_position.y;
      if (anchor.includes("center")) {
        topLeftX -= totalWidth / 2;
      } else if (anchor.includes("right")) {
        topLeftX -= totalWidth;
      }
      if (anchor.includes("center")) {
        topLeftY += totalHeight / 2;
      } else if (anchor.includes("bottom")) {
        topLeftY += totalHeight;
      }
      const centerX = topLeftX + totalWidth / 2;
      const centerY = topLeftY - totalHeight / 2;
      updateBounds(
        { x: centerX, y: centerY },
        { width: totalWidth, height: totalHeight },
        0
      );
    } else if (item.type === "schematic_line") {
      updateBounds({ x: item.x1, y: item.y1 }, { width: 0.02, height: 0.02 }, 0);
      updateBounds({ x: item.x2, y: item.y2 }, { width: 0.02, height: 0.02 }, 0);
    } else if (item.type === "schematic_circle") {
      updateBounds(
        item.center,
        { width: item.radius * 2, height: item.radius * 2 },
        0
      );
    } else if (item.type === "schematic_rect") {
      updateBounds(
        item.center,
        { width: item.width, height: item.height },
        item.rotation
      );
    } else if (item.type === "schematic_arc") {
      updateBounds(
        item.center,
        { width: item.radius * 2, height: item.radius * 2 },
        0
      );
    } else if (item.type === "schematic_path") {
      if (item.points && item.points.length > 0) {
        for (const point of item.points) {
          updateBounds(point, { width: 0.02, height: 0.02 }, 0);
        }
      }
    }
  }
  if (!Number.isFinite(minX)) {
    minX = -1;
    minY = -1;
    maxX = 1;
    maxY = 1;
  }
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  const symbolTextBounds = getSchematicSymbolTextBounds(circuitJson);
  if (symbolTextBounds) {
    if (symbolTextBounds.minX < minX) {
      minX = symbolTextBounds.minX - padding;
    }
    if (symbolTextBounds.minY < minY) {
      minY = symbolTextBounds.minY - padding;
    }
    if (symbolTextBounds.maxX > maxX) {
      maxX = symbolTextBounds.maxX + padding;
    }
    if (symbolTextBounds.maxY > maxY) {
      maxY = symbolTextBounds.maxY + padding;
    }
  }
  return { minX, minY, maxX, maxY };
  function updateBounds(center, size, rotation) {
    const corners = [
      { x: -size.width / 2, y: -size.height / 2 },
      { x: size.width / 2, y: -size.height / 2 },
      { x: size.width / 2, y: size.height / 2 },
      { x: -size.width / 2, y: size.height / 2 }
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

// lib/utils/svg-object-utils.ts
function ensureElementNode(node) {
  if (node.type !== "element") {
    throw new Error("Expected SVG root element to be of type 'element'");
  }
  return node;
}
function cloneSvgObject(node) {
  return {
    ...node,
    attributes: { ...node.attributes ?? {} },
    children: node.children?.map(cloneSvgObject) ?? []
  };
}
function translateNestedSvg(node, x, y, width, height) {
  const clone = cloneSvgObject(node);
  clone.attributes = {
    ...clone.attributes,
    x: formatNumber(x),
    y: formatNumber(y),
    width: formatNumber(width),
    height: formatNumber(height)
  };
  delete clone.attributes.xmlns;
  return clone;
}
function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  return Number.parseFloat(value.toFixed(6)).toString();
}

// lib/sch/svg-object-fns/create-svg-object-from-schematic-graphic.ts
var SVG_MIMETYPE = "image/svg+xml";
function createSvgObjectFromSchematicGraphic({
  schematicGraphic,
  viewport
}) {
  const href = getEmbeddedSvgHref(schematicGraphic);
  return {
    name: "g",
    type: "element",
    value: "",
    attributes: {
      class: "schematic-graphic",
      "pointer-events": "none",
      "data-circuit-json-type": "schematic_graphic",
      "data-schematic-graphic-id": schematicGraphic.schematic_graphic_id,
      ...schematicGraphic.schematic_sheet_id ? {
        "data-schematic-sheet-id": schematicGraphic.schematic_sheet_id
      } : {}
    },
    children: [
      {
        name: "image",
        type: "element",
        value: "",
        attributes: {
          // Use the SVG 2 href attribute supported by browsers and Resvg.
          href,
          x: formatNumber(viewport.x),
          y: formatNumber(viewport.y),
          width: formatNumber(viewport.width),
          height: formatNumber(viewport.height),
          preserveAspectRatio: "xMidYMid meet",
          overflow: "hidden",
          "pointer-events": "none"
        },
        children: []
      }
    ]
  };
}
function getEmbeddedSvgHref(schematicGraphic) {
  const errorPrefix = `Unable to render schematic graphic "${schematicGraphic.schematic_graphic_id}"`;
  const { asset, svg_content: svgContent } = schematicGraphic;
  if (!asset) {
    if (svgContent !== void 0) return encodeSvgDataUrl(svgContent);
    throw new Error(`${errorPrefix}: asset or svg_content is required`);
  }
  if (getMediaType(asset.mimetype) !== SVG_MIMETYPE) {
    throw new Error(
      `${errorPrefix}: asset.mimetype must be "${SVG_MIMETYPE}" (received ${JSON.stringify(asset.mimetype)})`
    );
  }
  const assetUrl = asset.url.trim();
  if (assetUrl.toLowerCase().startsWith("data:")) {
    validateSvgDataUrl(assetUrl, errorPrefix);
    return assetUrl;
  }
  if (svgContent !== void 0) return encodeSvgDataUrl(svgContent);
  throw new Error(
    `${errorPrefix}: asset.url must be an inline SVG data URL because circuit-to-svg cannot synchronously load ${JSON.stringify(asset.url)}`
  );
}
function validateSvgDataUrl(dataUrl, errorPrefix) {
  const match = dataUrl.match(/^data:([^,]*),(.*)$/is);
  if (!match) {
    throw new Error(`${errorPrefix}: asset.url is not a valid SVG data URL`);
  }
  const metadataParts = match[1].split(";").map((part) => part.trim());
  const dataUrlMediaType = getMediaType(metadataParts.shift() ?? "");
  if (dataUrlMediaType !== SVG_MIMETYPE) {
    throw new Error(
      `${errorPrefix}: asset.url must use the "${SVG_MIMETYPE}" media type`
    );
  }
  const payload = match[2];
  const base64Index = metadataParts.findIndex(
    (part) => part.toLowerCase() === "base64"
  );
  const isBase64 = base64Index !== -1;
  if (isBase64 && base64Index !== metadataParts.length - 1) {
    throw new Error(
      `${errorPrefix}: asset.url must place "base64" as its final metadata token`
    );
  }
  if (isBase64) {
    const encoded = payload.replace(/\s+/g, "");
    if (!/^(?:[a-z\d+/]{4})*(?:[a-z\d+/]{2}==|[a-z\d+/]{3}=)?$/i.test(encoded)) {
      throw new Error(`${errorPrefix}: asset.url is not a valid SVG data URL`);
    }
    return;
  }
  if (payload.includes("#")) {
    throw new Error(
      `${errorPrefix}: asset.url must percent-encode "#" in a non-base64 SVG data URL`
    );
  }
  try {
    decodeURIComponent(payload);
  } catch (cause) {
    throw new Error(`${errorPrefix}: asset.url is not a valid SVG data URL`, {
      cause
    });
  }
}
function encodeSvgDataUrl(svgContent) {
  const bytes = new TextEncoder().encode(svgContent);
  let binary = "";
  const chunkSize = 32768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${SVG_MIMETYPE};base64,${btoa(binary)}`;
}
function getMediaType(value) {
  return (value.split(";", 1)[0] ?? "").trim().toLowerCase();
}

// lib/utils/get-sch-stroke-size.ts
var getSchStrokeSize = (transform) => {
  return Math.abs(transform.a) * 0.02;
};

// lib/sch/svg-object-fns/create-svg-objects-for-sch-net-label.ts
import {
  applyToPoint as applyToPoint68,
  compose as compose12,
  rotate as rotate7,
  scale as scale7,
  translate as translate12
} from "transformation-matrix";

// lib/sch/svg-object-fns/create-svg-objects-for-sch-net-label-with-symbol.ts
import {
  applyToPoint as applyToPoint67,
  compose as compose11,
  rotate as rotate6,
  scale as scale6,
  translate as translate11
} from "transformation-matrix";
import { symbols as symbols2 } from "schematic-symbols";

// lib/sch/svg-object-fns/create-svg-error-text.ts
import { applyToPoint as applyToPoint66 } from "transformation-matrix";
var createSvgSchErrorText = ({
  text,
  realCenter,
  realToScreenTransform
}) => {
  const screenCenter = applyToPoint66(realToScreenTransform, realCenter);
  return {
    type: "element",
    name: "text",
    value: "",
    attributes: {
      x: screenCenter.x.toString(),
      y: screenCenter.y.toString(),
      fill: "red",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-family": "sans-serif",
      "font-size": `${getSchScreenFontSize(realToScreenTransform, "error")}px`
    },
    children: [
      {
        type: "text",
        value: text,
        name: "",
        attributes: {},
        children: []
      }
    ]
  };
};

// lib/sch/svg-object-fns/create-svg-objects-for-sch-net-label-with-symbol.ts
var createSvgObjectsForSchNetLabelWithSymbol = ({
  schNetLabel,
  realToScreenTransform,
  colorMap: colorMap2
}) => {
  if (!schNetLabel.text) return [];
  const isNegated = schNetLabel.text.startsWith("N_");
  const labelText = isNegated ? schNetLabel.text.slice(2) : schNetLabel.text;
  const netLabelDataAttributes = getNetLabelDataAttributes(schNetLabel);
  const svgObjects = [];
  const symbol = symbols2[schNetLabel.symbol_name];
  if (!symbol) {
    const errorText = createSvgSchErrorText({
      text: `Symbol not found: ${schNetLabel.symbol_name}`,
      realCenter: schNetLabel.center,
      realToScreenTransform
    });
    errorText.attributes = {
      ...errorText.attributes,
      ...netLabelDataAttributes
    };
    svgObjects.push(errorText);
    return svgObjects;
  }
  const symbolPaths = symbol.primitives.filter((p) => p.type === "path");
  const symbolTexts = symbol.primitives.filter((p) => p.type === "text");
  const symbolCircles = symbol.primitives.filter((p) => p.type === "circle");
  const symbolBoxes = symbol.primitives.filter((p) => p.type === "box");
  const bounds = {
    minX: Math.min(...symbolPaths.flatMap((p) => p.points.map((pt) => pt.x))),
    maxX: Math.max(...symbolPaths.flatMap((p) => p.points.map((pt) => pt.x))),
    minY: Math.min(...symbolPaths.flatMap((p) => p.points.map((pt) => pt.y))),
    maxY: Math.max(...symbolPaths.flatMap((p) => p.points.map((pt) => pt.y)))
  };
  const fontSizeMm = getSchMmFontSize("net_label");
  const textWidthFSR = getNetLabelTextWidth({ ...schNetLabel, text: labelText });
  const fullWidthFsr = textWidthFSR + ARROW_POINT_WIDTH_FSR * 2 + END_PADDING_EXTRA_PER_CHARACTER_FSR * labelText.length + END_PADDING_FSR;
  const realTextGrowthVec = getUnitVectorFromOutsideToEdge(
    schNetLabel.anchor_side
  );
  const realAnchorPosition = schNetLabel.anchor_position ?? {
    x: schNetLabel.center.x - realTextGrowthVec.x * fullWidthFsr * fontSizeMm / 2,
    y: schNetLabel.center.y - realTextGrowthVec.y * fullWidthFsr * fontSizeMm / 2
  };
  const pathRotation = 0;
  const rotationMatrix = rotate6(pathRotation / 180 * Math.PI);
  const symbolBounds = {
    minX: Math.min(
      ...symbol.primitives.flatMap(
        (p) => p.type === "path" ? p.points.map((pt) => pt.x) : []
      )
    ),
    maxX: Math.max(
      ...symbol.primitives.flatMap(
        (p) => p.type === "path" ? p.points.map((pt) => pt.x) : []
      )
    ),
    minY: Math.min(
      ...symbol.primitives.flatMap(
        (p) => p.type === "path" ? p.points.map((pt) => pt.y) : []
      )
    ),
    maxY: Math.max(
      ...symbol.primitives.flatMap(
        (p) => p.type === "path" ? p.points.map((pt) => pt.y) : []
      )
    )
  };
  const symbolEndPoint = symbol.ports?.[0] ? { x: symbol.ports[0].x, y: symbol.ports[0].y } : {
    x: symbolBounds.minX,
    y: (symbolBounds.minY + symbolBounds.maxY) / 2
  };
  const rotatedSymbolEnd = applyToPoint67(rotationMatrix, symbolEndPoint);
  const symbolToRealTransform = compose11(
    translate11(
      realAnchorPosition.x - rotatedSymbolEnd.x,
      realAnchorPosition.y - rotatedSymbolEnd.y
    ),
    rotationMatrix,
    scale6(1)
    // Use full symbol size
  );
  const [screenMinX, screenMinY] = applyToPoint67(
    compose11(realToScreenTransform, symbolToRealTransform),
    [bounds.minX, bounds.minY]
  );
  const [screenMaxX, screenMaxY] = applyToPoint67(
    compose11(realToScreenTransform, symbolToRealTransform),
    [bounds.maxX, bounds.maxY]
  );
  const rectHeight = Math.abs(screenMaxY - screenMinY);
  const rectY = Math.min(screenMinY, screenMaxY);
  const rectWidth = Math.abs(screenMaxX - screenMinX);
  const rectX = Math.min(screenMinX, screenMaxX);
  svgObjects.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "component-overlay sch-component-overlay sch-net-label-overlay",
      ...netLabelDataAttributes,
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString(),
      fill: "transparent"
    },
    children: []
  });
  for (const path of symbolPaths) {
    const symbolPath = path.points.map((p, i) => {
      const [x, y] = applyToPoint67(
        compose11(realToScreenTransform, symbolToRealTransform),
        [p.x, p.y]
      );
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
    svgObjects.push({
      name: "path",
      type: "element",
      attributes: {
        class: "sch-net-label-symbol-path",
        ...netLabelDataAttributes,
        d: symbolPath + (path.closed ? " Z" : ""),
        stroke: colorMap2.schematic.component_outline,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
        "stroke-linecap": "round"
      },
      value: "",
      children: []
    });
  }
  for (const text of symbolTexts) {
    const screenTextPos = applyToPoint67(
      compose11(realToScreenTransform, symbolToRealTransform),
      text
    );
    let textValue = text.text;
    if (textValue === "{REF}") {
      textValue = labelText || "";
    } else if (textValue === "{VAL}") {
      textValue = "";
    }
    const scale10 = Math.abs(realToScreenTransform.a);
    const baseOffset = scale10 * 0.1;
    const offsetScreenPos = {
      x: screenTextPos.x,
      y: screenTextPos.y
    };
    svgObjects.push({
      name: "text",
      type: "element",
      attributes: {
        class: "sch-net-label-symbol-text",
        ...netLabelDataAttributes,
        x: offsetScreenPos.x.toString(),
        y: offsetScreenPos.y.toString(),
        fill: colorMap2.schematic.label_local,
        "font-family": "sans-serif",
        "text-anchor": ninePointAnchorToTextAnchor[text.anchor],
        "dominant-baseline": ninePointAnchorToDominantBaseline[text.anchor],
        "font-size": `${getSchScreenFontSize(realToScreenTransform, "reference_designator")}px`,
        ...isNegated && textValue === labelText ? { style: "text-decoration: overline;" } : {}
      },
      children: createNetLabelTextChildren(
        textValue,
        text.text === "{REF}" ? schNetLabel.display_superscript : void 0,
        getSchScreenFontSize(realToScreenTransform, "reference_designator"),
        ninePointAnchorToDominantBaseline[text.anchor]
      ),
      value: ""
    });
  }
  for (const box of symbolBoxes) {
    const screenBoxPos = applyToPoint67(
      compose11(realToScreenTransform, symbolToRealTransform),
      box
    );
    const symbolToScreenScale = compose11(
      realToScreenTransform,
      symbolToRealTransform
    ).a;
    svgObjects.push({
      name: "rect",
      type: "element",
      attributes: {
        class: "sch-net-label-symbol-box",
        ...netLabelDataAttributes,
        x: screenBoxPos.x.toString(),
        y: screenBoxPos.y.toString(),
        width: (box.width * symbolToScreenScale).toString(),
        height: (box.height * symbolToScreenScale).toString(),
        fill: "red"
      },
      value: "",
      children: []
    });
  }
  for (const circle of symbolCircles) {
    const screenCirclePos = applyToPoint67(
      compose11(realToScreenTransform, symbolToRealTransform),
      circle
    );
    const symbolToScreenScale = compose11(
      realToScreenTransform,
      symbolToRealTransform
    ).a;
    svgObjects.push({
      name: "circle",
      type: "element",
      attributes: {
        class: "sch-net-label-symbol-circle",
        ...netLabelDataAttributes,
        cx: screenCirclePos.x.toString(),
        cy: screenCirclePos.y.toString(),
        r: (circle.radius * symbolToScreenScale).toString(),
        fill: "none",
        stroke: colorMap2.schematic.component_outline,
        "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`
      },
      value: "",
      children: []
    });
  }
  return svgObjects;
};

// lib/sch/svg-object-fns/create-svg-objects-for-sch-net-label.ts
var createSvgObjectsForSchNetLabel = ({
  schNetLabel,
  realToScreenTransform,
  colorMap: colorMap2
}) => {
  if (!schNetLabel.text) return [];
  const labelText = schNetLabel.text;
  if (schNetLabel.symbol_name) {
    return createSvgObjectsForSchNetLabelWithSymbol({
      schNetLabel,
      realToScreenTransform,
      colorMap: colorMap2
    });
  }
  const netLabelDataAttributes = getNetLabelDataAttributes(schNetLabel);
  const svgObjects = [];
  const fontSizePx = getSchScreenFontSize(realToScreenTransform, "net_label");
  const fontSizeMm = getSchMmFontSize("net_label");
  const halfHeightFsr = NET_LABEL_HEIGHT_MM / fontSizeMm / 2;
  const textWidthFSR = getNetLabelTextWidth({ ...schNetLabel, text: labelText });
  const screenCenter = applyToPoint68(realToScreenTransform, schNetLabel.center);
  const realTextGrowthVec = getUnitVectorFromOutsideToEdge(
    schNetLabel.anchor_side
  );
  const screenTextGrowthVec = { ...realTextGrowthVec };
  screenTextGrowthVec.y *= -1;
  const fullWidthFsr = textWidthFSR + ARROW_POINT_WIDTH_FSR * 2 + END_PADDING_EXTRA_PER_CHARACTER_FSR * labelText.length + END_PADDING_FSR;
  const screenAnchorPosition = schNetLabel.anchor_position ? applyToPoint68(realToScreenTransform, schNetLabel.anchor_position) : {
    x: screenCenter.x - screenTextGrowthVec.x * fullWidthFsr * fontSizePx / 2,
    y: screenCenter.y - screenTextGrowthVec.y * fullWidthFsr * fontSizePx / 2
  };
  const realAnchorPosition = schNetLabel.anchor_position ?? {
    x: schNetLabel.center.x - realTextGrowthVec.x * fullWidthFsr * fontSizeMm / 2,
    y: schNetLabel.center.y - realTextGrowthVec.y * fullWidthFsr * fontSizeMm / 2
  };
  const pathRotation = {
    left: 0,
    top: -90,
    bottom: 90,
    right: 180
  }[schNetLabel.anchor_side];
  const screenOutlinePoints = [
    // Arrow point in font-relative coordinates
    {
      x: 0,
      y: 0
    },
    // Top left corner in font-relative coordinates
    {
      x: ARROW_POINT_WIDTH_FSR,
      y: halfHeightFsr
    },
    // Top right corner in font-relative coordinates
    {
      x: ARROW_POINT_WIDTH_FSR * 2 + END_PADDING_FSR + END_PADDING_EXTRA_PER_CHARACTER_FSR * labelText.length + textWidthFSR,
      y: halfHeightFsr
    },
    // Bottom right corner in font-relative coordinates
    {
      x: ARROW_POINT_WIDTH_FSR * 2 + END_PADDING_FSR + END_PADDING_EXTRA_PER_CHARACTER_FSR * labelText.length + textWidthFSR,
      y: -halfHeightFsr
    },
    // Bottom left corner in font-relative coordinates
    {
      x: ARROW_POINT_WIDTH_FSR,
      y: -halfHeightFsr
    }
  ].map(
    (fontRelativePoint) => applyToPoint68(
      compose12(
        realToScreenTransform,
        translate12(realAnchorPosition.x, realAnchorPosition.y),
        scale7(fontSizeMm),
        rotate7(pathRotation / 180 * Math.PI)
      ),
      fontRelativePoint
    )
  );
  const pathD = `
    M ${screenOutlinePoints[0].x},${screenOutlinePoints[0].y}
    L ${screenOutlinePoints[1].x},${screenOutlinePoints[1].y}
    L ${screenOutlinePoints[2].x},${screenOutlinePoints[2].y}
    L ${screenOutlinePoints[3].x},${screenOutlinePoints[3].y}
    L ${screenOutlinePoints[4].x},${screenOutlinePoints[4].y}
    Z
  `;
  svgObjects.push({
    name: "path",
    type: "element",
    attributes: {
      class: "net-label sch-net-label",
      ...netLabelDataAttributes,
      d: pathD,
      fill: colorMap2.schematic.label_background,
      stroke: colorMap2.schematic.label_global,
      "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`
    },
    value: "",
    children: []
  });
  const screenTextPos = {
    x: screenAnchorPosition.x + screenTextGrowthVec.x * fontSizePx * 0.5,
    y: screenAnchorPosition.y + screenTextGrowthVec.y * fontSizePx * 0.5
  };
  const textAnchor = {
    left: "start",
    top: "start",
    bottom: "start",
    right: "end"
  }[schNetLabel.anchor_side];
  const textTransformString = {
    left: "",
    right: "",
    top: `rotate(90 ${screenTextPos.x} ${screenTextPos.y})`,
    bottom: `rotate(-90 ${screenTextPos.x} ${screenTextPos.y})`
  }[schNetLabel.anchor_side];
  svgObjects.push({
    name: "text",
    type: "element",
    attributes: {
      class: "net-label-text sch-net-label-text",
      ...netLabelDataAttributes,
      x: screenTextPos.x.toString(),
      y: screenTextPos.y.toString(),
      fill: colorMap2.schematic.label_global,
      "text-anchor": textAnchor,
      "dominant-baseline": "central",
      "font-family": "sans-serif",
      "font-variant-numeric": "tabular-nums",
      "font-size": `${fontSizePx}px`,
      transform: textTransformString
    },
    children: createNetLabelTextChildren(
      labelText,
      schNetLabel.display_superscript,
      fontSizePx
    ),
    value: ""
  });
  return svgObjects;
};

// lib/sch/svg-object-fns/create-svg-objects-for-sch-port-hover.ts
import { su as su7 } from "@tscircuit/circuit-json-util";
import { applyToPoint as applyToPoint69 } from "transformation-matrix";
var PIN_CIRCLE_RADIUS_MM = 0.02;
var createSvgObjectsForSchPortHover = ({
  schPort,
  transform
}) => {
  const screenSchPortPos = applyToPoint69(transform, schPort.center);
  const pinRadiusPx = Math.abs(transform.a) * PIN_CIRCLE_RADIUS_MM * 2;
  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "schematic-port-hover sch-port-hover",
        "data-schematic-port-id": schPort.source_port_id,
        ...schPort.schematic_sheet_id ? { "data-schematic-sheet-id": schPort.schematic_sheet_id } : {}
      },
      children: [
        {
          name: "circle",
          type: "element",
          value: "",
          attributes: {
            cx: screenSchPortPos.x.toString(),
            cy: screenSchPortPos.y.toString(),
            r: pinRadiusPx.toString(),
            fill: "red",
            opacity: "0"
          },
          children: []
        }
      ]
    }
  ];
};
var createSvgObjectsForSchComponentPortHovers = ({
  component,
  transform,
  circuitJson
}) => {
  const schematicPorts = su7(circuitJson).schematic_port.list({
    schematic_component_id: component.schematic_component_id
  });
  const svgs = [];
  for (const schPort of schematicPorts) {
    svgs.push(...createSvgObjectsForSchPortHover({ schPort, transform }));
  }
  return svgs;
};

// lib/sch/svg-object-fns/create-svg-object-for-sch-port-no-connect.ts
import { applyToPoint as applyToPoint70 } from "transformation-matrix";
var createSvgObjectForSchPortNoConnect = ({
  schPort,
  transform,
  colorMap: colorMap2
}) => {
  const halfSize = 0.05;
  const { x, y } = schPort.center;
  const d = [-1, 1].map((slope) => {
    const start = applyToPoint70(transform, {
      x: x - halfSize,
      y: y - slope * halfSize
    });
    const end = applyToPoint70(transform, {
      x: x + halfSize,
      y: y + slope * halfSize
    });
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }).join(" ");
  return {
    name: "path",
    type: "element",
    value: "",
    attributes: {
      class: "sch-port-no-connect",
      "data-schematic-port-id": schPort.schematic_port_id,
      "data-source-port-id": schPort.source_port_id,
      d,
      fill: "none",
      stroke: colorMap2.schematic.no_connect,
      "stroke-width": `${getSchStrokeSize(transform)}px`,
      "stroke-linecap": "round"
    },
    children: []
  };
};

// lib/sch/svg-object-fns/create-svg-objects-for-sch-port-indicator.ts
import { applyToPoint as applyToPoint71 } from "transformation-matrix";
var PIN_CIRCLE_RADIUS_MM2 = 0.02;
var createSvgObjectsForSchPortIndicator = ({
  schPort,
  transform,
  circuitJson,
  colorMap: colorMap2
}) => {
  const svgObjects = [];
  const radiusPx = Math.abs(transform.a) * PIN_CIRCLE_RADIUS_MM2;
  const strokeWidth = Math.abs(transform.a) * PIN_CIRCLE_RADIUS_MM2;
  const screenPos = applyToPoint71(transform, schPort.center);
  const sourcePort = circuitJson.find(
    (e) => e.type === "source_port" && e.source_port_id === schPort.source_port_id
  );
  if (!sourcePort?.do_not_connect) {
    svgObjects.push({
      name: "circle",
      type: "element",
      value: "",
      attributes: {
        class: "component-pin sch-component-pin sch-port-indicator",
        cx: screenPos.x.toString(),
        cy: screenPos.y.toString(),
        r: radiusPx.toString(),
        fill: "none",
        stroke: colorMap2.schematic.component_outline,
        "stroke-width": strokeWidth.toString(),
        "data-schematic-port-id": schPort.schematic_port_id
      },
      children: []
    });
  }
  const label = schPort.display_pin_label ?? sourcePort?.name;
  if (label) {
    const labelPos = { ...schPort.center };
    const distanceFromComponentEdge = schPort.distance_from_component_edge ?? 0;
    const labelOffset = 0.05;
    let textAnchor = "middle";
    let rotation = "";
    switch (schPort.facing_direction) {
      case "left":
        labelPos.x += distanceFromComponentEdge / 2;
        labelPos.y += labelOffset;
        textAnchor = "start";
        break;
      case "right":
        labelPos.x -= distanceFromComponentEdge / 2;
        labelPos.y += labelOffset;
        textAnchor = "end";
        break;
      case "up":
        labelPos.y -= distanceFromComponentEdge / 2;
        labelPos.x -= labelOffset;
        textAnchor = "middle";
        break;
      case "down":
        labelPos.y += distanceFromComponentEdge / 2;
        labelPos.x -= labelOffset;
        textAnchor = "middle";
        break;
    }
    const screenLabelPos = applyToPoint71(transform, labelPos);
    const fontSizePx = getSchScreenFontSize(transform, "pin_number");
    if (schPort.facing_direction === "up" || schPort.facing_direction === "down") {
      rotation = `rotate(-90 ${screenLabelPos.x} ${screenLabelPos.y})`;
    }
    svgObjects.push({
      name: "text",
      type: "element",
      value: "",
      attributes: {
        class: "port-indicator-label sch-port-label",
        x: screenLabelPos.x.toString(),
        y: screenLabelPos.y.toString(),
        fill: colorMap2.schematic.component_outline,
        "font-family": "sans-serif",
        "font-size": `${fontSizePx * 0.7}px`,
        "text-anchor": textAnchor,
        "dominant-baseline": "middle",
        ...rotation && { transform: rotation }
      },
      children: [
        {
          type: "text",
          value: label,
          name: "",
          attributes: {},
          children: []
        }
      ]
    });
  }
  return svgObjects;
};

// lib/utils/create-svg-text-parts.ts
var createSvgTextPart = (part) => ({
  type: "element",
  name: "tspan",
  value: "",
  attributes: part.is_overlined ? { "text-decoration": "overline" } : {},
  children: [
    {
      type: "text",
      name: "",
      value: part.text,
      attributes: {},
      children: []
    }
  ]
});
var createSvgTextParts = (parts) => parts.filter((part) => part.text).map(createSvgTextPart);
var createSvgTextPartLines = (parts) => {
  const lines = [[]];
  for (const part of parts) {
    part.text.split("\n").forEach((text, index) => {
      if (index > 0) lines.push([]);
      if (text) lines.at(-1).push(createSvgTextPart({ ...part, text }));
    });
  }
  return lines;
};

// lib/sch/svg-object-fns/create-svg-objects-for-sch-text.ts
import { applyToPoint as applyToPoint72 } from "transformation-matrix";
var createSvgSchText = ({
  elm,
  transform,
  colorMap: colorMap2
}) => {
  const center = applyToPoint72(transform, elm.position);
  const textAnchorMap = {
    center: "middle",
    center_right: "end",
    bottom_left: "start",
    bottom_center: "middle",
    bottom_right: "end",
    left: "start",
    right: "end",
    top: "middle",
    bottom: "middle",
    top_left: "start",
    top_center: "middle",
    top_right: "end",
    center_left: "start"
  };
  const dominantBaselineMap = {
    center: "middle",
    center_right: "middle",
    bottom_left: "ideographic",
    bottom_center: "ideographic",
    bottom_right: "ideographic",
    left: "middle",
    right: "middle",
    top: "hanging",
    bottom: "ideographic",
    top_left: "hanging",
    top_center: "hanging",
    top_right: "hanging",
    center_left: "middle"
  };
  const lines = elm.text.split("\n");
  const styledLines = createSvgTextPartLines(elm.text_parts ?? []);
  const children = lines.length === 1 ? elm.text_parts?.length ? styledLines[0] : [
    {
      type: "text",
      value: elm.text,
      name: elm.schematic_text_id,
      attributes: {},
      children: []
    }
  ] : lines.map((line, idx) => ({
    type: "element",
    name: "tspan",
    value: "",
    attributes: {
      x: center.x.toString(),
      ...idx > 0 ? { dy: "1em" } : {}
    },
    children: elm.text_parts?.length ? styledLines[idx] ?? [] : [
      {
        type: "text",
        value: line,
        name: idx === 0 ? elm.schematic_text_id : "",
        attributes: {},
        children: []
      }
    ]
  }));
  if (elm.display_superscript) {
    const target = lines.length === 1 ? children : children[children.length - 1].children;
    target.push(
      ...createNetLabelTextChildren(
        "",
        elm.display_superscript,
        getSchScreenFontSize(transform, "reference_designator", elm.font_size),
        dominantBaselineMap[elm.anchor]
      ).slice(1)
    );
  }
  return {
    type: "element",
    name: "text",
    value: "",
    attributes: {
      class: "sch-text",
      "data-schematic-text-id": elm.schematic_text_id,
      x: center.x.toString(),
      y: center.y.toString(),
      fill: elm.color ?? colorMap2.schematic.sheet_label,
      "text-anchor": textAnchorMap[elm.anchor],
      "dominant-baseline": dominantBaselineMap[elm.anchor],
      "font-family": "sans-serif",
      "font-size": `${getSchScreenFontSize(transform, "reference_designator", elm.font_size)}px`,
      transform: `rotate(${elm.rotation}, ${center.x}, ${center.y})`
    },
    children
  };
};

// lib/sch/svg-object-fns/create-svg-objects-from-sch-arc.ts
import { applyToPoint as applyToPoint73 } from "transformation-matrix";
function createSvgObjectsFromSchematicArc({
  schArc,
  transform,
  colorMap: colorMap2
}) {
  const center = applyToPoint73(transform, schArc.center);
  const transformedRadius = Math.abs(transform.a) * schArc.radius;
  const strokeWidth = schArc.stroke_width ?? 0.02;
  const transformedStrokeWidth = Math.abs(transform.a) * strokeWidth;
  const startAngleRad = schArc.start_angle_degrees * Math.PI / 180;
  const endAngleRad = schArc.end_angle_degrees * Math.PI / 180;
  const startX = center.x + transformedRadius * Math.cos(startAngleRad);
  const startY = center.y + transformedRadius * Math.sin(startAngleRad);
  const endX = center.x + transformedRadius * Math.cos(endAngleRad);
  const endY = center.y + transformedRadius * Math.sin(endAngleRad);
  let angleDiff = schArc.end_angle_degrees - schArc.start_angle_degrees;
  if (schArc.direction === "clockwise") {
    angleDiff = -angleDiff;
  }
  if (angleDiff < 0) {
    angleDiff += 360;
  }
  const largeArcFlag = angleDiff > 180 ? 1 : 0;
  const sweepFlag = schArc.direction === "clockwise" ? 1 : 0;
  const pathData = `M ${startX} ${startY} A ${transformedRadius} ${transformedRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: "sch-arc",
        d: pathData,
        fill: "none",
        stroke: schArc.color,
        "stroke-width": transformedStrokeWidth.toString(),
        ...schArc.is_dashed && {
          "stroke-dasharray": (transformedStrokeWidth * 3).toString()
        },
        "data-schematic-arc-id": schArc.schematic_arc_id,
        ...schArc.schematic_component_id && {
          "data-schematic-component-id": schArc.schematic_component_id
        }
      },
      children: [],
      value: ""
    }
  ];
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-box.ts
import { applyToPoint as applyToPoint74 } from "transformation-matrix";
var createSvgObjectsFromSchematicBox = ({
  schematicBox,
  transform,
  colorMap: colorMap2
}) => {
  const topLeft = applyToPoint74(transform, {
    x: schematicBox.x,
    y: schematicBox.y
  });
  const bottomRight = applyToPoint74(transform, {
    x: schematicBox.x + schematicBox.width,
    y: schematicBox.y + schematicBox.height
  });
  const yTop = Math.min(topLeft.y, bottomRight.y);
  const yBottom = Math.max(topLeft.y, bottomRight.y);
  const xLeft = Math.min(topLeft.x, bottomRight.x);
  const xRight = Math.max(topLeft.x, bottomRight.x);
  const strokeWidthPx = getSchStrokeSize(transform);
  const attributes = {
    class: "schematic-box sch-box",
    x: xLeft.toString(),
    y: yTop.toString(),
    width: (xRight - xLeft).toString(),
    height: (yBottom - yTop).toString(),
    "stroke-width": `${strokeWidthPx}px`,
    stroke: colorMap2.schematic.component_outline || "black",
    fill: "transparent"
  };
  if (schematicBox.is_dashed) {
    const dashLength = 8 * strokeWidthPx;
    const gapLength = 4 * strokeWidthPx;
    attributes["stroke-dasharray"] = `${dashLength} ${gapLength}`;
  }
  return [
    {
      name: "rect",
      type: "element",
      value: "",
      attributes,
      children: []
    }
  ];
};

// lib/sch/svg-object-fns/create-svg-objects-from-sch-circle.ts
import { applyToPoint as applyToPoint75 } from "transformation-matrix";
function createSvgObjectsFromSchematicCircle({
  schCircle,
  transform,
  colorMap: colorMap2
}) {
  const center = applyToPoint75(transform, schCircle.center);
  const transformedRadius = Math.abs(transform.a) * schCircle.radius;
  const strokeWidth = schCircle.stroke_width ?? 0.02;
  const transformedStrokeWidth = Math.abs(transform.a) * strokeWidth;
  return [
    {
      name: "circle",
      type: "element",
      attributes: {
        class: "sch-circle",
        cx: center.x.toString(),
        cy: center.y.toString(),
        r: transformedRadius.toString(),
        fill: schCircle.is_filled ? schCircle.fill_color ?? schCircle.color : "none",
        stroke: schCircle.color,
        "stroke-width": transformedStrokeWidth.toString(),
        ...schCircle.is_dashed && {
          "stroke-dasharray": (transformedStrokeWidth * 3).toString()
        },
        "data-schematic-circle-id": schCircle.schematic_circle_id,
        ...schCircle.schematic_component_id && {
          "data-schematic-component-id": schCircle.schematic_component_id
        }
      },
      children: [],
      value: ""
    }
  ];
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-component-with-box.ts
import { su as su11 } from "@tscircuit/circuit-json-util";
import "schematic-symbols";
import "svgson";
import { applyToPoint as applyToPoint81 } from "transformation-matrix";

// lib/sch/svg-object-fns/create-svg-objects-from-sch-component-with-symbol.ts
import { su as su8 } from "@tscircuit/circuit-json-util";
import { symbols as symbols3 } from "schematic-symbols";
import "svgson";
import {
  applyToPoint as applyToPoint76,
  compose as compose13
} from "transformation-matrix";

// lib/utils/is-source-port-connected.ts
var isSourcePortConnected = (circuitJson, sourcePortId) => {
  for (const elm of circuitJson) {
    if (elm.type !== "source_trace") continue;
    const trace = elm;
    if (Array.isArray(trace.connected_source_port_ids) && trace.connected_source_port_ids.includes(sourcePortId)) {
      return true;
    }
  }
  return false;
};

// lib/sch/svg-object-fns/create-svg-objects-from-sch-component-with-symbol.ts
var ninePointAnchorToTextAnchor2 = {
  top_left: "start",
  top_right: "end",
  middle_left: "start",
  middle_right: "end",
  bottom_left: "start",
  bottom_right: "end",
  center: "middle",
  middle_top: "middle",
  middle_bottom: "middle"
};
var ninePointAnchorToDominantBaseline2 = {
  top_left: "hanging",
  top_right: "hanging",
  bottom_left: "ideographic",
  bottom_right: "ideographic",
  center: "middle",
  middle_left: "middle",
  middle_right: "middle",
  middle_top: "hanging",
  middle_bottom: "ideographic"
};
var createSvgObjectsFromSchematicComponentWithSymbol = ({
  component: schComponent,
  transform: realToScreenTransform,
  circuitJson,
  colorMap: colorMap2
}) => {
  const svgObjects = [];
  const symbol = symbols3[schComponent.symbol_name];
  if (!symbol) {
    return [
      createSvgSchErrorText({
        text: `Symbol not found: ${schComponent.symbol_name}`,
        realCenter: schComponent.center,
        realToScreenTransform
      })
    ];
  }
  const schPorts = su8(circuitJson).schematic_port.list({
    schematic_component_id: schComponent.schematic_component_id
  });
  const srcComponent = su8(circuitJson).source_component.get(
    schComponent.source_component_id
  );
  const schPortsWithSymbolPorts = matchSchPortsToSymbolPorts({
    schPorts,
    symbol,
    schComponent
  });
  if (!schPortsWithSymbolPorts[0]) {
    return [
      createSvgSchErrorText({
        text: `Could not match ports for symbol ${schComponent.symbol_name}`,
        realCenter: schComponent.center,
        realToScreenTransform
      })
    ];
  }
  const transformFromSymbolToReal = pointPairsToMatrix(
    schPortsWithSymbolPorts[1]?.symbolPort ?? symbol.center,
    schPortsWithSymbolPorts[1]?.schPort.center ?? schComponent.center,
    schPortsWithSymbolPorts[0].symbolPort,
    schPortsWithSymbolPorts[0].schPort.center
  );
  const paths = symbol.primitives.filter((p) => p.type === "path");
  const texts = symbol.primitives.filter((p) => p.type === "text");
  const circles = symbol.primitives.filter((p) => p.type === "circle");
  const boxes = symbol.primitives.filter((p) => p.type === "box");
  const portsWithoutTerminalCircle = /* @__PURE__ */ new Set();
  for (const match of schPortsWithSymbolPorts) {
    if (isSourcePortConnected(circuitJson, match.schPort.source_port_id) || su8(circuitJson).source_port.get(match.schPort.source_port_id)?.do_not_connect) {
      portsWithoutTerminalCircle.add(match.symbolPort);
    }
  }
  const bounds = {
    minX: Math.min(...paths.flatMap((p) => p.points.map((pt) => pt.x))),
    maxX: Math.max(...paths.flatMap((p) => p.points.map((pt) => pt.x))),
    minY: Math.min(...paths.flatMap((p) => p.points.map((pt) => pt.y))),
    maxY: Math.max(...paths.flatMap((p) => p.points.map((pt) => pt.y)))
  };
  const [screenMinX, screenMinY] = applyToPoint76(
    compose13(realToScreenTransform, transformFromSymbolToReal),
    [bounds.minX, bounds.minY]
  );
  const [screenMaxX, screenMaxY] = applyToPoint76(
    compose13(realToScreenTransform, transformFromSymbolToReal),
    [bounds.maxX, bounds.maxY]
  );
  const rectHeight = Math.abs(screenMaxY - screenMinY);
  const rectY = Math.min(screenMinY, screenMaxY);
  const rectWidth = Math.abs(screenMaxX - screenMinX);
  const rectX = Math.min(screenMinX, screenMaxX);
  svgObjects.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "component-overlay sch-component-overlay",
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString(),
      fill: "transparent"
    },
    children: []
  });
  for (const path of paths) {
    const { points, color, closed, fill } = path;
    svgObjects.push({
      type: "element",
      name: "path",
      attributes: {
        class: "sch-component-symbol-path",
        d: points.map((p, i) => {
          const [x, y] = applyToPoint76(
            compose13(realToScreenTransform, transformFromSymbolToReal),
            [p.x, p.y]
          );
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        }).join(" ") + (closed ? " Z" : ""),
        stroke: colorMap2.schematic.component_outline,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
        "stroke-linecap": "round"
      },
      value: "",
      children: []
    });
  }
  for (const text of texts) {
    const screenTextPos = applyToPoint76(
      compose13(realToScreenTransform, transformFromSymbolToReal),
      text
    );
    let textValue = "";
    const isReferenceText = text.text === "{REF}";
    if (isReferenceText) {
      textValue = srcComponent?.display_name ?? srcComponent?.name ?? "";
    } else if (text.text === "{VAL}") {
      textValue = schComponent.symbol_display_value ?? "";
    }
    const dominantBaseline = ninePointAnchorToDominantBaseline2[text.anchor];
    svgObjects.push({
      name: "text",
      type: "element",
      attributes: {
        class: isReferenceText ? "sch-component-name sch-component-text" : "sch-component-text",
        x: screenTextPos.x.toString(),
        y: screenTextPos.y.toString(),
        ...isReferenceText ? {
          stroke: colorMap2.schematic.background,
          "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
          "paint-order": "stroke"
        } : {},
        fill: colorMap2.schematic.label_local,
        "font-family": "sans-serif",
        "text-anchor": ninePointAnchorToTextAnchor2[text.anchor],
        "dominant-baseline": dominantBaseline,
        "font-size": `${getSchScreenFontSize(realToScreenTransform, "reference_designator")}px`
      },
      value: "",
      children: [
        {
          type: "text",
          value: textValue,
          name: "",
          attributes: {},
          children: []
        }
      ]
    });
  }
  for (const box of boxes) {
    const screenBoxPos = applyToPoint76(
      compose13(realToScreenTransform, transformFromSymbolToReal),
      box
    );
    const symbolToScreenScale = compose13(
      realToScreenTransform,
      transformFromSymbolToReal
    ).a;
    svgObjects.push({
      name: "rect",
      type: "element",
      attributes: {
        class: "sch-component-symbol-box",
        x: screenBoxPos.x.toString(),
        y: screenBoxPos.y.toString(),
        width: (box.width * symbolToScreenScale).toString(),
        height: (box.height * symbolToScreenScale).toString(),
        fill: "red"
      },
      value: "",
      children: []
    });
  }
  for (const port of symbol.ports) {
    if (portsWithoutTerminalCircle.has(port)) continue;
    const screenPortPos = applyToPoint76(
      compose13(realToScreenTransform, transformFromSymbolToReal),
      port
    );
    svgObjects.push({
      type: "element",
      name: "circle",
      attributes: {
        class: "component-pin sch-component-pin",
        cx: screenPortPos.x.toString(),
        cy: screenPortPos.y.toString(),
        r: `${Math.abs(realToScreenTransform.a) * 0.02}px`,
        "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
        fill: "none",
        stroke: colorMap2.schematic.component_outline
      },
      value: "",
      children: []
    });
  }
  for (const circle of circles) {
    const screenCirclePos = applyToPoint76(
      compose13(realToScreenTransform, transformFromSymbolToReal),
      circle
    );
    const screenRadius = Math.abs(circle.radius * realToScreenTransform.a);
    svgObjects.push({
      type: "element",
      name: "circle",
      attributes: {
        class: "sch-component-symbol-circle",
        cx: screenCirclePos.x.toString(),
        cy: screenCirclePos.y.toString(),
        r: `${screenRadius}px`,
        "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
        fill: "none",
        stroke: colorMap2.schematic.component_outline
      },
      value: "",
      children: []
    });
  }
  return svgObjects;
};

// lib/sch/svg-object-fns/create-svg-objects-from-sch-port-on-box.ts
import "transformation-matrix";
import "@tscircuit/circuit-json-util";

// lib/sch/svg-object-fns/create-svg-objects-for-sch-port-box-line.ts
import { applyToPoint as applyToPoint77 } from "transformation-matrix";
import { su as su9 } from "@tscircuit/circuit-json-util";
var PIN_CIRCLE_RADIUS_MM3 = 0.02;
var createArrow = (tip, angle, size, color, strokeWidth) => {
  const arrowAngle = Math.PI / 6;
  const p1 = {
    x: tip.x - size * Math.cos(angle - arrowAngle),
    y: tip.y - size * Math.sin(angle - arrowAngle)
  };
  const p2 = {
    x: tip.x - size * Math.cos(angle + arrowAngle),
    y: tip.y - size * Math.sin(angle + arrowAngle)
  };
  return {
    name: "polygon",
    type: "element",
    attributes: {
      points: `${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`,
      fill: "white",
      stroke: color,
      "stroke-width": `${strokeWidth}px`
    },
    value: "",
    children: []
  };
};
var createSvgObjectsForSchPortBoxLine = ({
  schPort,
  schComponent,
  transform,
  circuitJson
}) => {
  const svgObjects = [];
  const srcPort = su9(circuitJson).source_port.get(schPort.source_port_id);
  const realEdgePos = {
    x: schPort.center.x,
    y: schPort.center.y
  };
  const realPinLineLength = schPort.distance_from_component_edge ?? 0.4;
  switch (schPort.side_of_component) {
    case "left":
      realEdgePos.x += realPinLineLength;
      break;
    case "right":
      realEdgePos.x -= realPinLineLength;
      break;
    case "top":
      realEdgePos.y -= realPinLineLength;
      break;
    case "bottom":
      realEdgePos.y += realPinLineLength;
      break;
  }
  const screenSchPortPos = applyToPoint77(transform, schPort.center);
  const screenRealEdgePos = applyToPoint77(transform, realEdgePos);
  const isConnected = srcPort != null && srcPort.source_component_id == null && typeof schPort.is_connected === "boolean" ? schPort.is_connected : isSourcePortConnected(circuitJson, schPort.source_port_id);
  const is_drawn_with_inversion_circle = schPort.is_drawn_with_inversion_circle ?? false;
  const BUBBLE_RADIUS_MM = 0.06;
  const realLineEnd = { ...schPort.center };
  if (!isConnected && !srcPort?.do_not_connect) {
    switch (schPort.side_of_component) {
      case "left":
        realLineEnd.x += PIN_CIRCLE_RADIUS_MM3;
        break;
      case "right":
        realLineEnd.x -= PIN_CIRCLE_RADIUS_MM3;
        break;
      case "top":
        realLineEnd.y -= PIN_CIRCLE_RADIUS_MM3;
        break;
      case "bottom":
        realLineEnd.y += PIN_CIRCLE_RADIUS_MM3;
        break;
    }
  }
  const screenLineEnd = applyToPoint77(transform, realLineEnd);
  if (is_drawn_with_inversion_circle) {
    const bubbleRadiusPx = Math.abs(transform.a) * BUBBLE_RADIUS_MM;
    const bubbleCenter = { ...screenRealEdgePos };
    switch (schPort.side_of_component) {
      case "left":
        bubbleCenter.x -= bubbleRadiusPx;
        screenRealEdgePos.x -= bubbleRadiusPx * 2;
        break;
      case "right":
        bubbleCenter.x += bubbleRadiusPx;
        screenRealEdgePos.x += bubbleRadiusPx * 2;
        break;
      case "top":
        bubbleCenter.y -= bubbleRadiusPx;
        screenRealEdgePos.y -= bubbleRadiusPx * 2;
        break;
      case "bottom":
        bubbleCenter.y += bubbleRadiusPx;
        screenRealEdgePos.y += bubbleRadiusPx * 2;
        break;
    }
    svgObjects.push({
      name: "circle",
      type: "element",
      attributes: {
        class: "component-pin sch-component-pin sch-inversion-bubble",
        cx: bubbleCenter.x.toString(),
        cy: bubbleCenter.y.toString(),
        r: bubbleRadiusPx.toString(),
        fill: "white",
        stroke: colorMap.schematic.component_outline,
        "stroke-width": `${getSchStrokeSize(transform)}px`
      },
      value: "",
      children: []
    });
  }
  svgObjects.push({
    name: "line",
    type: "element",
    attributes: {
      class: "component-pin sch-component-pin sch-port-line",
      x1: screenRealEdgePos.x.toString(),
      y1: screenRealEdgePos.y.toString(),
      x2: screenLineEnd.x.toString(),
      y2: screenLineEnd.y.toString(),
      "stroke-width": `${getSchStrokeSize(transform)}px`
    },
    value: "",
    children: []
  });
  const pinRadiusPx = Math.abs(transform.a) * PIN_CIRCLE_RADIUS_MM3;
  const pinChildren = [];
  if (!isConnected && !srcPort?.do_not_connect) {
    pinChildren.push({
      name: "circle",
      type: "element",
      attributes: {
        class: "component-pin sch-component-pin sch-port-terminal",
        cx: screenSchPortPos.x.toString(),
        cy: screenSchPortPos.y.toString(),
        r: pinRadiusPx.toString(),
        "stroke-width": `${getSchStrokeSize(transform)}px`
      },
      value: "",
      children: []
    });
  }
  pinChildren.push({
    name: "rect",
    type: "element",
    attributes: {
      x: (screenSchPortPos.x - pinRadiusPx).toString(),
      y: (screenSchPortPos.y - pinRadiusPx).toString(),
      width: (pinRadiusPx * 2).toString(),
      height: (pinRadiusPx * 2).toString(),
      opacity: "0"
    },
    value: "",
    children: []
  });
  svgObjects.push({
    name: "g",
    type: "element",
    value: "",
    attributes: {
      class: "sch-port",
      "data-schematic-port-id": schPort.source_port_id
    },
    children: pinChildren
  });
  const { has_input_arrow, has_output_arrow } = schPort;
  if ((has_input_arrow || has_output_arrow) && schPort.side_of_component) {
    const arrowSize = Math.abs(transform.a) * 0.1;
    const arrowColor = colorMap.schematic.component_outline;
    const arrowAxialLength = arrowSize * Math.cos(Math.PI / 6);
    const strokeWidth = getSchStrokeSize(transform) / 3;
    let inputAngleRads = 0;
    let outputAngleRads = 0;
    if (schPort.side_of_component === "left") {
      inputAngleRads = 0;
      outputAngleRads = Math.PI;
    } else if (schPort.side_of_component === "right") {
      inputAngleRads = Math.PI;
      outputAngleRads = 0;
    } else if (schPort.side_of_component === "top") {
      inputAngleRads = Math.PI / 2;
      outputAngleRads = -Math.PI / 2;
    } else if (schPort.side_of_component === "bottom") {
      inputAngleRads = -Math.PI / 2;
      outputAngleRads = Math.PI / 2;
    }
    const both = has_input_arrow && has_output_arrow;
    let inputArrowTip = { ...screenRealEdgePos };
    let outputArrowBase = { ...screenRealEdgePos };
    if (both) {
      const offset = arrowAxialLength;
      if (schPort.side_of_component === "left") {
        outputArrowBase.x -= offset;
      } else if (schPort.side_of_component === "right") {
        outputArrowBase.x += offset;
      } else if (schPort.side_of_component === "top") {
        outputArrowBase.y -= offset;
      } else if (schPort.side_of_component === "bottom") {
        outputArrowBase.y += offset;
      }
    }
    if (has_input_arrow) {
      svgObjects.push(
        createArrow(
          inputArrowTip,
          inputAngleRads,
          arrowSize,
          arrowColor,
          strokeWidth
        )
      );
    }
    if (has_output_arrow) {
      const outputArrowTip = {
        x: outputArrowBase.x + arrowSize * Math.cos(outputAngleRads),
        y: outputArrowBase.y + arrowSize * Math.sin(outputAngleRads)
      };
      svgObjects.push(
        createArrow(
          outputArrowTip,
          outputAngleRads,
          arrowSize,
          arrowColor,
          strokeWidth
        )
      );
    }
  }
  return svgObjects;
};

// lib/sch/svg-object-fns/create-svg-objects-for-sch-port-pin-number-text.ts
import { applyToPoint as applyToPoint78 } from "transformation-matrix";
var createSvgObjectsForSchPortPinNumberText = (params) => {
  const svgObjects = [];
  const { schPort, schComponent, transform, circuitJson } = params;
  const realPinNumberPos = {
    x: schPort.center.x,
    y: schPort.center.y
  };
  if (!schPort.side_of_component) return [];
  const vecToEdge = getUnitVectorFromOutsideToEdge(schPort.side_of_component);
  const realPinEdgeDistance = schPort.distance_from_component_edge ?? 0.4;
  realPinNumberPos.x += vecToEdge.x * realPinEdgeDistance / 2;
  realPinNumberPos.y += vecToEdge.y * realPinEdgeDistance / 2;
  if (schPort.side_of_component === "top" || schPort.side_of_component === "bottom") {
    realPinNumberPos.x -= 0.02;
  } else {
    realPinNumberPos.y += 0.02;
  }
  const screenPinNumberTextPos = applyToPoint78(transform, realPinNumberPos);
  svgObjects.push({
    name: "text",
    type: "element",
    attributes: {
      class: "pin-number sch-pin-number",
      x: screenPinNumberTextPos.x.toString(),
      y: screenPinNumberTextPos.y.toString(),
      style: "font-family: sans-serif;",
      fill: colorMap.schematic.pin_number,
      "text-anchor": "middle",
      "dominant-baseline": "auto",
      "font-size": `${getSchScreenFontSize(transform, "pin_number")}px`,
      transform: schPort.side_of_component === "top" || schPort.side_of_component === "bottom" ? `rotate(-90 ${screenPinNumberTextPos.x} ${screenPinNumberTextPos.y})` : ""
    },
    children: [
      {
        type: "text",
        value: schPort.pin_number?.toString() || "",
        name: "",
        attributes: {},
        children: []
      }
    ],
    value: ""
  });
  return svgObjects;
};

// lib/sch/svg-object-fns/create-svg-objects-for-sch-port-pin-label.ts
import { applyToPoint as applyToPoint79 } from "transformation-matrix";
var LABEL_DIST_FROM_EDGE_MM = 0.1;
var createSvgObjectsForSchPortPinLabel = (params) => {
  const svgObjects = [];
  const {
    schPort,
    schComponent,
    transform,
    labelColor = colorMap.schematic.pin_number,
    labelClassName = "pin-number sch-pin-label"
  } = params;
  const realPinNumberPos = {
    x: schPort.center.x,
    y: schPort.center.y
  };
  if (!schPort.side_of_component) return [];
  const vecToEdge = getUnitVectorFromOutsideToEdge(schPort.side_of_component);
  const realPinEdgeDistance = schPort.distance_from_component_edge ?? 0.4;
  realPinNumberPos.x += vecToEdge.x * (realPinEdgeDistance + LABEL_DIST_FROM_EDGE_MM);
  realPinNumberPos.y += vecToEdge.y * (realPinEdgeDistance + LABEL_DIST_FROM_EDGE_MM);
  const screenPinNumberTextPos = applyToPoint79(transform, realPinNumberPos);
  const label = schPort.display_pin_label ?? schComponent.port_labels?.[`${schPort.pin_number}`];
  if (!label) return [];
  const isNegated = label.startsWith("N_");
  const displayLabel = isNegated ? label.slice(2) : label;
  const textParts = schPort.display_pin_label_text_parts;
  const is_drawn_with_inversion_circle = schPort.is_drawn_with_inversion_circle ?? false;
  const fontSizePx = getSchScreenFontSize(
    transform,
    isNegated || is_drawn_with_inversion_circle ? "negated_pin_number" : "pin_number",
    schPort.display_pin_label_font_size
  );
  svgObjects.push({
    name: "text",
    type: "element",
    attributes: {
      class: labelClassName,
      x: screenPinNumberTextPos.x.toString(),
      y: screenPinNumberTextPos.y.toString(),
      style: `font-family: sans-serif;${isNegated && !textParts?.length ? " text-decoration: overline;" : ""}`,
      fill: labelColor,
      "text-anchor": schPort.side_of_component === "left" || schPort.side_of_component === "bottom" ? "start" : "end",
      "dominant-baseline": "middle",
      "font-size": `${fontSizePx}px`,
      transform: schPort.side_of_component === "top" || schPort.side_of_component === "bottom" ? `rotate(-90 ${screenPinNumberTextPos.x} ${screenPinNumberTextPos.y})` : ""
    },
    children: textParts?.length ? createSvgTextParts(textParts) : [
      {
        type: "text",
        value: displayLabel || "",
        name: "",
        attributes: {},
        children: []
      }
    ],
    value: ""
  });
  return svgObjects;
};

// lib/sch/svg-object-fns/create-svg-objects-from-sch-port-on-box.ts
var createSvgObjectsFromSchPortOnBox = (params) => {
  const svgObjects = [];
  const { schPort, schComponent, transform, circuitJson } = params;
  svgObjects.push(...createSvgObjectsForSchPortBoxLine(params));
  svgObjects.push(...createSvgObjectsForSchPortPinNumberText(params));
  svgObjects.push(...createSvgObjectsForSchPortPinLabel(params));
  return svgObjects;
};

// lib/sch/svg-object-fns/create-svg-objects-from-sch-component-with-box.ts
var createSvgObjectsFromSchematicComponentWithBox = ({
  component: schComponent,
  transform,
  circuitJson,
  colorMap: colorMap2
}) => {
  const svgObjects = [];
  const componentScreenTopLeft = applyToPoint81(transform, {
    x: schComponent.center.x - schComponent.size.width / 2,
    y: schComponent.center.y + schComponent.size.height / 2
  });
  const componentScreenBottomRight = applyToPoint81(transform, {
    x: schComponent.center.x + schComponent.size.width / 2,
    y: schComponent.center.y - schComponent.size.height / 2
  });
  const componentScreenWidth = componentScreenBottomRight.x - componentScreenTopLeft.x;
  const componentScreenHeight = componentScreenBottomRight.y - componentScreenTopLeft.y;
  svgObjects.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "component chip sch-component-body",
      x: componentScreenTopLeft.x.toString(),
      y: componentScreenTopLeft.y.toString(),
      width: componentScreenWidth.toString(),
      height: componentScreenHeight.toString(),
      "stroke-width": `${getSchStrokeSize(transform)}px`,
      fill: colorMap2.schematic.component_body,
      stroke: colorMap2.schematic.component_outline
    },
    children: []
  });
  svgObjects.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "component-overlay sch-component-overlay",
      x: componentScreenTopLeft.x.toString(),
      y: componentScreenTopLeft.y.toString(),
      width: componentScreenWidth.toString(),
      height: componentScreenHeight.toString(),
      fill: "transparent"
    },
    children: []
  });
  const schTexts = su11(circuitJson).schematic_text.list();
  for (const schText of schTexts) {
    if (schText.schematic_component_id === schComponent.schematic_component_id) {
      svgObjects.push(
        createSvgSchText({
          elm: schText,
          transform,
          colorMap: colorMap2
        })
      );
    }
  }
  const schematicPorts = su11(circuitJson).schematic_port.list({
    schematic_component_id: schComponent.schematic_component_id
  });
  for (const schPort of schematicPorts) {
    svgObjects.push(
      ...createSvgObjectsFromSchPortOnBox({
        schPort,
        schComponent,
        transform,
        circuitJson
      })
    );
  }
  return svgObjects;
};

// lib/sch/svg-object-fns/create-svg-objects-from-sch-line.ts
import { applyToPoint as applyToPoint82 } from "transformation-matrix";

// lib/sch/svg-object-fns/get-schematic-stroke-dasharray.ts
function getSchematicStrokeDasharray({
  isDashed,
  dashLength,
  dashGap,
  strokeWidth,
  transform
}) {
  if (!isDashed) return void 0;
  const scale10 = Math.abs(transform.a);
  const defaultDashLength = strokeWidth * scale10 * 3;
  const transformedDashLength = dashLength !== void 0 ? dashLength * scale10 : defaultDashLength;
  const transformedDashGap = dashGap !== void 0 ? dashGap * scale10 : defaultDashLength;
  return `${transformedDashLength} ${transformedDashGap}`;
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-line.ts
function createSvgObjectsFromSchematicLine({
  schLine,
  transform,
  colorMap: colorMap2
}) {
  const p1 = applyToPoint82(transform, { x: schLine.x1, y: schLine.y1 });
  const p2 = applyToPoint82(transform, { x: schLine.x2, y: schLine.y2 });
  const strokeWidth = schLine.stroke_width ?? 0.02;
  const transformedStrokeWidth = Math.abs(transform.a) * strokeWidth;
  const strokeDasharray = getSchematicStrokeDasharray({
    isDashed: schLine.is_dashed,
    dashLength: schLine.dash_length,
    dashGap: schLine.dash_gap,
    strokeWidth,
    transform
  });
  return [
    {
      name: "line",
      type: "element",
      attributes: {
        class: "sch-line",
        x1: p1.x.toString(),
        y1: p1.y.toString(),
        x2: p2.x.toString(),
        y2: p2.y.toString(),
        stroke: schLine.color,
        "stroke-width": transformedStrokeWidth.toString(),
        ...strokeDasharray && {
          "stroke-dasharray": strokeDasharray
        },
        "data-schematic-line-id": schLine.schematic_line_id,
        ...schLine.schematic_component_id && {
          "data-schematic-component-id": schLine.schematic_component_id
        }
      },
      children: [],
      value: ""
    }
  ];
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-rect.ts
import { applyToPoint as applyToPoint83 } from "transformation-matrix";
function createSvgObjectsFromSchematicRect({
  schRect,
  transform,
  colorMap: colorMap2
}) {
  const center = applyToPoint83(transform, schRect.center);
  const transformedWidth = Math.abs(transform.a) * schRect.width;
  const transformedHeight = Math.abs(transform.d) * schRect.height;
  const strokeWidth = schRect.stroke_width ?? 0.02;
  const transformedStrokeWidth = Math.abs(transform.a) * strokeWidth;
  const x = center.x - transformedWidth / 2;
  const y = center.y - transformedHeight / 2;
  const svgRect = {
    name: "rect",
    type: "element",
    attributes: {
      class: "sch-rect",
      x: x.toString(),
      y: y.toString(),
      width: transformedWidth.toString(),
      height: transformedHeight.toString(),
      fill: schRect.is_filled ? schRect.fill_color ?? schRect.color : "none",
      stroke: schRect.color,
      "stroke-width": transformedStrokeWidth.toString(),
      ...schRect.is_dashed && {
        "stroke-dasharray": (transformedStrokeWidth * 3).toString()
      },
      ...schRect.rotation !== 0 && {
        transform: `rotate(${schRect.rotation} ${center.x} ${center.y})`
      },
      "data-schematic-rect-id": schRect.schematic_rect_id,
      ...schRect.schematic_component_id && {
        "data-schematic-component-id": schRect.schematic_component_id
      }
    },
    children: [],
    value: ""
  };
  return [svgRect];
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-path.ts
import { applyToPoint as applyToPoint84 } from "transformation-matrix";
function createSvgObjectsFromSchematicPath({
  schPath,
  transform,
  colorMap: colorMap2
}) {
  const strokeColor = schPath.stroke_color ?? colorMap2.schematic.component_outline;
  const fillColor = schPath.fill_color ?? "none";
  const strokeWidth = schPath.stroke_width ?? 0.02;
  const transformedStrokeWidth = Math.abs(transform.a) * strokeWidth;
  const strokeDasharray = getSchematicStrokeDasharray({
    isDashed: schPath.is_dashed,
    dashLength: schPath.dash_length,
    dashGap: schPath.dash_gap,
    strokeWidth,
    transform
  });
  if (!schPath.points || schPath.points.length < 2) {
    return [];
  }
  const transformedPoints = schPath.points.map(
    (p) => applyToPoint84(transform, { x: p.x, y: p.y })
  );
  const pathD = transformedPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: "sch-path",
        d: pathD,
        stroke: strokeColor,
        "stroke-width": transformedStrokeWidth.toString(),
        fill: schPath.is_filled ? fillColor : "none",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        ...strokeDasharray && {
          "stroke-dasharray": strokeDasharray
        },
        ...schPath.schematic_component_id && {
          "data-schematic-component-id": schPath.schematic_component_id
        }
      },
      children: [],
      value: ""
    }
  ];
}

// lib/sch/svg-object-fns/get-schematic-primitive-paint-order.ts
function getSchematicPrimitivePaintOrder(element) {
  if (element.type === "schematic_rect") return 0;
  if ((element.type === "schematic_circle" || element.type === "schematic_path") && element.is_filled) {
    return 1;
  }
  if (element.type === "schematic_text") return 3;
  return 2;
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-component-with-primitives.ts
var createSvgObjectsFromSchematicComponentWithPrimitives = ({
  component: schComponent,
  transform,
  circuitJson,
  colorMap: colorMap2
}) => {
  const svgObjects = [];
  const compId = schComponent.schematic_component_id;
  const componentElements = circuitJson.filter(
    (element) => "schematic_component_id" in element && element.schematic_component_id === compId
  ).sort(
    (firstElement, secondElement) => getSchematicPrimitivePaintOrder(firstElement) - getSchematicPrimitivePaintOrder(secondElement)
  );
  for (const elm of componentElements) {
    if (elm.type === "schematic_text" && schComponent.is_box_with_pins === false) {
      svgObjects.push(createSvgSchText({ elm, transform, colorMap: colorMap2 }));
    } else if (elm.type === "schematic_line") {
      svgObjects.push(
        ...createSvgObjectsFromSchematicLine({
          schLine: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_circle") {
      svgObjects.push(
        ...createSvgObjectsFromSchematicCircle({
          schCircle: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_rect") {
      svgObjects.push(
        ...createSvgObjectsFromSchematicRect({
          schRect: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_arc") {
      svgObjects.push(
        ...createSvgObjectsFromSchematicArc({
          schArc: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_path") {
      svgObjects.push(
        ...createSvgObjectsFromSchematicPath({
          schPath: elm,
          transform,
          colorMap: colorMap2
        })
      );
    }
  }
  if (schComponent.is_box_with_pins === false) {
    const schLines = circuitJson.filter(
      (elm) => elm.type === "schematic_line" && elm.schematic_component_id === compId
    );
    const schPorts = circuitJson.filter(
      (elm) => elm.type === "schematic_port" && elm.schematic_component_id === compId
    );
    for (const schPort of schPorts) {
      const stem = schLines.find(
        (line) => line.x1 === schPort.center.x && line.y1 === schPort.center.y || line.x2 === schPort.center.x && line.y2 === schPort.center.y
      );
      if (!stem) continue;
      const edge = stem.x1 === schPort.center.x && stem.y1 === schPort.center.y ? { x: stem.x2, y: stem.y2 } : { x: stem.x1, y: stem.y1 };
      const dx = edge.x - schPort.center.x;
      const dy = edge.y - schPort.center.y;
      const side = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "left" : "right" : dy > 0 ? "bottom" : "top";
      const stemLength = Math.max(Math.abs(dx), Math.abs(dy));
      svgObjects.push(
        ...createSvgObjectsForSchPortPinLabel({
          schPort: {
            ...schPort,
            side_of_component: side,
            distance_from_component_edge: stemLength
          },
          schComponent,
          transform,
          circuitJson,
          labelClassName: "port-label sch-pin-label",
          labelColor: colorMap2.schematic.pin_name
        })
      );
    }
  }
  return svgObjects;
};

// lib/sch/svg-object-fns/create-svg-objects-from-sch-component.ts
function createSvgObjectsFromSchematicComponent(params) {
  const { component } = params;
  let boxOrSymbolElements = [];
  if (component.is_box_with_pins !== false) {
    if (component.symbol_name) {
      boxOrSymbolElements = createSvgObjectsFromSchematicComponentWithSymbol(params);
    } else {
      boxOrSymbolElements = createSvgObjectsFromSchematicComponentWithBox(params);
    }
  }
  const primitiveElements = createSvgObjectsFromSchematicComponentWithPrimitives(params);
  const innerElements = [...boxOrSymbolElements, ...primitiveElements];
  return [
    {
      type: "element",
      name: "g",
      attributes: {
        class: "sch-component",
        "data-circuit-json-type": "schematic_component",
        "data-schematic-component-id": component.schematic_component_id,
        ...component.schematic_sheet_id ? { "data-schematic-sheet-id": component.schematic_sheet_id } : {}
      },
      children: innerElements,
      value: ""
    }
  ];
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-debug-object.ts
import { applyToPoint as applyToPoint85 } from "transformation-matrix";
function createSvgObjectsFromSchDebugObject({
  debugObject,
  transform
}) {
  if (debugObject.shape === "rect") {
    let [screenLeft, screenTop] = applyToPoint85(transform, [
      debugObject.center.x - debugObject.size.width / 2,
      debugObject.center.y - debugObject.size.height / 2
    ]);
    let [screenRight, screenBottom] = applyToPoint85(transform, [
      debugObject.center.x + debugObject.size.width / 2,
      debugObject.center.y + debugObject.size.height / 2
    ]);
    [screenTop, screenBottom] = [
      Math.min(screenTop, screenBottom),
      Math.max(screenTop, screenBottom)
    ];
    const width = Math.abs(screenRight - screenLeft);
    const height = Math.abs(screenBottom - screenTop);
    const [screenCenterX, screenCenterY] = applyToPoint85(transform, [
      debugObject.center.x,
      debugObject.center.y
    ]);
    return [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          x: screenLeft.toString(),
          y: screenTop.toString(),
          width: width.toString(),
          height: height.toString(),
          fill: "none",
          stroke: "red",
          "stroke-width": (0.02 * Math.abs(transform.a)).toString(),
          "stroke-dasharray": "5,5"
        },
        children: debugObject.label ? [
          {
            name: "text",
            type: "element",
            value: "",
            attributes: {
              x: screenCenterX.toString(),
              y: (screenCenterY - 10).toString(),
              "text-anchor": "middle",
              "font-size": (0.2 * Math.abs(transform.a)).toString(),
              fill: "red"
            },
            children: [
              {
                type: "text",
                value: debugObject.label,
                name: "",
                attributes: {},
                children: []
              }
            ]
          }
        ] : []
      }
    ];
  }
  if (debugObject.shape === "line") {
    const [screenStartX, screenStartY] = applyToPoint85(transform, [
      debugObject.start.x,
      debugObject.start.y
    ]);
    const [screenEndX, screenEndY] = applyToPoint85(transform, [
      debugObject.end.x,
      debugObject.end.y
    ]);
    const screenMidX = (screenStartX + screenEndX) / 2;
    const screenMidY = (screenStartY + screenEndY) / 2;
    return [
      {
        name: "line",
        type: "element",
        value: "",
        attributes: {
          x1: screenStartX.toString(),
          y1: screenStartY.toString(),
          x2: screenEndX.toString(),
          y2: screenEndY.toString(),
          stroke: "red",
          "stroke-width": (0.02 * Math.abs(transform.a)).toString(),
          "stroke-dasharray": "5,5"
        },
        children: debugObject.label ? [
          {
            name: "text",
            type: "element",
            value: "",
            attributes: {
              x: screenMidX.toString(),
              y: (screenMidY - 10).toString(),
              "text-anchor": "middle",
              "font-size": (0.2 * Math.abs(transform.a)).toString(),
              fill: "red"
            },
            children: [
              {
                type: "text",
                value: debugObject.label,
                name: "",
                attributes: {},
                children: []
              }
            ]
          }
        ] : []
      }
    ];
  }
  return [];
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-sheet.ts
import { applyToPoint as applyToPoint86 } from "transformation-matrix";
var SHEET_STROKE_WIDTH = 0.2 / SCHEMATIC_UNIT_TO_MM;
var SHEET_LABEL_FONT_SIZE = 3 / SCHEMATIC_UNIT_TO_MM;
var SHEET_COLUMNS = ["1", "2", "3", "4", "5", "6"];
var SHEET_ROWS = ["A", "B", "C", "D"];
function createSvgObjectsFromSchematicSheet({
  schematicSheet,
  transform,
  colorMap: colorMap2
}) {
  const layout = getSchematicSheetLayout(schematicSheet);
  const sheetColor = colorMap2.schematic.sheet;
  const labelColor = colorMap2.schematic.net_name;
  const children = [
    createSheetRect({
      id: `${schematicSheet.schematic_sheet_id}_outer`,
      center: layout.center,
      width: layout.width,
      height: layout.height,
      transform,
      color: sheetColor
    }),
    createSheetRect({
      id: `${schematicSheet.schematic_sheet_id}_inner`,
      center: layout.center,
      width: layout.innerMaxX - layout.innerMinX,
      height: layout.innerMaxY - layout.innerMinY,
      transform,
      color: sheetColor
    })
  ];
  for (let i = 1; i < SHEET_COLUMNS.length; i++) {
    const x = layout.innerMinX + (layout.innerMaxX - layout.innerMinX) * i / SHEET_COLUMNS.length;
    children.push(
      createSheetLine({
        id: `${schematicSheet.schematic_sheet_id}_top_column_${i}`,
        x1: x,
        y1: layout.maxY,
        x2: x,
        y2: layout.innerMaxY,
        transform,
        color: sheetColor
      }),
      createSheetLine({
        id: `${schematicSheet.schematic_sheet_id}_bottom_column_${i}`,
        x1: x,
        y1: layout.minY,
        x2: x,
        y2: layout.innerMinY,
        transform,
        color: sheetColor
      })
    );
  }
  for (let i = 1; i < SHEET_ROWS.length; i++) {
    const y = layout.innerMinY + (layout.innerMaxY - layout.innerMinY) * i / SHEET_ROWS.length;
    children.push(
      createSheetLine({
        id: `${schematicSheet.schematic_sheet_id}_left_row_${i}`,
        x1: layout.minX,
        y1: y,
        x2: layout.innerMinX,
        y2: y,
        transform,
        color: sheetColor
      }),
      createSheetLine({
        id: `${schematicSheet.schematic_sheet_id}_right_row_${i}`,
        x1: layout.maxX,
        y1: y,
        x2: layout.innerMaxX,
        y2: y,
        transform,
        color: sheetColor
      })
    );
  }
  SHEET_COLUMNS.forEach((text, i) => {
    const x = layout.innerMinX + (layout.innerMaxX - layout.innerMinX) * (i + 0.5) / SHEET_COLUMNS.length;
    children.push(
      createSheetText({
        text,
        x,
        y: (layout.maxY + layout.innerMaxY) / 2,
        transform,
        color: labelColor
      }),
      createSheetText({
        text,
        x,
        y: (layout.minY + layout.innerMinY) / 2,
        transform,
        color: labelColor
      })
    );
  });
  SHEET_ROWS.forEach((text, i) => {
    const y = layout.innerMinY + (layout.innerMaxY - layout.innerMinY) * (SHEET_ROWS.length - i - 0.5) / SHEET_ROWS.length;
    children.push(
      createSheetText({
        text,
        x: (layout.minX + layout.innerMinX) / 2,
        y,
        transform,
        color: labelColor
      }),
      createSheetText({
        text,
        x: (layout.maxX + layout.innerMaxX) / 2,
        y,
        transform,
        color: labelColor
      })
    );
  });
  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "schematic-sheet",
        "data-circuit-json-type": "schematic_sheet",
        "data-schematic-sheet-id": schematicSheet.schematic_sheet_id
      },
      children
    }
  ];
}
function createSheetRect({
  id,
  center,
  width,
  height,
  transform,
  color
}) {
  const screenCenter = applyToPoint86(transform, center);
  const screenWidth = Math.abs(transform.a) * width;
  const screenHeight = Math.abs(transform.d) * height;
  return {
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "sch-rect",
      x: (screenCenter.x - screenWidth / 2).toString(),
      y: (screenCenter.y - screenHeight / 2).toString(),
      width: screenWidth.toString(),
      height: screenHeight.toString(),
      fill: "none",
      stroke: color,
      "stroke-width": (Math.abs(transform.a) * SHEET_STROKE_WIDTH).toString(),
      "data-schematic-rect-id": id
    },
    children: []
  };
}
function createSheetLine({
  id,
  x1,
  y1,
  x2,
  y2,
  transform,
  color
}) {
  const p1 = applyToPoint86(transform, { x: x1, y: y1 });
  const p2 = applyToPoint86(transform, { x: x2, y: y2 });
  return {
    name: "line",
    type: "element",
    value: "",
    attributes: {
      class: "sch-line",
      x1: p1.x.toString(),
      y1: p1.y.toString(),
      x2: p2.x.toString(),
      y2: p2.y.toString(),
      stroke: color,
      "stroke-width": (Math.abs(transform.a) * SHEET_STROKE_WIDTH).toString(),
      "data-schematic-line-id": id
    },
    children: []
  };
}
function createSheetText({
  text,
  x,
  y,
  transform,
  color
}) {
  const center = applyToPoint86(transform, { x, y });
  return {
    type: "element",
    name: "text",
    value: "",
    attributes: {
      class: "sch-text",
      x: center.x.toString(),
      y: center.y.toString(),
      fill: color,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-family": "sans-serif",
      "font-size": `${getSchScreenFontSize(transform, "reference_designator", SHEET_LABEL_FONT_SIZE)}px`,
      transform: `rotate(0, ${center.x}, ${center.y})`
    },
    children: [
      {
        type: "text",
        value: text,
        name: "",
        attributes: {},
        children: []
      }
    ]
  };
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-table.ts
import { applyToPoint as applyToPoint87 } from "transformation-matrix";
var createSvgObjectsFromSchematicTable = ({
  schematicTable,
  transform,
  colorMap: colorMap2,
  circuitJson
}) => {
  const {
    anchor_position,
    border_width = 0.05,
    anchor = "center"
  } = schematicTable;
  const { column_widths, row_heights } = getTableDimensions(
    schematicTable,
    circuitJson
  );
  const totalWidth = column_widths.reduce((a, b) => a + b, 0);
  const totalHeight = row_heights.reduce((a, b) => a + b, 0);
  let topLeftX = anchor_position.x;
  let topLeftY = anchor_position.y;
  if (anchor.includes("center")) {
    topLeftX -= totalWidth / 2;
  } else if (anchor.includes("right")) {
    topLeftX -= totalWidth;
  }
  if (anchor.includes("center")) {
    topLeftY += totalHeight / 2;
  } else if (anchor.includes("bottom")) {
    topLeftY += totalHeight;
  }
  const svgObjects = [];
  const borderStrokeWidth = border_width * Math.abs(transform.a);
  const gridStrokeWidth = getSchStrokeSize(transform);
  const [screenTopLeftX, screenTopLeftY] = applyToPoint87(transform, [
    topLeftX,
    topLeftY
  ]);
  const [screenBottomRightX, screenBottomRightY] = applyToPoint87(transform, [
    topLeftX + totalWidth,
    topLeftY - totalHeight
  ]);
  svgObjects.push({
    name: "rect",
    type: "element",
    attributes: {
      class: "sch-table-border",
      x: screenTopLeftX.toString(),
      y: screenTopLeftY.toString(),
      width: (screenBottomRightX - screenTopLeftX).toString(),
      height: (screenBottomRightY - screenTopLeftY).toString(),
      fill: "none",
      stroke: colorMap2.schematic.table,
      "stroke-width": borderStrokeWidth.toString()
    },
    children: [],
    value: ""
  });
  const cells = circuitJson.filter(
    (elm) => elm.type === "schematic_table_cell" && elm.schematic_table_id === schematicTable.schematic_table_id
  );
  let currentX = topLeftX;
  for (let i = 0; i < column_widths.length - 1; i++) {
    currentX += column_widths[i];
    let segmentStartY = topLeftY;
    for (let j = 0; j < row_heights.length; j++) {
      const segmentEndY = segmentStartY - row_heights[j];
      const isMerged = cells.some(
        (cell) => cell.start_column_index <= i && cell.end_column_index > i && cell.start_row_index <= j && cell.end_row_index >= j
      );
      if (!isMerged) {
        const start = applyToPoint87(transform, { x: currentX, y: segmentStartY });
        const end = applyToPoint87(transform, { x: currentX, y: segmentEndY });
        svgObjects.push({
          name: "line",
          type: "element",
          attributes: {
            class: "sch-table-grid-line",
            x1: start.x.toString(),
            y1: start.y.toString(),
            x2: end.x.toString(),
            y2: end.y.toString(),
            stroke: colorMap2.schematic.table,
            "stroke-width": gridStrokeWidth.toString()
          },
          children: [],
          value: ""
        });
      }
      segmentStartY = segmentEndY;
    }
  }
  let currentY = topLeftY;
  for (let i = 0; i < row_heights.length - 1; i++) {
    currentY -= row_heights[i];
    let segmentStartX = topLeftX;
    for (let j = 0; j < column_widths.length; j++) {
      const segmentEndX = segmentStartX + column_widths[j];
      const isMerged = cells.some(
        (cell) => cell.start_row_index <= i && cell.end_row_index > i && cell.start_column_index <= j && cell.end_column_index >= j
      );
      if (!isMerged) {
        const start = applyToPoint87(transform, {
          x: segmentStartX,
          y: currentY
        });
        const end = applyToPoint87(transform, { x: segmentEndX, y: currentY });
        svgObjects.push({
          name: "line",
          type: "element",
          attributes: {
            class: "sch-table-grid-line",
            x1: start.x.toString(),
            y1: start.y.toString(),
            x2: end.x.toString(),
            y2: end.y.toString(),
            stroke: colorMap2.schematic.table,
            "stroke-width": gridStrokeWidth.toString()
          },
          children: [],
          value: ""
        });
      }
      segmentStartX = segmentEndX;
    }
  }
  for (const cell of cells) {
    if (cell.text) {
      const cellWidth = column_widths.slice(cell.start_column_index, cell.end_column_index + 1).reduce((a, b) => a + b, 0);
      const cellHeight = row_heights.slice(cell.start_row_index, cell.end_row_index + 1).reduce((a, b) => a + b, 0);
      const cellTopLeftX = topLeftX + column_widths.slice(0, cell.start_column_index).reduce((a, b) => a + b, 0);
      const cellTopLeftY = topLeftY - row_heights.slice(0, cell.start_row_index).reduce((a, b) => a + b, 0);
      const { cell_padding = 0.2 } = schematicTable;
      const horizontal_align = cell.horizontal_align ?? "center";
      const vertical_align = cell.vertical_align ?? "middle";
      let realTextAnchorPos = {
        x: cellTopLeftX + cellWidth / 2,
        y: cellTopLeftY - cellHeight / 2
      };
      if (horizontal_align === "left") {
        realTextAnchorPos.x = cellTopLeftX + cell_padding;
      } else if (horizontal_align === "right") {
        realTextAnchorPos.x = cellTopLeftX + cellWidth - cell_padding;
      }
      if (vertical_align === "top") {
        realTextAnchorPos.y = cellTopLeftY - cell_padding;
      } else if (vertical_align === "bottom") {
        realTextAnchorPos.y = cellTopLeftY - cellHeight + cell_padding;
      }
      const screenTextAnchorPos = applyToPoint87(transform, realTextAnchorPos);
      const fontSize = getSchScreenFontSize(
        transform,
        "reference_designator",
        cell.font_size
      );
      const textAnchorMap = {
        left: "start",
        center: "middle",
        right: "end"
      };
      const dominantBaselineMap = {
        top: "hanging",
        middle: "middle",
        bottom: "ideographic"
      };
      svgObjects.push({
        name: "text",
        type: "element",
        attributes: {
          class: "sch-table-text",
          x: screenTextAnchorPos.x.toString(),
          y: screenTextAnchorPos.y.toString(),
          "font-size": `${fontSize}px`,
          "text-anchor": textAnchorMap[horizontal_align],
          "dominant-baseline": dominantBaselineMap[vertical_align],
          fill: colorMap2.schematic.table,
          "font-family": "sans-serif"
        },
        children: [
          {
            type: "text",
            value: cell.text,
            name: "",
            attributes: {},
            children: []
          }
        ],
        value: ""
      });
    }
  }
  return [
    {
      name: "g",
      type: "element",
      attributes: {
        class: "sch-table",
        "data-schematic-table-id": schematicTable.schematic_table_id
      },
      children: svgObjects,
      value: ""
    }
  ];
};

// lib/sch/svg-object-fns/create-svg-objects-from-sch-trace.ts
import { applyToPoint as applyToPoint88 } from "transformation-matrix";
function createSchematicTrace({
  trace,
  transform,
  colorMap: colorMap2
}) {
  const edges = trace.edges;
  if (edges.length === 0) return [];
  const baseObjects = [];
  const overlayObjects = [];
  let path = "";
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
    const edge = edges[edgeIndex];
    if (edge.is_crossing) continue;
    const [screenFromX, screenFromY] = applyToPoint88(transform, [
      edge.from.x,
      edge.from.y
    ]);
    const [screenToX, screenToY] = applyToPoint88(transform, [
      edge.to.x,
      edge.to.y
    ]);
    if (edgeIndex === 0 || edges[edgeIndex - 1]?.is_crossing) {
      path += `M ${screenFromX} ${screenFromY} L ${screenToX} ${screenToY}`;
    } else {
      path += ` L ${screenToX} ${screenToY}`;
    }
  }
  if (path) {
    baseObjects.push({
      name: "path",
      type: "element",
      attributes: {
        d: path,
        class: "trace-invisible-hover-outline sch-trace-hitbox",
        stroke: colorMap2.schematic.wire,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform) * 8}px`,
        "stroke-linecap": "round",
        opacity: "0",
        "stroke-linejoin": "round"
      },
      value: "",
      children: []
    });
    baseObjects.push({
      name: "path",
      type: "element",
      attributes: {
        class: "sch-trace-path",
        d: path,
        stroke: colorMap2.schematic.wire,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform)}px`,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      },
      value: "",
      children: []
    });
  }
  for (const edge of edges) {
    if (!edge.is_crossing) continue;
    const [screenFromX, screenFromY] = applyToPoint88(transform, [
      edge.from.x,
      edge.from.y
    ]);
    const [screenToX, screenToY] = applyToPoint88(transform, [
      edge.to.x,
      edge.to.y
    ]);
    const midX = (screenFromX + screenToX) / 2;
    const midY = (screenFromY + screenToY) / 2;
    const dx = screenToX - screenFromX;
    const dy = screenToY - screenFromY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const hopHeight = len * 0.7;
    const perpX = -dy / len * hopHeight;
    const perpY = dx / len * hopHeight;
    const controlX = midX + perpX;
    const controlY = midY - Math.abs(perpY);
    overlayObjects.push({
      name: "path",
      type: "element",
      attributes: {
        class: "trace-crossing-outline sch-trace-crossing-outline",
        d: `M ${screenFromX} ${screenFromY} Q ${controlX} ${controlY} ${screenToX} ${screenToY}`,
        stroke: colorMap2.schematic.background,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform) * 1.5}px`,
        "stroke-linecap": "butt"
      },
      value: "",
      children: []
    });
    overlayObjects.push({
      name: "path",
      type: "element",
      attributes: {
        class: "sch-trace-crossing-path",
        d: `M ${screenFromX} ${screenFromY} Q ${controlX} ${controlY} ${screenToX} ${screenToY}`,
        stroke: colorMap2.schematic.wire,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform)}px`,
        "stroke-linecap": "round"
      },
      value: "",
      children: []
    });
  }
  if (trace.junctions) {
    for (const junction of trace.junctions) {
      const [screenX, screenY] = applyToPoint88(transform, [
        junction.x,
        junction.y
      ]);
      overlayObjects.push({
        name: "circle",
        type: "element",
        attributes: {
          cx: screenX.toString(),
          cy: screenY.toString(),
          r: (Math.abs(transform.a) * 0.03).toString(),
          class: "trace-junction sch-trace-junction",
          fill: colorMap2.schematic.junction
        },
        value: "",
        children: []
      });
    }
  }
  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "trace sch-trace",
        "data-layer": "base",
        "data-circuit-json-type": "schematic_trace",
        "data-schematic-trace-id": trace.schematic_trace_id,
        ...trace.subcircuit_connectivity_map_key && {
          "data-subcircuit-connectivity-map-key": trace.subcircuit_connectivity_map_key
        }
      },
      children: baseObjects
    },
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "trace-overlays sch-trace-overlays",
        "data-layer": "overlay",
        "data-circuit-json-type": "schematic_trace",
        "data-schematic-trace-id": trace.schematic_trace_id,
        ...trace.subcircuit_connectivity_map_key && {
          "data-subcircuit-connectivity-map-key": trace.subcircuit_connectivity_map_key
        }
      },
      children: overlayObjects
    }
  ];
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-voltage-probe.ts
import { applyToPoint as applyToPoint89 } from "transformation-matrix";
function createSvgObjectsFromSchVoltageProbe({
  probe,
  transform,
  colorMap: colorMap2,
  fallbackColor
}) {
  const [screenX, screenY] = applyToPoint89(transform, [
    probe.position.x,
    probe.position.y
  ]);
  const probeColor = probe.color ?? fallbackColor ?? colorMap2.schematic.reference;
  const arrowLength = Math.abs(transform.a) * 0.6;
  const arrowWidth = Math.abs(transform.a) * 0.28;
  const labelAlignment = probe.label_alignment ?? "top_right";
  let baseAngleRad;
  let textAnchor;
  let textOffsetX;
  let textOffsetY;
  switch (labelAlignment) {
    case "top_left":
      baseAngleRad = -135 * Math.PI / 180;
      textAnchor = "end";
      textOffsetX = -8;
      textOffsetY = -8;
      break;
    case "top_center":
      baseAngleRad = -90 * Math.PI / 180;
      textAnchor = "middle";
      textOffsetX = 0;
      textOffsetY = -8;
      break;
    case "top_right":
      baseAngleRad = -45 * Math.PI / 180;
      textAnchor = "start";
      textOffsetX = 8;
      textOffsetY = -8;
      break;
    case "center_left":
      baseAngleRad = 180 * Math.PI / 180;
      textAnchor = "end";
      textOffsetX = -8;
      textOffsetY = 0;
      break;
    case "center":
      baseAngleRad = -90 * Math.PI / 180;
      textAnchor = "middle";
      textOffsetX = 0;
      textOffsetY = -8;
      break;
    case "center_right":
      baseAngleRad = 0 * Math.PI / 180;
      textAnchor = "start";
      textOffsetX = 8;
      textOffsetY = 0;
      break;
    case "bottom_left":
      baseAngleRad = 135 * Math.PI / 180;
      textAnchor = "end";
      textOffsetX = -8;
      textOffsetY = 8;
      break;
    case "bottom_center":
      baseAngleRad = 90 * Math.PI / 180;
      textAnchor = "middle";
      textOffsetX = 0;
      textOffsetY = 8;
      break;
    case "bottom_right":
      baseAngleRad = 45 * Math.PI / 180;
      textAnchor = "start";
      textOffsetX = 8;
      textOffsetY = 8;
      break;
    default:
      baseAngleRad = -50 * Math.PI / 180;
      textAnchor = "start";
      textOffsetX = 8;
      textOffsetY = 0;
  }
  const baseX = screenX + arrowLength * Math.cos(baseAngleRad);
  const baseY = screenY + arrowLength * Math.sin(baseAngleRad);
  const tipX = screenX;
  const tipY = screenY;
  const arrowPath = [
    `M ${baseX},${baseY}`,
    `L ${tipX},${tipY}`,
    `M ${tipX},${tipY}`,
    `L ${tipX - arrowWidth * Math.cos((baseAngleRad * 180 / Math.PI + 150) * Math.PI / 180)},${tipY - arrowWidth * Math.sin((baseAngleRad * 180 / Math.PI + 150) * Math.PI / 180)}`,
    `L ${tipX - arrowWidth * Math.cos((baseAngleRad * 180 / Math.PI + 210) * Math.PI / 180)},${tipY - arrowWidth * Math.sin((baseAngleRad * 180 / Math.PI + 210) * Math.PI / 180)}`,
    "Z"
  ].join(" ");
  const x = (baseX + textOffsetX).toString();
  const y = (baseY + textOffsetY).toString();
  const textChildren = [];
  if (probe.name && probe.voltage !== void 0) {
    textChildren.push({
      type: "element",
      name: "tspan",
      value: "",
      attributes: {
        x
      },
      children: [
        {
          type: "text",
          value: probe.name,
          name: "",
          attributes: {},
          children: []
        }
      ]
    });
    textChildren.push({
      type: "element",
      name: "tspan",
      value: "",
      attributes: {
        x,
        dy: "1.2em"
      },
      children: [
        {
          type: "text",
          value: `${probe.voltage}V`,
          name: "",
          attributes: {},
          children: []
        }
      ]
    });
  } else {
    const textParts = [];
    if (probe.name) {
      textParts.push(probe.name);
    }
    if (probe.voltage !== void 0) {
      textParts.push(`${probe.voltage}V`);
    }
    textChildren.push({
      type: "text",
      value: textParts.join(" "),
      name: "",
      attributes: {},
      children: []
    });
  }
  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: "sch-voltage-probe",
        d: arrowPath,
        stroke: probeColor,
        fill: probeColor,
        "stroke-width": `${getSchStrokeSize(transform)}px`
      },
      value: "",
      children: []
    },
    {
      type: "element",
      name: "text",
      value: "",
      attributes: {
        class: "sch-voltage-probe-label",
        x,
        y,
        fill: probeColor,
        "text-anchor": textAnchor,
        "dominant-baseline": "middle",
        "font-family": "sans-serif",
        "font-size": `${getSchScreenFontSize(transform, "reference_designator")}px`,
        "font-weight": "bold",
        "data-schematic-voltage-probe-id": probe.schematic_voltage_probe_id
      },
      children: textChildren
    }
  ];
}

// lib/sch/svg-object-fns/create-svg-objects-from-sch-warning.ts
import { applyToPoint as applyToPoint90 } from "transformation-matrix";
var TARGET_PADDING = 6;
var CALLOUT_GAP = 12;
var VIEWPORT_PADDING = 12;
var CALLOUT_PADDING = 6;
var LINE_HEIGHT2 = 14;
var MESSAGE_FONT_SIZE = 11;
var MAX_CALLOUT_WIDTH = 280;
var MIN_CALLOUT_WIDTH = 140;
var isSchematicWarning = (element) => element.type === "schematic_component_overlap_warning" || element.type === "schematic_component_styling_warning" || element.type === "schematic_element_outside_sheet_warning" || element.type === "schematic_manual_edit_conflict_warning";
function createSvgObjectsFromSchematicWarnings({
  circuitJson,
  transform,
  svgWidth,
  svgHeight,
  colorMap: colorMap2
}) {
  const warningColor = colorMap2.schematic.erc_warning;
  const occupiedCalloutBounds = [];
  return circuitJson.filter(isSchematicWarning).flatMap((warning) => {
    const targetBounds = getWarningTargetBounds(warning, circuitJson, transform);
    if (!targetBounds) return [];
    const availableCalloutWidth = Math.max(1, svgWidth - VIEWPORT_PADDING * 2);
    const messageLines = wrapText(
      warning.message,
      Math.max(
        12,
        Math.floor(
          (Math.min(MAX_CALLOUT_WIDTH, availableCalloutWidth) - CALLOUT_PADDING * 2) / (MESSAGE_FONT_SIZE * 0.56)
        )
      )
    );
    const longestLineLength = Math.max(
      ...messageLines.map((line) => line.length)
    );
    const calloutWidth = Math.min(
      MAX_CALLOUT_WIDTH,
      availableCalloutWidth,
      Math.max(
        Math.min(MIN_CALLOUT_WIDTH, availableCalloutWidth),
        longestLineLength * MESSAGE_FONT_SIZE * 0.56 + CALLOUT_PADDING * 2
      )
    );
    const calloutHeight = CALLOUT_PADDING * 2 + messageLines.length * LINE_HEIGHT2;
    const placement = placeCallout({
      targetBounds,
      calloutWidth,
      calloutHeight,
      svgWidth,
      svgHeight,
      occupiedCalloutBounds
    });
    occupiedCalloutBounds.push(placement);
    const warningId = getWarningId(warning);
    const targetOutline = expandBounds(targetBounds, TARGET_PADDING);
    const leader = getLeaderEndpoints(placement, targetOutline);
    const warningGroup = {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "schematic-warning",
        "data-type": warning.type,
        "data-warning-id": warningId,
        role: "note",
        "aria-label": warning.message
      },
      children: [
        {
          name: "rect",
          type: "element",
          value: "",
          attributes: {
            x: targetOutline.minX.toString(),
            y: targetOutline.minY.toString(),
            width: (targetOutline.maxX - targetOutline.minX).toString(),
            height: (targetOutline.maxY - targetOutline.minY).toString(),
            rx: "6",
            fill: "none",
            stroke: warningColor,
            "stroke-width": "1",
            "stroke-dasharray": "4,3",
            "data-warning-reference": "target"
          },
          children: []
        },
        {
          name: "line",
          type: "element",
          value: "",
          attributes: {
            x1: leader.from.x.toString(),
            y1: leader.from.y.toString(),
            x2: leader.to.x.toString(),
            y2: leader.to.y.toString(),
            stroke: warningColor,
            "stroke-width": "1",
            "data-warning-reference": "leader"
          },
          children: []
        },
        {
          name: "rect",
          type: "element",
          value: "",
          attributes: {
            x: placement.minX.toString(),
            y: placement.minY.toString(),
            width: calloutWidth.toString(),
            height: calloutHeight.toString(),
            fill: "rgba(255, 250, 235, 0.97)",
            stroke: warningColor,
            "stroke-width": "1",
            "data-warning-reference": "callout"
          },
          children: []
        },
        {
          name: "text",
          type: "element",
          value: "",
          attributes: {
            x: (placement.minX + CALLOUT_PADDING).toString(),
            y: (placement.minY + CALLOUT_PADDING + MESSAGE_FONT_SIZE).toString(),
            fill: "#5c4300",
            "font-family": "sans-serif",
            "font-size": MESSAGE_FONT_SIZE.toString()
          },
          children: messageLines.map((line, index) => ({
            name: "tspan",
            type: "element",
            value: "",
            attributes: {
              x: (placement.minX + CALLOUT_PADDING).toString(),
              dy: index === 0 ? "0" : LINE_HEIGHT2.toString()
            },
            children: [createTextNode(line)]
          }))
        }
      ]
    };
    return [warningGroup];
  });
}
function getWarningTargetBounds(warning, circuitJson, transform) {
  const targetIds = getWarningTargetIds(warning);
  const targetBounds = targetIds.map((targetId) => getSchematicElementById(circuitJson, targetId)).filter((element) => Boolean(element)).map((element) => getElementScreenBounds(element, transform)).filter((bounds) => Boolean(bounds));
  if (targetBounds.length === 0) return null;
  return targetBounds.reduce(unionBounds);
}
function getWarningTargetIds(warning) {
  switch (warning.type) {
    case "schematic_component_overlap_warning":
      return warning.schematic_component_ids;
    case "schematic_component_styling_warning":
      return [
        warning.schematic_component_id,
        ...warning.schematic_port_ids ?? []
      ];
    case "schematic_manual_edit_conflict_warning":
      return [warning.schematic_component_id];
    case "schematic_element_outside_sheet_warning":
      return [warning.schematic_element_id];
  }
}
function getSchematicElementById(circuitJson, targetId) {
  return circuitJson.find((element) => {
    if (!element.type.startsWith("schematic_")) return false;
    const idKey = `${element.type}_id`;
    return element[idKey] === targetId;
  });
}
function getElementScreenBounds(element, transform) {
  if (element.type === "schematic_component") {
    const topLeft = applyToPoint90(transform, {
      x: element.center.x - element.size.width / 2,
      y: element.center.y + element.size.height / 2
    });
    const bottomRight = applyToPoint90(transform, {
      x: element.center.x + element.size.width / 2,
      y: element.center.y - element.size.height / 2
    });
    return boundsFromPoints([topLeft, bottomRight]);
  }
  if (element.type === "schematic_port") {
    const center = applyToPoint90(transform, element.center);
    return expandBounds(boundsFromPoints([center]), 4);
  }
  if (element.type === "schematic_net_label") {
    const center = applyToPoint90(
      transform,
      element.anchor_position ?? element.center
    );
    const estimatedWidth = Math.max(28, element.text.length * 8);
    return {
      minX: center.x - estimatedWidth / 2,
      minY: center.y - 10,
      maxX: center.x + estimatedWidth / 2,
      maxY: center.y + 10
    };
  }
  if (element.type === "schematic_trace") {
    const points = element.edges.flatMap((edge) => [
      applyToPoint90(transform, edge.from),
      applyToPoint90(transform, edge.to)
    ]);
    if (points.length === 0) return null;
    return expandBounds(boundsFromPoints(points), 4);
  }
  return null;
}
function placeCallout({
  targetBounds,
  calloutWidth,
  calloutHeight,
  svgWidth,
  svgHeight,
  occupiedCalloutBounds
}) {
  const targetCenterX = (targetBounds.minX + targetBounds.maxX) / 2;
  const targetCenterY = (targetBounds.minY + targetBounds.maxY) / 2;
  const topY = targetBounds.minY - TARGET_PADDING - CALLOUT_GAP - calloutHeight;
  const bottomY = targetBounds.maxY + TARGET_PADDING + CALLOUT_GAP;
  const leftX = targetBounds.minX - TARGET_PADDING - CALLOUT_GAP - calloutWidth;
  const rightX = targetBounds.maxX + TARGET_PADDING + CALLOUT_GAP;
  const candidates = [];
  if (topY >= VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: clamp(
          targetCenterX - calloutWidth / 2,
          VIEWPORT_PADDING,
          svgWidth - VIEWPORT_PADDING - calloutWidth
        ),
        y: topY,
        width: calloutWidth,
        height: calloutHeight,
        side: "top"
      })
    );
  }
  if (bottomY + calloutHeight <= svgHeight - VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: clamp(
          targetCenterX - calloutWidth / 2,
          VIEWPORT_PADDING,
          svgWidth - VIEWPORT_PADDING - calloutWidth
        ),
        y: bottomY,
        width: calloutWidth,
        height: calloutHeight,
        side: "bottom"
      })
    );
  }
  if (rightX + calloutWidth <= svgWidth - VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: rightX,
        y: clamp(
          targetCenterY - calloutHeight / 2,
          VIEWPORT_PADDING,
          svgHeight - VIEWPORT_PADDING - calloutHeight
        ),
        width: calloutWidth,
        height: calloutHeight,
        side: "right"
      })
    );
  }
  if (leftX >= VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: leftX,
        y: clamp(
          targetCenterY - calloutHeight / 2,
          VIEWPORT_PADDING,
          svgHeight - VIEWPORT_PADDING - calloutHeight
        ),
        width: calloutWidth,
        height: calloutHeight,
        side: "left"
      })
    );
  }
  const nonOverlappingCandidate = candidates.find(
    (candidate) => occupiedCalloutBounds.every(
      (occupiedBounds) => !boundsOverlap(expandBounds(candidate, 4), occupiedBounds)
    )
  );
  if (nonOverlappingCandidate) return nonOverlappingCandidate;
  if (candidates[0]) return candidates[0];
  return makePlacement({
    x: clamp(
      targetCenterX - calloutWidth / 2,
      VIEWPORT_PADDING,
      svgWidth - VIEWPORT_PADDING - calloutWidth
    ),
    y: clamp(
      topY,
      VIEWPORT_PADDING,
      svgHeight - VIEWPORT_PADDING - calloutHeight
    ),
    width: calloutWidth,
    height: calloutHeight,
    side: "top"
  });
}
function getLeaderEndpoints(placement, targetBounds) {
  const targetCenterX = (targetBounds.minX + targetBounds.maxX) / 2;
  const targetCenterY = (targetBounds.minY + targetBounds.maxY) / 2;
  const calloutCenterX = (placement.minX + placement.maxX) / 2;
  const calloutCenterY = (placement.minY + placement.maxY) / 2;
  switch (placement.side) {
    case "top":
      return {
        from: { x: calloutCenterX, y: placement.maxY },
        to: { x: targetCenterX, y: targetBounds.minY }
      };
    case "bottom":
      return {
        from: { x: calloutCenterX, y: placement.minY },
        to: { x: targetCenterX, y: targetBounds.maxY }
      };
    case "left":
      return {
        from: { x: placement.maxX, y: calloutCenterY },
        to: { x: targetBounds.minX, y: targetCenterY }
      };
    case "right":
      return {
        from: { x: placement.minX, y: calloutCenterY },
        to: { x: targetBounds.maxX, y: targetCenterY }
      };
  }
}
function getWarningId(warning) {
  switch (warning.type) {
    case "schematic_component_overlap_warning":
      return warning.schematic_component_overlap_warning_id;
    case "schematic_component_styling_warning":
      return warning.schematic_component_styling_warning_id;
    case "schematic_element_outside_sheet_warning":
      return warning.schematic_element_outside_sheet_warning_id;
    case "schematic_manual_edit_conflict_warning":
      return warning.schematic_manual_edit_conflict_warning_id;
  }
}
function wrapText(message, maxCharacters) {
  const words = message.trim().split(/\s+/);
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxCharacters || currentLine.length === 0) {
      currentLine = nextLine;
      continue;
    }
    lines.push(currentLine);
    currentLine = word;
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : ["Warning"];
}
function boundsFromPoints(points) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y))
  };
}
function unionBounds(a, b) {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  };
}
function expandBounds(bounds, amount) {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount
  };
}
function boundsOverlap(a, b) {
  return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);
}
function makePlacement({
  x,
  y,
  width,
  height,
  side
}) {
  return {
    minX: x,
    minY: y,
    maxX: x + width,
    maxY: y + height,
    side
  };
}
function clamp(value, min, max) {
  if (max < min) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}
function createTextNode(value) {
  return {
    name: "",
    type: "text",
    value,
    attributes: {},
    children: []
  };
}

// lib/sch/convert-circuit-json-to-schematic-svg.ts
function convertCircuitJsonToSchematicSvg(circuitJson, options) {
  const schematicSheets = circuitJson.filter(
    (elm) => elm.type === "schematic_sheet"
  );
  const defaultSheet = getDefaultSchematicSheet(schematicSheets);
  let selectedSheet = defaultSheet;
  if (options?.schematicSheetId !== void 0) {
    selectedSheet = schematicSheets.find(
      (sheet) => sheet.schematic_sheet_id === options.schematicSheetId
    ) ?? defaultSheet;
  } else if (options?.schematicSheetIndex !== void 0) {
    selectedSheet = schematicSheets.find(
      (sheet) => sheet.sheet_index === options.schematicSheetIndex
    ) ?? defaultSheet;
  }
  const sheetCircuitJson = selectedSheet ? circuitJson.filter(
    (elm) => !elm.type.startsWith("schematic_") || isSchematicWarning(elm) || "schematic_sheet_id" in elm && elm.schematic_sheet_id === selectedSheet.schematic_sheet_id
  ) : circuitJson;
  const realBounds = getSchematicBoundsFromCircuitJson(
    selectedSheet ? [selectedSheet] : sheetCircuitJson
  );
  const realWidth = realBounds.maxX - realBounds.minX;
  const realHeight = realBounds.maxY - realBounds.minY;
  const svgWidth = options?.width ?? 1200;
  const svgHeight = options?.height ?? 600;
  const colorOverrides = options?.colorOverrides;
  const colorMap2 = {
    ...colorMap,
    schematic: {
      ...colorMap.schematic,
      ...colorOverrides?.schematic ?? {}
    }
  };
  const circuitAspectRatio = realWidth / realHeight;
  const containerAspectRatio = svgWidth / svgHeight;
  let screenPaddingPx;
  if (circuitAspectRatio > containerAspectRatio) {
    const newHeight = svgWidth / circuitAspectRatio;
    screenPaddingPx = {
      x: 0,
      y: (svgHeight - newHeight) / 2
    };
  } else {
    const newWidth = svgHeight * circuitAspectRatio;
    screenPaddingPx = {
      x: (svgWidth - newWidth) / 2,
      y: 0
    };
  }
  const transform = fromTriangles(
    [
      { x: realBounds.minX, y: realBounds.maxY },
      { x: realBounds.maxX, y: realBounds.maxY },
      { x: realBounds.maxX, y: realBounds.minY }
    ],
    [
      { x: screenPaddingPx.x, y: screenPaddingPx.y },
      { x: svgWidth - screenPaddingPx.x, y: screenPaddingPx.y },
      { x: svgWidth - screenPaddingPx.x, y: svgHeight - screenPaddingPx.y }
    ]
  );
  const svgChildren = [];
  svgChildren.push({
    name: "rect",
    type: "element",
    attributes: {
      class: "boundary",
      x: "0",
      y: "0",
      width: svgWidth.toString(),
      height: svgHeight.toString()
    },
    children: [],
    value: ""
  });
  if (options?.grid) {
    const gridConfig = typeof options.grid === "object" ? options.grid : {};
    svgChildren.push(
      drawSchematicGrid({ bounds: realBounds, transform, ...gridConfig })
    );
  }
  const schDebugObjectSvgs = [];
  const schComponentSvgs = [];
  const schTraceSvgs = [];
  const schNetLabel = [];
  const schText = [];
  const voltageProbeSvgs = [];
  const schBoxSvgs = [];
  const schTableSvgs = [];
  const schPortHoverSvgs = [];
  const schPortIndicatorSvgs = [];
  const schLineSvgs = [];
  const schCircleSvgs = [];
  const schRectSvgs = [];
  const schArcSvgs = [];
  const schPathSvgs = [];
  const schSheetSvgs = [];
  const schGraphicSvgs = [];
  const graphicViewport = getSchematicGraphicViewport({
    transform,
    svgWidth,
    svgHeight,
    schematicSheet: selectedSheet
  });
  const simulationPalette = Array.isArray(colorMap2.simulation_palette) ? colorMap2.simulation_palette : Array.isArray(colorMap2.palette) ? colorMap2.palette : [];
  let schematicVoltageProbeIndex = 0;
  for (const elm of sheetCircuitJson) {
    if (elm.type === "schematic_sheet") {
      schSheetSvgs.push(
        ...createSvgObjectsFromSchematicSheet({
          schematicSheet: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_graphic") {
      schGraphicSvgs.push(
        createSvgObjectFromSchematicGraphic({
          schematicGraphic: elm,
          viewport: fitSchematicGraphicViewport({
            availableViewport: graphicViewport,
            schematicGraphic: elm,
            transform
          })
        })
      );
    } else if (elm.type === "schematic_debug_object") {
      schDebugObjectSvgs.push(
        ...createSvgObjectsFromSchDebugObject({
          debugObject: elm,
          transform
        })
      );
    } else if (elm.type === "schematic_component") {
      schComponentSvgs.push(
        ...createSvgObjectsFromSchematicComponent({
          component: elm,
          transform,
          circuitJson: sheetCircuitJson,
          colorMap: colorMap2
        })
      );
      schPortHoverSvgs.push(
        ...createSvgObjectsForSchComponentPortHovers({
          component: elm,
          transform,
          circuitJson: sheetCircuitJson
        })
      );
    } else if (elm.type === "schematic_box") {
      schBoxSvgs.push(
        ...createSvgObjectsFromSchematicBox({
          schematicBox: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_trace") {
      schTraceSvgs.push(
        ...createSchematicTrace({
          trace: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_net_label") {
      schNetLabel.push(
        ...createSvgObjectsForSchNetLabel({
          schNetLabel: elm,
          realToScreenTransform: transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_text" && !elm.schematic_component_id) {
      schText.push(
        createSvgSchText({
          elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_voltage_probe") {
      const fallbackColor = simulationPalette.length > 0 ? simulationPalette[schematicVoltageProbeIndex % simulationPalette.length] : void 0;
      schematicVoltageProbeIndex += 1;
      voltageProbeSvgs.push(
        ...createSvgObjectsFromSchVoltageProbe({
          probe: elm,
          transform,
          colorMap: colorMap2,
          fallbackColor
        })
      );
    } else if (elm.type === "schematic_table") {
      schTableSvgs.push(
        ...createSvgObjectsFromSchematicTable({
          schematicTable: elm,
          transform,
          colorMap: colorMap2,
          circuitJson: sheetCircuitJson
        })
      );
    } else if (elm.type === "schematic_line") {
      if (elm.schematic_component_id) continue;
      schLineSvgs.push(
        ...createSvgObjectsFromSchematicLine({
          schLine: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_circle") {
      if (elm.schematic_component_id) continue;
      schCircleSvgs.push(
        ...createSvgObjectsFromSchematicCircle({
          schCircle: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_rect") {
      if (elm.schematic_component_id) continue;
      schRectSvgs.push(
        ...createSvgObjectsFromSchematicRect({
          schRect: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_arc") {
      if (elm.schematic_component_id) continue;
      schArcSvgs.push(
        ...createSvgObjectsFromSchematicArc({
          schArc: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_path") {
      if (elm.schematic_component_id) continue;
      schPathSvgs.push(
        ...createSvgObjectsFromSchematicPath({
          schPath: elm,
          transform,
          colorMap: colorMap2
        })
      );
    } else if (elm.type === "schematic_port") {
      const sourcePort = sheetCircuitJson.find(
        (source) => source.type === "source_port" && source.source_port_id === elm.source_port_id
      );
      if (sourcePort?.type === "source_port" && sourcePort.do_not_connect === true) {
        schPortIndicatorSvgs.push(
          createSvgObjectForSchPortNoConnect({
            schPort: elm,
            transform,
            colorMap: colorMap2
          })
        );
      }
      if (options?.drawPorts) {
        schPortIndicatorSvgs.push(
          ...createSvgObjectsForSchPortIndicator({
            schPort: elm,
            transform,
            circuitJson: sheetCircuitJson,
            colorMap: colorMap2
          })
        );
      }
    }
  }
  const schTraceBaseSvgs = schTraceSvgs.filter(
    (o) => o.attributes?.["data-layer"] !== "overlay"
  );
  const schTraceOverlaySvgs = schTraceSvgs.filter(
    (o) => o.attributes?.["data-layer"] === "overlay"
  );
  svgChildren.push(
    ...schGraphicSvgs,
    ...schDebugObjectSvgs,
    ...schSheetSvgs,
    ...schTraceBaseSvgs,
    ...schTraceOverlaySvgs,
    ...schLineSvgs,
    ...schCircleSvgs,
    ...schRectSvgs,
    ...schArcSvgs,
    ...schPathSvgs,
    ...schComponentSvgs,
    ...schPortHoverSvgs,
    ...schPortIndicatorSvgs,
    ...schNetLabel,
    ...schText,
    ...schBoxSvgs,
    ...voltageProbeSvgs,
    ...schTableSvgs
  );
  if (options?.labeledPoints) {
    svgChildren.push(
      drawSchematicLabeledPoints({
        points: options.labeledPoints,
        transform
      })
    );
  }
  if (options?.shouldDrawWarnings) {
    svgChildren.push(
      ...createSvgObjectsFromSchematicWarnings({
        circuitJson: sheetCircuitJson,
        transform,
        svgWidth,
        svgHeight,
        colorMap: colorMap2
      })
    );
  }
  const softwareUsedString = getSoftwareUsedString(circuitJson);
  const version = CIRCUIT_TO_SVG_VERSION;
  if (options?.showErrorsInTextOverlay) {
    const errorOverlay = createErrorTextOverlay(circuitJson);
    if (errorOverlay) {
      svgChildren.push(errorOverlay);
    }
  }
  const svgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      class: ["tscircuit-schematic", options?.className].filter(Boolean).join(" "),
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      style: `background-color: ${colorMap2.schematic.background}`,
      "data-real-to-screen-transform": toSVG(transform),
      ...softwareUsedString && {
        "data-software-used-string": softwareUsedString
      },
      ...options?.includeVersion && {
        "data-circuit-to-svg-version": version
      }
    },
    children: [
      // Add styles
      {
        name: "style",
        type: "element",
        children: [
          {
            type: "text",
            // DO NOT USE THESE CLASSES!!!!
            // PUT STYLES IN THE SVG OBJECTS THEMSELVES
            value: `
              .boundary { fill: ${colorMap2.schematic.background}; }
              .schematic-boundary { fill: none; stroke: #fff; }
              .component { fill: none; stroke: ${colorMap2.schematic.component_outline}; }
              .chip { fill: ${colorMap2.schematic.component_body}; stroke: ${colorMap2.schematic.component_outline}; }
              .component-pin { fill: none; stroke: ${colorMap2.schematic.component_outline}; }
              .text { font-family: sans-serif; fill: ${colorMap2.schematic.wire}; }
              .pin-number { fill: ${colorMap2.schematic.pin_number}; }
              .port-label { fill: ${colorMap2.schematic.reference}; }
              .component-name { fill: ${colorMap2.schematic.reference}; }
              ${options?.css ?? ""}
            `,
            name: "",
            attributes: {},
            children: []
          }
        ],
        value: "",
        attributes: {}
      },
      ...svgChildren
    ],
    value: ""
  };
  return stringifySvg(svgObject);
}
var circuitJsonToSchematicSvg = convertCircuitJsonToSchematicSvg;
function getSchematicGraphicViewport({
  transform,
  svgWidth,
  svgHeight,
  schematicSheet
}) {
  if (!schematicSheet) {
    return { x: 0, y: 0, width: svgWidth, height: svgHeight };
  }
  const layout = getSchematicSheetLayout(schematicSheet);
  const topLeft = applyToPoint91(transform, {
    x: layout.innerMinX,
    y: layout.innerMaxY
  });
  const bottomRight = applyToPoint91(transform, {
    x: layout.innerMaxX,
    y: layout.innerMinY
  });
  return {
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
    height: Math.abs(bottomRight.y - topLeft.y)
  };
}
function fitSchematicGraphicViewport({
  availableViewport,
  schematicGraphic,
  transform
}) {
  if (schematicGraphic.width === void 0 && schematicGraphic.height === void 0) {
    return availableViewport;
  }
  const width = schematicGraphic.width === void 0 ? availableViewport.width : clampGraphicDimension(
    schematicGraphic.width * Math.hypot(transform.a, transform.b),
    availableViewport.width
  );
  const height = schematicGraphic.height === void 0 ? availableViewport.height : clampGraphicDimension(
    schematicGraphic.height * Math.hypot(transform.c, transform.d),
    availableViewport.height
  );
  return {
    x: availableViewport.x + (availableViewport.width - width) / 2,
    y: availableViewport.y + (availableViewport.height - height) / 2,
    width,
    height
  };
}
function clampGraphicDimension(requestedPixels, availablePixels) {
  if (!Number.isFinite(requestedPixels)) return availablePixels;
  return Math.max(0, Math.min(requestedPixels, availablePixels));
}

// lib/sch/convert-circuit-json-to-stacked-schematic-sheets-svg.ts
import { parseSync as parseSync3 } from "svgson";
import { applyToPoint as applyToPoint92, fromString } from "transformation-matrix";
var DEFAULT_SHEET_WIDTH = 1e3;
var DEFAULT_LABEL_HEIGHT = 28;
var DEFAULT_GAP = 16;
function convertCircuitJsonToStackedSchematicSheetsSvg(circuitJson, options) {
  const sheets = circuitJson.filter((elm) => elm.type === "schematic_sheet").slice().sort((a, b) => (a.sheet_index ?? 0) - (b.sheet_index ?? 0));
  if (sheets.length <= 1) {
    return convertCircuitJsonToSchematicSvg(circuitJson, options);
  }
  const sheetWidth = options?.width ?? DEFAULT_SHEET_WIDTH;
  const labelHeight = options?.sheetLabelHeight ?? DEFAULT_LABEL_HEIGHT;
  const gap = options?.sheetGap ?? DEFAULT_GAP;
  const colorMap2 = {
    ...colorMap,
    schematic: {
      ...colorMap.schematic,
      ...options?.colorOverrides?.schematic ?? {}
    }
  };
  const children = [];
  let yOffset = 0;
  sheets.forEach((sheet, index) => {
    const sheetLayout = getSchematicSheetLayout(sheet);
    const sheetHeight = options?.height ?? Math.round(sheetWidth * sheetLayout.height / sheetLayout.width);
    const sheetSvg = convertCircuitJsonToSchematicSvg(circuitJson, {
      ...options,
      schematicSheetId: sheet.schematic_sheet_id,
      schematicSheetIndex: void 0,
      width: sheetWidth,
      height: sheetHeight
    });
    const sheetNode = ensureElementNode(parseSync3(sheetSvg));
    const panelTop = yOffset + labelHeight;
    const labelText = sheet.display_name ?? sheet.name ?? `Sheet ${sheet.sheet_index ?? index + 1}`;
    const labelPosition = getSheetLabelPosition({
      transformStr: sheetNode.attributes?.["data-real-to-screen-transform"],
      panelTop,
      labelHeight,
      schematicSheet: sheet
    });
    children.push(
      {
        name: "text",
        type: "element",
        value: "",
        attributes: {
          class: "stacked-sheet-label",
          x: formatNumber(labelPosition.x),
          y: formatNumber(labelPosition.y),
          "font-family": "sans-serif",
          "font-size": `${formatNumber(labelHeight * 0.55)}px`,
          fill: colorMap2.schematic.reference,
          "data-schematic-sheet-id": sheet.schematic_sheet_id
        },
        children: [
          {
            name: "",
            type: "text",
            value: labelText,
            attributes: {},
            children: []
          }
        ]
      },
      translateNestedSvg(sheetNode, 0, panelTop, sheetWidth, sheetHeight)
    );
    yOffset = panelTop + sheetHeight + gap;
  });
  const totalHeight = Math.max(0, yOffset - gap);
  const svgObject = {
    name: "svg",
    type: "element",
    value: "",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      class: "tscircuit-stacked-schematic",
      width: formatNumber(sheetWidth),
      height: formatNumber(totalHeight),
      viewBox: `0 0 ${formatNumber(sheetWidth)} ${formatNumber(totalHeight)}`,
      style: `background-color: ${colorMap2.schematic.background}`
    },
    children: [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          class: "boundary",
          x: "0",
          y: "0",
          width: formatNumber(sheetWidth),
          height: formatNumber(totalHeight),
          fill: colorMap2.schematic.background
        },
        children: []
      },
      ...children
    ]
  };
  return stringifySvg(svgObject);
}
function getSheetLabelPosition({
  transformStr,
  panelTop,
  labelHeight,
  schematicSheet
}) {
  const y = panelTop - labelHeight * 0.28;
  if (!transformStr) {
    return { x: 4, y };
  }
  const layout = getSchematicSheetLayout(schematicSheet);
  const frameLeft = applyToPoint92(fromString(transformStr), {
    x: layout.minX,
    y: layout.maxY
  });
  return { x: Math.max(2, frameLeft.x), y };
}

// lib/convert-circuit-json-to-schematic-simulation-svg.ts
import { parseSync as parseSync4 } from "svgson";

// lib/sim/normalize-simulation-analysis-results.ts
var getResultName = ({
  simulationResult,
  fallbackName
}) => {
  const name = simulationResult.name ?? fallbackName;
  const coordinate = simulationResult.simulation_parameter_sweep_coordinate;
  if (!coordinate) return name;
  return `${name} (${coordinate.parameter_value}${coordinate.parameter_unit})`;
};
var getTransientGraphCoordinates = (horizontalCoordinates) => {
  const firstCoordinate = horizontalCoordinates[0] ?? 0;
  const secondCoordinate = horizontalCoordinates[1];
  return {
    timestamps_ms: horizontalCoordinates,
    start_time_ms: firstCoordinate,
    end_time_ms: horizontalCoordinates.at(-1) ?? 0,
    time_per_step: secondCoordinate === void 0 ? 1 : Math.abs(secondCoordinate - firstCoordinate)
  };
};
var getTransientSimulationResultId = (simulationResult) => simulationResult.type === "simulation_transient_voltage_graph" ? simulationResult.simulation_transient_voltage_graph_id : simulationResult.simulation_transient_current_graph_id;
var getSimulationAnalysisResultId = (simulationResult) => {
  switch (simulationResult.type) {
    case "simulation_transient_voltage_graph":
      return simulationResult.simulation_transient_voltage_graph_id;
    case "simulation_transient_current_graph":
      return simulationResult.simulation_transient_current_graph_id;
    case "simulation_dc_operating_point_voltage":
      return simulationResult.simulation_dc_operating_point_voltage_id;
    case "simulation_dc_operating_point_current":
      return simulationResult.simulation_dc_operating_point_current_id;
    case "simulation_dc_sweep_voltage_graph":
      return simulationResult.simulation_dc_sweep_voltage_graph_id;
    case "simulation_dc_sweep_current_graph":
      return simulationResult.simulation_dc_sweep_current_graph_id;
    case "simulation_ac_sweep_voltage_graph":
      return simulationResult.simulation_ac_sweep_voltage_graph_id;
    case "simulation_ac_sweep_current_graph":
      return simulationResult.simulation_ac_sweep_current_graph_id;
  }
};
var getAnalysisGraphCoordinates = ({
  simulationResult,
  acSweepView,
  usesLogarithmicXValues
}) => {
  switch (simulationResult.type) {
    case "simulation_dc_operating_point_voltage":
      return {
        horizontalCoordinates: [0],
        measuredLevels: [simulationResult.voltage],
        isCurrent: false
      };
    case "simulation_dc_operating_point_current":
      return {
        horizontalCoordinates: [0],
        measuredLevels: [simulationResult.current],
        isCurrent: true
      };
    case "simulation_dc_sweep_voltage_graph":
      return {
        horizontalCoordinates: simulationResult.sweep_values,
        measuredLevels: simulationResult.voltage_levels,
        isCurrent: false
      };
    case "simulation_dc_sweep_current_graph":
      return {
        horizontalCoordinates: simulationResult.sweep_values,
        measuredLevels: simulationResult.current_levels,
        isCurrent: true
      };
    case "simulation_ac_sweep_voltage_graph":
      return {
        horizontalCoordinates: usesLogarithmicXValues ? simulationResult.frequencies_hz.map(Math.log10) : simulationResult.frequencies_hz,
        measuredLevels: simulationResult.complex_voltages.map(
          (sample) => acSweepView === "phase" ? Math.atan2(sample.im, sample.re) * 180 / Math.PI : Math.hypot(sample.re, sample.im)
        ),
        isCurrent: false
      };
    case "simulation_ac_sweep_current_graph":
      return {
        horizontalCoordinates: usesLogarithmicXValues ? simulationResult.frequencies_hz.map(Math.log10) : simulationResult.frequencies_hz,
        measuredLevels: simulationResult.complex_currents.map(
          (sample) => acSweepView === "phase" ? Math.atan2(sample.im, sample.re) * 180 / Math.PI : Math.hypot(sample.re, sample.im)
        ),
        isCurrent: true
      };
  }
};
var normalizeSimulationResult = ({
  simulationResult,
  acSweepView,
  usesLogarithmicXValues
}) => {
  if (simulationResult.type === "simulation_transient_voltage_graph" || simulationResult.type === "simulation_transient_current_graph") {
    if (!simulationResult.simulation_parameter_sweep_coordinate) {
      return simulationResult;
    }
    return {
      ...simulationResult,
      name: getResultName({
        simulationResult,
        fallbackName: simulationResult.name ?? getTransientSimulationResultId(simulationResult)
      })
    };
  }
  const simulationResultId = getSimulationAnalysisResultId(simulationResult);
  const { horizontalCoordinates, measuredLevels, isCurrent } = getAnalysisGraphCoordinates({
    simulationResult,
    acSweepView,
    usesLogarithmicXValues
  });
  const transientGraphFields = {
    simulation_experiment_id: simulationResult.simulation_experiment_id,
    simulation_parameter_sweep_coordinate: simulationResult.simulation_parameter_sweep_coordinate,
    name: getResultName({
      simulationResult,
      fallbackName: simulationResultId
    }),
    color: simulationResult.color,
    ...getTransientGraphCoordinates(horizontalCoordinates)
  };
  if (isCurrent) {
    return {
      type: "simulation_transient_current_graph",
      simulation_transient_current_graph_id: simulationResultId,
      current_levels: measuredLevels,
      ...transientGraphFields
    };
  }
  return {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: simulationResultId,
    voltage_levels: measuredLevels,
    ...transientGraphFields
  };
};
var getXAxisTitle = ({
  simulationResultType,
  experiment
}) => {
  if (simulationResultType?.startsWith("simulation_ac_sweep_")) {
    return "Frequency (Hz)";
  }
  if (simulationResultType?.startsWith("simulation_dc_sweep_")) {
    return experiment?.dc_sweep_unit ? `DC Sweep (${experiment.dc_sweep_unit})` : "DC Sweep";
  }
  if (simulationResultType?.startsWith("simulation_dc_operating_point_")) {
    return "Operating Point";
  }
  return "Time (ms)";
};
var normalizeSimulationAnalysisResults = ({
  results,
  acSweepView,
  experiment
}) => {
  const simulationResultType = results[0]?.type;
  const isAcSweep = simulationResultType?.startsWith("simulation_ac_sweep_") ?? false;
  const usesLogarithmicXValues = isAcSweep && experiment?.ac_sweep_type !== "linear";
  const graphs = results.map(
    (simulationResult) => normalizeSimulationResult({
      simulationResult,
      acSweepView,
      usesLogarithmicXValues
    })
  );
  return {
    graphs,
    xAxisTitle: getXAxisTitle({
      simulationResultType,
      experiment
    }),
    yAxisTitle: isAcSweep && acSweepView === "phase" ? "Phase (deg)" : void 0,
    usesLogarithmicXValues
  };
};

// lib/sim/simulation-graph-svg/simulation-graph-svg-shared.ts
function isUsableScopeTraceDisplay(scopeTraceDisplay) {
  return scopeTraceDisplay?.valuePerDiv !== void 0 && Number.isFinite(scopeTraceDisplay.valuePerDiv) && Math.abs(scopeTraceDisplay.valuePerDiv) > Number.EPSILON;
}
var DEFAULT_WIDTH = 1200;
var DEFAULT_HEIGHT = 600;
var MARGIN = { top: 64, right: 100, bottom: 80, left: 100 };
var SCOPE_LEGEND_GAP = 24;
var SCOPE_AXIS_SPACING = 56;
var SCOPE_AXIS_LABEL_WIDTH = 56;
var SCOPE_AXIS_LABEL_PADDING = 8;
var FALLBACK_LINE_COLOR = "#1f77b4";
function isCurrentGraph(graph) {
  return graph.type === "simulation_transient_current_graph";
}
function getGraphId(graph) {
  return isCurrentGraph(graph) ? graph.simulation_transient_current_graph_id : graph.simulation_transient_voltage_graph_id;
}
function getGraphIdDataAttributeName(graph) {
  return isCurrentGraph(graph) ? "data-simulation-transient-current-graph-id" : "data-simulation-transient-voltage-graph-id";
}
function getGraphLevels(graph) {
  return isCurrentGraph(graph) ? graph.current_levels : graph.voltage_levels;
}
function getYAxisTitle(graphs) {
  const hasCurrentGraphs = graphs.some((entry) => isCurrentGraph(entry.graph));
  const hasVoltageGraphs = graphs.some((entry) => !isCurrentGraph(entry.graph));
  if (hasCurrentGraphs && !hasVoltageGraphs) return "Current (A)";
  if (hasVoltageGraphs && !hasCurrentGraphs) return "Voltage (V)";
  return "Value";
}
function createClipPathId(simulationExperimentId) {
  const sanitized = simulationExperimentId.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `simulation-graph-${sanitized}`;
}
function formatNumber2(value) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Number.parseFloat(value.toFixed(6));
  if (Number.isInteger(rounded)) return rounded.toString();
  return rounded.toString();
}
function svgElement(name, attributes, children = []) {
  return {
    name,
    type: "element",
    value: "",
    attributes,
    children
  };
}
function textNode2(value) {
  return {
    name: "",
    type: "text",
    value,
    attributes: {},
    children: []
  };
}

// lib/sim/simulation-graph-svg/format-value-with-unit.ts
function formatValueWithUnit(value, unit) {
  if (!Number.isFinite(value)) return `0 ${unit}`;
  if (value === 0) return `0 ${unit}`;
  const absValue = Math.abs(value);
  const prefixes = [
    { threshold: 1e6, factor: 1e6, prefix: "M" },
    { threshold: 1e3, factor: 1e3, prefix: "k" },
    { threshold: 1, factor: 1, prefix: "" },
    { threshold: 1e-3, factor: 1e-3, prefix: "m" },
    { threshold: 1e-6, factor: 1e-6, prefix: "\xB5" },
    { threshold: 1e-9, factor: 1e-9, prefix: "n" }
  ];
  const prefix = prefixes.find((candidate) => absValue >= candidate.threshold) ?? prefixes[prefixes.length - 1];
  const scaledValue = value / prefix.factor;
  return `${formatScopeNumber(scaledValue)} ${prefix.prefix}${unit}`;
}
function formatDivs(value) {
  return `${formatScopeNumber(value)} div`;
}
function formatScopeNumber(value) {
  if (!Number.isFinite(value)) return "0";
  const absValue = Math.abs(value);
  const maximumFractionDigits = absValue >= 100 ? 0 : absValue >= 10 ? 1 : absValue >= 1 ? 2 : 3;
  return Number.parseFloat(value.toFixed(maximumFractionDigits)).toString();
}
function formatTickLabel(value, axis) {
  const overriddenLabel = axis.tickLabelOverrides?.get(value);
  if (overriddenLabel !== void 0) return overriddenLabel;
  const { ticks } = axis;
  if (ticks.length <= 1) return formatNumber2(value);
  const span = ticks[ticks.length - 1] - ticks[0];
  if (!Number.isFinite(span) || span === 0) return formatNumber2(value);
  const precision = getTickLabelPrecisionForSpan(span);
  const factor = 10 ** precision;
  const rounded = Math.round(value * factor) / factor;
  const fixed = rounded.toFixed(precision);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}
function getTickLabelPrecisionForSpan(span) {
  if (span >= 100) return 0;
  if (span >= 10) return 1;
  if (span >= 1) return 2;
  return 3;
}

// lib/sim/simulation-graph-svg/create-axes/create-scope-value-axes.ts
function createScopeValueAxes({
  graphs,
  valueAxis,
  scaleY,
  plotLeft,
  plotWidth,
  plotHeight
}) {
  const top = MARGIN.top;
  const bottom = MARGIN.top + plotHeight;
  const left = plotLeft;
  const right = plotLeft + plotWidth;
  const axisElements = [];
  const scopeGraphs = graphs.filter(
    (graph) => isUsableScopeTraceDisplay(graph.scopeTraceDisplay)
  );
  for (const [axisIndex, entry] of scopeGraphs.entries()) {
    const side = axisIndex % 2 === 0 ? "left" : "right";
    const sideIndex = Math.floor(axisIndex / 2);
    const axisX = side === "left" ? left - 10 - sideIndex * SCOPE_AXIS_SPACING : right + 10 + sideIndex * SCOPE_AXIS_SPACING;
    const textX = side === "left" ? axisX - 6 : axisX + 6;
    const textAnchor = side === "left" ? "end" : "start";
    const tickEndX = side === "left" ? axisX + 6 : axisX - 6;
    const traceDisplay = entry.scopeTraceDisplay;
    if (!isUsableScopeTraceDisplay(traceDisplay)) continue;
    axisElements.push(
      svgElement("line", {
        class: "axis axis-y axis-y-scope",
        x1: formatNumber2(axisX),
        y1: formatNumber2(top),
        x2: formatNumber2(axisX),
        y2: formatNumber2(bottom),
        style: `stroke: ${entry.color};`
      }),
      svgElement(
        "text",
        {
          class: "axis-title axis-title-y axis-title-y-scope",
          x: formatNumber2(axisX),
          y: formatNumber2(top - 12),
          "text-anchor": "middle",
          style: `fill: ${entry.color}; font-size: 10px;`
        },
        [textNode2(entry.label)]
      )
    );
    for (const tick of valueAxis.ticks) {
      const tickY = scaleY(tick);
      const rawValue = (traceDisplay.center ?? 0) + (tick - (traceDisplay.offsetDivs ?? 0)) * traceDisplay.valuePerDiv;
      axisElements.push(
        svgElement("line", {
          class: "axis-tick axis-tick-y axis-tick-y-scope",
          x1: formatNumber2(axisX),
          y1: formatNumber2(tickY),
          x2: formatNumber2(tickEndX),
          y2: formatNumber2(tickY),
          style: `stroke: ${entry.color};`
        }),
        svgElement(
          "text",
          {
            class: "axis-label axis-label-y axis-label-y-scope",
            x: formatNumber2(textX),
            y: formatNumber2(tickY),
            "text-anchor": textAnchor,
            "dominant-baseline": "middle",
            style: `fill: ${entry.color}; font-size: 10px;`
          },
          [
            textNode2(
              formatValueWithUnit(
                rawValue,
                isCurrentGraph(entry.graph) ? "A" : "V"
              )
            )
          ]
        )
      );
    }
  }
  return axisElements;
}

// lib/sim/simulation-graph-svg/create-axes.ts
function createAxes({
  timeAxis,
  valueAxis,
  graphs,
  scaleX,
  scaleY,
  plotLeft,
  plotWidth,
  plotHeight,
  yAxisTitle,
  xAxisTitle,
  usesScopeTraceDisplay
}) {
  const bottom = MARGIN.top + plotHeight;
  const left = plotLeft;
  const right = plotLeft + plotWidth;
  const children = [
    svgElement("line", {
      class: "axis axis-x",
      x1: formatNumber2(left),
      y1: formatNumber2(bottom),
      x2: formatNumber2(right),
      y2: formatNumber2(bottom)
    }),
    ...usesScopeTraceDisplay ? [] : [
      svgElement("line", {
        class: "axis axis-y",
        x1: formatNumber2(left),
        y1: formatNumber2(MARGIN.top),
        x2: formatNumber2(left),
        y2: formatNumber2(bottom)
      })
    ]
  ];
  for (const tick of timeAxis.ticks) {
    const x = formatNumber2(scaleX(tick));
    children.push(
      svgElement("line", {
        class: "axis-tick axis-tick-x",
        x1: x,
        y1: formatNumber2(bottom),
        x2: x,
        y2: formatNumber2(bottom + 6)
      }),
      svgElement(
        "text",
        {
          class: "axis-label axis-label-x",
          x,
          y: formatNumber2(bottom + 22),
          "text-anchor": "middle"
        },
        [textNode2(formatTickLabel(tick, timeAxis))]
      )
    );
  }
  if (usesScopeTraceDisplay) {
    children.push(
      ...createScopeValueAxes({
        graphs,
        valueAxis,
        scaleY,
        plotLeft,
        plotWidth,
        plotHeight
      })
    );
  } else {
    for (const tick of valueAxis.ticks) {
      const y = formatNumber2(scaleY(tick));
      children.push(
        svgElement("line", {
          class: "axis-tick axis-tick-y",
          x1: formatNumber2(left - 6),
          y1: y,
          x2: formatNumber2(left),
          y2: y
        }),
        svgElement(
          "text",
          {
            class: "axis-label axis-label-y",
            x: formatNumber2(left - 10),
            y,
            "text-anchor": "end",
            "dominant-baseline": "middle"
          },
          [textNode2(formatTickLabel(tick, valueAxis))]
        )
      );
    }
    children.push(
      svgElement(
        "text",
        {
          class: "axis-title axis-title-y",
          x: formatNumber2(left - 64),
          y: formatNumber2(MARGIN.top + plotHeight / 2),
          transform: `rotate(-90 ${formatNumber2(left - 64)} ${formatNumber2(
            MARGIN.top + plotHeight / 2
          )})`,
          "text-anchor": "middle"
        },
        [textNode2(yAxisTitle)]
      )
    );
  }
  children.push(
    svgElement(
      "text",
      {
        class: "axis-title axis-title-x",
        x: formatNumber2(left + plotWidth / 2),
        y: formatNumber2(bottom + 48),
        "text-anchor": "middle"
      },
      [textNode2(xAxisTitle)]
    )
  );
  return svgElement("g", { class: "axes" }, children);
}

// lib/sim/simulation-graph-svg/create-axes/build-axis-info.ts
function buildAxisInfo(values, applyPadding = false) {
  if (values.length === 0) {
    return {
      domainMin: 0,
      domainMax: 1,
      ticks: [0, 1]
    };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const offset = min === 0 ? 1 : Math.abs(min) * 0.1 || 1;
    return {
      domainMin: min - offset,
      domainMax: min + offset,
      ticks: [min - offset, min, min + offset]
    };
  }
  const ticks = generateTickValues(min, max);
  const safeTicks = ticks.length > 0 ? [...ticks] : [min, max];
  let domainMin = safeTicks[0];
  let domainMax = safeTicks[safeTicks.length - 1];
  if (applyPadding && safeTicks.length > 1) {
    const tickStep = Math.abs(safeTicks[1] - safeTicks[0]);
    const paddingToleranceRatio = 0.1;
    if (min < domainMin + tickStep * paddingToleranceRatio) {
      domainMin -= tickStep;
      safeTicks.unshift(domainMin);
    }
    if (max > domainMax - tickStep * paddingToleranceRatio) {
      domainMax += tickStep;
      safeTicks.push(domainMax);
    }
  }
  return { domainMin, domainMax, ticks: safeTicks };
}
function buildTimeAxisInfo({
  values,
  graphs,
  experiment
}) {
  const experimentStartTimeMs = getFiniteNumber(
    experiment?.start_time_ms
  );
  const experimentEndTimeMs = getFiniteNumber(
    experiment?.end_time_ms
  );
  const startTimes = graphs.map((graph) => getFiniteNumber(graph.start_time_ms)).filter((value) => value !== void 0);
  const endTimes = graphs.map((graph) => getFiniteNumber(graph.end_time_ms)).filter((value) => value !== void 0);
  const domainMin = experimentStartTimeMs ?? (startTimes.length > 0 ? Math.min(...startTimes) : void 0);
  const domainMax = experimentEndTimeMs ?? (endTimes.length > 0 ? Math.max(...endTimes) : void 0);
  if (domainMin === void 0 || domainMax === void 0 || domainMin === domainMax) {
    return buildAxisInfo(values);
  }
  const min = Math.min(domainMin, domainMax);
  const max = Math.max(domainMin, domainMax);
  const span = max - min;
  const minimumEndpointTickDistance = span * 0.12;
  const interiorTicks = generateTickValues(min, max).filter(
    (tick) => tick > min + minimumEndpointTickDistance && tick < max - minimumEndpointTickDistance
  );
  const ticks = sortAndDedupeApproximateNumbers([min, ...interiorTicks, max]);
  return {
    domainMin: min,
    domainMax: max,
    ticks,
    tickLabelOverrides: /* @__PURE__ */ new Map([
      [min, formatNumber2(min)],
      [max, formatNumber2(max)]
    ])
  };
}
function getFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function sortAndDedupeApproximateNumbers(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const deduped = [];
  for (const value of sorted) {
    const previous = deduped[deduped.length - 1];
    if (previous === void 0 || Math.abs(value - previous) > 1e-12) {
      deduped.push(value);
    }
  }
  return deduped;
}
function generateTickValues(min, max, desired = 6) {
  const span = max - min;
  if (!Number.isFinite(span) || span <= Number.EPSILON) {
    return [min, max];
  }
  const step = niceStep(span / Math.max(1, desired - 1));
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const values = [];
  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    values.push(Number.parseFloat(value.toPrecision(12)));
  }
  return values;
}
function niceStep(step) {
  if (!Number.isFinite(step) || step <= 0) return 1;
  const exponent = Math.floor(Math.log10(step));
  const fraction = step / 10 ** exponent;
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * 10 ** exponent;
}

// lib/sim/simulation-graph-svg/create-axes/create-background-rect.ts
function createBackgroundRect(width, height) {
  return svgElement("rect", {
    class: "background",
    x: "0",
    y: "0",
    width: formatNumber2(width),
    height: formatNumber2(height)
  });
}

// lib/sim/simulation-graph-svg/create-axes/create-defs-node.ts
function createDefsNode(clipPathId, plotLeft, plotWidth, plotHeight) {
  return svgElement("defs", {}, [
    svgElement("clipPath", { id: clipPathId }, [
      svgElement("rect", {
        x: formatNumber2(plotLeft),
        y: formatNumber2(MARGIN.top),
        width: formatNumber2(plotWidth),
        height: formatNumber2(plotHeight)
      })
    ])
  ]);
}

// lib/sim/simulation-graph-svg/create-axes/create-grid-lines.ts
function createGridLines({
  timeAxis,
  valueAxis,
  scaleX,
  scaleY,
  plotLeft,
  plotWidth,
  plotHeight
}) {
  const top = MARGIN.top;
  const bottom = MARGIN.top + plotHeight;
  const left = plotLeft;
  const right = plotLeft + plotWidth;
  const children = [];
  for (const tick of timeAxis.ticks) {
    const x = formatNumber2(scaleX(tick));
    children.push(
      svgElement("line", {
        class: "grid-line grid-line-x",
        x1: x,
        y1: formatNumber2(top),
        x2: x,
        y2: formatNumber2(bottom)
      })
    );
  }
  for (const tick of valueAxis.ticks) {
    const y = formatNumber2(scaleY(tick));
    children.push(
      svgElement("line", {
        class: "grid-line grid-line-y",
        x1: formatNumber2(left),
        y1: y,
        x2: formatNumber2(right),
        y2: y
      })
    );
  }
  return svgElement("g", { class: "grid" }, children);
}

// lib/sim/simulation-graph-svg/create-axes/create-linear-scale.ts
function createLinearScale(domainMin, domainMax, rangeMin, rangeMax) {
  if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax)) {
    const midpoint2 = (rangeMin + rangeMax) / 2;
    return () => midpoint2;
  }
  const span = domainMax - domainMin;
  if (Math.abs(span) < Number.EPSILON) {
    const midpoint2 = (rangeMin + rangeMax) / 2;
    return () => midpoint2;
  }
  return (value) => rangeMin + (value - domainMin) / span * (rangeMax - rangeMin);
}

// lib/sim/simulation-graph-svg/create-axes/create-plot-background.ts
function createPlotBackground(plotLeft, plotWidth, plotHeight) {
  return svgElement("rect", {
    class: "plot-background",
    x: formatNumber2(plotLeft),
    y: formatNumber2(MARGIN.top),
    width: formatNumber2(plotWidth),
    height: formatNumber2(plotHeight)
  });
}

// lib/sim/simulation-graph-svg/create-axes/create-style-node.ts
function createStyleNode() {
  const content = `
:root { color-scheme: light; }
svg { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }
.background { fill: ${colorMap.schematic.background}; }
.plot-background { fill: #ffffff; }
.grid-line { stroke: rgba(0, 0, 0, 0.08); stroke-width: 1; }
.axis { stroke: rgba(0, 0, 0, 0.6); stroke-width: 1.5; }
.axis-tick { stroke: rgba(0, 0, 0, 0.6); stroke-width: 1; }
.axis-label { fill: rgba(0, 0, 0, 0.75); font-size: 12px; }
.axis-title { fill: rgba(0, 0, 0, 0.9); font-size: 14px; font-weight: 600; }
.legend-label { fill: rgba(0, 0, 0, 0.75); font-size: 11px; }
.legend-line { stroke-width: 3; }
.scope-channel-card { fill: #ffffff; stroke: rgba(0, 0, 0, 0.22); stroke-width: 1; }
.scope-channel-header-text { fill: #ffffff; font-size: 14px; font-weight: 700; }
.scope-channel-detail { fill: rgba(0, 0, 0, 0.42); font-size: 14px; }
.simulation-line { fill: none; stroke-width: 2.5; }
.simulation-point { stroke-width: 0; }
.chart-title { fill: rgba(0, 0, 0, 0.85); font-size: 18px; font-weight: 600; }
`;
  return svgElement("style", {}, [textNode2(content)]);
}

// lib/sim/simulation-graph-svg/create-data-group.ts
function getStringProperty(value, key) {
  const propertyValue = value[key];
  if (typeof propertyValue !== "string") return void 0;
  return propertyValue;
}
function createDataGroup(graphs, clipPathId, scaleX, scaleY) {
  const LINE_REPEAT_COUNT = 3;
  const DASH_PATTERN = [4, 8];
  const dashArrayString = DASH_PATTERN.map((value) => formatNumber2(value)).join(
    " "
  );
  const dashCycleLength = DASH_PATTERN.reduce((sum, value) => sum + value, 0);
  const dashOffsetStep = dashCycleLength / LINE_REPEAT_COUNT;
  const processedGraphs = [];
  graphs.forEach((entry, graphIndex) => {
    if (entry.points.length === 0) return;
    const commands = [];
    entry.points.forEach((point, index) => {
      const x = formatNumber2(scaleX(point.timeMs));
      const y = formatNumber2(scaleY(point.displayValue));
      commands.push(`${index === 0 ? "M" : "L"} ${x} ${y}`);
    });
    const baseAttributes = {
      class: "simulation-line",
      d: commands.join(" "),
      stroke: entry.color,
      "clip-path": `url(#${clipPathId})`,
      [getGraphIdDataAttributeName(entry.graph)]: getGraphId(entry.graph)
    };
    if (entry.graph.source_component_id) {
      baseAttributes["data-source-component-id"] = entry.graph.source_component_id;
    }
    const sourceProbeId = getStringProperty(entry.graph, "source_probe_id");
    if (sourceProbeId) {
      baseAttributes["data-source-probe-id"] = sourceProbeId;
    }
    const sourceProbeName = getStringProperty(entry.graph, "source_probe_name");
    if (sourceProbeName) {
      baseAttributes["data-source-probe-name"] = sourceProbeName;
    }
    if (entry.graph.subcircuit_connectivity_map_key) {
      baseAttributes["data-subcircuit-connectivity-map-key"] = entry.graph.subcircuit_connectivity_map_key;
    }
    const pointElements2 = entry.points.map((point) => {
      const cx = formatNumber2(scaleX(point.timeMs));
      const cy = formatNumber2(scaleY(point.displayValue));
      return svgElement("circle", {
        class: "simulation-point",
        cx,
        cy,
        r: "2.5",
        fill: entry.color,
        "clip-path": `url(#${clipPathId})`
      });
    });
    processedGraphs.push({
      entry,
      graphIndex,
      pathAttributes: baseAttributes,
      pointElements: pointElements2
    });
  });
  const lineElements = [];
  for (let cycle = 0; cycle < LINE_REPEAT_COUNT; cycle++) {
    for (const graphInfo of processedGraphs) {
      const offsetIndex = (graphInfo.graphIndex + cycle) % LINE_REPEAT_COUNT;
      const dashOffset = formatNumber2(offsetIndex * dashOffsetStep);
      lineElements.push(
        svgElement("path", {
          ...graphInfo.pathAttributes,
          "stroke-dasharray": dashArrayString,
          "stroke-dashoffset": dashOffset
        })
      );
    }
  }
  const pointElements = processedGraphs.flatMap(
    (graphInfo) => graphInfo.pointElements
  );
  return svgElement("g", { class: "data-series" }, [
    ...lineElements,
    ...pointElements
  ]);
}
function createTitleNode(experiment, width) {
  if (!experiment?.name) return null;
  return svgElement(
    "text",
    {
      class: "chart-title",
      x: formatNumber2(width / 2),
      y: formatNumber2(MARGIN.top - 40),
      "text-anchor": "middle"
    },
    [textNode2(experiment.name)]
  );
}

// lib/sim/simulation-graph-svg/create-legend/create-legend-item.ts
var LEGEND_LINE_HEIGHT = 16;
function createLegendItem(entry, x, y, lines) {
  const textChildren = lines.map((line, index) => {
    return svgElement(
      "tspan",
      {
        x: "20",
        dy: index === 0 ? "0" : String(LEGEND_LINE_HEIGHT)
      },
      [textNode2(line)]
    );
  });
  return svgElement(
    "g",
    {
      class: "legend-item",
      transform: `translate(${formatNumber2(x)} ${formatNumber2(y)})`
    },
    [
      svgElement("line", {
        class: "legend-line",
        x1: "0",
        y1: "0",
        x2: "16",
        y2: "0",
        stroke: entry.color
      }),
      svgElement(
        "text",
        {
          class: "legend-label",
          x: "20",
          y: "0",
          "dominant-baseline": "middle"
        },
        textChildren
      )
    ]
  );
}

// lib/sim/simulation-graph-svg/create-legend/wrap-legend-text.ts
var MAX_LEGEND_LINE_LENGTH = 15;
function wrapLegendText(label) {
  const parts = label.split("_");
  if (parts.length <= 1) {
    return [label];
  }
  const lines = [];
  let currentLine = parts[0] ?? "";
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i] ?? "";
    const testLine = `${currentLine}_${part}`;
    if (testLine.length > MAX_LEGEND_LINE_LENGTH) {
      lines.push(currentLine);
      currentLine = part;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// lib/sim/simulation-graph-svg/create-legend.ts
var LEGEND_MIN_SPACING = 24;
function createLegend(graphs, width) {
  let currentY = MARGIN.top;
  const children = graphs.map((entry) => {
    const x = width - MARGIN.right + 10;
    const lines = wrapLegendText(entry.label);
    const legendItem = createLegendItem(entry, x, currentY, lines);
    const itemHeight = lines.length * LEGEND_LINE_HEIGHT;
    currentY += Math.max(itemHeight, LEGEND_MIN_SPACING);
    return legendItem;
  });
  return svgElement("g", { class: "legend" }, children);
}

// lib/sim/simulation-graph-svg/create-legend/get-scope-legend-grid-layout.ts
var SCOPE_LEGEND_CARD_WIDTH = 118;
var SCOPE_LEGEND_CARD_HEIGHT = 94;
var SCOPE_LEGEND_CARD_GAP = 18;
function getScopeLegendGridLayout(graphCount, containerWidth) {
  const columnsThatFit = Math.floor(
    (containerWidth + SCOPE_LEGEND_CARD_GAP) / (SCOPE_LEGEND_CARD_WIDTH + SCOPE_LEGEND_CARD_GAP)
  );
  const columns = Math.max(1, Math.min(columnsThatFit, graphCount));
  const rows = Math.max(1, Math.ceil(graphCount / columns));
  const width = columns * SCOPE_LEGEND_CARD_WIDTH + (columns - 1) * SCOPE_LEGEND_CARD_GAP;
  const height = rows * SCOPE_LEGEND_CARD_HEIGHT + (rows - 1) * SCOPE_LEGEND_CARD_GAP;
  return {
    columns,
    rows,
    x: Math.max(0, (containerWidth - width) / 2),
    height
  };
}

// lib/sim/simulation-graph-svg/create-legend/create-scope-legend.ts
var SCOPE_LEGEND_HEADER_HEIGHT = 20;
var SCOPE_LEGEND_BODY_PADDING = 8;
var SCOPE_LEGEND_BODY_FONT_SIZE = 14;
function createScopeLegend(graphs, graphWidth, graphHeight) {
  const layout = getScopeLegendGridLayout(graphs.length, graphWidth);
  const children = [];
  for (const [index, entry] of graphs.entries()) {
    const column = index % layout.columns;
    const row = Math.floor(index / layout.columns);
    children.push(
      createScopeLegendCard(
        entry,
        index,
        layout.x + column * (SCOPE_LEGEND_CARD_WIDTH + SCOPE_LEGEND_CARD_GAP),
        graphHeight + SCOPE_LEGEND_GAP + row * (SCOPE_LEGEND_CARD_HEIGHT + SCOPE_LEGEND_CARD_GAP)
      )
    );
  }
  return svgElement("g", { class: "scope-legend" }, children);
}
function createScopeLegendCard(entry, index, x, y) {
  const scopeTraceDisplay = entry.scopeTraceDisplay;
  const unit = isCurrentGraph(entry.graph) ? "A" : "V";
  const unitsPerDiv = scopeTraceDisplay && isUsableScopeTraceDisplay(scopeTraceDisplay) ? formatValueWithUnit(scopeTraceDisplay.valuePerDiv, unit) : `1 ${unit}`;
  const center = formatValueWithUnit(scopeTraceDisplay?.center ?? 0, unit);
  const offsetDivs = formatDivs(scopeTraceDisplay?.offsetDivs ?? 0);
  const channelName = `Ch${index + 1}`;
  const label = entry.label === channelName ? void 0 : entry.label;
  const bodyLines = [label, `${unitsPerDiv}/div`, offsetDivs, center].filter(
    (line) => Boolean(line)
  );
  const bodyLineSpacing = bodyLines.length > 1 ? (SCOPE_LEGEND_CARD_HEIGHT - SCOPE_LEGEND_HEADER_HEIGHT - SCOPE_LEGEND_BODY_PADDING * 2 - SCOPE_LEGEND_BODY_FONT_SIZE) / (bodyLines.length - 1) : 0;
  return svgElement(
    "g",
    {
      class: "scope-channel",
      transform: `translate(${formatNumber2(x)} ${formatNumber2(y)})`,
      [getGraphIdDataAttributeName(entry.graph)]: getGraphId(entry.graph)
    },
    [
      svgElement("rect", {
        class: "scope-channel-card",
        x: "0",
        y: "0",
        width: formatNumber2(SCOPE_LEGEND_CARD_WIDTH),
        height: formatNumber2(SCOPE_LEGEND_CARD_HEIGHT),
        rx: "6",
        ry: "6"
      }),
      svgElement("rect", {
        x: "0",
        y: "0",
        width: formatNumber2(SCOPE_LEGEND_CARD_WIDTH),
        height: formatNumber2(SCOPE_LEGEND_HEADER_HEIGHT),
        rx: "6",
        ry: "6",
        fill: entry.color
      }),
      svgElement("rect", {
        x: "0",
        y: formatNumber2(SCOPE_LEGEND_HEADER_HEIGHT - 6),
        width: formatNumber2(SCOPE_LEGEND_CARD_WIDTH),
        height: "6",
        fill: entry.color
      }),
      svgElement(
        "text",
        {
          class: "scope-channel-header-text",
          x: formatNumber2(SCOPE_LEGEND_CARD_WIDTH / 2),
          y: "14",
          "text-anchor": "middle"
        },
        [textNode2(channelName)]
      ),
      ...bodyLines.map(
        (line, lineIndex) => svgElement(
          "text",
          {
            class: "scope-channel-detail",
            x: formatNumber2(SCOPE_LEGEND_BODY_PADDING),
            y: formatNumber2(
              SCOPE_LEGEND_HEADER_HEIGHT + SCOPE_LEGEND_BODY_PADDING + lineIndex * bodyLineSpacing
            ),
            "dominant-baseline": "hanging"
          },
          [textNode2(line)]
        )
      )
    ]
  );
}

// lib/sim/simulation-graph-svg/create-legend/get-scope-axis-gutters.ts
function getScopeAxisGutters(graphCount) {
  const leftAxisCount = Math.ceil(graphCount / 2);
  const rightAxisCount = Math.floor(graphCount / 2);
  return {
    left: getScopeAxisGutter(leftAxisCount),
    right: getScopeAxisGutter(rightAxisCount)
  };
}
function getScopeAxisGutter(axisCount) {
  if (axisCount <= 1) return 0;
  const requiredWidth = 10 + (axisCount - 1) * SCOPE_AXIS_SPACING + 6 + SCOPE_AXIS_LABEL_WIDTH + SCOPE_AXIS_LABEL_PADDING;
  return Math.max(0, requiredWidth - MARGIN.left);
}

// lib/sim/types.ts
function isSimulationAnalysisResult(circuitElement) {
  return circuitElement.type === "simulation_transient_voltage_graph" || circuitElement.type === "simulation_transient_current_graph" || circuitElement.type === "simulation_dc_operating_point_voltage" || circuitElement.type === "simulation_dc_operating_point_current" || circuitElement.type === "simulation_dc_sweep_voltage_graph" || circuitElement.type === "simulation_dc_sweep_current_graph" || circuitElement.type === "simulation_ac_sweep_voltage_graph" || circuitElement.type === "simulation_ac_sweep_current_graph";
}
function isSimulationTransientCurrentGraph(value) {
  return value?.type === "simulation_transient_current_graph";
}
function isSimulationTransientVoltageGraph(value) {
  return value?.type === "simulation_transient_voltage_graph";
}
function isSimulationExperiment(value) {
  return value?.type === "simulation_experiment";
}
function isSimulationVoltageProbe(value) {
  return value?.type === "simulation_voltage_probe";
}
function isSimulationCurrentProbe(value) {
  return value?.type === "simulation_current_probe";
}
function isSimulationOscilloscopeTrace(value) {
  return value?.type === "simulation_oscilloscope_trace";
}

// lib/sim/simulation-graph-svg/prepare-simulation-graphs/create-graph-points.ts
function createGraphPoints(graph, scopeTraceDisplay) {
  const timestamps = getTimestamps(graph);
  const levels = getGraphLevels(graph);
  const length = Math.min(timestamps.length, levels.length);
  const points = [];
  const transformDisplayValue = createDisplayValueTransform(scopeTraceDisplay);
  for (let index = 0; index < length; index++) {
    const timeMs = Number(timestamps[index] ?? Number.NaN);
    const rawValue = Number(levels[index] ?? Number.NaN);
    if (!Number.isFinite(timeMs) || !Number.isFinite(rawValue)) continue;
    points.push({
      timeMs,
      rawValue,
      displayValue: transformDisplayValue(rawValue)
    });
  }
  return points;
}
function createDisplayValueTransform(scopeTraceDisplay) {
  if (!isUsableScopeTraceDisplay(scopeTraceDisplay)) {
    return (rawValue) => rawValue;
  }
  const center = scopeTraceDisplay.center ?? 0;
  const offsetDivs = scopeTraceDisplay.offsetDivs ?? 0;
  const valuePerDiv = scopeTraceDisplay.valuePerDiv;
  return (rawValue) => offsetDivs + (rawValue - center) / valuePerDiv;
}
function getTimestamps(graph) {
  const levels = getGraphLevels(graph);
  if (Array.isArray(graph.timestamps_ms) && graph.timestamps_ms.length === levels.length) {
    return graph.timestamps_ms.map((value) => Number(value));
  }
  const count = levels.length;
  if (count === 0) return [];
  const timestamps = [];
  for (let index = 0; index < count; index++) {
    timestamps.push(graph.start_time_ms + graph.time_per_step * index);
  }
  const lastTimestamp = timestamps.length > 0 ? timestamps[timestamps.length - 1] : void 0;
  if (lastTimestamp !== void 0 && Number.isFinite(graph.end_time_ms) && Number.isFinite(lastTimestamp) && Math.abs(lastTimestamp - graph.end_time_ms) > graph.time_per_step / 2) {
    timestamps.push(graph.end_time_ms);
  }
  return timestamps;
}

// lib/sim/simulation-graph-svg/prepare-simulation-graphs/get-string-property.ts
function getStringProperty2(value, key) {
  const propertyValue = value[key];
  if (typeof propertyValue !== "string") return void 0;
  return propertyValue;
}

// lib/sim/simulation-graph-svg/prepare-simulation-graphs/get-graph-label.ts
function getGraphLabel(graph, probe, scopeTraceDisplay, sourceComponentIdToProbeName) {
  const prefix = isCurrentGraph(graph) ? "I" : "V";
  if (scopeTraceDisplay?.displayName) return scopeTraceDisplay.displayName;
  if (graph.simulation_parameter_sweep_coordinate && graph.name) {
    return graph.name;
  }
  if (probe?.name) return `${prefix}(${probe.name})`;
  const sourceProbeName = getStringProperty2(graph, "source_probe_name");
  if (sourceProbeName) return `${prefix}(${sourceProbeName})`;
  if (graph.source_component_id) {
    const probeName = sourceComponentIdToProbeName.get(
      graph.source_component_id
    );
    if (probeName) return `${prefix}(${probeName})`;
  }
  if (graph.name) return graph.name;
  if (graph.source_component_id) return `Probe ${graph.source_component_id}`;
  return getGraphId(graph);
}

// lib/sim/simulation-graph-svg/prepare-simulation-graphs/get-oscilloscope-trace-for-graph.ts
function getOscilloscopeTraceForGraph(graph, probe, traceByVoltageGraphId, traceByCurrentGraphId, traceByVoltageProbeId, traceByCurrentProbeId) {
  if (isCurrentGraph(graph)) {
    const graphTrace2 = traceByCurrentGraphId.get(
      graph.simulation_transient_current_graph_id
    );
    if (graphTrace2) return graphTrace2;
    const sourceProbeId2 = getStringProperty2(graph, "source_probe_id") ?? (probe?.type === "simulation_current_probe" ? probe.simulation_current_probe_id : void 0);
    return sourceProbeId2 ? traceByCurrentProbeId.get(sourceProbeId2) : void 0;
  }
  const graphTrace = traceByVoltageGraphId.get(
    graph.simulation_transient_voltage_graph_id
  );
  if (graphTrace) return graphTrace;
  const sourceProbeId = getStringProperty2(graph, "source_probe_id") ?? (probe?.type === "simulation_voltage_probe" ? probe.simulation_voltage_probe_id : void 0);
  return sourceProbeId ? traceByVoltageProbeId.get(sourceProbeId) : void 0;
}

// lib/sim/simulation-graph-svg/prepare-simulation-graphs/get-probe-for-graph.ts
function getProbeForGraph(graph, voltageProbeIdToProbe, currentProbeIdToProbe, sourceComponentIdToVoltageProbe, sourceComponentIdToCurrentProbe) {
  const sourceProbeId = getStringProperty2(graph, "source_probe_id");
  if (sourceProbeId) {
    const probe = isCurrentGraph(graph) ? currentProbeIdToProbe.get(sourceProbeId) : voltageProbeIdToProbe.get(sourceProbeId);
    if (probe) return probe;
  }
  if (!graph.source_component_id) return void 0;
  return isCurrentGraph(graph) ? sourceComponentIdToCurrentProbe.get(graph.source_component_id) : sourceComponentIdToVoltageProbe.get(graph.source_component_id);
}

// lib/sim/simulation-graph-svg/prepare-simulation-graphs/get-scope-trace-display.ts
function getScopeTraceDisplay(graph, trace) {
  if (!trace) return void 0;
  return {
    displayName: trace.display_name,
    color: trace.color,
    center: trace.display_center_value,
    offsetDivs: trace.display_center_offset_divs,
    valuePerDiv: isCurrentGraph(graph) ? trace.amps_per_div : trace.volts_per_div
  };
}

// lib/sim/simulation-graph-svg/prepare-simulation-graphs.ts
function prepareSimulationGraphs(graphs, circuitJson) {
  const palette = Array.isArray(colorMap.simulation_palette) ? colorMap.simulation_palette : Array.isArray(colorMap.palette) ? colorMap.palette : [];
  const voltageProbes = circuitJson.filter(isSimulationVoltageProbe);
  const currentProbes = circuitJson.filter(isSimulationCurrentProbe);
  const oscilloscopeTraces = circuitJson.filter(isSimulationOscilloscopeTrace);
  const sourceComponentIdToVoltageProbeName = /* @__PURE__ */ new Map();
  const sourceComponentIdToVoltageProbeColor = /* @__PURE__ */ new Map();
  const sourceComponentIdToCurrentProbeName = /* @__PURE__ */ new Map();
  const sourceComponentIdToCurrentProbeColor = /* @__PURE__ */ new Map();
  const voltageProbeIdToProbe = /* @__PURE__ */ new Map();
  const currentProbeIdToProbe = /* @__PURE__ */ new Map();
  const sourceComponentIdToVoltageProbe = /* @__PURE__ */ new Map();
  const sourceComponentIdToCurrentProbe = /* @__PURE__ */ new Map();
  const traceByVoltageGraphId = /* @__PURE__ */ new Map();
  const traceByCurrentGraphId = /* @__PURE__ */ new Map();
  const traceByVoltageProbeId = /* @__PURE__ */ new Map();
  const traceByCurrentProbeId = /* @__PURE__ */ new Map();
  for (const trace of oscilloscopeTraces) {
    if (trace.simulation_transient_voltage_graph_id) {
      traceByVoltageGraphId.set(
        trace.simulation_transient_voltage_graph_id,
        trace
      );
    }
    if (trace.simulation_transient_current_graph_id) {
      traceByCurrentGraphId.set(
        trace.simulation_transient_current_graph_id,
        trace
      );
    }
    if (trace.simulation_voltage_probe_id) {
      traceByVoltageProbeId.set(trace.simulation_voltage_probe_id, trace);
    }
    if (trace.simulation_current_probe_id) {
      traceByCurrentProbeId.set(trace.simulation_current_probe_id, trace);
    }
  }
  for (const probe of voltageProbes) {
    voltageProbeIdToProbe.set(probe.simulation_voltage_probe_id, probe);
    if (probe.name && probe.source_component_id) {
      sourceComponentIdToVoltageProbeName.set(
        probe.source_component_id,
        probe.name
      );
    }
    if (probe.color && probe.source_component_id) {
      sourceComponentIdToVoltageProbeColor.set(
        probe.source_component_id,
        probe.color
      );
    }
    if (probe.source_component_id) {
      sourceComponentIdToVoltageProbe.set(probe.source_component_id, probe);
    }
  }
  for (const probe of currentProbes) {
    currentProbeIdToProbe.set(probe.simulation_current_probe_id, probe);
    if (probe.name && probe.source_component_id) {
      sourceComponentIdToCurrentProbeName.set(
        probe.source_component_id,
        probe.name
      );
    }
    if (probe.color && probe.source_component_id) {
      sourceComponentIdToCurrentProbeColor.set(
        probe.source_component_id,
        probe.color
      );
    }
    if (probe.source_component_id) {
      sourceComponentIdToCurrentProbe.set(probe.source_component_id, probe);
    }
  }
  return graphs.map((graph, index) => {
    const probe = getProbeForGraph(
      graph,
      voltageProbeIdToProbe,
      currentProbeIdToProbe,
      sourceComponentIdToVoltageProbe,
      sourceComponentIdToCurrentProbe
    );
    const trace = getOscilloscopeTraceForGraph(
      graph,
      probe,
      traceByVoltageGraphId,
      traceByCurrentGraphId,
      traceByVoltageProbeId,
      traceByCurrentProbeId
    );
    const scopeTraceDisplay = getScopeTraceDisplay(graph, trace);
    const points = createGraphPoints(graph, scopeTraceDisplay);
    const paletteColor = getPaletteColor(palette, index);
    const probeColor = getProbeColor(
      graph,
      probe,
      isCurrentGraph(graph) ? sourceComponentIdToCurrentProbeColor : sourceComponentIdToVoltageProbeColor
    );
    const color = graph.color ?? scopeTraceDisplay?.color ?? probeColor ?? paletteColor;
    const label = getGraphLabel(
      graph,
      probe,
      scopeTraceDisplay,
      isCurrentGraph(graph) ? sourceComponentIdToCurrentProbeName : sourceComponentIdToVoltageProbeName
    );
    return {
      graph,
      points,
      color,
      label,
      scopeTraceDisplay,
      usesScopeTraceDisplay: isUsableScopeTraceDisplay(scopeTraceDisplay)
    };
  }).filter((entry) => entry.points.length > 0);
}
function getPaletteColor(palette, index) {
  if (palette.length === 0) return FALLBACK_LINE_COLOR;
  return palette[index % palette.length] ?? FALLBACK_LINE_COLOR;
}
function getProbeColor(graph, probe, sourceComponentIdToProbeColor) {
  if (probe?.color) return probe.color;
  if (!graph.source_component_id) return void 0;
  return sourceComponentIdToProbeColor.get(graph.source_component_id);
}

// lib/sim/convert-circuit-json-to-simulation-graph-svg.ts
function convertCircuitJsonToSimulationGraphSvg({
  circuitJson,
  simulation_experiment_id,
  simulation_transient_current_graph_ids,
  simulation_transient_voltage_graph_ids,
  simulation_result_ids,
  ac_sweep_view = "magnitude",
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  includeVersion
}) {
  const selectedVoltageIds = simulation_transient_voltage_graph_ids ? new Set(simulation_transient_voltage_graph_ids) : null;
  const selectedCurrentIds = simulation_transient_current_graph_ids ? new Set(simulation_transient_current_graph_ids) : null;
  const hasGraphSelection = Boolean(selectedVoltageIds || selectedCurrentIds);
  const selectedResultIds = simulation_result_ids ? new Set(simulation_result_ids) : null;
  const experiment = circuitJson.find(
    (element) => isSimulationExperiment(element) && element.simulation_experiment_id === simulation_experiment_id
  );
  const simulationResults = circuitJson.filter(
    (element) => isSimulationAnalysisResult(element) && element.simulation_experiment_id === simulation_experiment_id && (!selectedResultIds || selectedResultIds.has(getSimulationAnalysisResultId(element))) && (!hasGraphSelection || element.type === "simulation_transient_voltage_graph" && (selectedVoltageIds?.has(
      element.simulation_transient_voltage_graph_id
    ) ?? false) || element.type === "simulation_transient_current_graph" && (selectedCurrentIds?.has(
      element.simulation_transient_current_graph_id
    ) ?? false))
  );
  const normalizedResults = normalizeSimulationAnalysisResults({
    results: simulationResults,
    acSweepView: ac_sweep_view,
    experiment
  });
  const graphs = normalizedResults.graphs;
  if (graphs.length === 0) {
    throw new Error(
      `No simulation analysis results found for simulation_experiment_id "${simulation_experiment_id}"`
    );
  }
  const preparedGraphs = prepareSimulationGraphs(graphs, circuitJson);
  const allPoints = preparedGraphs.flatMap((entry) => entry.points);
  if (allPoints.length === 0) {
    throw new Error(
      `Simulation results for simulation_experiment_id "${simulation_experiment_id}" do not contain any datapoints`
    );
  }
  const horizontalCoordinates = allPoints.map((point) => point.timeMs);
  let timeAxis;
  if (normalizedResults.usesLogarithmicXValues) {
    timeAxis = buildLogarithmicAxisInfo(horizontalCoordinates);
  } else if (normalizedResults.xAxisTitle === "Time (ms)") {
    timeAxis = buildTimeAxisInfo({
      values: horizontalCoordinates,
      graphs,
      experiment
    });
  } else {
    timeAxis = buildAxisInfo(horizontalCoordinates);
  }
  const valueAxis = buildAxisInfo(
    allPoints.map((point) => point.displayValue),
    true
  );
  const usesScopeTraceDisplay = preparedGraphs.some(
    (entry) => entry.usesScopeTraceDisplay
  );
  const scopeAxisGutters = usesScopeTraceDisplay ? getScopeAxisGutters(preparedGraphs.length) : { left: 0, right: 0 };
  const outputWidth = width + scopeAxisGutters.left + scopeAxisGutters.right;
  const scopeLegendLayout = usesScopeTraceDisplay ? getScopeLegendGridLayout(preparedGraphs.length, outputWidth) : null;
  const outputHeight = scopeLegendLayout ? height + SCOPE_LEGEND_GAP + scopeLegendLayout.height + SCOPE_LEGEND_GAP : height;
  const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
  const plotHeight = Math.max(1, height - MARGIN.top - MARGIN.bottom);
  const plotLeft = MARGIN.left + scopeAxisGutters.left;
  const scaleX = createLinearScale(
    timeAxis.domainMin,
    timeAxis.domainMax,
    plotLeft,
    plotLeft + plotWidth
  );
  const scaleY = createLinearScale(
    valueAxis.domainMin,
    valueAxis.domainMax,
    MARGIN.top + plotHeight,
    MARGIN.top
  );
  const clipPathId = createClipPathId(simulation_experiment_id);
  const softwareUsedString = getSoftwareUsedString(
    circuitJson
  );
  const version = CIRCUIT_TO_SVG_VERSION;
  const titleNode = createTitleNode(experiment, outputWidth);
  const svgChildren = [
    createStyleNode(),
    createBackgroundRect(outputWidth, outputHeight),
    createDefsNode(clipPathId, plotLeft, plotWidth, plotHeight),
    createPlotBackground(plotLeft, plotWidth, plotHeight),
    createGridLines({
      timeAxis,
      valueAxis,
      scaleX,
      scaleY,
      plotLeft,
      plotWidth,
      plotHeight
    }),
    createDataGroup(preparedGraphs, clipPathId, scaleX, scaleY),
    createAxes({
      timeAxis,
      valueAxis,
      graphs: preparedGraphs,
      scaleX,
      scaleY,
      plotLeft,
      plotWidth,
      plotHeight,
      yAxisTitle: normalizedResults.yAxisTitle ?? getYAxisTitle(preparedGraphs),
      xAxisTitle: normalizedResults.xAxisTitle,
      usesScopeTraceDisplay
    }),
    usesScopeTraceDisplay ? createScopeLegend(preparedGraphs, outputWidth, height) : createLegend(preparedGraphs, outputWidth),
    ...titleNode ? [titleNode] : []
  ];
  const svgObject = svgElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: outputWidth.toString(),
      height: outputHeight.toString(),
      style: `background-color: ${colorMap.schematic.background}`,
      viewBox: `0 0 ${formatNumber2(outputWidth)} ${formatNumber2(outputHeight)}`,
      "data-simulation-experiment-id": simulation_experiment_id,
      ...experiment?.name && {
        "data-simulation-experiment-name": experiment.name
      },
      ...softwareUsedString && {
        "data-software-used-string": softwareUsedString
      },
      ...includeVersion && {
        "data-circuit-to-svg-version": version
      }
    },
    svgChildren
  );
  return stringifySvg(svgObject);
}
var buildLogarithmicAxisInfo = (logarithmicCoordinates) => {
  const axisInfo = buildAxisInfo(logarithmicCoordinates);
  return {
    ...axisInfo,
    tickLabelOverrides: new Map(
      axisInfo.ticks.map((tick) => [tick, formatNumber2(10 ** tick)])
    )
  };
};

// lib/convert-circuit-json-to-schematic-simulation-svg.ts
var DEFAULT_WIDTH2 = 1200;
var DEFAULT_HEIGHT2 = 1200;
var DEFAULT_SCHEMATIC_RATIO = 0.55;
function convertCircuitJsonToSchematicSimulationSvg({
  circuitJson,
  simulation_experiment_id,
  simulation_transient_current_graph_ids,
  simulation_transient_voltage_graph_ids,
  simulation_result_ids,
  ac_sweep_view,
  width = DEFAULT_WIDTH2,
  height = DEFAULT_HEIGHT2,
  schematicHeightRatio = DEFAULT_SCHEMATIC_RATIO,
  schematicOptions,
  includeVersion,
  graphAboveSchematic = false,
  showErrorsInTextOverlay
}) {
  const schematicElements = circuitJson.filter(
    (element) => !isSimulationExperiment(element) && !isSimulationAnalysisResult(element)
  );
  const clampedRatio = clamp01(schematicHeightRatio);
  const rawSchematicHeight = Math.max(1, height * clampedRatio);
  const rawSimulationHeight = Math.max(1, height - rawSchematicHeight);
  const totalRawHeight = rawSchematicHeight + rawSimulationHeight;
  const scale10 = totalRawHeight === 0 ? 1 : height / totalRawHeight;
  const schematicHeight = rawSchematicHeight * scale10;
  const simulationHeight = rawSimulationHeight * scale10;
  const schematicSvg = convertCircuitJsonToSchematicSvg(schematicElements, {
    ...schematicOptions,
    width,
    height: schematicHeight,
    includeVersion: false,
    showErrorsInTextOverlay
  });
  const simulationSvg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id,
    simulation_transient_current_graph_ids,
    simulation_transient_voltage_graph_ids,
    simulation_result_ids,
    ac_sweep_view,
    width,
    height: simulationHeight,
    includeVersion: false
  });
  const schematicNode = ensureElementNode(parseSync4(schematicSvg));
  const simulationNode = ensureElementNode(parseSync4(simulationSvg));
  const simulationViewBoxSize = getSvgViewBoxSize(simulationNode) ?? {
    width,
    height: simulationHeight
  };
  const simulationDisplayHeight = simulationViewBoxSize.width > 0 ? width * (simulationViewBoxSize.height / simulationViewBoxSize.width) : simulationHeight;
  const outputHeight = schematicHeight + simulationDisplayHeight;
  const combinedChildren = [];
  if (graphAboveSchematic) {
    combinedChildren.push(
      translateNestedSvg(simulationNode, 0, 0, width, simulationDisplayHeight)
    );
    combinedChildren.push(
      translateNestedSvg(
        schematicNode,
        0,
        simulationDisplayHeight,
        width,
        schematicHeight
      )
    );
  } else {
    combinedChildren.push(
      translateNestedSvg(schematicNode, 0, 0, width, schematicHeight)
    );
    combinedChildren.push(
      translateNestedSvg(
        simulationNode,
        0,
        schematicHeight,
        width,
        simulationDisplayHeight
      )
    );
  }
  const softwareUsedString = getSoftwareUsedString(schematicElements);
  const svgObject = {
    name: "svg",
    type: "element",
    value: "",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: formatNumber(width),
      height: formatNumber(outputHeight),
      viewBox: `0 0 ${formatNumber(width)} ${formatNumber(outputHeight)}`,
      "data-simulation-experiment-id": simulation_experiment_id,
      ...softwareUsedString && {
        "data-software-used-string": softwareUsedString
      },
      ...includeVersion && {
        "data-circuit-to-svg-version": CIRCUIT_TO_SVG_VERSION
      }
    },
    children: combinedChildren
  };
  return stringifySvg(svgObject);
}
function getSvgViewBoxSize(node) {
  const viewBox = node.attributes?.viewBox;
  if (typeof viewBox !== "string") return null;
  const values = viewBox.trim().split(/[\s,]+/).map((value) => Number.parseFloat(value));
  if (values.length !== 4) return null;
  const width = values.at(2);
  const height = values.at(3);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width === void 0 || height === void 0) return null;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}
function clamp01(value) {
  if (!Number.isFinite(value)) return DEFAULT_SCHEMATIC_RATIO;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

// lib/pcb/convert-circuit-json-to-solder-paste-mask.ts
import { distance as distance8 } from "circuit-json";
import "svgson";
import {
  applyToPoint as applyToPoint93,
  compose as compose16,
  scale as scale9,
  translate as translate16
} from "transformation-matrix";
var OBJECT_ORDER3 = [
  "pcb_board",
  "pcb_solder_paste"
];
function convertCircuitJsonToSolderPasteMask(circuitJson, options) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const filteredCircuitJson = circuitJson.filter(
    (elm) => elm.type === "pcb_board" || elm.type === "pcb_panel" || elm.type === "pcb_solder_paste" && elm.layer === options.layer
  );
  for (const item of filteredCircuitJson) {
    if (item.type === "pcb_board") {
      if (item.outline && Array.isArray(item.outline) && item.outline.length >= 3) {
        updateBoundsToIncludeOutline(item.outline);
      } else if ("center" in item && "width" in item && "height" in item) {
        updateBounds(item.center, item.width, item.height);
      }
    } else if (item.type === "pcb_panel") {
      const panel = item;
      const width = distance8.parse(panel.width);
      const height = distance8.parse(panel.height);
      if (width !== void 0 && height !== void 0) {
        const center = panel.center ?? { x: width / 2, y: height / 2 };
        updateBounds(center, width, height);
      }
    } else if (item.type === "pcb_solder_paste" && "x" in item && "y" in item) {
      updateBounds({ x: item.x, y: item.y }, 0, 0);
    }
  }
  const padding = 1;
  const circuitWidth = maxX - minX + 2 * padding;
  const circuitHeight = maxY - minY + 2 * padding;
  const svgWidth = options.width ?? 800;
  const svgHeight = options.height ?? 600;
  const scaleX = svgWidth / circuitWidth;
  const scaleY = svgHeight / circuitHeight;
  const scaleFactor = Math.min(scaleX, scaleY);
  const offsetX = (svgWidth - circuitWidth * scaleFactor) / 2;
  const offsetY = (svgHeight - circuitHeight * scaleFactor) / 2;
  const transform = compose16(
    translate16(
      offsetX - minX * scaleFactor + padding * scaleFactor,
      svgHeight - offsetY + minY * scaleFactor - padding * scaleFactor
    ),
    scale9(scaleFactor, -scaleFactor)
    // Flip in y-direction
  );
  const ctx = {
    transform,
    layer: options.layer,
    colorMap: DEFAULT_PCB_COLOR_MAP
  };
  const svgObjects = filteredCircuitJson.sort(
    (a, b) => (OBJECT_ORDER3.indexOf(b.type) ?? 9999) - (OBJECT_ORDER3.indexOf(a.type) ?? 9999)
  ).flatMap((item) => createSvgObjects4({ elm: item, ctx }));
  const softwareUsedString = getSoftwareUsedString(circuitJson);
  const version = CIRCUIT_TO_SVG_VERSION;
  const children = [
    {
      name: "style",
      type: "element",
      children: [
        {
          type: "text",
          value: ""
        }
      ]
    },
    {
      name: "rect",
      type: "element",
      attributes: {
        class: "boundary",
        x: "0",
        y: "0",
        fill: "#000",
        width: svgWidth.toString(),
        height: svgHeight.toString()
      }
    },
    createSvgObjectFromPcbBoundary2(transform, minX, minY, maxX, maxY),
    ...svgObjects
  ].filter((child) => child !== null);
  if (options?.showErrorsInTextOverlay) {
    const errorOverlay = createErrorTextOverlay(circuitJson);
    if (errorOverlay) {
      children.push(errorOverlay);
    }
  }
  const svgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      ...softwareUsedString && {
        "data-software-used-string": softwareUsedString
      },
      ...options.includeVersion && {
        "data-circuit-to-svg-version": version
      }
    },
    value: "",
    children
  };
  try {
    return stringifySvg(svgObject);
  } catch (error) {
    console.error("Error stringifying SVG object:", error);
    throw error;
  }
  function updateBounds(center, width, height) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    minX = Math.min(minX, center.x - halfWidth);
    minY = Math.min(minY, center.y - halfHeight);
    maxX = Math.max(maxX, center.x + halfWidth);
    maxY = Math.max(maxY, center.y + halfHeight);
  }
  function updateBoundsToIncludeOutline(outline) {
    for (const point of outline) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
}
function createSvgObjects4({ elm, ctx }) {
  const { transform } = ctx;
  switch (elm.type) {
    case "pcb_board":
      return createSvgObjectsFromPcbBoard(elm, ctx);
    case "pcb_solder_paste":
      return createSvgObjectsFromSolderPaste(elm, ctx);
    default:
      return [];
  }
}
function createSvgObjectFromPcbBoundary2(transform, minX, minY, maxX, maxY) {
  const [x1, y1] = applyToPoint93(transform, [minX, minY]);
  const [x2, y2] = applyToPoint93(transform, [maxX, maxY]);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  return {
    name: "rect",
    type: "element",
    value: "",
    children: [],
    attributes: {
      class: "pcb-boundary",
      fill: "none",
      stroke: "#fff",
      "stroke-width": "0.3",
      x: x.toString(),
      y: y.toString(),
      width: width.toString(),
      height: height.toString()
    }
  };
}
export {
  CIRCUIT_TO_SVG_VERSION,
  circuitJsonToPcbSvg,
  circuitJsonToSchematicSvg,
  colorMap,
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToPinoutSvg,
  convertCircuitJsonToSchematicSimulationSvg,
  convertCircuitJsonToSchematicSvg,
  convertCircuitJsonToSimulationGraphSvg,
  convertCircuitJsonToSolderPasteMask,
  convertCircuitJsonToStackedSchematicSheetsSvg,
  createErrorTextOverlay,
  createSvgObjectsForSchComponentPortHovers,
  getSoftwareUsedString,
  isSimulationAnalysisResult,
  isSimulationCurrentProbe,
  isSimulationExperiment,
  isSimulationOscilloscopeTrace,
  isSimulationTransientCurrentGraph,
  isSimulationTransientVoltageGraph,
  isSimulationVoltageProbe
};
//# sourceMappingURL=index.js.map