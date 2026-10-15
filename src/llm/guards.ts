/**
 * Post-generation guards. The prompts ask models to stay on the facts; these
 * checks make sure they did, and fall back to pre-written text when not.
 */

const EASTERN_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Normalize Arabic-Indic digits and thousands separators so "100 000", "100,000" and "١٠٠٠٠٠" compare equal. */
export function numbersIn(text: string): string[] {
  const t = text
    .replace(/[٠-٩]/g, (d) => String(EASTERN_DIGITS.indexOf(d)))
    .replace(/(\d)[\s  ,.٬](?=\d{3}\b)/g, '$1');
  return (t.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.'));
}

/** Every number the model says must already appear in the source text. Catches invented stats. */
export function numbersGrounded(output: string, sources: string[]): boolean {
  const allowed = new Set(sources.flatMap(numbersIn));
  return numbersIn(output).every((n) => allowed.has(n));
}

/** Strip markdown/emphasis and keep at most `max` sentences (brevity rule: 2-3 short sentences). */
export function brief(text: string, max = 3): string {
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = clean.match(/[^.!?؟。]+[.!?؟。]*/g) ?? [clean];
  return parts
    .slice(0, max)
    .map((p) => p.trim())
    .join(' ');
}

const UNSAFE_TOPICS = /\b(sex|porn|nude|suicide|kill yourself|drugs?|cocaine|heroin|gun|weapon|bomb|gore)\b/i;

/** Cheap first-line filter before anything reaches the network. Gemini safety settings are the second line. */
export function looksUnsafe(query: string): boolean {
  return UNSAFE_TOPICS.test(query);
}

/** Every grounded answer is labelled NOT_FOUND / UNSUITABLE by the model when it cannot comply. */
export function isRefusal(text: string): 'not-found' | 'unsuitable' | null {
  if (/NOT_FOUND/.test(text)) return 'not-found';
  if (/UNSUITABLE/.test(text)) return 'unsuitable';
  return null;
}
