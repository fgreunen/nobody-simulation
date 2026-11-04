# Prioritize numerical stability over requested simulation speed

The experience targets integrated-GPU laptops while allowing accelerated simulation time. If a laptop cannot calculate the requested speed within stable numerical limits, simulation time will advance more slowly and the interface will report the achieved speed. Requested fast-forward speed does not justify silently increasing numerical error until orbital behavior breaks down.
