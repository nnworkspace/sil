import Link from "next/link";
import Image from "next/image";
import { Layers, AlertTriangle } from "lucide-react";

import { getLooks } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NewLookButton } from "@/components/new-look-button";

export const dynamic = "force-dynamic";

function Collage({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-muted text-muted-foreground">
        <Layers className="size-8" />
      </div>
    );
  }
  return (
    <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-0.5 bg-muted">
      {urls.slice(0, 4).map((u, i) => (
        <div
          key={i}
          className={cn(
            "relative overflow-hidden",
            urls.length === 1 && "col-span-2 row-span-2",
            urls.length === 2 && "row-span-2",
            urls.length === 3 && i === 0 && "row-span-2",
          )}
        >
          <Image src={u} alt="" fill sizes="(max-width: 640px) 50vw, 300px" className="object-cover" />
        </div>
      ))}
    </div>
  );
}

export default async function LooksPage() {
  const looks = await getLooks();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-normal tracking-tight">Looks</h1>
        <NewLookButton />
      </div>

      {looks.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Layers className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">
            No looks yet. Group pieces that go together — a matching set or a styled look.
          </p>
          <div className="mt-4 flex justify-center">
            <NewLookButton />
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {looks.map((look) => (
            <li key={look.id}>
              <Link href={`/looks/${look.id}`} className="group block">
                <Card className="overflow-hidden py-0 transition-colors group-hover:border-primary">
                  <Collage urls={look.coverUrls} />
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{look.name}</span>
                      <Badge variant="secondary" className="shrink-0 capitalize">
                        {look.kind}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                      <span>
                        {look.pieceCount} {look.pieceCount === 1 ? "piece" : "pieces"}
                      </span>
                      {look.incomplete ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-amber-600">
                          <AlertTriangle className="size-3.5" />
                          Incomplete
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
