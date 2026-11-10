"""Rebuild bundled 125 Myr anchors from retained published source rows (offline)."""
import json, math
from pathlib import Path
root = Path(__file__).resolve().parent.parent
source = root / 'data/source'
# BHAC15: interpolate log luminosity and log temperature in log age.
groups = {}
for line in (source / 'BHAC15-anchors.txt').read_text().splitlines():
    if not line or line.startswith('#'): continue
    row = list(map(float, line.split()))
    groups.setdefault(row[0], []).append(row)
bhac = []
for mass, rows in sorted(groups.items()):
    a, b = rows
    f = (math.log10(125e6) - a[1]) / (b[1] - a[1])
    bhac.append([mass, a[3] + f * (b[3] - a[3]), math.log10(a[2]) + f * math.log10(b[2] / a[2])])
mist = []
for line in (source / 'MIST-125Myr-anchors.txt').read_text().splitlines():
    if not line or line.startswith('#'): continue
    row = list(map(float, line.split()))
    mist.append(row)
(root / 'src/stellar-data.json').write_text(json.dumps({'ageYears': 125000000, 'bhac': bhac, 'mist': mist}, indent=2) + '\n')
