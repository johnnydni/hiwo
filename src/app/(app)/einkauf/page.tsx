"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShoppingBasket, Tag } from "lucide-react";
import { useApp } from "@/components/app-context";
import { PageHeader, cx } from "@/components/ui";
import { GroceryBasket } from "./grocery-basket";
import { ShoppingList } from "./shopping-list";
import { Sales } from "./sales";

export default function EinkaufPage() {
  return (
    <Suspense>
      <Einkauf />
    </Suspense>
  );
}

type View = "basket" | "all" | "room" | "sell";

const ICONS = {
  basket: { icon: ShoppingBasket, label: "Einkaufskorb", title: "Einkaufskorb: Lebensmittel, Drogerie, Haushalt" },
  sell: { icon: Tag, label: "Verkaufen", title: "Verkaufen: was aus der Wohnung weg soll" },
} as const;

function Einkauf() {
  const { doc } = useApp();
  const params = useSearchParams();
  const initialRoom = params.get("zimmer");
  // ?neu=1 opens the add sheet once, not again on every switch back
  const [initiallyAdding, setInitiallyAdding] = useState(params.get("neu") === "1");
  // the Einkaufskorb is the start view; links into a room's or the furnishing list keep theirs
  const [view, setView] = useState<View>(
    initialRoom ? "room" : initiallyAdding ? "all" : params.get("verkaufen") ? "sell" : "basket",
  );
  const rooms = [...doc.rooms]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ id: r.id, name: r.name }));
  return (
    <div className="max-w-3xl">
      <PageHeader title="Einkauf" subtitle={doc.home.name} />
      <div className="px-4 md:px-0">
        <div className="mb-5 inline-flex rounded-full bg-line/70 p-1 text-[13px]">
          {(["basket", "all", "room", "sell"] as const).map((m) => {
            const icon = m === "basket" || m === "sell" ? ICONS[m] : null;
            return (
              <button
                key={m}
                onClick={() => (setView(m), setInitiallyAdding(false))}
                aria-label={icon?.label}
                title={icon?.title}
                aria-pressed={view === m}
                className={cx(
                  "flex items-center rounded-full py-2 whitespace-nowrap transition",
                  icon ? "px-3" : "px-3 sm:px-4",
                  view === m ? "bg-ink text-white" : "text-ink/70",
                )}
              >
                {icon ? <icon.icon size={17} strokeWidth={1.8} /> : m === "all" ? "Gesamte Wohnung" : "Nach Zimmer"}
              </button>
            );
          })}
        </div>
        {view === "basket" ? (
          <GroceryBasket items={doc.groceries ?? []} learned={doc.grocery_words ?? {}} />
        ) : view === "sell" ? (
          <Sales items={doc.sales ?? []} />
        ) : (
          <ShoppingList
            items={doc.shopping}
            rooms={rooms}
            mode={view}
            initialRoom={initialRoom}
            initiallyAdding={initiallyAdding}
          />
        )}
      </div>
    </div>
  );
}
