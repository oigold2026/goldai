import "server-only";

function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`${name} is not configured.`); return value; }
export async function uploadToImageKit(file: File, userId: string, fileId: string) {
  const privateKey = required("IMAGEKIT_PRIVATE_KEY"); const endpoint = required("IMAGEKIT_URL_ENDPOINT");
  const form = new FormData(); form.append("file", new Blob([await file.arrayBuffer()], { type: file.type }), file.name); form.append("fileName", `${fileId}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`); form.append("folder", `/goldai/users/${userId}/files`); form.append("useUniqueFileName", "true");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` }, body: form });
  if (!response.ok) throw new Error("Image upload failed.");
  const data = await response.json() as { fileId?: string; url?: string; thumbnailUrl?: string };
  if (!data.fileId || !data.url) throw new Error("Image upload returned incomplete data.");
  return { imageKitFileId: data.fileId, url: data.url, thumbnailUrl: data.thumbnailUrl || `${endpoint.replace(/\/$/, "")}/tr:w-320/${data.url.split("/").pop()}` };
}

export async function deleteFromImageKit(fileId: string) {
  const privateKey = required("IMAGEKIT_PRIVATE_KEY");
  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, { method: "DELETE", headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` } });
  if (!response.ok && response.status !== 404) throw new Error("Image deletion failed.");
}
