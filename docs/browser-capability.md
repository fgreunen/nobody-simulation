# Local browser capability check

Checked on 2026-11-03 using read-only hardware inspection and a temporary browser compute probe.

## Hardware and browser

- Intel Core i7-1165G7 processor.
- Intel Iris Xe integrated graphics; no dedicated GPU appeared in the adapter inventory.
- Approximately 15.8 GiB physical memory.
- Windows 11, build 26300; Windows reports the system as mobile.
- Installed Chrome: 156.0.8078.80. Installed Edge: 156.0.4314.58.

## Verified result

A fresh headless Chrome profile, without flags to force WebGPU support or a software adapter, successfully exposed WebGPU in a secure context, obtained an Intel gen-12lp adapter, and reported `isFallbackAdapter: false`. A compute shader wrote 42 into a GPU storage buffer; copying and reading that buffer returned 42 as expected.

This verifies a working WebGPU hardware compute path on this machine in the tested Chrome configuration. Edge and the user's existing interactive browser profile were not tested. The probe does not measure cinematic rendering performance, achievable body counts, long-running simulation stability, or display/docking configuration effects.
