# Wondarta

A walkable 3D encyclopedia for kids. You walk through a topic instead of clicking through slides.
It's inspired by Encarta Kids/Junior, MindMaze, Zoombinis, Periplus, Braingle and Different Strokes.

The whole stack is free and open source, with no credit card anywhere. It runs light in the browser first and is structured to be wrapped with Tauri later.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Everything works **without any API keys**: all 11 category portals, every hotspot, quiz, puzzle, narration, and the Mascot Room's Play and Sleep modes. The LLM features (mascot chat, "Ask about anything", "I want more!" variants and Wikipedia-grounded Learn More) turn on when you add free-tier keys:

```bash
cp .env.example .env.local   # then fill GROQ_API_KEY and GEMINI_API_KEY
```

The keys are read **only by the Vite dev proxy** (`vite.config.ts`) and are never inlined into the client bundle.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with the `/api/groq` and `/api/gemini` key-injecting proxy |
| `npm run build` | Validates all locked content, type-checks, then builds `dist/` |
| `npm test` | Accuracy-guard unit tests + content validation |
| `npm run validate:content` | Structural checks on every `facts.json` |

### The Great Hall

The hub is the room kids see first, so it is dressed: the floor is one inlaid
medallion texture (`hallFloorTexture`) with a pale walkway running to each
doorway and a warm amber one to Wondoo's Den, a planted ring circles the
colonnade, and the fountain has flowing water and two fish in it. The ornament
lives in `src/scenes/hubDecor.tsx` — garden ring, drifting petals, butterflies,
pennants, lamp posts, benches, planters — and every piece of it is trimmed or
dropped on the low graphics tier. Lamp posts glow with an emissive globe and a
painted pool of light rather than real point lights, which each cost every lit
pixel in the scene.

### Real models, real sounds, real anatomy

- **Animals and flowers** are downloaded models with true proportions (Poly Pizza, CC BY 3.0 / public domain), loaded by `src/models/real.tsx`. The old procedural toys stay as the instant placeholder while a file streams in, and card pictures switch to the real model once it has loaded.
- **Organs** come from BodyParts3D, built from MRI scans (CC BY-SA 2.1 JP). Every organ keeps its true place in one body frame, so they assemble into a torso with no hand placement: the Science room shows them in a turning glass anatomy torso, and *Build a Body* has kids put them back one by one.
- **Sounds** in *Sound Safari* are real field recordings (BigSoundBank CC0, Wikimedia Commons).

New game types: `sound-match` (Sound Safari), `build-flower` (build a flower from the roots up and the outside in), `body-build` (3D, lazy-loaded). Hotspot cards are split into **Learn / Where / Play** tabs so a child sees one thing at a time.

### The atlas layer

Children's atlases put the animal on the map, so Wondarta does too. Hotspots can carry
an `origin` block (continents, one sentence of real range, and map pins in latitude and
longitude); the card then shows a **Where in the world** panel with those pins dropped on
a world map. The map in `public/images/map/world.png` is cropped to exactly the
-180..180 / -90..90 frame, so `src/content/geo.ts` turns a coordinate into a percentage
with nothing but arithmetic — a pin lands where the place really is. The `map-find`
puzzle (Animals → *Where in the World?*) is the game built on it: an animal, a map, and
"tap the continent it comes from".

### The Great Aquarium

Marine life is its own portal (`ocean`). Instead of a room, it is a walk across the
floor of a huge tank: a gradient of water from bright surface to deep blue, sunlight
shafts, a reef of coral and anemones, a kelp forest, schools of instanced fish, drifting
jellyfish and a blue whale making a slow pass overhead (`src/scenes/Aquarium.tsx`).
Its five hotspots are curated and sourced like every other scene.

### Living animals

Animals in the Living World are `<Critter>`s (`src/three/Critter.tsx`), not statues:
they breathe, graze, hop or sway, turn their heads when you walk within a few metres,
and react when tapped with a hop, a sound and a line from Wondoo. Every motion is one
group transform per frame — no skeletons, no animation clips — so a meadow of animals
costs what a meadow of statues did.

