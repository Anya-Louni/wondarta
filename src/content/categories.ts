import type { CategoryId } from '../types/content';
import type { ModelId } from '../models';

/** Visual identity per portal. Names come from i18n (`categories.<id>`). */
export const CATEGORY_STYLE: Record<CategoryId, { color: string; glow: string; emblem: ModelId }> = {
  animals: { color: '#4cc26a', glow: '#b8ffcb', emblem: 'lion' },
  science: { color: '#ff6f91', glow: '#ffd1dc', emblem: 'atom' },
  sports: { color: '#ffa53a', glow: '#ffe2b8', emblem: 'soccer-ball' },
  arts: { color: '#b46cff', glow: '#e6ccff', emblem: 'palette' },
  reading: { color: '#3aa0ff', glow: '#c6e5ff', emblem: 'book' },
  people: { color: '#ff8a5c', glow: '#ffd6c4', emblem: 'bust' },
  places: { color: '#2fc5c0', glow: '#bff5f2', emblem: 'globe' },
  history: { color: '#c9a25a', glow: '#f5e6c4', emblem: 'trex' },
  social: { color: '#5b8cff', glow: '#d0ddff', emblem: 'compass' },
  games: { color: '#ff5ac8', glow: '#ffd0f0', emblem: 'robot' },
  ocean: { color: '#1fa5d6', glow: '#c2f0ff', emblem: 'whale' },
};
