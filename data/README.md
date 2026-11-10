# Stellar data provenance

Bundled offline model anchors retrieved 2026-11-05. No stellar data is fetched at runtime. Values are scientific model data; attribution remains with their authors.

## Published models

- MIST v1.2, MESA revision 7503: [Choi et al. 2016](https://arxiv.org/abs/1604.08592) and [Dotter 2016](https://arxiv.org/abs/1601.05144). [Official models and references](https://mist.science/references.html).
- BHAC15: [Baraffe, Homeier, Allard & Chabrier 2015, A&A 577 A42](https://doi.org/10.1051/0004-6361/201425481), [author's data directory](https://perso.ens-lyon.fr/isabelle.baraffe/BHAC15dir/).
- Mass distribution approximation: [Kroupa's local stellar initial mass function discussion](https://arxiv.org/abs/astro-ph/0011328). This motivates the low-mass weighting, not an observed present-day Pleiades mass function.

## Extraction and reproducibility

Requested the [MIST theoretical isochrone interpolator](https://mist.science/interp_isos.html) with version MIST1, v/vcrit=0.0, linear age 125000000 yr, [Fe/H]=0, [alpha/Fe]=0, theoretical output and Av=0. The returned file `MIST_iso_6aecd1bd3a0a5.iso` reports log age 8.0969100130080562, Yinit=0.2722 and Zinit=0.0178798. Retained the unmodified numeric tokens for current mass, log L, log Teff, log R, phase and EEP on the PMS/MS branch from ~0.1004 through ~4.5626 M☉. `source/MIST-125Myr-anchors.txt` is this column subset. Sorting is by increasing current mass; phase -1 identifies PMS, phase 0 MS. Initial mass 5 M☉ would be evolved at this age, so the scene uses a conservative 4.5 M☉ upper bound rather than populating an out-of-scope evolved category. Treat the generation IMF applied to current masses as a documented negligible-wind approximation at these masses, not a progenitor evolution calculation.

Downloaded `BHAC15_tracks+structure` from the author's directory. Retained exact rows bracketing log10(125e6) for masses 0.08 through 0.20 M☉ in `source/BHAC15-anchors.txt`. Column definitions: mass/M☉, log age/yr, Teff/K, log L/L☉, log g/cgs, R/R☉, followed by internal-structure fields. The original table uses L☉=3.839e33 erg/s and R☉=6.96e10 cm; this small normalization difference is addressed by deriving consistent radii from luminosity and temperature with adopted solar Teff=5772 K. Rounded source radii therefore agree approximately, not bit-for-bit.

Run `python scripts/prepare-stellar-data.py` from any directory to regenerate `src/stellar-data.json` using these retained anchors, without network access. BHAC log luminosity and log temperature interpolate linearly in log age at each mass. At runtime, each model's log luminosity and log temperature interpolate linearly in log mass; a linear mass blend joins BHAC to MIST over 0.10–0.20 M☉. Below the first MIST anchor, the MIST endpoint holds during the tiny beginning of that blend. Outside the overlap the appropriate model alone contributes. This blend is an explicit approximation between two solar-like compositions, not a new published single-model isochrone. It avoids invented low-mass extrapolation because MIST v1.2 begins around 0.1 M☉.

The stellar module rejects masses outside 0.08–4.5 M☉ for population properties. Evolutionary identity follows the first MIST phase-0 mass (BHAC-only low-mass objects remain PMS); descriptive temperature labels are assigned afterwards. Attributes are continuous across label changes. Interpolating log L and log T and deriving `R=sqrt(L)*(5772/T)^2` guarantees Stefan–Boltzmann consistency. It does not preserve internal structure information or detailed spectra. Age is fixed, not a general age-interpolation API.

Independent unit anchors include BHAC15 0.08 M☉ bracket values and exact MIST near-solar and ~4 M☉ rows. Tests check boundary continuity and luminosity consistency as well as generation and physical dynamics. The separate homology merger model is documented in [design](../docs/design.md); it never extrapolates this table.

## Retained source SHA-256

- `BHAC15-anchors.txt`: `54971247128e162caba72ba4f70abc7c5d71888385ad69a0c46e8b5ce7be0263`
- `MIST-125Myr-anchors.txt`: `8b3968c74509c4d342d087bd01d9ab1e7ddb72710243a2ebea5d18dbaf034f81`
