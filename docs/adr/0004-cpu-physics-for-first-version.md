# Calculate first-version physics on the CPU

The first iteration has 100 mutually gravitating bodies, so we use double-precision CPU direct summation and fixed-step leapfrog, with WebGPU reserved for rendering. The user chose the simpler, independently verifiable physics engine over implementing GPU compute immediately. Numerical state is separate from presentation so a later solver can replace direct summation without rewriting the camera and interface; scaling to large populations is not promised by this choice.
