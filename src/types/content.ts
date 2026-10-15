/**
 * Wondarta content model.
 *
 * Every human-readable field is language-keyed ({ en, fr, ar }) from day one.
 * Premade scene content lives in src/content/scenes/<id>/facts.json, is written
 * and human-reviewed at build time, and is NEVER generated live.
 */

export const LANGS = ['en', 'fr', 'ar'] as const;
export type Lang = (typeof LANGS)[number];
export type LText = Record<Lang, string>;

/**
 * curated      – written + human-reviewed by Wondarta editors (locked facts.json)
 * ai-grounded  – AI phrasing constrained to a cited source (locked facts or
 *                retrieved Wikipedia text) and machine-checked against it
 * ai-generated – AI text with no verifiable source; never used for facts
 */
export type SourceType = 'curated' | 'ai-grounded' | 'ai-generated';

export interface SourceMeta {
  provider: 'wondarta-editors' | 'wikipedia' | 'gemini' | 'groq';
  /** Wikipedia edition the text was grounded in ('simple' = Simple English). */
  wikiLang?: Lang | 'simple';
  url?: string;
  title?: string;
  /** Set when no reasonable local-language article existed and we translated. */
  translatedFrom?: 'en' | 'simple';
  basedOnFactIds?: string[];
}

export type ContentType = 'video' | 'quiz' | 'puzzle' | 'narration' | 'audio-match';

export type PuzzleType =
  | 'sort-match'
  | 'photo-to-label-match'
  | 'name-that-x'
  | 'drag-to-label'
  | 'riddle'
  | 'rebus'
  | 'logic-grid'
  | 'odd-one-out'
  | 'pattern-series'
  | 'cipher'
  | 'construction'
  /** Concentration: turn two cards over to match a picture with its name. */
  | 'memory-pairs'
  /** Atlas game: tap the continent an animal comes from. */
  | 'map-find'
  /** Listen to a real recording, pick the animal making it. */
  | 'sound-match'
  /** Build a flower part by part, from the roots up and the outside in. */
  | 'build-flower'
  /** Put real organs back into a body, in 3D. */
  | 'body-build'
  /** Lightbot-style route commands (Games & Fun Stuff coding mini-scene). */
  | 'command-route'
  /** hands-on mini-games: move, brush, tap in rhythm, slide */
  | 'arcade'
  /** listen to an instrument, then find its country on the map */
  | 'listen-map';

import type { ModelId } from '../models';
import type { ContinentId } from '../content/geo';

/** A 3D model (always available, also rendered as a thumbnail); wikiImage upgrades to a real photo when online. */
export interface Media {
  model: ModelId;
  /** English Wikipedia article whose lead image may be shown (with credit). */
  wikiImage?: string;
}

export interface Fact {
  id: string;
  text: LText;
  /** Where the fact was checked (for human reviewers). */
  sources?: string[];
}

export interface GlossaryEntry {
  /** Surface forms that trigger this entry, per language (lowercase). */
  terms: Record<Lang, string[]>;
  definition: LText;
}

export interface Quiz {
  question: LText;
  choices: LText[];
  answerIndex: number;
  factId: string;
}

// ---------- puzzle shapes ----------

interface PuzzleBase {
  /** Short instruction line shown above the puzzle. */
  prompt: LText;
  factIds: string[];
}

export interface SortMatchPuzzle extends PuzzleBase {
  type: 'sort-match';
  bins: { id: string; label: LText }[];
  /** Pool is larger than `show` so "I want more!" can recombine locally. */
  items: { id: string; label: LText; media: Media; bin: string }[];
  show: number;
}

export interface PhotoToLabelPuzzle extends PuzzleBase {
  type: 'photo-to-label-match';
  pairs: { id: string; label: LText; media: Media }[];
  show: number;
}

export interface NameThatXPuzzle extends PuzzleBase {
  type: 'name-that-x';
  rounds: { id: string; media: Media; choices: LText[]; answerIndex: number }[];
  show: number;
}

