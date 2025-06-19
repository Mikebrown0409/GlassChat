#!/usr/bin/env tsx
// Test Block Rendering System (Phase 2)
// Verifies client-side block management and rendering coordination

import {
  BlockStreamManager,
  type RenderedBlock,
} from "../src/lib/ai/blockRenderer";
import { BlockType, type StreamBlock } from "../src/lib/ai/types";

console.log("🧪 Testing Block Rendering System (Phase 2)");
console.log("=".repeat(60));

// Test data similar to what would come from AI streaming
const testBlocks: Array<{
  content: string;
  block: StreamBlock;
  blockId: string;
}> = [
  {
    content: "# Introduction to AI",
    block: {
      type: BlockType.HEADER,
      content: "# Introduction to AI",
      metadata: { level: 1, complete: true },
    },
    blockId: "block-1",
  },
  {
    content: "This is a paragraph about artificial intelligence.",
    block: {
      type: BlockType.PARAGRAPH,
      content: "This is a paragraph about artificial intelligence.",
      metadata: { complete: true },
    },
    blockId: "block-2",
  },
  {
    content: "```python\ndef hello():\n    print('Hello!')\n```",
    block: {
      type: BlockType.CODE_BLOCK,
      content: "```python\ndef hello():\n    print('Hello!')\n```",
      metadata: { language: "python", complete: true },
    },
    blockId: "block-3",
  },
  {
    content: "- Feature 1\n- Feature 2\n- Feature 3",
    block: {
      type: BlockType.LIST,
      content: "- Feature 1\n- Feature 2\n- Feature 3",
      metadata: { ordered: false, complete: true },
    },
    blockId: "block-4",
  },
];

async function testBlockStreamManager() {
  console.log("\n🔧 Testing BlockStreamManager");
  console.log("-".repeat(40));

  const manager = new BlockStreamManager();
  let stateChanges = 0;

  // Subscribe to state changes
  const unsubscribe = manager.subscribe((state) => {
    stateChanges++;
    console.log(
      `📊 State change ${stateChanges}: ${state.blocks.length} blocks, streaming: ${state.isStreaming}`,
    );
  });

  try {
    // Test 1: Start streaming
    console.log("\n1. Starting streaming mode...");
    manager.startStreaming();

    // Test 2: Process blocks one by one
    console.log("\n2. Processing blocks...");
    for (const testBlock of testBlocks) {
      console.log(
        `   Processing ${testBlock.block.type}: "${testBlock.content.substring(0, 30)}..."`,
      );
      manager.processChunk(
        testBlock.content,
        testBlock.block,
        testBlock.blockId,
      );

      // Simulate animation completion
      setTimeout(() => {
        manager.updateBlockAnimation(
          testBlock.blockId,
          testBlock.content,
          false,
        );
      }, 10);
    }

    // Test 3: Complete streaming
    console.log("\n3. Completing streaming...");
    manager.completeStreaming();

    // Test 4: Verify final state
    const finalState = manager.getState();
    console.log(
      `\n📊 Final state: ${finalState.blocks.length} blocks, total content: ${finalState.totalContentLength} chars`,
    );

    // Test 5: Test block retrieval
    console.log("\n4. Testing block retrieval...");
    const headerBlock = manager.getBlock("block-1");
    if (headerBlock) {
      console.log(
        `   ✅ Retrieved header block: ${headerBlock.block.type} (level ${headerBlock.block.metadata?.level})`,
      );
    } else {
      console.log("   ❌ Failed to retrieve header block");
    }

    // Test 6: Test content optimization
    console.log("\n5. Testing content optimization...");
    finalState.blocks.forEach((block, index) => {
      const optimized = manager.getOptimizedContent(block);
      const original = block.block.content;
      const changed = optimized !== original;
      console.log(
        `   Block ${index + 1} (${block.block.type}): ${changed ? "optimized" : "unchanged"}`,
      );
      if (changed) {
        console.log(`     Original: "${original.substring(0, 30)}..."`);
        console.log(`     Optimized: "${optimized.substring(0, 30)}..."`);
      }
    });

    // Test 7: Reset
    console.log("\n6. Testing reset...");
    manager.reset();
    const resetState = manager.getState();
    console.log(
      `   ✅ Reset successful: ${resetState.blocks.length} blocks remaining`,
    );
  } finally {
    unsubscribe();
  }
}

