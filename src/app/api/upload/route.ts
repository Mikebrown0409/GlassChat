import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const fileEntries = formData.getAll("files");

  if (fileEntries.length === 0) {
    return NextResponse.json({ files: [] });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const origin = req.headers.get("origin") ?? "";

  const saved: Array<{ name: string; url: string }> = [];

  await Promise.all(
    fileEntries.map(async (entry) => {
      if (!(entry instanceof File)) return;
      const arrayBuffer = await entry.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = path.extname(entry.name);
      const randomName = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
      const dest = path.join(uploadDir, randomName);
      await writeFile(dest, buffer);
      saved.push({ name: entry.name, url: `${origin}/uploads/${randomName}` });
    }),
  );

  return NextResponse.json({ files: saved });
}
