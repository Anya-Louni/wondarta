# Credits

Wondarta is built on free and open work by these creators. Thank you!

## Kenney (www.kenney.nl)

3D models and sounds by **Kenney**, released under
[Creative Commons Zero (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/).
CC0 doesn't require credit, but Kenney deserves it. You can support him at <https://www.kenney.nl/donate>.

| Pack | Used for | Link | Files in this repo |
| --- | --- | --- | --- |
| Nature Kit | Trees, rocks, bushes, flowers, mushrooms, logs, lily pads, canoe, statues, fences, signs (recoloured to Wondarta's palette) | <https://kenney.nl/assets/nature-kit> | `public/models/kenney/nature/` (39 models) |
| Cube Pets | Wondoo's plush friends in the Den (lion, panda, bunny, elephant, penguin) | <https://kenney.nl/assets/cube-pets> | `public/models/kenney/pets/` (5 models + texture) |
| Interface Sounds | Open, drop, correct, wrong, portal and giggle sounds | <https://kenney.nl/assets/interface-sounds> | `public/audio/kenney/interface-sounds_*.ogg` |
| UI Audio | Click sound | <https://kenney.nl/assets/ui-audio> | `public/audio/kenney/ui-audio_*.ogg` |

Kenney's original license files ship alongside the assets:
`public/models/kenney/LICENSE_*.txt` and `public/audio/kenney/LICENSE_*.txt`.

Only the files the app uses are included, and the Nature Kit models are recoloured at load time. The geometry is Kenney's.

## Realistic animal and flower models (Poly Pizza)

The animals in the Living World, the atlas animals and the flower meadow are downloaded
models with real proportions, replacing the earlier procedural toys (which remain as the
instant placeholder while a file loads). Files are in `public/models/real/`, re-encoded
with gltf-transform (quantized, textures as WebP); the shapes are the authors' own.
"CC-BY 3.0" models require this credit: *model by the named author, via Poly Pizza,
licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)*.

| File | Model | Author | License | Source |
| --- | --- | --- | --- | --- |
| `elephant.glb` | Elephant | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/a27MA0rXyyj> |
| `lion.glb` | Lion | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/3XAJojWxSWz> |
| `giraffe.glb` | Giraffe | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/80w8kwQU0QH> |
| `zebra.glb` | Zebra | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/8Ut7mhb-aqK> |
| `rhino.glb` | Rhinoceros | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/11qk1uy0YGH> |
| `hippo.glb` | Hippopotamus | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/eau2X1phgjJ> |
| `fox.glb` | Fox | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/10u8FYPC5Br> |
| `deer.glb` | Deer | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/fUo4AIcd8XR> |
| `rabbit.glb` | Cottontail rabbit | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/3vvONbRCuEF> |
| `owl.glb` | Long eared owl | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/dVPHzmMmXlg> |
| `frog.glb` | Frog | Quaternius | Public Domain | <https://poly.pizza/m/9Z2V8fpazF> |
| `panda.glb` | Panda | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/2T6A0o4Kq2h> |
| `kangaroo.glb` | Kangaroo | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/7uiVArqEC80> |
| `penguin.glb` | Penguin | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/fBXvsC6pe_V> |
| `sunflower.glb` | Sunflower | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/ce4GXw3VYE5> |
| `tulip.glb` | Tulip | jeremy | CC-BY 3.0 | <https://poly.pizza/m/aho9NdFUBFu> |
| `rose.glb` | Rose | Erbay ÇELIK | CC-BY 3.0 | <https://poly.pizza/m/4UQ29NSK0ir> |
| `daisy.glb` | Daisy | Zsky | CC-BY 3.0 | <https://poly.pizza/m/4r0WBz3RZz> |
| `bee.glb` | Bee | jeremy | CC-BY 3.0 | <https://poly.pizza/m/6ktZgxSVVn1> |
| `monarch.glb` | Monarch Butterfly | Paul Spooner | CC-BY 3.0 | <https://poly.pizza/m/eeO11BVjvsO> |
| `whale.glb` | Whale (blue whale) | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/7-TgeTuwbzw> |
| `octopus.glb` | Octopus | Poly by Google | CC-BY 3.0 | <https://poly.pizza/m/26XWuxd1G4R> |

## Human anatomy: BodyParts3D

The 3D organs in the Science room (the glass anatomy torso and the *Build a Body* game)
are from **BodyParts3D, (c) The Database Center for Life Science, licensed under
[CC Attribution-Share Alike 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en)**.
They were built from MRI scans of a real person; every organ keeps its true shape, size and
place in the same body frame. Source meshes via
<https://github.com/Kevin-Mattheus-Moerman/BodyParts3D> (release 3.0). Cite: Mitsuhashi N.
et al., *BodyParts3D: 3D structure database for anatomical concepts*, Nucleic Acids Res.
2009;37:D782-5.

Files in `public/models/body/` are derived works (merged per organ, simplified,
quantized; the skin was cut to a head-and-trunk torso) and are therefore shared under the
same **CC BY-SA 2.1 JP** licence. The build scripts are described in the README.

## Animal sounds (Sound Safari)

Every clip is a real field recording, trimmed to a few seconds and level-matched.

| File | Recording | Author | License | Source |
| --- | --- | --- | --- | --- |
| `owl.mp3` | Long-Eared Owl #1 | Joseph SARDIN - BigSoundBank.com | CC0 1.0 | <https://bigsoundbank.com/long-eared-owl-1-s0936.html> |
| `frog.mp3` | One frog | Joseph SARDIN - BigSoundBank.com | CC0 1.0 | <https://bigsoundbank.com/one-frog-s0819.html> |
| `bee.mp3` | Bumblebee #1 | Joseph SARDIN - BigSoundBank.com | CC0 1.0 | <https://bigsoundbank.com/bumblebee-1-s1000.html> |
| `cricket.mp3` | Field cricket | Joseph SARDIN - BigSoundBank.com | CC0 1.0 | <https://bigsoundbank.com/field-cricket-s1020.html> |
| `elephant.mp3` | Elephant voice - trumpeting.ogg | தகவலுழவன் | CC0 | <https://commons.wikimedia.org/wiki/File:Elephant_voice_-_trumpeting.ogg> |
| `zebra.mp3` | Grévys zebra (Sound Effects).ogg | DiegoC472 | CC BY-SA 4.0 | <https://commons.wikimedia.org/wiki/File:Gr%C3%A9vys_zebra_(Sound_Effects).ogg> |

BigSoundBank asks, without requiring it, for this line: *Additional sounds: Joseph SARDIN - BigSoundBank.com*.

## Servier Medical Art (smart.servier.com)

The anatomy illustrations in the Science scene's **Body Map** puzzle are by
**Servier Medical Art**, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/):

