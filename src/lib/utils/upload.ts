export async function uploadFiles(
  files: File[],
): Promise<{ name: string; url: string }[]> {
  if (files.length === 0) return [];
  const form = new FormData();
  files.forEach((f) => form.append("files", f, f.name));
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const data = (await res.json()) as { files: { name: string; url: string }[] };
  return data.files;
}
