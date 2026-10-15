import type { Lang, Puzzle } from '../../types/content';

export interface PuzzleProps<P extends Puzzle = Puzzle> {
  puzzle: P;
  lang: Lang;
  /** Changes on "I want more!" so puzzles recombine their curated pool. */
  seed: number;
  onSolved: () => void;
  onWrong: () => void;
  /** Photos from Wikimedia Commons when online (emoji otherwise). */
  photos: boolean;
}

/** Deterministic shuffle so a given seed always yields the same layout. */
export function seeded<T>(xs: T[], seed: number): T[] {
  const a = [...xs];
  let s = (seed * 9301 + 49297) % 233280 || 1;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
