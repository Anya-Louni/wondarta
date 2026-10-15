import type { LText } from '../types/content';

/**
 * Fish that leap out of the hall fountain. The fountain itself is make-believe,
 * but every fish is a real species and every fact was checked (sources below).
 * Rarity is how often a fish jumps, shown by name and colour, never by stars.
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY: Record<Rarity, { weight: number; color: string; name: LText }> = {
  common: { weight: 46, color: '#9fb4c4', name: { en: 'Common', fr: 'Commun', ar: 'شائع' } },
  uncommon: { weight: 26, color: '#4cc46a', name: { en: 'Uncommon', fr: 'Peu commun', ar: 'غير شائع' } },
  rare: { weight: 15, color: '#2f8fe0', name: { en: 'Rare', fr: 'Rare', ar: 'نادر' } },
  epic: { weight: 9, color: '#a05ce6', name: { en: 'Super rare', fr: 'Super rare', ar: 'نادر جدًّا' } },
  legendary: { weight: 4, color: '#f2b21c', name: { en: 'Ultra rare', fr: 'Ultra rare', ar: 'نادر للغاية' } },
};

export interface FishKind {
  id: string;
  rarity: Rarity;
  name: LText;
  fact: LText;
  source: string;
  /** body colour, belly/pattern colour, fin colour; length:height of the body */
  look: { body: string; mark: string; fin: string; long: number; tall: number };
}

