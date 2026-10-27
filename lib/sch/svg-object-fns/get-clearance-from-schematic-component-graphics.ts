import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"

type Point = { x: number; y: number }

const EPSILON = 1e-6

const distanceBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) return distanceBetween(point, start)

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ),
  )

  return distanceBetween(point, {
    x: start.x + projection * dx,
    y: start.y + projection * dy,
  })
}

const pointIsInsidePolygon = (point: Point, polygon: Point[]) => {
  let isInside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const start = polygon[i]!
    const end = polygon[j]!
    const crossesHorizontalRay =
      start.y > point.y !== end.y > point.y &&
      point.x <
        ((end.x - start.x) * (point.y - start.y)) / (end.y - start.y) + start.x

    if (crossesHorizontalRay) isInside = !isInside
  }

  return isInside
}

const distanceToPath = (point: Point, points: Point[], isFilled: boolean) => {
  if (points.length === 0) return Number.POSITIVE_INFINITY
  if (isFilled && points.length >= 3 && pointIsInsidePolygon(point, points)) {
    return 0
  }
  if (points.length === 1) return distanceBetween(point, points[0]!)

  let distance = Number.POSITIVE_INFINITY
  for (let i = 1; i < points.length; i++) {
    distance = Math.min(
      distance,
      distanceToSegment(point, points[i - 1]!, points[i]!),
    )
  }
  return distance
}

const distanceToRect = (
  point: Point,
  rect: {
    center: Point
    width: number
    height: number
    rotation: number
    is_filled: boolean
  },
) => {
  const rotation = (-rect.rotation * Math.PI) / 180
  const dx = point.x - rect.center.x
  const dy = point.y - rect.center.y
  const localX = dx * Math.cos(rotation) - dy * Math.sin(rotation)
  const localY = dx * Math.sin(rotation) + dy * Math.cos(rotation)
  const distanceFromXEdge = Math.abs(localX) - rect.width / 2
  const distanceFromYEdge = Math.abs(localY) - rect.height / 2
  const isInside = distanceFromXEdge <= 0 && distanceFromYEdge <= 0

  if (rect.is_filled && isInside) return 0
  if (isInside) {
    return Math.min(-distanceFromXEdge, -distanceFromYEdge)
  }

  return Math.hypot(
    Math.max(distanceFromXEdge, 0),
    Math.max(distanceFromYEdge, 0),
  )
}

const isPortStem = (
  line: {
    x1: number
    y1: number
    x2: number
    y2: number
  },
  schPort: SchematicPort,
) => {
  const start = { x: line.x1, y: line.y1 }
  const end = { x: line.x2, y: line.y2 }
  const startsAtPort = distanceBetween(start, schPort.center) < EPSILON
  const endsAtPort = distanceBetween(end, schPort.center) < EPSILON
  const length = distanceBetween(start, end)

  return (
    (startsAtPort || endsAtPort) &&
    Math.abs(length - (schPort.distance_from_component_edge ?? length)) <
      EPSILON
  )
}

export const getClearanceFromSchematicComponentGraphics = ({
  point,
  schPort,
  schComponent,
  circuitJson,
}: {
  point: Point
  schPort: SchematicPort
  schComponent: SchematicComponent
  circuitJson: AnyCircuitElement[]
}) => {
  let minimumClearance = Number.POSITIVE_INFINITY
  const portStem = circuitJson.find(
    (element) =>
      element.type === "schematic_line" &&
      element.schematic_component_id === schComponent.schematic_component_id &&
      isPortStem(element, schPort),
  )
  const portBodyEdge =
    portStem?.type === "schematic_line"
      ? distanceBetween({ x: portStem.x1, y: portStem.y1 }, schPort.center) <
        EPSILON
        ? { x: portStem.x2, y: portStem.y2 }
        : { x: portStem.x1, y: portStem.y1 }
      : undefined

  for (const element of circuitJson) {
    if (
      !("schematic_component_id" in element) ||
      element.schematic_component_id !== schComponent.schematic_component_id
    ) {
      continue
    }

    let distance = Number.POSITIVE_INFINITY

    switch (element.type) {
      case "schematic_line":
        if (isPortStem(element, schPort)) continue
        distance = distanceToSegment(
          point,
          { x: element.x1, y: element.y1 },
          { x: element.x2, y: element.y2 },
        )
        break
      case "schematic_path":
        distance = distanceToPath(
          point,
          element.points,
          element.is_filled ?? false,
        )
        break
      case "schematic_circle": {
        const distanceFromCenter = distanceBetween(point, element.center)
        distance =
          element.is_filled && distanceFromCenter <= element.radius
            ? 0
            : Math.abs(distanceFromCenter - element.radius)
        break
      }
      case "schematic_arc":
        distance = Math.abs(
          distanceBetween(point, element.center) - element.radius,
        )
        break
      case "schematic_rect":
        if (
          portBodyEdge &&
          distanceToRect(portBodyEdge, { ...element, is_filled: false }) <
            EPSILON
        ) {
          continue
        }
        distance = distanceToRect(point, element)
        break
    }

    if (Number.isFinite(distance) && "stroke_width" in element) {
      distance = Math.max(0, distance - (element.stroke_width ?? 0) / 2)
    }
    minimumClearance = Math.min(minimumClearance, distance)
  }

  return minimumClearance
}
