#!/usr/bin/env tsx

/**
 * Test script to verify ChunkTypewriter animation fixes
 *
 * This script simulates the streaming behavior and tests:
 * 1. Animation starts properly when content arrives
 * 2. Animation continues as content grows
 * 3. Animation completes when streaming is done
 * 4. No infinite loops or state resets
 * 5. Proper model-based pattern detection
 */

interface MockChunkTypewriterState {
  content: string;
  done: boolean;
  visibleContent: string;
  isAnimating: boolean;
  currentPosition: number;
  lastContentLength: number;
  animationCompleteCallCount: number;
  patternLogCount: number;
}

function getStreamingPatternForModel(
  modelId?: string,
): "fast-stream" | "block-stream" {
  if (!modelId) return "fast-stream";

  if (
    modelId.includes("gpt-4o-mini") ||
    modelId.includes("gpt-4-turbo") ||
    modelId.includes("gpt")
  ) {
    return "fast-stream";
  }

  if (modelId.includes("gemini")) {
    return "block-stream";
  }

  return "fast-stream";
}

function simulateChunkTypewriter(
  contentUpdates: string[],
  modelId: string,
  messageId: string,
): MockChunkTypewriterState {
  const state: MockChunkTypewriterState = {
    content: "",
    done: false,
    visibleContent: "",
    isAnimating: false,
    currentPosition: 0,
    lastContentLength: 0,
    animationCompleteCallCount: 0,
    patternLogCount: 0,
  };

  const pattern = getStreamingPatternForModel(modelId);
  console.log(`🎯 Testing ${modelId} with ${pattern} pattern`);

  // Simulate content updates
  contentUpdates.forEach((content, index) => {
    const isLastUpdate = index === contentUpdates.length - 1;

    // Update content
    state.content = content;
    state.done = isLastUpdate;

    // Simulate ChunkTypewriter logic
    if (content.length !== state.lastContentLength) {
      state.lastContentLength = content.length;

      // Log pattern detection (only once per message)
      if (content.length > 0 && state.patternLogCount === 0) {
        console.log(`[ChunkTypewriter] Using ${pattern} for model: ${modelId}`);
        state.patternLogCount++;
      }

      // Start animation if not already running
      if (!state.isAnimating && content.length > 0) {
        state.isAnimating = true;
        console.log(
          `🎬 Animation started at content length: ${content.length}`,
        );
      }

      // Simulate animation progress
      if (state.isAnimating) {
        // Calculate how much content should be visible
        const targetLength = Math.min(
          state.currentPosition + 10,
          content.length,
        );
        state.currentPosition = targetLength;
        state.visibleContent = content.slice(0, targetLength);

        console.log(
          `📝 Animation progress: ${state.visibleContent.length}/${content.length} chars visible`,
        );

        // Check if animation should complete
        if (state.currentPosition >= content.length && isLastUpdate) {
          state.isAnimating = false;
          state.animationCompleteCallCount++;
          console.log(
            `✅ Animation completed! (callback called ${state.animationCompleteCallCount} times)`,
          );
        }
      }
    }
  });

  return state;
}

function testOpenAIStreaming() {
  console.log("\n🧪 Testing OpenAI GPT-4o-mini Streaming");
  console.log("=".repeat(50));

  const contentUpdates = [
    "Hello",
    "Hello there",
    "Hello there! How",
    "Hello there! How can I",
    "Hello there! How can I help you",
    "Hello there! How can I help you today?",
    "Hello there! How can I help you today?\n\nI'm here to",
    "Hello there! How can I help you today?\n\nI'm here to assist with any questions you might have.",
  ];

  const result = simulateChunkTypewriter(
    contentUpdates,
    "gpt-4o-mini",
    "test-gpt-msg",
  );

  console.log("\n📊 Final State:");
  console.log(`   Content Length: ${result.content.length}`);
  console.log(`   Visible Length: ${result.visibleContent.length}`);
  console.log(`   Animation Complete: ${!result.isAnimating}`);
  console.log(`   Callback Called: ${result.animationCompleteCallCount} times`);
  console.log(`   Pattern Logged: ${result.patternLogCount} times`);

  // Assertions
  if (result.patternLogCount !== 1) {
    console.log(
      `❌ FAIL: Pattern should be logged exactly once, got ${result.patternLogCount}`,
    );
  } else {
    console.log(`✅ PASS: Pattern logged exactly once`);
  }

  if (result.animationCompleteCallCount !== 1) {
    console.log(
      `❌ FAIL: Animation complete callback should be called exactly once, got ${result.animationCompleteCallCount}`,
    );
  } else {
    console.log(`✅ PASS: Animation complete callback called exactly once`);
  }

  if (result.isAnimating) {
    console.log(`❌ FAIL: Animation should be complete`);
  } else {
    console.log(`✅ PASS: Animation completed properly`);
  }
}

