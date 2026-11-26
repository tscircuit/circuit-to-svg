"""Generate independent glyph-direction references using KiCad's native plotter.

From the repo root, write the exact test fixture and pass it to this script:
  bun -e 'import {fabricationTextCircuit} from "./tests/fixtures/fabrication-text-board"; await Bun.write("/tmp/fab-input.json", JSON.stringify(fabricationTextCircuit))'
  /usr/bin/python tests/fixtures/generate-native-fabrication-reference.py /tmp/fab-input.json /tmp/fab-native
Copy /tmp/fab-native/reference.json to tests/fixtures/kicad-fabrication-reference.json.
KiCad is only needed to regenerate this reference, not to run the Bun tests.
"""
from pathlib import Path
import json
import math
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
import pcbnew

circuit = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
board_data = next(e for e in circuit if e['type'] == 'pcb_board')
notes = [e for e in circuit if e['type'] == 'pcb_fabrication_note_text']
assert len(notes) == 8 and all(n['text'] == 'R2 bottom' and n['font_size'] == 1 for n in notes)
assert board_data['center'] == {'x': 0, 'y': 0}
assert sorted({n['ccw_rotation'] for n in notes}) == [0,90,180,270]
width, height = board_data['width'], board_data['height']
board = pcbnew.BOARD()
def position(x, y):
    return pcbnew.VECTOR2I(pcbnew.FromMM(100+x), pcbnew.FromMM(100-y))
def segment(layer, start, end, stroke=0.05):
    shape = pcbnew.PCB_SHAPE(board)
    shape.SetShape(pcbnew.SHAPE_T_SEGMENT)
    shape.SetLayer(layer)
    shape.SetStart(position(*start))
    shape.SetEnd(position(*end))
    shape.SetWidth(pcbnew.FromMM(stroke))
    board.Add(shape)
w, h = width/2, height/2
for a, b in [((-w,-h),(w,-h)),((w,-h),(w,h)),((w,h),(-w,h)),((-w,h),(-w,-h))]:
    segment(pcbnew.Edge_Cuts, a, b)
for layer_name, layer in [('top', pcbnew.F_Fab), ('bottom', pcbnew.B_Fab)]:
    segment(layer, (-46,0), (46,0))
    segment(layer, (0,-28), (0,24))
    for note in notes:
        x, y = note['anchor_position']['x'], note['anchor_position']['y']
        text = pcbnew.PCB_TEXT(board)
        text.SetLayer(layer)
        text.SetText(note['text'])
        text.SetPosition(position(x, y))
        text.SetTextSize(pcbnew.VECTOR2I(pcbnew.FromMM(note['font_size']), pcbnew.FromMM(note['font_size'])))
        text.SetTextThickness(pcbnew.FromMM(0.12))
        text.SetTextAngle(pcbnew.EDA_ANGLE(note['ccw_rotation'], pcbnew.DEGREES_T))
        text.SetMirrored(layer_name == 'bottom')
        text.SetKeepUpright(False)
        centered = note['anchor_alignment'] == 'center'
        text.SetHorizJustify(pcbnew.GR_TEXT_H_ALIGN_CENTER if centered else pcbnew.GR_TEXT_H_ALIGN_LEFT)
        text.SetVertJustify(pcbnew.GR_TEXT_V_ALIGN_CENTER if centered else pcbnew.GR_TEXT_V_ALIGN_TOP)
        board.Add(text)
        segment(layer, (x-0.5,y), (x+0.5,y), 0.1)
        segment(layer, (x,y-0.5), (x,y+0.5), 0.1)
        caption = pcbnew.PCB_TEXT(board)
        caption.SetLayer(layer)
        caption.SetText(f"input {note['ccw_rotation']} CCW\n{note['anchor_alignment']}\nanchor ({x}, {y})")
        caption.SetPosition(position(x, y+11))
        caption.SetTextSize(pcbnew.VECTOR2I(pcbnew.FromMM(0.8), pcbnew.FromMM(0.8)))
        caption.SetTextThickness(pcbnew.FromMM(0.1))
        caption.SetMirrored(layer_name == 'bottom')
        caption.SetKeepUpright(False)
        board.Add(caption)
