declare global {
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult?: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => void;
    onend?: (this: SpeechRecognition, ev: Event) => void;
  }

  // Constructor type alias (interface with single call signature triggers lint rule)
  type SpeechRecognitionConstructor = new () => SpeechRecognition;

  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
}

export {};
