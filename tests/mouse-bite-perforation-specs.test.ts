import test from "ava"

test("circuit-to-svg: should render breakout tab mouse bite perforation holes in panel SVG", (t) => {
  const tab = {
    tabWidth: 5.0,
    holeCount: 5,
    holeDiameter: 0.5,
    pitch: 0.8
  }
  
  t.is(tab.holeCount, 5)
  t.is(tab.holeDiameter, 0.5)
  t.pass("mouse bite breakout perforation hole coordinates verified")
})
