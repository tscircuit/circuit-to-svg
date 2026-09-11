import test from "ava"

test("renders semicircular wire jump bridge arc when intersecting non-connected nets", (t) => {
  const intersection = { x: 20, y: 30 }
  const bridgeRadius = 2.0
  
  const startX = intersection.x - bridgeRadius
  const endX = intersection.x + bridgeRadius
  const svgArcD = `M ${startX} ${intersection.y} A ${bridgeRadius} ${bridgeRadius} 0 0 1 ${endX} ${intersection.y}`
  
  t.is(svgArcD, "M 18 30 A 2 2 0 0 1 22 30")
})
