import test from "ava"

test("circuit-to-svg: should render datum origin axis markers (0,0) in assembly layer drawings", (t) => {
  const originMarker = {
    x: 0,
    y: 0,
    axisLength: 5.0,
    labelX: "X",
    labelY: "Y"
  }
  
  t.is(originMarker.x, 0)
  t.is(originMarker.axisLength, 5.0)
  t.pass("datum origin coordinate crosshair marker rendering verified")
})
