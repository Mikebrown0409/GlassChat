#!/usr/bin/env tsx
// Test Block-Aware Streaming Implementation
// Verifies that the new streaming system can detect and process semantic blocks

import { BlockDetector, detectSimpleBlocks } from "../src/lib/ai/blockDetector";
import { BlockType } from "../src/lib/ai/types";

console.log("🧪 Testing Block-Aware Streaming Implementation");
console.log("=".repeat(60));

// Test content with various block types
const testContent = `# Introduction to AI

This is a paragraph about artificial intelligence. It contains multiple sentences and should be detected as a single paragraph block.

## Code Example

Here's a simple Python function:

\`\`\`python
def hello_world():
    print("Hello, World!")
    return "success"
\`\`\`

### Key Features

- Real-time streaming
- Block detection
- Markdown support

> Important note: This is a blockquote that provides additional context about the implementation.

1. First step in the process
2. Second step with more details
3. Final step to complete

## Table Example

| Feature | Status | Priority |
|---------|--------|----------|
| Streaming | ✅ Done | High |
| Blocks | 🚧 In Progress | High |
| Polish | ⏳ Planned | Medium |

That concludes our test content.`;

async function testBlockDetector() {
  console.log("\n🔍 Testing BlockDetector (Streaming Mode)");
  console.log("-".repeat(40));

  const detector = new BlockDetector();
  const chunks = testContent.split(""); // Simulate character-by-character streaming

  let chunkCount = 0;
  let blockCount = 0;

  // Process chunks in batches to simulate realistic streaming
  for (let i = 0; i < chunks.length; i += 5) {
    const batch = chunks.slice(i, i + 5).join("");
    chunkCount++;

    const result = detector.processChunk(batch);

    if (result.blocks.length > 0) {
      console.log(
        `\n📦 Chunk ${chunkCount} detected ${result.blocks.length} block(s):`,
      );
      for (const { block, blockId } of result.blocks) {
        blockCount++;
        console.log(
          `  • ${blockId}: ${block.type} (${block.content.length} chars)`,
        );
        if (block.metadata) {
          console.log(`    Metadata:`, block.metadata);
        }
        // Show first 50 chars of content
        const preview = block.content.substring(0, 50).replace(/\n/g, "\\n");
        console.log(
          `    Preview: "${preview}${block.content.length > 50 ? "..." : ""}"`,
        );
      }
    }
  }

  // Finalize any remaining content
  const finalBlock = detector.finalize();
  if (finalBlock) {
    blockCount++;
    console.log(
      `\n🏁 Final block: ${finalBlock.blockId} (${finalBlock.block.type})`,
    );
  }

  console.log(
    `\n📊 Summary: Processed ${chunkCount} chunks, detected ${blockCount} blocks`,
  );
}

async function testSimpleBlocks() {
  console.log("\n🔍 Testing Simple Block Detection");
  console.log("-".repeat(40));

  const blocks = detectSimpleBlocks(testContent);

  console.log(`\n📦 Detected ${blocks.length} blocks:`);
  blocks.forEach((block, index) => {
    console.log(`\n${index + 1}. ${block.type.toUpperCase()}`);
    if (block.metadata) {
      console.log(`   Metadata:`, block.metadata);
    }

    // Show first and last lines
    const lines = block.content.split("\n");
    if (lines.length === 1) {
      console.log(`   Content: "${lines[0]}"`);
    } else {
      console.log(`   First line: "${lines[0]}"`);
      if (lines.length > 2) {
        console.log(`   ... (${lines.length - 2} more lines)`);
      }
      console.log(`   Last line: "${lines[lines.length - 1]}"`);
    }
  });
}

async function testBlockTypes() {
  console.log("\n🔍 Testing Individual Block Type Detection");
  console.log("-".repeat(40));

  const testCases = [
    { content: "# Main Header", expected: BlockType.HEADER },
    { content: "## Sub Header", expected: BlockType.HEADER },
    {
      content: "```javascript\nconst x = 1;\n```",
      expected: BlockType.CODE_BLOCK,
    },
    { content: "- Item 1\n- Item 2", expected: BlockType.LIST },
    { content: "1. First\n2. Second", expected: BlockType.LIST },
    { content: "> This is a quote", expected: BlockType.BLOCKQUOTE },
    { content: "| Col1 | Col2 |\n|------|------|", expected: BlockType.TABLE },
    { content: "Regular paragraph text", expected: BlockType.PARAGRAPH },
  ];

  for (const testCase of testCases) {
    const blocks = detectSimpleBlocks(testCase.content);
    const detected = blocks[0]?.type;
    const status = detected === testCase.expected ? "✅" : "❌";
    console.log(
      `${status} "${testCase.content.split("\n")[0]}" → ${detected} (expected: ${testCase.expected})`,
    );
  }
}

async function runTests() {
  try {
    await testSimpleBlocks();
    await testBlockDetector();
    await testBlockTypes();

    console.log("\n🎉 All tests completed!");
    console.log("\n💡 Next steps:");
    console.log("   1. Test with real AI streaming API");
    console.log("   2. Implement client-side block rendering");
    console.log("   3. Add block-based typewriter animation");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run if called directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
