# Pending polygon keepout schema

`circuit-json@0.0.506.patch` is the generated runtime/type backport of
https://github.com/tscircuit/circuit-json/pull/841. It allows this renderer change
and its tests to use the proposed native `PcbKeepoutPolygon` type.

Before merging/releasing, replace the patch with a published Circuit JSON
version that includes that PR and remove the `patchedDependencies` entry.
The upstream PR adds filled polygons; existing stroked outlines keep their
original meaning.
