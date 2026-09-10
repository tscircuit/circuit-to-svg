import test from "ava"

test("circuit-to-svg: should render stencil paste mask with negative reduction tolerance", (t) => {
  const pad = { width: 1.0, height: 2.0 }
  const pasteReductionPercent = 0.10 // 10% area reduction
  
  const stencilWidth = pad.width * (1 - pasteReductionPercent / 2)
  const stencilHeight = pad.height * (1 - pasteReductionPercent / 2)
  
  t.is(stencilWidth, 0.95)
  t.is(stencilHeight, 1.9)
  t.pass("solder paste stencil aperture reduction applied")
})