| File | Servier source page |
| --- | --- |
| `public/images/servier/body.png` | [Male silhouette](https://smart.servier.com/smart_image/male-silhouette/) |
| `public/images/servier/brain.png` | [Brain](https://smart.servier.com/smart_image/smart-brain-overview/) |
| `public/images/servier/heart.png` | [Heart](https://smart.servier.com/smart_image/heart-sagittal/) |
| `public/images/servier/lungs.png` | [Lungs](https://smart.servier.com/smart_image/lungs-11/) |
| `public/images/servier/stomach.png` | [Stomach](https://smart.servier.com/smart_image/stomach-overview/) |
| `public/images/servier/intestine.png` | [Intestine](https://smart.servier.com/smart_image/intestine-overview/) |

They are resized and colour-quantised for the web (107 KB for all six); the drawings
are unchanged otherwise. The credit also appears under the puzzle itself, as CC BY
requires: *"Anatomy art by Servier Medical Art · CC BY 4.0"*.

## Maps

The world map behind the **Where in the world** panels and the atlas game is a cropped,
recoloured version of
[BlankMap-World-Equirectangular](https://commons.wikimedia.org/wiki/File:BlankMap-World-Equirectangular.svg)
from Wikimedia Commons, which is in the **public domain**. It is trimmed so the image is
exactly the -180..180 / -90..90 equirectangular frame, which is what lets Wondarta place
pins from real coordinates. File: `public/images/map/world.png` (34 KB).

## Content sources

- **Wikipedia** (text, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)) is the only retrieval source for AI-grounded answers, and every answer links to its article.
- **Instrument recordings** in Music of the World, from Wikimedia Commons, trimmed to 12 seconds (same licence as the original): didgeridoo, "Didgeridoo sound.ogg" by Cassa342 (CC BY-SA 4.0); sitar, "Sitar clipping.ogg" by Sanath311 (CC BY-SA 3.0); koto, "Koto performance.ogg" by Torsodog (CC BY 3.0); erhu, "江河水.ogg" recorded by David290 (CC BY-SA 4.0); charango, "Charango - cuerdas al aire.ogg" by Ferbr1 (public domain). Files: `public/audio/instruments/`.
- **Mona Lisa** jigsaw image: Leonardo da Vinci, public domain. Photo by C2RMF, retouched, from Wikimedia Commons (<https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg>). File: `public/images/art/mona-lisa.jpg` (117 KB).
- **T. rex skeleton** in the fossil dig: drawing by William D. Matthew, 1905, public domain, from Wikimedia Commons (<https://commons.wikimedia.org/wiki/File:Tyrannosaurus_skeleton.jpg>). File: `public/images/art/trex-skeleton.jpg` (74 KB).
- **Wikimedia Commons** photos and videos (the Mona Lisa, portraits, animal photos, the owl video) are loaded live and credited in the UI. Each file's author and license are on its Commons page.
- The fact-check source links for the curated facts are stored per fact in `src/content/scenes/*/facts.json` (`sources`).

## Free places we point grown-ups to

The Credits panel (behind the hub's cog) links these out. Apart from Servier (above),
nothing from them is bundled yet; they are the sources we draw on when a topic needs
accurate art.

| Source | License | Why it is listed |
| --- | --- | --- |
| [PhET Interactive Simulations](https://phet.colorado.edu) | CC BY 4.0 | Free science and maths simulations, embeddable and open-licensed |
| [BodyParts3D](https://lifesciencedb.jp/bp3d/) / [Z-Anatomy](https://www.z-anatomy.com) | CC BY-SA | Open 3D anatomy meshes built from real MRI data |
| [NIH 3D](https://3d.nih.gov) | per file (much of it public domain) | 3D models of bones, organs, cells and viruses |
| [NOAA Photo Library](https://www.noaa.gov/noaa-collections/photo-library) | Public domain (US government) | Ocean and weather photography |
| [Smithsonian Open Access](https://www.si.edu/openaccess) | CC0 | 5M+ museum images and 3D scans |

## Fonts, icons and libraries

- **IBM Plex Sans** and **IBM Plex Sans Arabic** by IBM, [SIL Open Font License 1.1](https://openfontlicense.org), via Fontsource.
- **Lucide** icons, [ISC License](https://lucide.dev/license).
- **three.js**, **React Three Fiber**, **drei**, **React**, **zustand**, **i18next** / **react-i18next**, **Vite**: MIT License.

## Original work

The procedural "toy" models in `src/models/` (animals, dinosaurs, sports gear, organs, portal emblems), Wondoo the mascot, and all curated facts were made for Wondarta.

## Voices and listening (run inside the app)

- **Reading voices** (Piper text-to-speech, MIT engine by the Rhasspy project, voices from `rhasspy/piper-voices`, served through the `diffusionstudio/piper-voices` mirror on Hugging Face):
  - English, `en_US-kristin-medium`: trained on a LibriVox public-domain reading.
  - French, `fr_FR-siwis-medium`: SIWIS French Speech Synthesis Database, CC BY 4.0.
  - Arabic, `ar_JO-kareem-medium`: trained on the `arabicttstrain` dataset; its licence is not stated by its author. **Must be confirmed or replaced before commercial use.**
- **Phonemizer:** piper-phonemize (MIT) with espeak-ng data (GPL-3.0), loaded at runtime from `@diffusionstudio/piper-wasm`. `src/vendor/piper-phonemize.js` is the loader from `@diffusionstudio/vits-web` (MIT).
- **Speech recognition:** OpenAI Whisper base (MIT), ONNX build `onnx-community/whisper-base`, run with Transformers.js (Apache-2.0) and ONNX Runtime Web (MIT). Audio is processed on the device and never uploaded.
- **Greetings in Say Hello:** Lingua Libre recordings on Wikimedia Commons: LoquaxFR "bonjour" (CC BY-SA 4.0), CaroEspinoza "hola" (CC0), Zinou2go "مَرْحَبًا" (CC BY-SA 3.0), Fukujinzuke "こんにちは" (CC BY 4.0). Files: `public/audio/hello/`.
