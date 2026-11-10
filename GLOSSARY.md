# Stellar observatory

An illustrative isolated open cluster with a coeval stellar population and accelerated gravitational motion.

## Language

**Scene**:
A realization of the cluster's starting population, physical properties, positions and motion.
_Avoid_: Level, match

**Reset**:
A return to the same initial scene, discarding its subsequent evolution.
_Avoid_: Rewind

**Gravitating body**:
A simulated object that both contributes to and responds to gravity. Every star in this cluster is a gravitating body.
_Avoid_: Tracer, background star

**Tracer particle**:
A massless test object responding to gravity without contributing to it. No tracers populate this scene.

**Body kind**:
An object's physical and evolutionary identity, such as a pre-main-sequence star or main-sequence star.
_Avoid_: Subtype, orbital role

**Descriptive subtype**:
A label summarizing continuous physical attributes, such as a temperature-based spectral type.

**Orbital role**:
A relationship to another body, such as satellite or moon, rather than an intrinsic body kind.

**Reference population age**:
The common age describing frozen stellar interiors, distinct from elapsed dynamical time.

**Half-mass radius**:
The three-dimensional radius about the cluster's mass centre enclosing half its mass.
_Avoid_: Core radius, projected radius, outer boundary

**Physical surface radius**:
The model's actual stellar surface radius, distinct from an enlarged effective capture boundary.
_Avoid_: Displayed core radius, picking radius

**Displayed core radius**:
An enlarged visual representation allowing stellar surfaces to be explored at parsec distances.

**Gravitational timescale**:
The characteristic time sqrt(r_half³/(G M_initial)) setting normal accelerated playback.

**Merger remnant**:
The surviving body after simplified physical coalescence, with retained mass and recalculated approximate attributes.

**Capture radius**:
An enlarged effective interaction boundary used to turn close approaches into immediate dissipative mergers, independently of displayed size.
_Avoid_: Physical stellar radius, glow radius
