import { useTranslation } from 'react-i18next';
import { ExternalLink, X } from 'lucide-react';
import { IconButton } from './Parts';

interface Row {
  name: string;
  by: string;
  license: string;
  href: string;
  use: string;
}

/** In-app credits. Mirrors CREDITS.md in the repository. */
export function CreditsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const kenney: Row[] = [
    { name: 'Nature Kit', by: 'Kenney', license: 'CC0 1.0', href: 'https://kenney.nl/assets/nature-kit', use: t('credits.useNature') },
    { name: 'Cube Pets', by: 'Kenney', license: 'CC0 1.0', href: 'https://kenney.nl/assets/cube-pets', use: t('credits.usePets') },
    { name: 'Interface Sounds', by: 'Kenney', license: 'CC0 1.0', href: 'https://kenney.nl/assets/interface-sounds', use: t('credits.useSounds') },
    { name: 'UI Audio', by: 'Kenney', license: 'CC0 1.0', href: 'https://kenney.nl/assets/ui-audio', use: t('credits.useSounds') },
  ];
  const models: Row[] = [
    { name: 'Poly by Google, jeremy, Erbay ÇELIK, Zsky, Paul Spooner', by: t('credits.viaPoly'), license: 'CC BY 3.0', href: 'https://poly.pizza', use: t('credits.useRealModels') },
    { name: 'Quaternius', by: 'Quaternius', license: t('credits.publicDomain'), href: 'https://quaternius.com', use: t('credits.useFrog') },
    { name: 'BodyParts3D', by: 'The Database Center for Life Science', license: 'CC BY-SA 2.1 JP', href: 'https://lifesciencedb.jp/bp3d/', use: t('credits.useOrgans') },
    { name: 'BigSoundBank', by: 'Joseph SARDIN', license: 'CC0 1.0', href: 'https://bigsoundbank.com', use: t('credits.useAnimalSounds') },
    { name: 'Wikimedia Commons', by: 'DiegoC472, தகவலுழவன்', license: 'CC BY-SA 4.0, CC0', href: 'https://commons.wikimedia.org', use: t('credits.useZebraElephant') },
  ];
  const other: Row[] = [
    { name: 'Servier Medical Art', by: 'Servier', license: 'CC BY 4.0', href: 'https://smart.servier.com', use: t('credits.useAnatomy') },
    { name: 'Wikipedia', by: 'Wikipedia contributors', license: 'CC BY-SA 4.0', href: 'https://www.wikipedia.org', use: t('credits.useWiki') },
    { name: 'Wikimedia Commons', by: t('credits.variousAuthors'), license: t('credits.perFile'), href: 'https://commons.wikimedia.org', use: t('credits.useCommons') },
    { name: 'IBM Plex Sans / Plex Sans Arabic', by: 'IBM', license: 'SIL OFL 1.1', href: 'https://www.ibm.com/plex/', use: t('credits.useFonts') },
    { name: 'Lucide', by: 'Lucide contributors', license: 'ISC', href: 'https://lucide.dev', use: t('credits.useIcons') },
    { name: 'three.js · React Three Fiber · drei', by: 'three.js / Poimandres', license: 'MIT', href: 'https://threejs.org', use: t('credits.use3d') },
  ];
  /**
   * Free, openly licensed places to go next. Kept in the grown-ups' panel on
   * purpose: these are outside links, and outside links are a parent's call.
   */
  const learning: Row[] = [
    { name: 'PhET Interactive Simulations', by: 'University of Colorado Boulder', license: 'CC BY 4.0', href: 'https://phet.colorado.edu', use: t('credits.usePhet') },
    { name: 'BodyParts3D / Z-Anatomy', by: 'DBCLS / Z-Anatomy', license: 'CC BY-SA', href: 'https://lifesciencedb.jp/bp3d/', use: t('credits.useBodyParts') },
    { name: 'NIH 3D', by: 'National Institutes of Health', license: t('credits.perFile'), href: 'https://3d.nih.gov', use: t('credits.useNih') },
    { name: 'NOAA Photo Library', by: 'NOAA', license: t('credits.publicDomain'), href: 'https://www.noaa.gov/noaa-collections/photo-library', use: t('credits.useNoaa') },
    { name: 'Smithsonian Open Access', by: 'Smithsonian Institution', license: 'CC0', href: 'https://www.si.edu/openaccess', use: t('credits.useSmithsonian') },
  ];
  const list = (rows: Row[]) => (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
      {rows.map((r) => (
        <li key={r.name} style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.4 }}>
          <a className="link" href={r.href} target="_blank" rel="noreferrer noopener">
            {r.name} <ExternalLink className="i" />
          </a>
          <div className="muted" style={{ fontSize: 12 }}>
            {r.by} · {r.license} · {r.use}
          </div>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="slab popover" role="dialog" aria-labelledby="credits-title" style={{ maxBlockSize: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <header className="slab-head">
        <h2 id="credits-title">{t('credits.title')}</h2>
        <IconButton small label={t('card2.close')} onClick={onClose}>
          <X className="i" />
        </IconButton>
      </header>
      <div className="slab-body">
        <p style={{ margin: '0 0 10px', fontSize: 'var(--fs-sm)' }}>
          {t('credits.kenneyThanks')}{' '}
          <a className="link" href="https://www.kenney.nl" target="_blank" rel="noreferrer noopener">
            www.kenney.nl
          </a>
        </p>
        {list(kenney)}
        <div className="section-title">{t('credits.realTitle')}</div>
        {list(models)}
        <div className="section-title">{t('credits.also')}</div>
        {list(other)}
        <div className="section-title">{t('credits.more')}</div>
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 12 }}>{t('credits.moreNote')}</p>
        {list(learning)}
        <p className="muted" style={{ marginBlockEnd: 0, fontSize: 12 }}>{t('credits.original')}</p>
      </div>
    </section>
  );
}
