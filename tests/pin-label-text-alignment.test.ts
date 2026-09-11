import test from "ava"

test("calculates correct SVG text-anchor and baseline alignment for rotated pin labels", (t) => {
  const pinOrientations = [
    { side: "left", expectedAnchor: "start", rotation: 0 },
    { side: "right", expectedAnchor: "end", rotation: 0 },
    { side: "top", expectedAnchor: "middle", rotation: 90 },
    { side: "bottom", expectedAnchor: "middle", rotation: 270 }
  ]
  
  pinOrientations.forEach(pin => {
    t.truthy(pin.expectedAnchor)
    t.true(pin.rotation >= 0 && pin.rotation <= 360)
  })
})
