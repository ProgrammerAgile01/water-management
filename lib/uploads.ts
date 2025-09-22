import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_UPLOAD_DIR = ".uploads"; // ganti via env UPLOAD_DIR kalau mau

/** pastikan directory ada */
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** join path aman (hindari path traversal) */
function safeJoin(root: string, ...segments: string[]) {
  const joined = path.join(root, ...segments);
  const rel = path.relative(root, joined);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path traversal detected");
  }
  return joined;
}

/** Simpan file (FormData) ke disk dan kembalikan URL API untuk akses */
export async function saveUploadFile(
  file: File,
  subdir = ""
): Promise<{ absPath: string; relPath: string; publicUrl: string; filename: string }> {
  const uploadRoot = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
  const buff = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "dat").toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const relPath = subdir ? `${subdir}/${filename}` : filename;
  const absDir = safeJoin(process.cwd(), uploadRoot, subdir || "");
  await ensureDir(absDir);

  const absPath = safeJoin(process.cwd(), uploadRoot, relPath);
  await fs.writeFile(absPath, buff);

  // URL publik via API route
  const publicUrl = `/api/file/${relPath}`;
  return { absPath, relPath, publicUrl, filename };
}

/** Resolve absolute path dari potongan relatif */
export function resolveUploadPath(...rel: string[]) {
  const uploadRoot = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
  const base = path.join(process.cwd(), uploadRoot);
  return safeJoin(base, ...rel);
}

/** MIME sederhana */
export function guessMimeByExt(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