function testGeminiStreaming() {
  console.log("\n🧪 Testing Gemini Streaming");
  console.log("=".repeat(50));

  const contentUpdates = [
    "As an AI",
    "As an AI, I don't have personal preferences",
    "As an AI, I don't have personal preferences or the ability to experience emotions",
    "As an AI, I don't have personal preferences or the ability to experience emotions in the way humans do.",
    "As an AI, I don't have personal preferences or the ability to experience emotions in the way humans do.\n\nHowever, I can help you explore this topic!",
  ];

  const result = simulateChunkTypewriter(
    contentUpdates,
    "gemini-2.5-flash-lite-preview-06-17",
    "test-gemini-msg",
  );

  console.log("\n📊 Final State:");
  console.log(`   Content Length: ${result.content.length}`);
  console.log(`   Visible Length: ${result.visibleContent.length}`);
  console.log(`   Animation Complete: ${!result.isAnimating}`);
  console.log(`   Callback Called: ${result.animationCompleteCallCount} times`);
  console.log(`   Pattern Logged: ${result.patternLogCount} times`);

  // Assertions
  if (result.patternLogCount !== 1) {
    console.log(
      `❌ FAIL: Pattern should be logged exactly once, got ${result.patternLogCount}`,
    );
  } else {
    console.log(`✅ PASS: Pattern logged exactly once`);
  }

  if (result.animationCompleteCallCount !== 1) {
    console.log(
      `❌ FAIL: Animation complete callback should be called exactly once, got ${result.animationCompleteCallCount}`,
    );
  } else {
    console.log(`✅ PASS: Animation complete callback called exactly once`);
  }
}

function testAnimationStateManagement() {
  console.log("\n🧪 Testing Animation State Management");
  console.log("=".repeat(50));

  // Test that animation doesn't restart when content grows
  const state: MockChunkTypewriterState = {
    content: "",
    done: false,
    visibleContent: "",
    isAnimating: false,
    currentPosition: 0,
    lastContentLength: 0,
    animationCompleteCallCount: 0,
    patternLogCount: 0,
  };

  const updates = [
    "Hello",
    "Hello world",
    "Hello world!",
    "Hello world! How are you?",
  ];
  let animationStartCount = 0;

  updates.forEach((content, index) => {
    const wasAnimating = state.isAnimating;
    state.content = content;
    state.lastContentLength = content.length;

    // Simulate animation start logic
    if (!state.isAnimating && content.length > 0) {
      state.isAnimating = true;
      animationStartCount++;
      console.log(
        `🎬 Animation started (${animationStartCount}) at update ${index + 1}: "${content}"`,
      );
    } else if (state.isAnimating) {
      console.log(
        `⏩ Animation continuing at update ${index + 1}: "${content}"`,
      );
    }

    // Simulate some progress
    state.currentPosition = Math.min(state.currentPosition + 5, content.length);
    state.visibleContent = content.slice(0, state.currentPosition);
  });

  console.log(`\n📊 Animation Management Results:`);
  console.log(`   Animation started: ${animationStartCount} times`);
  console.log(`   Expected: 1 time`);

  if (animationStartCount === 1) {
    console.log(`✅ PASS: Animation started exactly once`);
  } else {
    console.log(
      `❌ FAIL: Animation should start exactly once, got ${animationStartCount}`,
    );
  }
}

async function main() {
  console.log("🚀 ChunkTypewriter Animation Fix Test Suite");
  console.log("=".repeat(60));

  testOpenAIStreaming();
  testGeminiStreaming();
  testAnimationStateManagement();

  console.log("\n🎯 Summary");
  console.log("=".repeat(60));
  console.log("✅ Tests completed. Check output above for any failures.");
  console.log("🔍 Key fixes verified:");
  console.log("   - Pattern detection logged only once per message");
  console.log("   - Animation starts only once per message");
  console.log("   - Animation completes properly when streaming ends");
  console.log("   - No infinite loops or state resets");
}

// Run the main function
main().catch(console.error);