### Activities and the play stage

Reading and playing are separate: a hotspot card shows what there is to read, then a
**Let's play!** button opens the activity on a near-full-screen stage
(`src/ui/PlayStage.tsx`), which is where drag-and-drop puzzles get room to breathe.
Puzzle types live in `src/types/content.ts` and are rendered by
`src/activities/puzzles/PuzzleRouter.tsx`.

Every card ends in a hands-on game, not a question list. The 27 `arcade` games
(`src/activities/puzzles/Arcade.tsx`) each act out a fact from their card, and many
reuse a game kids already know with a new theme: Snake as a hungry caterpillar,
Breakout with a white blood cell, Flappy Bird with a pterosaur, Simon with colours,
a penalty shoot-out, a Moon lander, a pyramid stacker, a letter catcher, a recycling
sorter, a robot maze and a dinosaur runner. Others steer a blue whale through krill,
carry pollen as a bee, creep up on a zebra as a lion or flip a candle's image through
a pinhole as Ibn al-Haytham did. Most boards are small lit 3D worlds with grass,
water, shadows and the same models the worlds use (`src/activities/puzzles/Board3D.tsx`).
Five stay flat on purpose: the fossil dig, the Mona Lisa jigsaw, the X-ray (BodyParts3D
scans), stroke-order writing and the instrument map.
The old questions stay as an optional "Bonus questions" round.
Fewer slips earn more stars (up to 3 per card).

### Voices and listening, built in

Wondarta does not depend on the voices or languages installed on a computer.

- **Reading aloud** uses neural Piper voices that run inside the app, in a background thread (`src/audio/voice.worker.ts`): English (public domain), French (CC BY 4.0) and Modern Standard Arabic. Each voice (about 63 MB) downloads the first time a card is opened, stays loaded in memory, and is cached in the browser for next time. After warm-up the first word comes in about a second.
- **Talking to Wondoo**: the mic button records the child, and Whisper base (MIT) turns speech into text on the device (`src/audio/listen.worker.ts`). Audio never leaves the computer. The model (about 120 MB) downloads on the first tap, with progress shown.
- **Say Hello** plays real people recorded for Lingua Libre instead of synthetic voices.
- The site sends COOP/COEP headers so Chrome and Edge can run the engines on several CPU threads.
- Known gap: the Arabic voice's dataset licence is not stated by its author (see CREDITS.md), and Arabic speech recognition with Whisper base is noticeably weaker than English or French.

### Wondoo's welcome

On a first visit Wondoo asks for the explorer's language and first name, then walks
through how the place works in eight short steps (walking, doorways, cards, stars,
asking, getting home), lighting up each part of the screen as it talks about it
(`src/ui/Welcome.tsx`). After that Wondoo greets the child by name, and praise lines
use the name too. The tour can be replayed from the settings cog, and grown-ups can
"Start over" there to clear the name and progress on that device.

### Accurate art for the human body

The Body Map puzzle uses real anatomical illustrations from **Servier Medical Art**
(CC BY 4.0) over a neutral body outline: brain, lungs, heart, stomach and small
intestine, in `public/images/servier/`. The organ positions live next to the drop-slot
coordinates in `src/activities/puzzles/Matching.tsx` and `science/facts.json`, so the
art and the answers stay in step. The credit line renders under the puzzle, which is
what CC BY asks for.

### Performance

The scenes are fill-rate bound, so quality is decided at runtime (`src/three/quality.ts`):
the drawing buffer is capped at ~2.3 Mpx however large the window is, drei's
`PerformanceMonitor` tunes the pixel ratio inside that cap, and a sustained shortfall
drops to a `low` tier (fewer bubbles, no sparkles, thinner scatter, smaller shadow map).
Grown-ups can force it from the hub's cog: **Picture → Smooth**. Materials avoid
clearcoat/iridescence/sheen — the Frutiger Aero gloss comes from the environment map
instead, which is far cheaper per pixel.

