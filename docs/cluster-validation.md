# Cluster acceptance protocol

Declared before evaluating seed 125: evolve the default and variation seeds 42 and 731 for five characteristic times, sampling every quarter time. Require finite state, half-mass radius between 0.5 and 2 times its initial value, at least 80% individually bound stars, relative total-energy drift below 0.5%, and mass-centre displacement below 1e-10 pc. These deliberately allow finite-N breathing, segregation, and evaporation while rejecting immediate collapse/dispersal. They are engineering acceptance bounds for this isolated softened analogue, not observational Pleiades constraints.

Repeat at half the timestep; require final half-mass radii to agree within 5%, bound fractions within 5 percentage points, and energy error to decrease or already be below 1e-5. Check an analytic unsoftened two-body orbit separately. This separates integration error from cluster evolution; a scalar initial virial ratio alone is insufficient evidence. No long-term or larger-population accuracy guarantee follows.

Default seed 125 is chosen for reproducibility (the reference age), without rejecting seeds to guarantee a massive star. Numerical results are written to `verification-results/cluster-evolution.json` by the numerical tests. Browser screenshots provide separate visual evidence.

The current parameters are ε=0.001 initial half-mass radii and timestep t_grav/8192, with comparison runs at t_grav/16384. Lowering ε tenfold while retaining t_grav/4096 produced a 6.4% final-radius disagreement, exceeding the existing 5% limit. Halving the step passes the original protocol; acceptance tolerances were not widened. These close-encounter-sensitive trajectories still need the stated finite-horizon qualification.

## Enhanced-merger amendment

A later owner request supersedes physical-contact-only merging with enlarged encounter radii. The five-timescale conservative-gravity test explicitly sets `encounterRadiusScale=0` so its energy and equilibrium tolerances still test the same solver, without treating dissipative coalescence as integration error. Physical-surface contacts remain enabled in that control. It does not claim equilibrium or energy conservation for the enhanced-merger run.

Separate deterministic tests evolve the enhanced default and seeds 42/731 for one characteristic time at the production timestep. Acceptance: 3–24 mergers per realization, first event before 20 normal-playback seconds, finite numerical state, exact live-count bookkeeping, retained-plus-radiated mass accounting, and independent reset. At scale 0.025 all three produced six mergers, with first events at 2.50, 3.44 and 12.91 normal-playback seconds respectively. These are event-rate design checks, not astrophysical encounter-rate estimates. The desktop browser also verifies an unforced default event and visible flash without moving bodies into contact.
