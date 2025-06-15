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
      label: "Strategic Roadmap",
      prompt: `You are an expert AI project planner. Using the user's idea or requirements, generate a strategic, stakeholder-ready roadmap with these specifications:\n\n1. Structure by 4–5 key phases (e.g., Discovery, Implementation, Rollout, Optimization).\n2. For EACH phase, create a **Markdown table** with the following columns (in order): #, Milestone, Owner, Duration/Timeframe, Dependencies (optional), Success Indicator.\n   • Use bold header cells.\n   • Do NOT wrap tables in <details>; plain tables render best in GlassChat.\n3. Group milestones logically; if needed, precede each phase table with a short bullet list of work-stream labels (Technical, Data, Change Mgmt, Training).\n4. After all phase tables, add:\n   • A timeline-summary table mapping work-streams against week/month headers.\n   • A Mermaid Gantt chart with swimlanes, milestone blocks, and diamond flags for UAT Complete and Go-Live.\n5. Keep paragraphs ≤ 4 lines, use bold headings (e.g., **Phase 1 – Discovery**), bullets where helpful, and finish with a ✅ Summary.\n6. Respond ONLY with the roadmap content – no additional commentary.\n\nUser input to transform:\n\n${content}`,
    },
    {
      type: "prompt",
      label: "Format as Table",
      prompt: `Rewrite the following content as a GitHub-flavored **Markdown table**.\n\nGuidelines:\n• If the text contains bullet lists, merge related bullets into a single row where possible.\n• Bold the header row.\n• Preserve all information — add extra columns when you need to keep data.\n• Respond **only** with the table (no intro or outro).\n\nInput:\n\n${content}`,
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
