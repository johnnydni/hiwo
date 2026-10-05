"use client";

import { useState } from "react";
import { ArrowLeft, Layers, PenLine, Trash2 } from "lucide-react";
import { useApp, useMemberName } from "./app-context";
import { useActions } from "./use-actions";
import { MarkupEditor } from "./markup-editor";
import { Photo } from "./photo";
import { Sheet } from "./sheet";
import { Button, cx } from "./ui";
import { relativeDay } from "@/lib/format";

/**
 * Two round buttons for the bottom-right corner of an opened photo: draw on
 * it, and its "Skizzen" (every saved drawing, newest first). Place inside a
 * `relative` box, next to (not inside) any button covering the photo.
 */
export function PhotoTools({ sourceId, path, className }: { sourceId: string; path: string; className?: string }) {
  const { doc } = useApp();
  const { saveSketch } = useActions();
  const [editing, setEditing] = useState<string | null>(null);
  const [showSketches, setShowSketches] = useState(false);
  const [openSketch, setOpenSketch] = useState<string | null>(null);
  const count = (doc.sketches ?? []).filter((k) => k.source_id === sourceId).length;

  return (
    <>
      <div className={cx("absolute right-3 bottom-3 flex gap-2", className)}>
        <button
          onClick={() => {
            setOpenSketch(null);
            setShowSketches(true);
          }}
          aria-label={`Skizzen (${count})`}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-soft backdrop-blur transition hover:bg-white active:scale-95"
        >
          <Layers size={19} strokeWidth={1.6} />
          {count > 0 && (
            <span className="animate-pop absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-medium text-white">
              {count}
            </span>
          )}
        </button>
        <button
          onClick={() => setEditing(path)}
          aria-label="Bild bearbeiten"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-soft backdrop-blur transition hover:bg-white active:scale-95"
        >
          <PenLine size={19} strokeWidth={1.6} />
        </button>
      </div>

      <SketchesSheet
        open={showSketches}
        onClose={() => setShowSketches(false)}
        sourceId={sourceId}
        selected={openSketch}
        onSelect={setOpenSketch}
        onDraw={(p) => {
          setShowSketches(false);
          setEditing(p);
        }}
        originalPath={path}
      />

      {editing && (
        <MarkupEditor
          path={editing}
          onCancel={() => setEditing(null)}
          onSave={async (blob, w, h) => {
            const id = await saveSketch(sourceId, blob, w, h);
            setEditing(null);
            // land on the new sketch, so it's clear where it went
            setOpenSketch(id);
            setShowSketches(true);
          }}
        />
      )}
    </>
  );
}

function SketchesSheet({
  open,
  onClose,
  sourceId,
  selected,
  onSelect,
  onDraw,
  originalPath,
}: {
  open: boolean;
  onClose: () => void;
  sourceId: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onDraw: (path: string) => void;
  originalPath: string;
}) {
  const { doc } = useApp();
  const { deleteSketch } = useActions();
  const name = useMemberName();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const sketches = (doc.sketches ?? []).filter((k) => k.source_id === sourceId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const current = sketches.find((k) => k.id === selected);
  const select = (id: string | null) => {
    setConfirm(false);
    onSelect(id);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        current ? (
          <button onClick={() => select(null)} className="-ml-1 flex h-11 items-center gap-2">
            <ArrowLeft size={18} strokeWidth={1.6} />
            Skizzen
          </button>
        ) : (
          "Skizzen"
        )
      }
    >
      {current ? (
        <div key={current.id} className="animate-fade-in">
          <Photo path={current.path} fit="contain" className="aspect-[4/3] rounded-image" />
          <p className="mt-2 text-[13px] text-muted">
            Version {sketches.length - sketches.indexOf(current)} · {name(current.created_by)}, {relativeDay(current.created_at)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => onDraw(current.path)}>
              <PenLine size={17} /> Weiterzeichnen
            </Button>
            <Button
              variant="secondary"
              loading={busy}
              className={cx(confirm && "text-terracotta")}
              onClick={async () => {
                if (!confirm) return setConfirm(true);
                setBusy(true);
                await deleteSketch(current.id).catch(() => {});
                setBusy(false);
                select(null);
              }}
            >
              <Trash2 size={17} /> {confirm ? "Wirklich?" : "Löschen"}
            </Button>
          </div>
        </div>
      ) : sketches.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-[15px]">Noch keine Skizzen.</p>
          <p className="mx-auto mt-1 max-w-xs text-[14px] text-muted">
            Zeichne auf dem Foto, wo was hin soll. Jede gesicherte Skizze landet hier, das Original bleibt.
          </p>
          <Button className="mt-5" onClick={() => onDraw(originalPath)}>
            <PenLine size={17} /> Jetzt zeichnen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sketches.map((k, i) => (
            <button key={k.id} onClick={() => select(k.id)} className="animate-fade-up text-left">
              <Photo path={k.path} className="aspect-[4/3] rounded-[12px]" />
              <span className="mt-1 block truncate text-[12px] text-muted">
                Version {sketches.length - i} · {relativeDay(k.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
