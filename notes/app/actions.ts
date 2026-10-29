"use server";

type Note = {
  title: string;
  body: string;
  tags: string[];
  priority: "low" | "medium" | "high";
};

type CheckNoteResult = { error: string } | { note: Note };

export async function checkNote(formData: FormData): Promise<CheckNoteResult> {
  const title = formData.get("title");
  const body = formData.get("body");
  const rawTags = formData.get("tags");
  const priority = formData.get("priority");

  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "Title is required." };
  }

  if (typeof body !== "string" || body.trim().length === 0) {
    return { error: "Body is required." };
  }

  if (rawTags !== null && typeof rawTags !== "string") {
    return { error: "Tags must be text." };
  }

  if (
    priority !== "low" &&
    priority !== "medium" &&
    priority !== "high"
  ) {
    return { error: "Choose a valid priority." };
  }

  const tags = [
    ...new Set(
      (rawTags ?? "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  return {
    note: {
      title,
      body,
      tags,
      priority,
    },
  };
}
