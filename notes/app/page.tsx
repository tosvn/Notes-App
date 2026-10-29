"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import { checkNote } from "./actions";

const NOTES_STORAGE_KEY = "jotly-notes";
const STORAGE_PREFIX = "stored:";

type Note = {
  title: string;
  body: string;
  tags: string[];
  priority: "low" | "medium" | "high";
};

const noteListeners = new Set<() => void>();

function subscribeToNotes(listener: () => void) {
  noteListeners.add(listener);

  function handleStorageChange(event: StorageEvent) {
    if (event.key === NOTES_STORAGE_KEY || event.key === null) {
      listener();
    }
  }

  window.addEventListener("storage", handleStorageChange);

  return () => {
    noteListeners.delete(listener);
    window.removeEventListener("storage", handleStorageChange);
  };
}

function getNotesSnapshot() {
  try {
    return `${STORAGE_PREFIX}${window.localStorage.getItem(NOTES_STORAGE_KEY) ?? "[]"}`;
  } catch {
    return "unavailable";
  }
}

function getServerNotesSnapshot() {
  return `${STORAGE_PREFIX}[]`;
}

function saveNotes(notes: Note[]) {
  try {
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    return false;
  }

  noteListeners.forEach((listener) => listener());
  return true;
}

function isNote(value: unknown): value is Note {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (
    !("title" in value) ||
    !("body" in value) ||
    !("tags" in value) ||
    !("priority" in value)
  ) {
    return false;
  }

  return (
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag: unknown) => typeof tag === "string") &&
    (value.priority === "low" ||
      value.priority === "medium" ||
      value.priority === "high")
  );
}

function parseNotesSnapshot(snapshot: string) {
  if (snapshot === "unavailable") {
    return {
      notes: [] as Note[],
      error:
        "Browser storage is unavailable. Notes cannot be restored from this browser.",
    };
  }

  try {
    const savedNotes: unknown = JSON.parse(
      snapshot.slice(STORAGE_PREFIX.length),
    );

    if (!Array.isArray(savedNotes) || !savedNotes.every(isNote)) {
      throw new Error("Saved notes have an invalid format.");
    }

    return { notes: savedNotes, error: "" };
  } catch {
    return {
      notes: [] as Note[],
      error: "Saved notes could not be read. Add a note to replace them.",
    };
  }
}

const priorityStyles = {
  low: "bg-[#e6edda] text-[#4c6330]",
  medium: "bg-[#faedc9] text-[#765716]",
  high: "bg-[#f7dfd4] text-[#783b28]",
};

const noteColors = [
  {
    card: "border-[#efcdbd] bg-[#fff5ef]",
    accent: "bg-[#c45b38]",
    tag: "bg-[#f7dfd4] text-[#783b28]",
  },
  {
    card: "border-[#d2dcb9] bg-[#f7faef]",
    accent: "bg-[#71894b]",
    tag: "bg-[#e6edda] text-[#4c6330]",
  },
  {
    card: "border-[#c9d8e8] bg-[#f2f7fc]",
    accent: "bg-[#527ca6]",
    tag: "bg-[#dfeaf5] text-[#365a7e]",
  },
  {
    card: "border-[#e4d1e8] bg-[#fbf5fc]",
    accent: "bg-[#94639e]",
    tag: "bg-[#f0e2f2] text-[#704879]",
  },
];

