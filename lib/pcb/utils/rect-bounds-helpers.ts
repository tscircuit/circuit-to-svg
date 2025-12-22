import type { Point } from "circuit-json";
import { distance } from "circuit-json";
import type { Bounds } from "@tscircuit/math-utils";
import { expandBounds, getEmptyBounds } from "./bounds-helpers";

type BoundsMap = Map<string, Bounds>;

const toRectBounds = (
  center: Point | undefined,
  width: unknown,
  height: unknown,
): Bounds | undefined => {
  if (!center) return undefined;
  const centerX = distance.parse(center.x);
  const centerY = distance.parse(center.y);
  if (centerX === undefined || centerY === undefined) return undefined;
  const numericWidth = distance.parse(width) ?? 0;
  const numericHeight = distance.parse(height) ?? 0;
  const halfWidth = numericWidth / 2;
  const halfHeight = numericHeight / 2;
  return {
    minX: centerX - halfWidth,
    minY: centerY - halfHeight,
    maxX: centerX + halfWidth,
    maxY: centerY + halfHeight,
  };
};

export const addRectToBounds = (
  target: Bounds,
  center: Point | undefined,
  width: unknown,
  height: unknown,
): Bounds => {
  const rect = toRectBounds(center, width, height);
  return rect ? expandBounds(target, rect) : target;
};

export const addRectToBoundsWithId = (
  target: Bounds,
  center: Point | undefined,
  width: unknown,
  height: unknown,
  opts: { id?: string; byId?: BoundsMap; overall?: Bounds },
): {
  bounds: Bounds;
  overall: Bounds;
} => {
  const rect = toRectBounds(center, width, height);
  if (!rect) return { bounds: target, overall: opts.overall ?? target };

  const nextBounds = expandBounds(target, rect);
  const nextOverall = expandBounds(opts.overall ?? getEmptyBounds(), rect);

  if (opts.id && opts.byId) {
    const existing = opts.byId.get(opts.id) ?? getEmptyBounds();
    opts.byId.set(opts.id, expandBounds(existing, rect));
  }

  return { bounds: nextBounds, overall: nextOverall };
};
