import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/Button";

interface SpeechToTextButtonProps {
  onResult: (transcript: string) => void;
  buttonSize?: number;
}

/**
 * SpeechToTextButton
 * Uses Web Speech Recognition API (if available) to transcribe microphone input.
 */
export function SpeechToTextButton({
  onResult,
  buttonSize = 20,
}: SpeechToTextButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SrCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SrCtor) {
      setSupported(false);
      return;
    }

    const recognition = new SrCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const isSpeechEvent = (e: Event): e is SpeechRecognitionEvent =>
      "results" in e;

    recognition.onresult = (event) => {
      if (!isSpeechEvent(event)) return;
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        onResult(transcript);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, [onResult]);

  const toggleListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      rec.start();
      setListening(true);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleListening}
      aria-label={listening ? "Stop recording" : "Start recording"}
      disabled={!supported}
      style={{ height: buttonSize, width: buttonSize }}
    >
      {listening ? (
        <MicOff size={buttonSize - 4} />
      ) : (
        <Mic size={buttonSize - 4} />
      )}
    </Button>
  );
}
