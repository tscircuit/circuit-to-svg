import type { PcbContext } from "./convert-circuit-json-to-pcb-svg"

type BoardSide = "top" | "bottom"

export function getRealisticSolderMaskColor(
  ctx: PcbContext,
  side: BoardSide,
): string {
  return (
    ctx.realisticBoardColors?.solderMask?.[side] ??
    ctx.colorMap.soldermask[side]
  )
}

export function getRealisticSilkscreenColor(
  ctx: PcbContext,
  side: BoardSide,
): string {
  return (
    ctx.realisticBoardColors?.silkscreen?.[side] ??
    ctx.colorMap.silkscreen[side]
  )
}
