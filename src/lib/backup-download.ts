import { Capacitor, registerPlugin } from "@capacitor/core";

const GrainFiles = registerPlugin<{
  export(options: { content: string; filename: string; mimeType: string; encoding?: string }): Promise<{ saved: boolean }>;
  shareImage(options: { content: string; encoding: string }): Promise<void>;
  shareText(options: { text: string }): Promise<void>;
}>("GrainFiles");

export async function exportImage(dataUrl: string, filename: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return (await GrainFiles.export({ content: dataUrl.split(",")[1], filename, mimeType: "image/png", encoding: "base64" })).saved;
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

export async function shareNativeImage(dataUrl: string): Promise<void> {
  await GrainFiles.shareImage({ content: dataUrl.split(",")[1], encoding: "base64" });
}

export async function shareNativeText(text: string): Promise<void> {
  await GrainFiles.shareText({ text });
}

export async function downloadBackup(payload: unknown): Promise<boolean> {
  const json = JSON.stringify(payload, null, 2);
  const filename = `grain-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (Capacitor.isNativePlatform()) return (await GrainFiles.export({ content: json, filename, mimeType: "application/json" })).saved;
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return true;
}
