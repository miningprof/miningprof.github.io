/**
 * Utility Functions for Interactive Stats
 */

const Utils = {
    // Generate a random number from a Uniform distribution [min, max]
    randomUniform: (min, max) => {
        return Math.random() * (max - min) + min;
    },

    // Generate a random number from a Custom distribution
    // Strategy: Rejection sampling or Inverse Transform if CDF is known.
    // For this app, we might stick to specific predefined shapes.

    // Generate data for a "Skewed" distribution (e.g., Exponential-ish)
    randomSkewed: () => {
        // Simple approximation: square a random number
        // Moves mass towards 0. Range [0, 1]
        let r = Math.random();
        return r * r;
    },

    // Generate data for a "Bimodal" distribution
    randomBimodal: () => {
        // 50% chance of being around 0.2, 50% chance of being around 0.8
        let mode = Math.random() < 0.5 ? 0.2 : 0.8;
        // Add some noise
        return mode + (Math.random() * 0.2 - 0.1);
    },

    // Parabolic (U-Shaped) - Inverse Transform Sampling
    // PDF: f(x) = 1.5 * (x - 0.5)^2 * alpha? No, simple U shape: f(x) = 12(x-0.5)^2.
    // Simpler method: Generate 2 randoms, take the one furthest from 0.5?
    // Beta distribution with alpha=0.5, beta=0.5 is U-shaped.
    // Simple heuristic: 
    randomParabolic: () => {
        // x^3 transform pushes to edges? 
        // Let's use simple rejection sampling for exact shape or a mix.
        // Quick hack: Power to push to edges. 
        // return Math.random() > 0.5 ? Math.pow(Math.random(), 0.3) : 1 - Math.pow(Math.random(), 0.3);

        // Better: Beta(0.5, 0.5) approximation
        // Using two uniforms: sin^2(pi * u / 2)
        let u = Math.random();
        return Math.pow(Math.sin(Math.PI * u / 2), 2);
    },

    // Triangular Distribution (Peak at 0.5)
    randomTriangular: () => {
        // Sum of two uniforms / 2 results in Triangle
        return (Math.random() + Math.random()) / 2;
    },

    // Step / Skyline (Random Crazy)
    // 3 distinct steps: Low [0-0.3], Med [0.3-0.6], High [0.6-1.0] with different densities
    randomStep: () => {
        let r = Math.random();
        if (r < 0.5) {
            // 50% chance to be in first 30% range (Dense)
            return Math.random() * 0.3;
        } else if (r < 0.8) {
            // 30% chance to be in middle (Medium)
            return 0.3 + Math.random() * 0.4; // 0.3 to 0.7
        } else {
            // 20% chance to be in top (Sparse)
            return 0.7 + Math.random() * 0.3;
        }
    },

    // Average of an array
    mean: (arr) => {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
};