pcbnew.SaveBoard(str(out/'source.kicad_pcb'), board)
views = [('top', 'F.Fab', False), ('bottom_from_top', 'B.Fab', False), ('bottom', 'B.Fab', True)]
measured = {}
ns = {'s': 'http://www.w3.org/2000/svg'}
for name, layer, mirror in views:
    command = ['kicad-cli', 'pcb', 'export', 'svg', '--layers', f'{layer},Edge.Cuts', '--mode-single', '--page-size-mode', '2', '--exclude-drawing-sheet', '--output', str(out/f'{name}.svg')]
    if mirror:
        command += ['--mirror']
    result = subprocess.run(command+[str(out/'source.kicad_pcb')], capture_output=True, text=True, check=True)
    (out/f'{name}.log').write_text(result.stdout+result.stderr)
    tree = ET.parse(out/f'{name}.svg')
    parents = {c:p for p in tree.iter() for c in p}
    groups = [g for g in tree.findall('.//s:g', ns) if g.find('s:desc', ns) is not None and g.find('s:desc', ns).text == 'R2 bottom']
    assert len(groups) == len(notes)
    measured[name] = {}
    for group in groups:
        siblings = list(parents[group])
        hidden_text = siblings[siblings.index(group)-1]
        if not hidden_text.tag.endswith('}text'):
            hidden_text = hidden_text.find('.//s:text', ns)
        assert hidden_text is not None and hidden_text.text == 'R2 bottom'
        # Identify inputs by position, without using an angle or rotation formula.
        point = (float(hidden_text.attrib['x']), float(hidden_text.attrib['y']))
        def distance(note):
            x, y = note['anchor_position']['x'], note['anchor_position']['y']
            target = (width/2-x if mirror else width/2+x, height/2-y)
            return math.dist(point, target)
        note = min(notes, key=distance)
        assert distance(note) < 1.1
        vectors = []
        for path in group.findall('s:path', ns)[:2]:
            coords = list(map(float, re.findall(r'-?\d+(?:\.\d+)?', path.attrib['d'])))
            assert len(coords) == 4
            vectors.append([coords[2]-coords[0], coords[3]-coords[1]])
        measured[name][note['pcb_fabrication_note_text_id']] = vectors
# The first two strokes of the native R are a diagonal and its vertical stem.
# Solve their 2D basis relative to the native top/0-degree glyph, using actual
# plotted coordinates. No circuit-to-svg output or rotation formula is used.
base = measured['top']['center_0']
result = {'kicad_version': pcbnew.Version(), 'method': 'Basis measured from native SVG R glyph strokes; matrices are [a,b,c,d] in SVG coordinates.', 'cases_per_view': len(notes), 'font_note': 'Native KiCad stroke font verifies directions and mirroring, not font metrics.', 'board_angles': [0,90,180,270], 'views': {}}
for view, cases in measured.items():
    bases = []
    for angle in result['board_angles']:
        for alignment in ['center', 'top_left']:
            diagonal, stem = cases[f'{alignment}_{angle}']
            c, d = -stem[0], -stem[1]
            a = (diagonal[0]-c*base[0][1])/base[0][0]
            b = (diagonal[1]-d*base[0][1])/base[0][0]
            matrix = [a,b,c,d]
            rounded = [round(v) for v in matrix]
            assert all(abs(v-r) < 0.001 for v,r in zip(matrix,rounded))
            assert abs(rounded[0]*rounded[3]-rounded[1]*rounded[2]) == 1
            if alignment == 'center':
                bases.append(rounded)
            else:
                assert rounded == bases[-1]
    result['views'][view] = bases
(out/'reference.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result))
