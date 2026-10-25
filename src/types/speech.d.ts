/* Ambient Web Speech API types (recognition side) */
interface KittySpeechAlternative {
  transcript: string;
  confidence: number;
}
interface KittySpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): KittySpeechAlternative;
  [index: number]: KittySpeechAlternative;
}
interface KittySpeechResultList {
  readonly length: number;
  item(index: number): KittySpeechResult;
  [index: number]: KittySpeechResult;
}
interface KittySpeechEvent extends Event {
  readonly resultIndex: number;
  readonly results: KittySpeechResultList;
}
interface KittySpeechErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onresult: ((ev: KittySpeechEvent) => void) | null;
  onerror: ((ev: KittySpeechErrorEvent) => void) | null;
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}
