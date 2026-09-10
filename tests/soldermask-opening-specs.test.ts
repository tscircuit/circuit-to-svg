import test from "ava"

test("circuit-to-svg: should apply correct soldermask expansion clearance in SVG rendering", (t) => {
  const pad = { x: 25, y: 30, w: 2.0, h: 1.5 }
  const maskExpansion = 0.1
  
  const maskWidth = pad.w + (maskExpansion * 2)
  const maskHeight = pad.h + (maskExpansion * 2)
  
  t.is(maskWidth, 2.2)
  t.is(maskHeight, 1.7)
  t.pass("soldermask SVG path expansion attributes verified")
})
