import { MessageSquarePlus } from "lucide-react";
import { Button } from "~/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface QuickActionsMenuProps {
  content: string;
  onSelect: (prompt: string) => void;
}

type MenuAction =
  | { type: "prompt"; label: string; prompt: string }
  | { type: "copy"; label: string };

export function QuickActionsMenu({ content, onSelect }: QuickActionsMenuProps) {
  // Define menu options
  const actions: MenuAction[] = [
    { type: "copy", label: "Copy block" },
    {
      type: "prompt",
      label: "Explain code",
      prompt: `Explain the following code:\n\n${content}`,
    },
    {
      type: "prompt",
      label: "Task List",
      prompt: `Turn the following into a task list:\n\n${content}`,
    },
    {
      type: "prompt",
      label: "Diagram",
      prompt: `Using the following text, generate a visual diagram in Mermaid syntax. Respond ONLY with a single \
\`\`\`mermaid code-block containing the diagram (no explanation text).\n\n${content}`,
    },
    {
      type: "prompt",
      label: "Schedule",
      prompt:
        "Rewrite the following content as a valid GitHub-flavored **Markdown table**.\n\nRequirements:\n1. The ONLY output must be the table – no intro or outro sentences.\n2. Use the pipe character (|) to separate columns and include a header separator row of dashes.\n3. Columns: Phase, Milestone / Task, Start, End, Owner, Deliverables.\n4. Use the pipe character (|) between every cell; **do NOT use tabs**.\n5. Wrap nothing in backticks.\n\nExample format:\n| Phase | Milestone / Task | Start | End | Owner | Deliverables |\n| ----- | ---------------- | ----- | --- | ----- | ------------ |\n| 1 | Kickoff | 2024-11-02 | 2024-11-03 | PM | Charter |\n\nNow create the table based on this input:\n\n" +
        content,
    },
    {
      type: "prompt",
      label: "Summary",
      prompt: `Provide a concise summary of the following:\n\n${content}`,
    },
    {
      type: "prompt",
      label: "Project Roadmap",
      prompt: `You are an expert AI project planner. The user will describe a business idea, project, or concept. Return a structured and editable project roadmap following these rules:\n\n• Modular – organize into 4–5 high-level phases (Initiation, Planning, Execution, etc.).\n• Compact & Editable – output each phase as collapsible Markdown using \"<details>\" tags, OR a clean Markdown table if preferred.\n• Schedule-aware – include estimated durations (e.g., Week 1–2) and suggest dependencies.\n• Actionable – list roles, deliverables, suggested tools.\n• Visual-ready – after the list, append a Mermaid Gantt chart of the timeline.\n• Provide a downloadable Markdown block at the end (fenced with ~~~markdown).\n• If user later requests, be ready to convert to Trello JSON or CSV (but do NOT include now).\n\nUse this nested bullet format inside each phase:\n- 🗂️ Phase Name\n    - 📌 Task: ...\n        - ⏱ Timeline: ...\n        - 📦 Deliverables: ...\n        - 👤 Owner: ...\n        - 🔗 Dependencies: ...\n\nUser input to transform:\n\n${content}`,
    },
    { type: "prompt", label: "New prompt from this", prompt: content },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0 opacity-80 hover:opacity-100"
          aria-label="AI quick actions"
          title="AI quick actions"
        >
          <MessageSquarePlus size={11} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-56">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onSelect={() => {
              if (action.type === "copy") {
                void navigator.clipboard.writeText(content);
              } else {
                onSelect(action.prompt);
              }
            }}
            className="cursor-pointer"
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