export interface DragToLabelPuzzle extends PuzzleBase {
  type: 'drag-to-label';
  diagram: 'plant' | 'body';
  /** Slot coordinates are percentages of the diagram box. */
  slots: { id: string; x: number; y: number; label: LText; hint: LText }[];
}

export interface SoundMatchPuzzle extends PuzzleBase {
  type: 'sound-match';
  /** Each animal: a real recording in public/audio/animals/<sound>.mp3. */
  animals: { id: string; label: LText; media: Media; sound: string; note: LText; factId: string }[];
  /** Rounds per play; each round offers `choices` pictures. */
  show: number;
  choices: number;
}

export interface ListenMapPuzzle extends PuzzleBase {
  type: 'listen-map';
  /** Each instrument: a recording in public/audio/instruments/<sound>.mp3 and its home country. */
  rounds: { id: string; sound: string; instrument: LText; country: LText; pin: { lat: number; lon: number }; note: LText; factId: string }[];
  show: number;
}

export type ArcadeGame = 'krill-gulp' | 'pollinate' | 'fossil-dig' | 'steady-race' | 'keep-up' | 'camouflage' | 'treasure' | 'pinhole' | 'jigsaw' | 'stalk' | 'tadpole' | 'sun-track' | 'xray' | 'bug-hunt' | 'dots';

/** A game played with the hands, not answered. The prompt is the only text it needs. */
export interface ArcadePuzzle extends PuzzleBase {
  type: 'arcade';
  game: ArcadeGame;
}

export type FlowerPartId = 'roots' | 'stem' | 'leaves' | 'sepals' | 'petals' | 'stamens' | 'pistil';

export interface BuildFlowerPuzzle extends PuzzleBase {
  type: 'build-flower';
  /** In building order: from the ground up, then from the outside of the flower in. */
  parts: { id: FlowerPartId; label: LText; job: LText; factId: string }[];
}

export type OrganId = 'brain' | 'lungs' | 'heart' | 'liver' | 'stomach' | 'kidneys' | 'small-intestine' | 'large-intestine';

export interface BodyBuildPuzzle extends PuzzleBase {
  type: 'body-build';
  /** In building order. Each is a real BodyParts3D organ in public/models/body/<id>.glb. */
  organs: { id: OrganId; label: LText; job: LText; factId: string }[];
}

export interface MapFindPuzzle extends PuzzleBase {
  type: 'map-find';
  /** Continents offered as tappable areas; the same set for every round. */
  options: ContinentId[];
  rounds: {
    id: string;
    media: Media;
    question: LText;
    answer: ContinentId;
    /** Real places to pin once the round is solved. */
    pins: { lat: number; lon: number }[];
    /** One line of atlas detail shown after the answer. */
    note: LText;
    factId: string;
  }[];
}

export interface MemoryPairsPuzzle extends PuzzleBase {
  type: 'memory-pairs';
  /** Each pair becomes two cards: the picture and the word. */
  pairs: { id: string; label: LText; media: Media }[];
  show: number;
}

export interface OddOneOutPuzzle extends PuzzleBase {
  type: 'odd-one-out';
  options: { id: string; label: LText; media: Media }[];
  answerId: string;
  explanation: LText;
}

export interface PatternSeriesPuzzle extends PuzzleBase {
  type: 'pattern-series';
  sequence: { label: LText; media: Media }[];
  choices: { id: string; label: LText; media: Media }[];
  answerId: string;
}

export interface RiddlePuzzle extends PuzzleBase {
  type: 'riddle';
  riddle: LText;
  choices: LText[];
  answerIndex: number;
}

export interface RebusPuzzle extends PuzzleBase {
  type: 'rebus';
  /** Rendered as real 3D objects in-scene; ids map to low-poly models. */
  parts: ('star' | 'sea' | 'sun' | 'flower')[];
  choices: LText[];
  answerIndex: number;
}

export interface CipherPuzzle extends PuzzleBase {
  type: 'cipher';
  /** Plain word per language; the encoded form is computed, never hand-typed. */
  plain: LText;
  shift: number;
  choices: LText[];
}

