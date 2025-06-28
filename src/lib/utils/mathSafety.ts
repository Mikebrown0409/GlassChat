// Utility helpers for safe math rendering in markdown

import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Pluggable } from "unified";

const remarkBreaksTyped = remarkBreaks as unknown as Pluggable;
const remarkMathTyped = remarkMath as unknown as Pluggable;
const remarkGfmTyped = remarkGfm as unknown as Pluggable;
const rehypeKatexTyped = rehypeKatex as unknown as Pluggable;

/**
 * Returns true when the provided text looks like it might contain
 * an incomplete math expression that would crash remark-math/katex.
 */
export function hasIncompleteMath(text: string): boolean {
  if (!text) return false;

  // Incomplete inline math: odd number of $
  const dollarMatches = text.match(/\$/g);
  if (dollarMatches && dollarMatches.length % 2 !== 0) return true;

  // Incomplete block math: odd number of $$
  const blockMatches = text.match(/\$\$/g);
  if (blockMatches && blockMatches.length % 2 !== 0) return true;

  // Mismatched \begin / \end
  const beginMatches = text.match(/\\begin\{[^}]*\}/g);
  const endMatches = text.match(/\\end\{[^}]*\}/g);
  if ((beginMatches?.length ?? 0) !== (endMatches?.length ?? 0)) return true;

  // Incomplete \frac
  if (text.includes("\\frac{") && !/\\frac\{[^}]*\}\{[^}]*\}/.exec(text))
    return true;

  // Additional problematic patterns that can crash KaTeX
  // Incomplete commands
  if (/\\[a-zA-Z]+\{[^}]*$/.exec(text)) return true; // Unclosed command braces

  // Incomplete matrix/array environments
  if (text.includes("\\begin{") && !text.includes("\\end{")) return true;

  // Incomplete subscript/superscript
  if (/[_^]\{[^}]*$/.exec(text)) return true;

  // Check for dollar signs that might confuse the parser
  // E.g., "$5.99" without proper escaping
  if (/\$\d+(\.\d+)?(?!\s*\$)/.exec(text)) return true;

  // Incomplete parentheses in math contexts
  const mathSections = text.match(/\$[^$]*\$/g) ?? [];
  for (const section of mathSections) {
    const openParens = (section.match(/\(/g) ?? []).length;
    const closeParens = (section.match(/\)/g) ?? []).length;
    if (openParens !== closeParens) return true;

    const openBrackets = (section.match(/\[/g) ?? []).length;
    const closeBrackets = (section.match(/\]/g) ?? []).length;
    if (openBrackets !== closeBrackets) return true;
  }

  return false;
}

export function getPlugins(isStreaming: boolean, content: string) {
  const disableMath = isStreaming || hasIncompleteMath(content);

  const DEBUG_MATH_LOGS = false;
  if (
    DEBUG_MATH_LOGS &&
    process.env.NODE_ENV === "development" &&
    content.includes("$")
  ) {
    console.log("[mathSafety] Plugin decision:", {
      isStreaming,
      hasIncompleteMath: hasIncompleteMath(content),
      disableMath,
      contentPreview: content.slice(0, 100) + "...",
    });
  }

  // Always include GFM so that lists, tables, etc., render even while math is disabled.
  const remarkPlugins: Pluggable[] = disableMath
    ? [remarkGfmTyped, remarkBreaksTyped]
    : [remarkGfmTyped, remarkBreaksTyped, remarkMathTyped];

  return {
    remark: remarkPlugins,
    rehype: disableMath ? [] : [rehypeKatexTyped],
    disableMath,
  };
}