export default function Home() {
  const notesSnapshot = useSyncExternalStore(
    subscribeToNotes,
    getNotesSnapshot,
    getServerNotesSnapshot,
  );
  const storedNotes = useMemo(
    () => parseNotesSnapshot(notesSnapshot),
    [notesSnapshot],
  );
  const notes = storedNotes.notes;
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [storageError, setStorageError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await checkNote(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setError("");
      setStorageError("");
      const updatedNotes = [result.note, ...notes];

      if (!saveNotes(updatedNotes)) {
        setStorageError(
          "Your note could not be saved in this browser. Check your storage settings.",
        );
        return;
      }

      form.reset();
    });
  }

  return (
    <main className="relative isolate min-h-screen flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_8%_4%,rgba(190,112,77,0.62),transparent_34%),radial-gradient(ellipse_at_94%_28%,rgba(79,132,102,0.58),transparent_36%),radial-gradient(ellipse_at_58%_100%,rgba(124,99,157,0.52),transparent_42%),linear-gradient(135deg,#cbb39b_0%,#b8bca9_52%,#a6bcb0_100%)] text-[#1d1b18]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(rgba(103, 91, 70, 0.22) 0.7px, transparent 0.7px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-[#bd7952]/60 blur-3xl"
      />
      <div className="mx-auto w-full max-w-6xl px-5 pb-10 sm:px-8 lg:px-12 lg:pb-6">
        <header className="flex items-center justify-between border-b border-[#817968]/45 py-4 lg:py-3">
          <a aria-label="Notes home" className="flex items-center gap-3" href="#">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#bd5d3b] text-xl font-light text-white shadow-sm">
              +
            </span>
            <span className="text-sm font-semibold tracking-[0.16em]">
              JOTLY
            </span>
          </a>
          <span className="rounded-full border border-[#817968]/45 bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#49443c]">
            YOUR PERSONAL NOTEBOOK
          </span>
        </header>

        <section className="py-8 sm:py-12 lg:py-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#813d27] lg:mb-2">
            <span className="h-px w-6 bg-[#813d27]" />
            A little space to think
          </p>
          <h1 className="max-w-2xl font-serif text-4xl font-semibold leading-tight tracking-tight text-[#211b17] sm:text-5xl">
            Make room for a thought.
          </h1>
          <p className="mt-3 max-w-md text-base leading-7 text-[#49443c] lg:mt-2">
            Catch the ideas, reminders, and little things you don&apos;t want to
            lose.
          </p>
        </section>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8">
          <section
            aria-labelledby="write-heading"
            className="rounded-2xl border border-[#e8e4da] bg-white p-6 shadow-[0_12px_40px_-28px_rgba(55,45,30,0.3)] sm:p-8 lg:p-6"
          >
            <div className="mb-7 flex items-start justify-between gap-4 lg:mb-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#625b50]">
                  New entry
                </p>
                <h2
                  className="font-serif text-2xl tracking-tight"
                  id="write-heading"
                >
                  Write it down
                </h2>
              </div>
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8eee9] text-[#bd5d3b]"
              >
                <svg
                  fill="none"
                  height="19"
                  viewBox="0 0 20 20"
                  width="19"
                >
                  <path
                    d="M11.5 3.5H5.75A1.75 1.75 0 0 0 4 5.25v9.5c0 .97.78 1.75 1.75 1.75h8.5c.97 0 1.75-.78 1.75-1.75V9.5M9 11l1.5-.3 5.9-5.9a1.06 1.06 0 0 0-1.5-1.5L9 9.2 9 11Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </span>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-[#332e28]"
                  htmlFor="title"
                >
                  Title
                </label>
                <input
                  className="w-full rounded-xl border border-[#e7e4dc] bg-[#fcfbf9] px-4 py-3 text-sm text-[#282922] outline-none transition placeholder:text-[#b2afa6] focus:border-[#bd5d3b] focus:bg-white focus:ring-4 focus:ring-[#bd5d3b]/10"
                  id="title"
                  name="title"
                  placeholder="Give this note a name"
                  required
                />
              </div>

              <div className="max-w-xs space-y-2">
                <label
                  className="block text-sm font-semibold text-[#332e28]"
                  htmlFor="priority"
                >
                  Priority
                </label>
                <select
                  className="w-full rounded-xl border border-[#e7e4dc] bg-[#fcfbf9] px-4 py-3 text-sm font-medium text-[#282922] outline-none transition focus:border-[#bd5d3b] focus:bg-white focus:ring-4 focus:ring-[#bd5d3b]/10"
                  defaultValue="medium"
                  id="priority"
                  name="priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-[#332e28]"
                  htmlFor="body"
                >
                  Your note
                </label>
                <textarea
                  className="min-h-40 w-full resize-y rounded-xl border border-[#e7e4dc] bg-[#fcfbf9] px-4 py-3 text-sm leading-6 text-[#282922] outline-none transition placeholder:text-[#b2afa6] focus:border-[#bd5d3b] focus:bg-white focus:ring-4 focus:ring-[#bd5d3b]/10"
                  id="body"
                  name="body"
                  placeholder="Use # for headings, **bold** for emphasis, and - for lists..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-[#332e28]"
                  htmlFor="tags"
                >
                  Tags
                </label>
                <input
                  className="w-full rounded-xl border border-[#e7e4dc] bg-[#fcfbf9] px-4 py-3 text-sm text-[#282922] outline-none transition placeholder:text-[#b2afa6] focus:border-[#bd5d3b] focus:bg-white focus:ring-4 focus:ring-[#bd5d3b]/10"
                  id="tags"
                  name="tags"
                  placeholder="work, ideas, personal"
                />
                <p className="pl-1 text-xs text-[#625b50]">
                  Add a comma between each tag.
                </p>
              </div>

              {error && (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <button
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#bd5d3b] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a84e30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bd5d3b] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Adding note..." : "Add to notebook"}
                {!isPending && (
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                )}
              </button>
            </form>
          </section>

          <section aria-labelledby="notes-heading" className="pt-1">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#625b50]">
                  The collection
                </p>
                <h2 className="font-serif text-2xl tracking-tight" id="notes-heading">
                  Your notes
                </h2>
              </div>
              <span className="pb-1 text-sm font-medium text-[#514a40]">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </span>
            </div>

            {(storageError || storedNotes.error) && (
              <p
                className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                role="status"
              >
                {storageError || storedNotes.error}
              </p>
            )}

            {notes.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dcd7ca] bg-white/45 px-6 py-10 text-center">
                <span
                  aria-hidden="true"
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#eeeadd] text-[#8b877b]"
                >
                  <svg
                    fill="none"
                    height="22"
                    viewBox="0 0 24 24"
                    width="22"
                  >
                    <path
                      d="M7 4.75h7.5L19 9.25v10A1.75 1.75 0 0 1 17.25 21h-10A1.75 1.75 0 0 1 5.5 19.25v-12A2.5 2.5 0 0 1 8 4.75ZM14 5v4.5h4.5M9 13h6M9 16.5h6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                  </svg>
                </span>
                <h3 className="font-serif text-lg font-medium text-[#373128]">
                  A blank page, for now.
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#5f584e]">
                  Your notes will find a home here. Start with whatever is on
                  your mind.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {notes.map((note, index) => (
                  <li
                    className={`rounded-2xl border border-l-4 p-5 shadow-[0_8px_30px_-24px_rgba(55,45,30,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-24px_rgba(55,45,30,0.35)] sm:p-6 ${noteColors[index % noteColors.length].card}`}
                    key={`${note.title}-${index}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${noteColors[index % noteColors.length].accent}`}
                        />
                        <h3 className="font-serif text-xl font-semibold leading-snug text-[#201d19]">
                          {note.title}
                        </h3>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${priorityStyles[note.priority]}`}
                      >
                        {note.priority}
                      </span>
                    </div>
                    <div className="space-y-3 pl-5 text-sm leading-7 text-[#48483f]">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h4 className="text-xl font-bold leading-snug text-[#282922]">
                              {children}
                            </h4>
                          ),
                          h2: ({ children }) => (
                            <h4 className="text-lg font-bold leading-snug text-[#282922]">
                              {children}
                            </h4>
                          ),
                          h3: ({ children }) => (
                            <h4 className="text-base font-bold leading-snug text-[#282922]">
                              {children}
                            </h4>
                          ),
                          p: ({ children }) => (
                            <p className="whitespace-pre-wrap">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc space-y-1 pl-5">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal space-y-1 pl-5">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => <li>{children}</li>,
                          strong: ({ children }) => (
                            <strong className="font-bold text-[#282922]">
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic">{children}</em>
                          ),
                        }}
                      >
                        {note.body}
                      </ReactMarkdown>
                    </div>
                    {note.tags.length > 0 && (
                      <ul
                        aria-label="Tags"
                        className="mt-5 flex flex-wrap gap-2 pl-5"
                      >
                        {note.tags.map((tag) => (
                          <li
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${noteColors[index % noteColors.length].tag}`}
                            key={tag}
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="mt-10 border-t border-[#817968]/45 pt-4 text-center text-xs font-medium tracking-wide text-[#514a40] lg:mt-6 lg:pt-3">
          A quiet place for everything on your mind.
        </footer>
      </div>
    </main>
  );
}
