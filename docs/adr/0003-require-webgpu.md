# Require WebGPU for the first version

The simulation targets browser-only GPU computation and cinematic rendering on integrated-GPU laptops. The first version requires WebGPU and explains unsupported configurations rather than maintaining a separate WebGL simulation fallback. A hardware-backed WebGPU compute probe passed on the user's Intel Iris Xe laptop in Chrome; broader compatibility is deferred to keep the initial implementation focused.
