import { Paperclip, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "~/components/ui/Button";

interface AttachmentPickerProps {
  attachments: File[];
  setAttachments: (files: File[]) => void;
  buttonSize?: number; // e.g., 20
  showChipsInline?: boolean; // if false, chips rendered separately
}

/**
 * AttachmentPicker
 * Compact paperclip button that triggers a hidden file <input> and shows small chips for selected files.
 * Relies on parent to hold attachments state so they can be incorporated into the outbound message.
 */
export function AttachmentPicker({
  attachments,
  setAttachments,
  buttonSize = 20,
  showChipsInline = false,
}: AttachmentPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAttachments([...attachments, ...Array.from(files)]);
    // reset input so the same file can be selected again later
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Trigger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleAttachClick}
        aria-label="Attach files"
        className="shrink-0"
        style={{ height: buttonSize, width: buttonSize }}
      >
        <Paperclip size={buttonSize - 4} />
      </Button>

      {/* hidden input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      {/* Chips */}
      {showChipsInline && attachments.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {attachments.map((file, idx) => (
            <span
              key={idx}
              className="bg-surface-1 text-muted flex items-center gap-1 rounded px-2 py-0.5 text-[10px]"
            >
              {file.name}
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="hover:text-primary"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