export const FISH: FishKind[] = [
  {
    id: 'goldfish',
    rarity: 'common',
    name: { en: 'Goldfish', fr: 'Poisson rouge', ar: 'السمكة الذهبية' },
    fact: {
      en: 'People in China started keeping goldfish as pets about 1,000 years ago.',
      fr: 'En Chine, on a commencé à garder des poissons rouges comme animaux de compagnie il y a environ 1 000 ans.',
      ar: 'بدأ الناس في الصين بتربية السمك الذهبي في بيوتهم قبل نحو ١٠٠٠ سنة.',
    },
    source: 'https://www.ebsco.com/research-starters/zoology/goldfish/',
    look: { body: '#ff8a1f', mark: '#ffc04d', fin: '#ff6a00', long: 1, tall: 0.62 },
  },
  {
    id: 'guppy',
    rarity: 'common',
    name: { en: 'Guppy', fr: 'Guppy', ar: 'سمكة الغوبي' },
    fact: {
      en: 'A guppy mum does not lay eggs: her babies are born already swimming.',
      fr: 'La maman guppy ne pond pas d’œufs : ses bébés naissent en sachant déjà nager.',
      ar: 'أنثى الغوبي لا تضع بيضًا، بل تلد صغارًا تسبح منذ لحظة ولادتها.',
    },
    source: 'https://en.wikipedia.org/wiki/Livebearers',
    look: { body: '#c9d6de', mark: '#7fd3d6', fin: '#ff5aa8', long: 0.8, tall: 0.42 },
  },
  {
    id: 'koi',
    rarity: 'uncommon',
    name: { en: 'Koi', fr: 'Carpe koï', ar: 'سمكة الكوي' },
    fact: {
      en: 'Koi are colourful carp. Farmers in Japan first bred them about 200 years ago.',
      fr: 'Les koïs sont des carpes colorées. Des paysans du Japon les ont élevées pour la première fois il y a environ 200 ans.',
      ar: 'الكوي أسماك شبوط ملوّنة، ربّاها مزارعون في اليابان أول مرة قبل نحو ٢٠٠ سنة.',
    },
    source: 'https://web-japan.org/trends/11_culture/pop202309_nishikigoi.html',
    look: { body: '#fbf6ee', mark: '#ff5a2a', fin: '#fbf6ee', long: 1.3, tall: 0.5 },
  },
  {
    id: 'neon-tetra',
    rarity: 'uncommon',
    name: { en: 'Neon tetra', fr: 'Néon', ar: 'سمكة النيون' },
    fact: {
      en: 'Neon tetras come from streams of the Amazon rainforest in South America. Their blue stripe shines like a neon light.',
      fr: 'Le néon vient des ruisseaux de la forêt amazonienne, en Amérique du Sud. Sa bande bleue brille comme un néon.',
      ar: 'تعيش سمكة النيون في جداول غابة الأمازون بأمريكا الجنوبية، ويلمع خطّها الأزرق كمصباح نيون.',
    },
    source: 'https://en.wikipedia.org/wiki/Neon_tetra',
    look: { body: '#d9433a', mark: '#36b8ff', fin: '#e8f4ff', long: 0.75, tall: 0.36 },
  },
  {
    id: 'clownfish',
    rarity: 'rare',
    name: { en: 'Clownfish', fr: 'Poisson-clown', ar: 'سمكة المهرّج' },
    fact: {
      en: 'A clownfish hides in a stinging sea anemone. A slimy coat keeps it from getting stung.',
      fr: 'Le poisson-clown se cache dans une anémone qui pique. Une couche de mucus le protège des piqûres.',
      ar: 'تختبئ سمكة المهرّج بين لوامس شقائق النعمان اللاسعة، وتحميها طبقة لزجة من اللسع.',
    },
    source: 'https://asknature.org/strategy/mucus-coat-protects-from-sea-anemone/',
    look: { body: '#ff7a1a', mark: '#ffffff', fin: '#1b1b1b', long: 0.9, tall: 0.5 },
  },
  {
    id: 'pufferfish',
    rarity: 'rare',
    name: { en: 'Pufferfish', fr: 'Poisson-globe', ar: 'السمكة المنتفخة' },
    fact: {
      en: 'When it is scared, a pufferfish gulps water until it is a big round ball, too big to swallow.',
      fr: 'Quand il a peur, le poisson-globe avale de l’eau jusqu’à devenir une grosse boule, trop grosse pour être avalée.',
      ar: 'عندما تخاف السمكة المنتفخة تبتلع الماء حتى تصير كرة كبيرة يصعب ابتلاعها.',
    },
    source: 'https://www.brown.edu/news/2020-02-03-0',
    look: { body: '#e8c84a', mark: '#fff6d0', fin: '#c9a53a', long: 0.9, tall: 0.85 },
  },
  {
    id: 'seahorse',
    rarity: 'epic',
    name: { en: 'Seahorse', fr: 'Hippocampe', ar: 'حصان البحر' },
    fact: {
      en: 'A seahorse is a fish, and it is the dad who carries the eggs in a pouch and gives birth.',
      fr: 'L’hippocampe est un poisson, et c’est le papa qui porte les œufs dans une poche et donne naissance aux bébés.',
      ar: 'حصان البحر سمكة، والأب هو الذي يحمل البيض في جيب على بطنه ويلد الصغار.',
    },
    source: 'https://hastingsaquarium.co.uk/blog/animal-stories/do-male-seahorses-give-birth-life-cycle-explained/',
    look: { body: '#ffb347', mark: '#ffe2a8', fin: '#ff9a3c', long: 0.6, tall: 0.9 },
  },
  {
    id: 'mandarinfish',
    rarity: 'epic',
    name: { en: 'Mandarinfish', fr: 'Poisson-mandarin', ar: 'سمكة الماندرين' },
    fact: {
      en: 'Almost every blue animal gets its colour from light bouncing off tiny crystals. The mandarinfish has real blue paint in its skin, which is super rare.',
      fr: 'Presque tous les animaux bleus doivent leur couleur à la lumière qui rebondit sur de minuscules cristaux. Le poisson-mandarin, lui, a un vrai pigment bleu dans la peau, ce qui est très rare.',
      ar: 'معظم الحيوانات الزرقاء يأتي لونها من ضوء ينعكس على بلّورات صغيرة، أما سمكة الماندرين ففي جلدها صبغة زرقاء حقيقية، وهذا نادر جدًّا.',
    },
    source: 'https://en.wikipedia.org/wiki/Synchiropus_splendidus',
    look: { body: '#2f6fe0', mark: '#ff8a1f', fin: '#2fd0c0', long: 0.85, tall: 0.45 },
  },
  {
    id: 'coelacanth',
    rarity: 'legendary',
    name: { en: 'Coelacanth', fr: 'Cœlacanthe', ar: 'سمكة الكولاكانث' },
    fact: {
      en: 'Scientists thought the coelacanth died out with the dinosaurs. Then a fisherman caught a living one off South Africa in 1938!',
      fr: 'Les scientifiques pensaient que le cœlacanthe avait disparu avec les dinosaures. Puis un pêcheur en a attrapé un vivant au large de l’Afrique du Sud en 1938 !',
      ar: 'ظنّ العلماء أن الكولاكانث انقرض مع الديناصورات، ثم اصطاد صيّاد واحدة حيّة قرب جنوب أفريقيا عام ١٩٣٨!',
    },
    source: 'https://www.historytoday.com/archive/months-past/discovery-living-fossil',
    look: { body: '#2b3f66', mark: '#e8eef7', fin: '#3b5585', long: 1.4, tall: 0.5 },
  },
  {
    id: 'oarfish',
    rarity: 'legendary',
    name: { en: 'Giant oarfish', fr: 'Régalec', ar: 'سمكة المجداف' },
    fact: {
      en: 'The giant oarfish is the longest bony fish in the world. Some measure more than 7 metres, longer than a car!',
      fr: 'Le régalec est le plus long poisson osseux du monde. Certains mesurent plus de 7 mètres, plus qu’une voiture !',
      ar: 'سمكة المجداف أطول سمكة عظمية في العالم، وبعضها يزيد طوله على ٧ أمتار، أي أطول من سيارة!',
    },
    source: 'https://www.guinnessworldrecords.com/world-records/109456-longest-bony-fish/',
    look: { body: '#d9e3ea', mark: '#9fb0bd', fin: '#ff3a3a', long: 2.4, tall: 0.28 },
  },
];

/** Pick a fish: rarer kinds jump less often. */
export function rollFish(rnd = Math.random): FishKind {
  const total = FISH.reduce((s, f) => s + RARITY[f.rarity].weight / FISH.filter((x) => x.rarity === f.rarity).length, 0);
  let r = rnd() * total;
  for (const f of FISH) {
    r -= RARITY[f.rarity].weight / FISH.filter((x) => x.rarity === f.rarity).length;
    if (r <= 0) return f;
  }
  return FISH[0];
}
