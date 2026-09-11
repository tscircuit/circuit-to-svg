import test from "ava"

test("formats cubic bezier SVG path commands for rounded PCB trace corners", (t) => {
  const p0 = { x: 0, y: 0 }
  const cp1 = { x: 5, y: 0 }
  const cp2 = { x: 10, y: 5 }
  const p1 = { x: 10, y: 10 }
  
  const svgPathD = `M ${p0.x} ${p0.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p1.x} ${p1.y}`
  t.is(svgPathD, "M 0 0 C 5 0, 10 5, 10 10")
})
