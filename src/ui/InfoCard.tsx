import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  ChevronUp,
  Gamepad2,
  Globe,
  Square,
  Volume2,
  X,
} from "lucide-react";
import type { CategoryId } from "../types/content";
import { canEarnStars, factsForHotspot, findHotspot, tx } from "../content/loader";
import { CATEGORY_STYLE } from "../content/categories";
import { llmAwake, useApp } from "../state/store";
import { useLines } from "../i18n";
import { sfx } from "../audio/sfx";
import { hasVoice, speak, stopSpeaking, warmVoice } from "../audio/tts";
import { learnMoreFromWiki, type GroundedResult } from "../llm/grounded";
import { mascotBus } from "../three/playerState";
import { PlayStage } from "./PlayStage";
import { WorldMap } from "./WorldMap";
import { NarrationText } from "./NarrationText";
import { Citation, IconButton, SourceTag, StarRow } from "./Parts";

const EXPLORE_PROMPT = {
  en: "Tell a child two or three interesting things from this article.",
  fr: "Raconte à un enfant deux ou trois choses intéressantes tirées de cet article.",
  ar: "أخبر طفلًا بشيئين أو ثلاثة أشياء مثيرة للاهتمام من هذه المقالة.",
};

/**
 * The glass panel a hotspot opens. Everything factual comes from the locked
 * facts.json or the Wikipedia-grounded pipeline, each tagged with its source.
 */
