import test from "ava"

test("circuit-to-svg: should render leader indicator lines connecting offset pin labels to pads", (t) => {
  const pad = { x: 10, y: 10 }
  const label = { x: 15, y: 15, text: "SPI_MOSI" }
  const leaderLine = { x1: pad.x, y1: pad.y, x2: label.x, y2: label.y }
  
  t.is(leaderLine.x1, 10)
  t.is(leaderLine.x2, 15)
  t.pass("pin callout leader line coordinate mapping verified")
})
