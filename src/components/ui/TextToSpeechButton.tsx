import { StopCircle, Volume1 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/Button";

interface TextToSpeechButtonProps {
  text: string;
  buttonSize?: number;
}

export function TextToSpeechButton({
  text,
  buttonSize = 20,
}: TextToSpeechButtonProps) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const handleEnd = () => setSpeaking(false);
    window.speechSynthesis.addEventListener("end", handleEnd);
    return () => {
      window.speechSynthesis.removeEventListener("end", handleEnd);
    };
  }, []);

  const speak = () => {
    if (!text.trim()) return;
    const utterance = new SpeechSynthesisUtterance(text);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={speaking ? stop : speak}
      aria-label={speaking ? "Stop speaking" : "Speak text"}
      disabled={!text.trim()}
      style={{ height: buttonSize, width: buttonSize }}
    >
      {speaking ? (
        <StopCircle size={buttonSize - 4} />
      ) : (
        <Volume1 size={buttonSize - 4} />
      )}
    </Button>
  );
}