export interface ConstructionPuzzle extends PuzzleBase {
  type: 'construction';
  /** Each target is built by dropping parts into its slots (order-free). */
  targets: { id: string; label: LText; swatch: string; needs: string[] }[];
  parts: { id: string; label: LText; swatch: string }[];
}

export interface CommandRoutePuzzle extends PuzzleBase {
  type: 'command-route';
  grid: string[]; // 'S' start, 'G' goal, '#' wall, '.' floor
  startDir: 'N' | 'E' | 'S' | 'W';
  maxCommands: number;
}

export interface LogicGridPuzzle extends PuzzleBase {
  type: 'logic-grid';
  rows: LText[];
  cols: LText[];
  clues: LText[];
  solution: Record<number, number>;
}

export type Puzzle =
  | SortMatchPuzzle
  | PhotoToLabelPuzzle
  | NameThatXPuzzle
  | DragToLabelPuzzle
  | MemoryPairsPuzzle
  | MapFindPuzzle
  | SoundMatchPuzzle
  | BuildFlowerPuzzle
  | BodyBuildPuzzle
  | OddOneOutPuzzle
  | PatternSeriesPuzzle
  | RiddlePuzzle
  | RebusPuzzle
  | CipherPuzzle
  | ConstructionPuzzle
  | CommandRoutePuzzle
  | LogicGridPuzzle
  | ArcadePuzzle
  | ListenMapPuzzle;

export interface AudioMatch {
  prompt: LText;
  /** Each clip is spoken with Web Speech TTS in `speakLang`; `text` is also shown as a caption. */
  clips: { id: string; text: string; speakLang: string; answer: LText }[];
  factIds: string[];
}

export interface VideoSpec {
  /** English Wikipedia article whose media list is searched for a Commons video. */
  wikiArticle: string;
  /** Fallback "picture show" frames, each tied to a locked fact. */
  frames: { media: Media; factId: string }[];
}

/** The atlas panel on a hotspot card: where this thing lives, and on what map. */
export interface Origin {
  continents: ContinentId[];
  /** One child-sized sentence naming the real range. */
  where: LText;
  pins: { lat: number; lon: number }[];
  sources?: string[];
}

export interface Hotspot {
  id: string; // globally unique: "<sceneId>/<slug>"
  title: LText;
  zone?: string;
  position: [number, number, number];
  contentType: ContentType;
  narration: LText;
  learnMore: LText;
  funFact: LText;
  linkedTopics: string[];
  sourceType: SourceType;
  factIds: string[];
  /** Search phrase for the matching-language Wikipedia (Learn More grounding). */
  wikiQuery: LText;
  /** Pre-written in-character line; used whenever the LLM is asleep. */
  mascotLine: LText;
  /** "Where in the world" panel (animals, plants, places). */
  origin?: Origin;
  quiz?: Quiz;
  /** Extra curated questions: a quiz hotspot plays as a short run (MindMaze / Encarta quiz style). */
  moreQuestions?: Quiz[];
  puzzle?: Puzzle;
  video?: VideoSpec;
  audioMatch?: AudioMatch;
}

export interface ReviewRecord {
  status: 'pending-human-review' | 'reviewed';
  reviewers: string[];
  lastReviewed: string | null;
  notes?: string;
  factCheck?: { date: string; method: string };
}

export interface SceneFacts {
  sceneId: string;
  category: CategoryId | 'mascot-room';
  title: LText;
  intro: LText;
  review: ReviewRecord;
  facts: Fact[];
  glossary: GlossaryEntry[];
  hotspots: Hotspot[];
}

export const CATEGORY_IDS = [
  'animals',
  'science',
  'sports',
  'arts',
  'reading',
  'people',
  'places',
  'history',
  'social',
  'games',
  'ocean',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type SceneId = 'hub' | 'mascot-room' | CategoryId;

/** Any piece of content shown in a card, with its provenance. */
export interface SourcedText {
  text: string;
  sourceType: SourceType;
  sourceMeta: SourceMeta;
}