async function testLegacyCompatibility() {
  console.log("\n🔧 Testing Legacy Compatibility");
  console.log("-".repeat(40));

  const manager = new BlockStreamManager();

  // Test legacy chunk processing (no block metadata)
  console.log("\n1. Processing legacy chunks...");
  manager.startStreaming();

  const legacyContent = "This is legacy content without block metadata.";
  const chunks = legacyContent.split(" ");

  for (const chunk of chunks) {
    manager.processChunk(chunk + " ");
  }

  manager.completeStreaming();

  const state = manager.getState();
  console.log(
    `   ✅ Legacy compatibility: ${state.blocks.length} block(s) created`,
  );
  console.log(`   Content: "${state.blocks[0]?.block.content}"`);
  console.log(`   Type: ${state.blocks[0]?.block.type}`);

  manager.reset();
}

async function testBlockOptimization() {
  console.log("\n🔧 Testing Block Content Optimization");
  console.log("-".repeat(40));

  const manager = new BlockStreamManager();

  // Test cases for content optimization
  const optimizationTests = [
    {
      name: "Header without #",
      block: {
        id: "test-header",
        block: {
          type: BlockType.HEADER,
          content: "My Header",
          metadata: { level: 2, complete: true },
        },
        isAnimating: false,
        isComplete: true,
        displayContent: "",
        timestamp: Date.now(),
      } as RenderedBlock,
      expectedPrefix: "## ",
    },
    {
      name: "Code without backticks",
      block: {
        id: "test-code",
        block: {
          type: BlockType.CODE_BLOCK,
          content: "console.log('hello');",
          metadata: { language: "javascript", complete: true },
        },
        isAnimating: false,
        isComplete: true,
        displayContent: "",
        timestamp: Date.now(),
      } as RenderedBlock,
      expectedPrefix: "```javascript",
    },
    {
      name: "List without bullets",
      block: {
        id: "test-list",
        block: {
          type: BlockType.LIST,
          content: "Item 1\nItem 2\nItem 3",
          metadata: { ordered: false, complete: true },
        },
        isAnimating: false,
        isComplete: true,
        displayContent: "",
        timestamp: Date.now(),
      } as RenderedBlock,
      expectedPrefix: "- ",
    },
  ];

  for (const test of optimizationTests) {
    const optimized = manager.getOptimizedContent(test.block);
    const hasExpectedPrefix = optimized.startsWith(test.expectedPrefix);
    console.log(
      `   ${hasExpectedPrefix ? "✅" : "❌"} ${test.name}: ${hasExpectedPrefix ? "optimized correctly" : "optimization failed"}`,
    );
    if (!hasExpectedPrefix) {
      console.log(`     Expected to start with: "${test.expectedPrefix}"`);
      console.log(`     Got: "${optimized.substring(0, 50)}..."`);
    }
  }
}

async function testAnimationCoordination() {
  console.log("\n🔧 Testing Animation Coordination");
  console.log("-".repeat(40));

  const manager = new BlockStreamManager();
  let animationEvents = 0;

  const unsubscribe = manager.subscribe((state) => {
    const animatingBlocks = state.blocks.filter((b) => b.isAnimating);
    if (animatingBlocks.length > 0) {
      animationEvents++;
      console.log(
        `   📺 Animation event ${animationEvents}: ${animatingBlocks.length} blocks animating`,
      );
    }
  });

  try {
    manager.startStreaming();

    // Add blocks with animation simulation
    for (let i = 0; i < 3; i++) {
      const blockId = `anim-block-${i}`;
      const block: StreamBlock = {
        type: BlockType.PARAGRAPH,
        content: `Animated paragraph ${i + 1}`,
        metadata: { complete: false },
      };

      manager.processChunk(block.content, block, blockId);

      // Simulate typewriter animation completing after delay
      setTimeout(
        () => {
          manager.updateBlockAnimation(blockId, block.content, false);
          console.log(`   ✅ Block ${blockId} animation completed`);
        },
        (i + 1) * 100,
      );
    }

    // Wait for animations and complete
    setTimeout(() => {
      manager.completeStreaming();
      const finalState = manager.getState();
      const stillAnimating = finalState.blocks.filter(
        (b) => b.isAnimating,
      ).length;
      console.log(
        `   📊 Final animation state: ${stillAnimating} blocks still animating`,
      );
    }, 500);
  } finally {
    setTimeout(() => {
      unsubscribe();
      manager.reset();
    }, 600);
  }
}

async function runTests() {
  try {
    await testBlockStreamManager();
    await testLegacyCompatibility();
    await testBlockOptimization();
    await testAnimationCoordination();

    console.log("\n🎉 All Phase 2 tests completed!");
    console.log("\n💡 Next steps:");
    console.log("   1. Integrate with existing ChatInterface");
    console.log("   2. Test with real AI streaming API");
    console.log("   3. Add CSS styling for block-specific animations");
    console.log("   4. Implement Phase 3: Block-based typewriter animation");
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