Controls: **WASD / ZQSD** to walk and strafe, **arrow keys** to walk and turn (the keyboard alone is enough — no mouse needed), **Shift** to run, **drag** to look, **tap the floor** to walk there. Walk into a glowing doorway to enter it, and walk into (or click) a lens-flare marker to open a hotspot. In Wondoo's Den everything happens in the room: tap Wondoo to pet him or wake him, tap the ball to play, tap the nest to say goodnight, or use the small "Talk" action next to him.

## Deploy (live demo)

The repo is ready for [Vercel](https://vercel.com): `vercel.json` builds the Vite app and
routes `/api/groq/*` and `/api/gemini/*` to two small serverless functions in `api/`.

1. Import the GitHub repo in Vercel (framework: Vite, no settings to change).
2. Add two environment variables: `GROQ_API_KEY` and `GEMINI_API_KEY` (both free tier).
3. Deploy. The keys stay on the server; the browser only ever calls `/api/...`.

Without the keys the site still works: every world, fact, quiz and game is curated and
offline. Only the three AI features (chat with Wondoo, "Ask about anything", Wikipedia
"Learn more") switch off, and Wondoo naps instead.

The relay (`api/_relay.js`) only forwards the two calls the app makes, caps reply size,
and limits each visitor to 20 requests a minute.

## Team

| Name | What they built |
| --- | --- |
| _TODO: full name_ | _TODO: one honest line_ |
| _TODO: full name_ | _TODO: one honest line_ |

AI tools used: _TODO (required by the submission rules; list them plainly)._

## Architecture

```
src/
  types/content.ts          content model (every text field is { en, fr, ar })
  content/
    scenes/<id>/facts.json  LOCKED, human-reviewed content, one per category
    loader.ts               bundles facts at build time + dictionary lookup
  three/                    shared 3D systems
    SceneShell.tsx          player + mascot + hotspots + exit portal (used by EVERY scene)
    Player.tsx              first-person walker (keys, drag-look, tap-to-walk)
    Hotspot.tsx, Portal.tsx lens-flare markers, glowing doorways
    Mascot.tsx              Wondoo (follow / stay / sleep, reactions, speech bubble)
  scenes/
    Hub.tsx                 walkable atrium: 10 category portals + separate Den portal
    MiniScene.tsx           the reusable mini-scene template
    themes.tsx              9 reskins of the template (colours + decor only)
    LivingWorld.tsx         FLAGSHIP (Animals): savanna, forest, pond
    MascotRoom.tsx          Wondoo's Den (Play / Chat / Sleep)
  activities/               quiz, video, audio-match + 12 puzzle types
  llm/                      transport (rate limits, quota → sleep), prompts, guards
  wiki/wikipedia.ts         retrieval: search → intro extract, per-language editions
  ui/                       glass card, HUD, Ask panel, badges, clickable narration
  i18n/                     react-i18next UI strings (en / fr / ar)
```

**Reuse is the point.** The flagship and all nine mini-scenes run on the same `SceneShell`, `Hotspot`, `InfoCard` and activity components. Adding a category means adding a `facts.json` and a theme entry.

## Content accuracy system

This is Wondarta's "safe browser", the curated-database approach Encarta used.

| Content | Source | `sourceType` | Guarantee |
| --- | --- | --- | --- |
| Narration, hotspot facts, base quizzes/puzzles, fun facts, glossary | `facts.json` | `curated` | Never generated live. Bundled at build time. |
| "I want more!" quiz | Gemini, restricted to the scene's facts | `ai-grounded` | Validated: the answer must be copied from the cited fact, no distractor may appear in it, and no invented numbers. On failure it falls back to curated. |
| "I want more!" puzzle | Local recombination of the curated pool + Gemini rephrasing the instruction only | `curated` / `ai-grounded` | The puzzle data itself is never AI-made. |
| Ask about anything / Learn More / dictionary lookups | Wikipedia retrieval → Gemini may only restate it | `ai-grounded` + citation | Every number must appear in the source, and most content words must too. On failure it says so honestly. |
| Mascot quiz framing | Groq | shown as the mascot's line | Must contain no numbers and must not reveal the answer; otherwise the pre-written line is used. |
| Mascot Room chat | Groq, JSON: `{say, factId, askRecall}` | `ai-generated` (glue) + `curated` (fact) | The model **never states facts**. It picks a fact id and our code inserts the curated text verbatim. Recall questions come from curated quizzes and are graded locally. |

Every card shows a small icon tag: *Checked by editors*, *AI, from a source*, or *AI chat*.

### Fact-check trail

Every fact was compared against web sources on 2026-09-19. Where a claim needed checking, the source links are stored on the fact itself (`facts[].sources`), so reviewers can follow them. That pass corrected six facts:

- "Birds are the only animals with feathers" became "the only animals **alive today** with feathers", because many dinosaurs had feathers.
- "Most dinosaurs died out 66 million years ago" became "**all except birds**".
- "An owl can turn its head about 270°" became "**many** owls can…".
- "Frogs take in some air through their skin" became "take in **oxygen**…".
- "The Sun rises in the east" became "rises in the **eastern part** of the sky". It rises due east only at the equinoxes.
- "Ada Lovelace… in the 1840s" became "**in 1843**".

### Review workflow (required before release)

Each `facts.json` has a `review` block. On 2026-10-09 every fact was searched on the web and compared with independent sources; the links sit next to each fact in `sources`. Facts that did not match were corrected (for example the Great Barrier Reef length and the heaviest blue whale heart). The French and Arabic text has not been read by a native speaker yet. Notes are in each file's `review.notes`; for example, the Arabic collective noun for a pride of lions (زُمْرة) should be confirmed.

## Internationalization

- Every content field is `{ en, fr, ar }`, and the validator fails the build if any language is missing.
- `dir="rtl"` is set on `<html>` for Arabic. The CSS uses logical properties only (`inset-inline-*`, `margin-block-*`), so glass panels, cards and the HUD mirror automatically. Maps and diagrams (the robot grid, drag-to-label diagrams) intentionally stay left-to-right.
- The dictionary tooltip uses `Intl.Segmenter`, and Arabic lookup strips diacritics and common prefixes (ال، و، ب، ل…).
- Wikipedia grounding queries fr/ar.wikipedia.org first. It falls back to Simple/English Wikipedia plus translation only when no local article matches, and the result is flagged "Translated from English Wikipedia".
- Fonts: IBM Plex Sans and IBM Plex Sans Arabic (OFL), bundled locally via `@fontsource`.
- TTS uses the Web Speech API for EN/FR/**MSA**. Dialect narration must be human recordings (see the comment in `src/audio/tts.ts`). Arabic voice availability depends on the OS; on Windows, install the Arabic speech pack.

## Privacy

- No accounts, no tracking, no analytics, no ads.
- The child's first name, stars and visited cards are stored only in the browser's
  `localStorage` on that device. The name is never sent to an AI provider or any server.
- AI requests (when keys are configured) go through our own relay, which holds the keys,
  allows only the two calls the app makes and rate-limits each visitor.
- Grown-ups can clear everything from Settings, "Start over".

## Usage shape (business logic only, no payments)

- "Ask about anything" allows **3 uses per free session** (`FREE_ASKS_PER_SESSION` in `src/state/store.ts`). `plan: 'unlimited'` is the hook for a future subscription.
- Mascot Room chat and Play are **not** counted against that limit. They are bounded only by the free API tier.
- The client-side rate limiter keeps Gemini under about 12 RPM and Groq under about 25 RPM. Any 429 or quota response flips the provider to `exhausted`, which is the automatic trigger for Wondoo's **Sleep** state. There are zero API calls while asleep, and every scene keeps working.
- A persisted tally (days visited, topics explored) lives in `localStorage` and is wrapped in try/catch.

## Quiz design (adapted from Encarta and MindMaze)

- A quiz hotspot plays as a short run of three curated questions. Wondoo, standing in the scene, asks each one, as the room characters did in MindMaze.
- Answers use lettered answer keys (A–D, or أ–د in Arabic). Keys **1–4** answer from the keyboard.
- Speed earns up to 3 stars per question, like MindMaze's speed points, but a correct answer always earns at least 1 star.
- A **hint** removes one wrong answer, like MindMaze's lifelines. It costs 1 star.
- Every correct answer shows the question's own curated fact ("Did you know?"). This follows Encarta, where every quiz linked back to its article; "Read more" opens the full article text.
- A results screen shows the star rating and the hotspot's fun fact, with an "I want more!" button.

## Assets

See **[CREDITS.md](CREDITS.md)** for full attribution. The app also has a Credits panel, behind the small cog on the hub (the same quiet menu holds the language switch, so kids see fewer controls).


- **3D:** `src/models/` holds 56 procedural "toy" models: animals, dinosaurs, sports gear, organs and portal emblems. They are built in code from cached primitives, so there are zero downloads. Each model is baked once into one mesh per material (about 4–8 draw calls per animal) and cloned for every instance. The same models render the picture thumbnails used in puzzles when there is no Wikimedia photo (for example, offline). The app uses no emoji anywhere; UI icons come from `lucide-react` (tree-shaken). Kenney CC0 packs are used for set dressing: see the next bullet. Shap-E/TripoSR generation is future work.
- **Kenney (CC0):** 39 **Nature Kit** models (trees, rocks, plants, logs, lily pads and more) dress the scenes. They are recoloured by material name to match our palette. 5 animated **Cube Pets** are Wondoo's plush friends in the Den; tap one and it dances. **Interface Sounds** and **UI Audio** provide the UI sounds, mapped in `public/audio/manifest.json`. Only the files used are shipped (about 1.3 MB), each scene loads its own models lazily, and Kenney's license files sit next to the assets.
- **Lighting:** image-based lighting comes from a few light panels rendered once into a cube map, so no HDR file is downloaded. Contact shadows are rendered once per scene. There is no post-processing pass. The Living World measured 59 fps, 130 draw calls, on the dev machine.
- **Audio:** Kenney CC0 UI sounds (see above). The WebAudio synth is still the fallback if a file fails to load.
- **Photos/video:** optional, fetched from Wikipedia/Wikimedia Commons when online and always credited. The Mona Lisa and portraits are public-domain Commons images. The owl hotspot uses a Commons video when one exists; otherwise it shows a picture show of curated facts.

## Tauri (desktop) path

The app already uses relative asset paths (`base: './'`) and hash-free in-memory routing, so `dist/` works inside a native webview as-is. To wrap it:

1. `npm create tauri-app` (or `npm i -D @tauri-apps/cli && npx tauri init`) with `frontendDist: ../dist`.
2. Keep keys out of the webview: expose a Rust command (or a tiny local relay) that serves `/groq/*` and `/gemini/*` with the keys attached, and set `window.__WONDARTA_API_BASE__` to it (see `src/llm/transport.ts`).
3. Note that WebKit (macOS/Linux) may not play Commons WebM video. The picture-show fallback covers that case.

## Known gaps / next steps

- A native-speaker read of the French and Arabic text (see above).
- The LLM paths could not be exercised end to end during development (no keys were configured). The guards are unit-tested, and the no-key fallbacks were verified in the browser.
- A `logic-grid` puzzle component exists, but no scene uses it yet.
- Mini-scenes mix procedural models with Kenney set dressing. TripoSR / Shap-E generation for on-demand topics is still future work.
- A plain static host has no LLM relay, so Wondoo sleeps for AI features there. On Vercel the relay in `api/` turns them on once the two keys are set (see Deploy).
- Game boards use the worlds' low-poly models; only the X-ray (scanned organs) and the fossil dig (a 1905 museum drawing) are true to life. The lion game shows a maned lion because no free lioness model exists yet.
