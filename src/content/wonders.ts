import type { Lang, LText } from '../types/content';

/**
 * Wonder worlds: ask Wondoo a question and it builds a little 3D world that
 * answers it, then walks you through it stop by stop. Each built world below
 * is hand-checked (sources listed); any other question gets a world made from
 * its Wikipedia article. Every world ends with a free Wikimedia Commons video
 * when one exists.
 */
export type WonderId = 'volcano' | 'solar-system' | 'water-cycle';

export interface WonderStop {
  /** where the stop is in the little world, and where the explorer stands to look at it */
  at: [number, number, number];
  title: LText;
  text: LText;
}

export interface Wonder {
  id: WonderId;
  /** words that point to this world in a question (lower case, any of the three languages) */
  keys: string[];
  title: LText;
  intro: LText;
  stops: WonderStop[];
  /** a Commons video file, shown at the end */
  video?: string;
  sources: string[];
}

const L = (en: string, fr: string, ar: string): LText => ({ en, fr, ar });

export const WONDERS: Wonder[] = [
  {
    id: 'volcano',
    keys: ['volcano', 'volcanoes', 'lava', 'magma', 'eruption', 'erupt', 'volcan', 'volcans', 'éruption', 'بركان', 'براكين', 'البركان', 'الحمم', 'حمم', 'الصهارة'],
    title: L('Inside a volcano', 'À l’intérieur d’un volcan', 'داخل بركان'),
    intro: L('A volcano? Ooh, follow me! I sliced one open so we can see inside!', 'Un volcan ? Ooh, suis-moi ! J’en ai coupé un en deux pour voir l’intérieur !', 'بركان؟ واو، اتبعني! قسمت بركانًا إلى نصفين لنرى ما في داخله!'),
    stops: [
      {
        at: [0, -1.4, 0],
        title: L('The magma chamber', 'La chambre magmatique', 'غرفة الصهارة'),
        text: L(
          'Deep under a volcano there is a huge pool of melted rock called magma. It is so hot that solid rock turns into a thick, glowing liquid.',
          'Tout au fond, sous le volcan, il y a une énorme poche de roche fondue appelée magma. Il fait si chaud que la roche devient un liquide épais et brillant.',
          'في أعماق الأرض تحت البركان بركة ضخمة من الصخور الذائبة تُسمّى الصهارة. الحرارة هناك شديدة حتى يتحوّل الصخر إلى سائل كثيف متوهّج.',
        ),
      },
      {
        at: [0, 1.4, 0],
        title: L('The vent', 'La cheminée', 'المدخنة'),
        text: L(
          'Melted rock is lighter than the solid rock around it, so it pushes its way up through a crack called a vent, like a bubble rising in water.',
          'La roche fondue est plus légère que la roche solide autour d’elle : elle remonte par une fissure appelée cheminée, comme une bulle qui monte dans l’eau.',
          'الصخر الذائب أخفّ من الصخر الصلب حوله، فيشقّ طريقه إلى الأعلى عبر شقّ يُسمّى المدخنة، مثل فقاعة تصعد في الماء.',
        ),
      },
      {
        at: [0, 3.3, 0],
        title: L('Eruption!', 'L’éruption !', 'الثوران!'),
        text: L(
          'When magma bursts out at the top, it gets a new name: lava. Fresh lava can be hotter than 1,000 degrees Celsius. Boiling water is only 100!',
          'Quand le magma jaillit au sommet, il change de nom : on l’appelle lave. La lave fraîche peut dépasser 1 000 degrés Celsius. L’eau qui bout n’en fait que 100 !',
          'عندما تنفجر الصهارة من القمّة يصبح اسمها الحمم. وقد تزيد حرارة الحمم الجديدة على ١٠٠٠ درجة مئوية، بينما يغلي الماء عند ١٠٠ درجة فقط!',
        ),
      },
      {
        at: [1.6, 1.0, 1.0],
        title: L('Layers on layers', 'Des couches et des couches', 'طبقات فوق طبقات'),
        text: L(
          'A tall, cone-shaped volcano like this one is built from layers of cooled lava and ash, one eruption after another, a bit like a cake growing taller.',
          'Un grand volcan en forme de cône comme celui-ci est fait de couches de lave refroidie et de cendres, éruption après éruption, un peu comme un gâteau qui grandit.',
          'البركان المخروطي العالي مثل هذا مبنيّ من طبقات من الحمم المبرّدة والرماد، ثوَرانًا بعد ثوَران، مثل كعكة تزداد ارتفاعًا.',
        ),
      },
      {
        at: [0, 5.2, 0],
        title: L('Ash clouds', 'Les nuages de cendres', 'سحب الرماد'),
        text: L(
          'Volcanoes can also blast out clouds of ash. Volcanic ash is not like the soft ash from a fire: it is made of tiny, sharp bits of rock and glass.',
          'Les volcans peuvent aussi cracher des nuages de cendres. Ce n’est pas comme la cendre douce d’un feu : ce sont de minuscules morceaux de roche et de verre, très coupants.',
          'تقذف البراكين أيضًا سحبًا من الرماد. وهو ليس كرماد النار الناعم، بل قطع صغيرة حادّة من الصخر والزجاج.',
        ),
      },
    ],
    video: '007_Volcano_eruption_of_Litli-Hrútur_in_Iceland_in_2023_Video_by_Giles_Laurent.webm',
    sources: ['https://www.usgs.gov/programs/VHP/about-volcanoes', 'https://www.usgs.gov/programs/VHP/volcanic-ash-impacts-mitigation'],
  },
  {
    id: 'solar-system',
    keys: ['planet', 'planets', 'solar system', 'sun', 'jupiter', 'saturn', 'mars', 'earth', 'space', 'planète', 'planètes', 'système solaire', 'soleil', 'espace', 'كوكب', 'كواكب', 'الكواكب', 'الشمس', 'المجموعة الشمسية', 'الفضاء', 'المريخ'],
    title: L('Our Solar System', 'Notre système solaire', 'مجموعتنا الشمسية'),
    intro: L('Space! Hold on tight, follow me to the stars!', 'L’espace ! Accroche-toi, suis-moi jusqu’aux étoiles !', 'الفضاء! تمسّك جيدًا واتبعني إلى النجوم!'),
    stops: [
      {
        at: [0, 1.6, 0],
        title: L('The Sun', 'Le Soleil', 'الشمس'),
        text: L('The Sun is a star, a giant ball of glowing gas. It is so big that about 1.3 million Earths could fit inside it!', 'Le Soleil est une étoile, une boule géante de gaz brûlant. Il est si grand qu’environ 1,3 million de Terres pourraient tenir dedans !', 'الشمس نجم، كرة عملاقة من الغاز المتوهّج. إنها ضخمة لدرجة أن نحو ١٫٣ مليون كرة أرضية تتّسع داخلها!'),
      },
      {
        at: [5.2, 1.4, 0],
        title: L('Earth', 'La Terre', 'الأرض'),
        text: L('Earth is the third planet from the Sun. It is the only place we know of with oceans of liquid water on its surface, and with life.', 'La Terre est la troisième planète en partant du Soleil. C’est le seul endroit connu avec des océans d’eau liquide à sa surface, et avec de la vie.', 'الأرض الكوكب الثالث من الشمس، وهي المكان الوحيد الذي نعرفه فيه محيطات من الماء السائل على سطحه، وفيه حياة.'),
      },
      {
        at: [6.6, 1.4, 0],
        title: L('Mars, the red planet', 'Mars, la planète rouge', 'المريخ، الكوكب الأحمر'),
        text: L('Mars looks red because its dust and rocks are full of iron that has rusted, just like an old bike left in the rain.', 'Mars est rouge parce que sa poussière et ses roches contiennent du fer qui a rouillé, comme un vieux vélo laissé sous la pluie.', 'يبدو المريخ أحمر لأن غباره وصخوره مليئة بالحديد الصدئ، مثل درّاجة قديمة تُركت تحت المطر.'),
      },
      {
        at: [9, 1.6, 0],
        title: L('Jupiter, the giant', 'Jupiter, la géante', 'المشتري، العملاق'),
        text: L('Jupiter is the biggest planet. Its Great Red Spot is a storm wider than the whole Earth, and it has been swirling for hundreds of years.', 'Jupiter est la plus grande planète. Sa Grande Tache rouge est une tempête plus large que toute la Terre, qui tourbillonne depuis des centaines d’années.', 'المشتري أكبر الكواكب. وبقعته الحمراء العظيمة عاصفة أعرض من الأرض كلّها، وهي تدور منذ مئات السنين.'),
      },
      {
        at: [11.4, 1.4, 0],
        title: L('Saturn’s rings', 'Les anneaux de Saturne', 'حلقات زحل'),
        text: L('Saturn’s beautiful rings are made of billions of pieces of ice and rock, some as small as a grain of sand and some as big as a house.', 'Les beaux anneaux de Saturne sont faits de milliards de morceaux de glace et de roche, certains petits comme un grain de sable, d’autres gros comme une maison.', 'حلقات زحل الجميلة مكوّنة من مليارات القطع من الجليد والصخر، بعضها صغير كحبّة رمل وبعضها كبير كبيت.'),
      },
    ],
    video: "Planets and dwarf planets' tilt and rotation speed.webm",
    sources: ['https://science.nasa.gov/sun/facts/', 'https://science.nasa.gov/mars/facts/', 'https://science.nasa.gov/jupiter/facts/', 'https://science.nasa.gov/saturn/facts/', 'https://science.nasa.gov/earth/facts/'],
  },
  {
    id: 'water-cycle',
    keys: ['rain', 'water cycle', 'clouds', 'cloud', 'evaporation', 'pluie', 'cycle de l’eau', "cycle de l'eau", 'nuage', 'nuages', 'المطر', 'مطر', 'دورة الماء', 'السحب', 'الغيوم', 'سحابة'],
    title: L('The water cycle', 'Le cycle de l’eau', 'دورة الماء'),
    intro: L('Where does rain come from? Follow me, let’s ride along with a raindrop!', 'D’où vient la pluie ? Suis-moi, on va voyager avec une goutte d’eau !', 'من أين يأتي المطر؟ اتبعني، سنسافر مع قطرة ماء!'),
    stops: [
      {
        at: [-3, 0.6, 1],
        title: L('1. Evaporation', '1. L’évaporation', '١. التبخّر'),
        text: L('The Sun warms the sea. Some of the water turns into an invisible gas called water vapour and floats up into the air.', 'Le Soleil chauffe la mer. Une partie de l’eau se transforme en un gaz invisible, la vapeur d’eau, qui monte dans l’air.', 'تسخّن الشمس البحر، فيتحوّل بعض الماء إلى غاز غير مرئي يُسمّى بخار الماء ويصعد في الهواء.'),
      },
      {
        at: [0, 4, 0],
        title: L('2. Condensation', '2. La condensation', '٢. التكثّف'),
        text: L('High up, the air is cold. The vapour cools down and turns back into tiny droplets of water. Billions of them together make a cloud.', 'Là-haut, l’air est froid. La vapeur se refroidit et redevient de minuscules gouttelettes. Des milliards de gouttelettes ensemble forment un nuage.', 'في الأعلى يكون الهواء باردًا، فيبرد البخار ويعود قطيرات ماء صغيرة جدًّا، ومليارات منها معًا تصنع سحابة.'),
      },
      {
        at: [2.5, 2.5, 0],
        title: L('3. Rain', '3. La pluie', '٣. المطر'),
        text: L('When the droplets bump together and grow too heavy to float, they fall as rain, or as snow when it is very cold.', 'Quand les gouttelettes se cognent et deviennent trop lourdes pour flotter, elles tombent en pluie, ou en neige quand il fait très froid.', 'عندما تتصادم القطيرات وتثقل فلا تستطيع الطفو، تسقط مطرًا، أو ثلجًا عندما يكون الجوّ باردًا جدًّا.'),
      },
      {
        at: [4, 0.6, 2],
        title: L('4. Back to the sea', '4. Retour à la mer', '٤. العودة إلى البحر'),
        text: L('Rain runs into rivers, soaks into the ground and flows back to the sea, and the journey starts all over again. The same water has been going round for millions of years!', 'La pluie coule dans les rivières, s’infiltre dans le sol et retourne à la mer, et le voyage recommence. La même eau fait ce tour depuis des millions d’années !', 'يجري المطر في الأنهار ويتسرّب في الأرض ويعود إلى البحر، ثم تبدأ الرحلة من جديد. والماء نفسه يدور هكذا منذ ملايين السنين!'),
      },
    ],
    video: "Earth's_Water_Cycle.ogv",
    sources: ['https://www.usgs.gov/special-topics/water-science-school/science/water-cycle-schools-and-kids'],
  },
];

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[ً-ْ]/g, '');

/** Which built world (if any) does this question point to? */
export function matchWonder(question: string, _lang: Lang): Wonder | null {
  const q = ` ${norm(question)} `;
  const words = q.split(/[^\p{L}\p{M}']+/u).filter(Boolean);
  // whole words only (so 'sunflower' is not 'sun'); Arabic words may carry the article ال
  const has = (k: string) => (k.includes(' ') ? q.includes(` ${k} `) : words.some((w) => w === k || w === `ال${k}` || w === `${k}s`));
  let best: { w: Wonder; hits: number } | null = null;
  for (const w of WONDERS) {
    const hits = w.keys.filter((k) => has(norm(k))).length;
    if (hits && (!best || hits > best.hits)) best = { w, hits };
  }
  return best?.w ?? null;
}
