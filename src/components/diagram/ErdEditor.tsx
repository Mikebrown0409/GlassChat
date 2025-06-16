"use client";

// The full-featured ERD editor (which relied on the `mermaid` library) has been archived under
// `src/icebox/mermaid/ErdEditor.tsx`.  To keep the application lightweight while mermaid support is
// paused, we provide this minimal stub component that simply displays the original source code and a
// notice to the user.

import type { FC } from "react";

export const ErdEditor: FC = () => (
  <div className="flex h-full w-full items-center justify-center p-8 text-center">
    <div>
      <p className="mb-4 text-lg font-semibold text-slate-200">
        ERD Editor Disabled
      </p>
      <p className="text-sm text-slate-400">
        The interactive ERD editor is currently unavailable in this build.
        <br />
        Mermaid support has been archived for performance reasons.
      </p>
    </div>
  </div>
);

export default ErdEditor;
