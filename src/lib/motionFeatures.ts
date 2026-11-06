/**
 * Motion's animation engine, in its own chunk. `LazyMotion` downloads it after
 * the first paint; until then `m` components render without animating.
 * `domMax` is needed for the shared-layout slide between tabs.
 */
export { domMax } from 'motion/react';
