import { z } from "zod";
import { verifyFirebaseToken } from "../../../lib/ai/auth-server";
import { deleteNote, getNote, listNotes, saveNote, updateNote } from "../../../lib/notes/service";

export const runtime = "nodejs";

const noteSchema = z.object({ title: z.string().trim().min(1, "Add a title.").max(160), content: z.string().max(30000) });

function authToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  return authorization.slice(7).trim();
}

export async function GET(request: Request) {
  try {
    const uid = await verifyFirebaseToken(authToken(request));
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const note = await getNote(uid, id);
      return note ? Response.json({ note }) : Response.json({ error: "Note not found." }, { status: 404 });
    }
    return Response.json({ notes: await listNotes(uid) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to view your notes." }, { status: 401 });
    console.error("Gold AI notes list failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to load notes right now." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await verifyFirebaseToken(authToken(request));
    const parsed = noteSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check your note." }, { status: 400 });
    return Response.json({ note: await saveNote(uid, parsed.data) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to save notes." }, { status: 401 });
    console.error("Gold AI note creation failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to save this note right now." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const uid = await verifyFirebaseToken(authToken(request));
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Note not found." }, { status: 400 });
    const parsed = noteSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check your note." }, { status: 400 });
    const note = await updateNote(uid, id, parsed.data);
    return note ? Response.json({ note }) : Response.json({ error: "Note not found." }, { status: 404 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to update notes." }, { status: 401 });
    console.error("Gold AI note update failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to update this note right now." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const uid = await verifyFirebaseToken(authToken(request));
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Note not found." }, { status: 400 });
    await deleteNote(uid, id);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Please log in to delete notes." }, { status: 401 });
    console.error("Gold AI note deletion failed", { error: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: "Unable to delete this note right now." }, { status: 503 });
  }
}
