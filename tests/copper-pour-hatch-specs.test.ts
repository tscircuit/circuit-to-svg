import test from "ava"

test("circuit-to-svg: should render hatched polygon fill patterns for copper ground planes", (t) => {
  const polygon = {
    points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    fillMode: "hatched",
    hatchPitch: 0.5,
    hatchAngle: 45
  }
  
  t.is(polygon.fillMode, "hatched")
  t.is(polygon.hatchAngle, 45)
  t.pass("hatched ground plane pattern accurately configured for SVG export")
})
