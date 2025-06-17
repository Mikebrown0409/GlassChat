import { NextResponse } from "next/server";
import { env } from "~/env";

export async function GET() {
  return NextResponse.json({
    openaiKeyPresent: !!env.OPENAI_API_KEY,
    openaiKeyLength: env.OPENAI_API_KEY?.length ?? 0,
    openaiKeyPrefix: env.OPENAI_API_KEY?.substring(0, 20) + "...",
    googleKeyPresent: !!env.GOOGLE_GENERATIVE_AI_API_KEY,
    googleKeyLength: env.GOOGLE_GENERATIVE_AI_API_KEY?.length ?? 0,
    processEnvOpenAI: !!process.env.OPENAI_API_KEY,
    processEnvOpenAILength: process.env.OPENAI_API_KEY?.length ?? 0,
  });
}
