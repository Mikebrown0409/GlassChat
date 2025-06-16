import { Users } from "lucide-react";
import { Button } from "./Button";

interface CollabToggleProps {
  onClick: () => void;
}

export function CollabToggle({ onClick }: CollabToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      title="Show collaboration panel"
    >
      <Users size={18} />
    </Button>
  );
}
