"use client";

/**
 * Thin wrappers over the browser Web Speech API (Chrome/Edge). Free, no keys —
 * the Phase 1 voice path. Phase 2 swaps this for Deepgram STT + Azure TTS over
 * LiveKit without touching the call UI's logic.
 */

// Minimal typings — the DOM lib doesn't ship SpeechRecognition.
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return getRecognitionCtor() !== null && typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Listen once for a single final utterance. Resolves with the transcript. */
export function listenOnce(
  lang: string,
  onPartial?: (text: string) => void
): { promise: Promise<string>; stop: () => void } {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return { promise: Promise.reject(new Error("Speech recognition unsupported")), stop: () => {} };

  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = true;

  let finalText = "";
  const promise = new Promise<string>((resolve, reject) => {
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim && onPartial) onPartial(interim);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") resolve(finalText.trim());
      else reject(new Error(e.error));
    };
    rec.onend = () => resolve(finalText.trim());
  });

  rec.start();
  return { promise, stop: () => rec.stop() };
}

const LANG_MAP: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  hi: "hi-IN",
  pt: "pt-BR",
};

export function localeFor(lang: string): string {
  return LANG_MAP[lang] ?? "en-US";
}

/** Speak text and resolve when done (or immediately if unsupported). */
export function speak(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = localeFor(lang);
    u.rate = 1.05;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    // Prefer a higher-quality matching voice when the OS offers one.
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang === u.lang) ?? voices.find((v) => v.lang.startsWith(lang));
    if (match) u.voice = match;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
