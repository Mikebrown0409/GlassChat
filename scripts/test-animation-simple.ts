#!/usr/bin/env tsx

/**
 * Simple test to verify ChunkTypewriter animation works
 * This simulates the exact scenario from the console logs
 */

interface AnimationState {
  content: string;
  done: boolean;
  visibleContent: string;
  isAnimating: boolean;
  currentPosition: number;
  lastContentLength: number;
  animationActive: boolean;
  lastContent: string;
}

function simulateChunkTypewriterAnimation(
  contentUpdates: { content: string; done: boolean }[],
) {
  console.log("🎬 Simulating ChunkTypewriter Animation (Fixed Logic)");
  console.log("=".repeat(50));

  const state: AnimationState = {
    content: "",
    done: false,
    visibleContent: "",
    isAnimating: false,
    currentPosition: 0,
    lastContentLength: 0,
    animationActive: false,
    lastContent: "",
  };

  contentUpdates.forEach((update, index) => {
    console.log(
      `\n📥 Update ${index + 1}: content="${update.content.slice(0, 20)}..." (${update.content.length} chars), done=${update.done}`,
    );

    // Update state
    state.content = update.content;
    state.done = update.done;

    // Main animation logic (FIXED VERSION)

    // Skip if no content change and done status hasn't changed
    if (
      update.content.length === state.lastContentLength &&
      update.content === state.lastContent
    ) {
      console.log("   ⏭️  Skipped: No content change and done status same");
      return;
    }

    // Handle content reset (new message)
    if (update.content.length < state.lastContentLength) {
      console.log("   🔄 Reset: Content length decreased");
      state.currentPosition = 0;
      state.visibleContent = "";
      state.isAnimating = false;
      state.animationActive = false;
    }

    state.lastContent = update.content;
    state.lastContentLength = update.content.length;

    // Start animation if not already running and we have content to show
    if (!state.animationActive && update.content.length > 0) {
      console.log("   🎬 Starting animation");
      state.isAnimating = true;
      state.animationActive = true;

      // Simulate animation steps
      let animationSteps = 0;
      const maxSteps = 10; // Increased for better simulation

      while (animationSteps < maxSteps) {
        animationSteps++;

        const currentContent = state.content;
        const isDone = state.done;

        // Check if animation should complete (caught up AND streaming is done)
        if (state.currentPosition >= currentContent.length) {
          if (isDone) {
            console.log(
              "   ✅ Animation completed: Caught up and streaming done",
            );
            state.isAnimating = false;
            state.animationActive = false;
            break;
          } else {
            console.log(
              "   ⏸️  Animation paused: Caught up but streaming continues",
            );
            state.isAnimating = false;
            state.animationActive = false;
            break;
          }
        }

        const remaining = currentContent.slice(state.currentPosition);
        let chunkSize = Math.min(5, remaining.length); // Simulate chunk size

        state.currentPosition = Math.min(
          state.currentPosition + chunkSize,
          currentContent.length,
        );
        state.visibleContent = currentContent.slice(0, state.currentPosition);

        console.log(
          `      📝 Step ${animationSteps}: ${state.visibleContent.length}/${currentContent.length} chars visible`,
        );
      }
    } else if (state.animationActive) {
      console.log("   ⏩ Animation already running - will continue");
    } else {
      console.log("   ❌ Animation not started (no content)");
    }

    console.log(
      `      State: visible=${state.visibleContent.length}, pos=${state.currentPosition}, animating=${state.isAnimating}, active=${state.animationActive}`,
    );
  });

  return state;
}

function testOpenAIScenario() {
  console.log("\n🧪 Testing OpenAI GPT Scenario (from console logs)");

  // Based on actual console logs showing content growing
  const updates = [
    { content: "Alright! I", done: false },
    { content: "Alright! If I were", done: false },
    { content: "Alright! If I were to choose", done: false },
    { content: "Alright! If I were to choose a concept", done: false },
    {
      content: "Alright! If I were to choose a concept that embodies",
      done: false,
    },
    {
      content:
        "Alright! If I were to choose a concept that embodies both creativity and",
      done: false,
    },
    {
      content:
        "Alright! If I were to choose a concept that embodies both creativity and intellectual",
      done: false,
    },
    {
      content:
        "Alright! If I were to choose a concept that embodies both creativity and intellectual curiosity, I'd probably lean toward",
      done: false,
    },
    {
      content:
        'Alright! If I were to choose a concept that embodies both creativity and intellectual curiosity, I\'d probably lean toward something like **"Emergent Discovery"** - the idea that meaningful insights arise from the intersection of seemingly unrelated ideas.',
      done: true,
    },
  ];

  const result = simulateChunkTypewriterAnimation(updates);

  console.log("\n📊 Final Result:");
  console.log(`   Content Length: ${result.content.length}`);
  console.log(`   Visible Length: ${result.visibleContent.length}`);
  console.log(`   Current Position: ${result.currentPosition}`);
  console.log(`   Is Animating: ${result.isAnimating}`);
  console.log(`   Animation Active: ${result.animationActive}`);

  // Check if animation worked
  if (
    result.visibleContent.length > 0 &&
    result.visibleContent.length <= result.content.length
  ) {
    console.log("✅ PASS: Animation produced visible content");
  } else {
    console.log("❌ FAIL: Animation did not produce visible content");
  }

  if (
    result.currentPosition === result.content.length &&
    result.done &&
    !result.isAnimating
  ) {
    console.log("✅ PASS: Animation completed fully");
  } else {
    console.log("❌ FAIL: Animation did not complete fully");
    console.log(
      `   Expected: pos=${result.content.length}, done=true, animating=false`,
    );
    console.log(
      `   Actual: pos=${result.currentPosition}, done=${result.done}, animating=${result.isAnimating}`,
    );
  }
}

function testGeminiScenario() {
  console.log("\n🧪 Testing Gemini Scenario");

  // Gemini typically sends larger chunks less frequently
  const updates = [
    {
      content:
        "As an AI, I don't have personal preferences or the ability to experience emotions in the way humans do.",
      done: false,
    },
    {
      content:
        "As an AI, I don't have personal preferences or the ability to experience emotions in the way humans do.\n\nHowever, I can help you explore this topic! What specifically would you like to know about preferences, emotions, or decision-making?",
      done: true,
    },
  ];

  const result = simulateChunkTypewriterAnimation(updates);

  console.log("\n📊 Final Result:");
  console.log(`   Content Length: ${result.content.length}`);
  console.log(`   Visible Length: ${result.visibleContent.length}`);
  console.log(
    `   Animation Completed: ${!result.isAnimating && !result.animationActive && result.done}`,
  );

  if (
    !result.isAnimating &&
    !result.animationActive &&
    result.done &&
    result.currentPosition === result.content.length
  ) {
    console.log("✅ PASS: Gemini animation completed properly");
  } else {
    console.log("❌ FAIL: Gemini animation did not complete properly");
  }
}

async function main() {
  console.log("🚀 ChunkTypewriter Animation Simple Test (Fixed Logic)");
  console.log("=".repeat(60));

  testOpenAIScenario();
  testGeminiScenario();

  console.log("\n🎯 Test Complete");
  console.log(
    "The fixed logic should now properly pause and resume animation as content arrives.",
  );
}

// Run the main function
main().catch(console.error);
