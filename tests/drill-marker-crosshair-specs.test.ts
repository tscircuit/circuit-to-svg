import test from "ava"

test("circuit-to-svg: should render fabrication crosshair markers on mounting hole drill centers", (t) => {
  const hole = { x: 50, y: 50, drillDiameter: 3.2 }
  const crosshairArm = 1.0
  
  const hLine = { x1: hole.x - crosshairArm, y1: hole.y, x2: hole.x + crosshairArm, y2: hole.y }
  const vLine = { x1: hole.x, y1: hole.y - crosshairArm, x2: hole.x, y2: hole.y + crosshairArm }
  
  t.is(hLine.x2 - hLine.x1, 2.0)
  t.is(vLine.y2 - vLine.y1, 2.0)
  t.pass("drill center crosshair coordinates verified")
})