export function InfoCard({ hotspotId }: { hotspotId: string }) {
  const { t } = useTranslation();
  const line = useLines();
  const lang = useApp((s) => s.lang);
  const close = useApp((s) => s.close);
  const say = useApp((s) => s.say);
  const markExplored = useApp((s) => s.markExplored);
  const earned = useApp((s) => s.stars[hotspotId] ?? 0);

  const hit = findHotspot(hotspotId);
  const h = hit?.hotspot;
  const facts = useMemo(
    () => (hit ? factsForHotspot(hit.scene, hit.hotspot) : []),
    [hit],
  );

  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const [more, setMore] = useState(false);
  const [wiki, setWiki] = useState<GroundedResult | "loading" | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [tab, setTab] = useState<"learn" | "where" | "play">("learn");

  // get the reading voice ready in the background, so "listen" starts quickly
  useEffect(() => warmVoice(lang), [lang]);
  useEffect(() => {
    if (!h) return;
    markExplored(h.id);
    sfx("open");
    if (h.contentType !== "quiz") say(tx(h.mascotLine, lang));
    setPlaying(false);
    setPlayed(false);
    setMore(false);
    setWiki(null);
    setTab("learn");
    return () => stopSpeaking();
  }, [h, lang, markExplored, say]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [close]);

  if (!h || !hit) return null;
  const category = hit.scene.category as CategoryId;
  // one thing at a time: read it, see where it lives, then play
  const tabs = (["learn", h.origin ? "where" : null, h.contentType !== "narration" ? "play" : null].filter(Boolean) as ("learn" | "where" | "play")[]);
  const questions = (h.quiz ? 1 : 0) + (h.moreQuestions?.length ?? 0);
  const blurb = h.puzzle ? tx(h.puzzle.prompt, lang) : h.quiz ? t("card3.quizBlurb", { count: questions }) : t(`card3.${h.contentType}Blurb`);
  const accent = CATEGORY_STYLE[category]?.color;

  const praise = () => {
    setPlayed(true);
    sfx("correct");
    mascotBus.emit("happy");
    say(line("mascot.praise"));
  };
  const onWrong = () => {
    sfx("wrong");
    mascotBus.emit("sad");
    say(line("mascot.encourage"));
  };
  return (
    <>
      <section
        className="slab info"
        role="dialog"
        aria-labelledby="card-title"
        style={{ "--accent": accent } as CSSProperties}
      >
        <header className="slab-head">
          <h2 id="card-title">
            {tx(h.title, lang)}
          </h2>
          {h.sourceType !== "curated" && <SourceTag type={h.sourceType} />}
          {hasVoice(lang) && (
            <IconButton
              small
              label={speaking ? t("card2.stop") : t("card2.listen")}
              pressed={speaking}
              onClick={() => {
                if (speaking) {
                  stopSpeaking();
                  setSpeaking(false);
                } else
                  setSpeaking(
                    speak(tx(h.narration, lang), lang, {
                      onEnd: () => setSpeaking(false),
                    }),
                  );
              }}
            >
              {speaking ? <Square className="i" /> : <Volume2 className="i" />}
            </IconButton>
          )}
          <IconButton
            small
            label={t("card2.close")}
            onClick={() => {
              sfx("click");
              close();
            }}
          >
            <X className="i" />
          </IconButton>
        </header>

        {tabs.length > 1 && (
          <div className="card-tabs" role="tablist" aria-label={tx(h.title, lang)}>
            {tabs.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`card-tab${tab === id ? " on" : ""}${id === "play" && !played && tab !== "play" ? " invite" : ""}`}
                onClick={() => {
                  sfx("click");
                  setTab(id);
                }}
              >
                {id === "learn" ? <BookOpen className="i" /> : id === "where" ? <Globe className="i" /> : <Gamepad2 className="i" />}
                {t(`card3.${id}`)}
              </button>
            ))}
          </div>
        )}

        <div className="slab-body">
          {tab === "learn" && (
            <>
              <NarrationText text={tx(h.narration, lang)} sceneId={hit.scene.sceneId} />
              {!more ? (
                <button className="link read-more" onClick={() => setMore(true)} aria-expanded={false}>
                  <BookOpen className="i" /> {t("card2.readMore")}
                </button>
              ) : (
                <div className="answer-box">
                  <NarrationText text={tx(h.learnMore, lang)} sceneId={hit.scene.sceneId} className="" />
                  {wiki && wiki !== "loading" && (
                    <div style={{ marginBlockStart: 10, paddingBlockStart: 10, borderBlockStart: "1px solid var(--line)" }}>
                      {wiki.status === "ok" ? (
                        <>
                          <p style={{ margin: "0 0 6px" }}>{wiki.text}</p>
                          <SourceTag type={wiki.sourceType} />
                          <Citation meta={wiki.sourceMeta} />
                        </>
                      ) : (
                        <p className="muted" style={{ margin: 0 }}>
                          {wiki.status === "asleep"
                            ? line("mascot.sleepLines")
                            : t(`ask.${wiki.status === "unverified" ? "unverified" : wiki.status === "offline" ? "offline" : "notFound"}`)}
                        </p>
                      )}
                    </div>
                  )}
                  {wiki === "loading" && <p className="muted" style={{ marginBlockEnd: 0 }}>{t("ask.thinking")}</p>}
                  <div className="answer-links">
                    {wiki === null && llmAwake("gemini") && (
                      <button
                        className="link"
                        onClick={async () => {
                          setWiki("loading");
                          setWiki(await learnMoreFromWiki(tx(h.wikiQuery, lang), h.wikiQuery.en, lang, EXPLORE_PROMPT[lang]));
                        }}
                      >
                        <Globe className="i" /> {t("card.moreFromWiki")}
                      </button>
                    )}
                    <button className="link" onClick={() => setMore(false)} aria-expanded>
                      <ChevronUp className="i" /> {t("card2.readLess")}
                    </button>
                  </div>
                </div>
              )}
              {tabs.includes("play") && (
                <button className="btn play-cta small-cta" onClick={() => setTab("play")}>
                  <Gamepad2 className="i" /> {t("card3.toPlay")}
                </button>
              )}
            </>
          )}

          {tab === "where" && h.origin && (
            <div className="where-panel">
              <p>{tx(h.origin.where, lang)}</p>
              <WorldMap pins={h.origin.pins} highlight={h.origin.continents.length === 1 ? h.origin.continents[0] : undefined} />
            </div>
          )}

          {tab === "play" && (
            <div className="play-panel">
              <p className="play-blurb">{blurb}</p>
              {canEarnStars(h) && <StarRow n={earned} max={3} />}
              <button
                className="btn play-cta"
                onClick={() => {
                  sfx("click");
                  setPlaying(true);
                }}
              >
                <Gamepad2 className="i" /> {t("card2.play")}
              </button>
              {played && (
                <p className="did-you-know">
                  <strong>{t("card.funFact")}</strong> {tx(h.funFact, lang)}
                </p>
              )}
            </div>
          )}
        </div>

      </section>

      {/* a sibling of the card, not a child: .slab's backdrop-filter would
          otherwise become the containing block for the fixed stage */}
      {playing && (
        <PlayStage
          hotspot={h}
          facts={facts}
          category={category}
          lang={lang}
          onCorrect={praise}
          onWrong={onWrong}
          onClose={() => {
            setPlaying(false);
            sfx("click");
          }}
        />
      )}
    </>
  );
}
