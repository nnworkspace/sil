import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/db";
import { LookForm } from "@/components/look-form";
import { DeleteLookButton } from "@/components/delete-look-button";

export const dynamic = "force-dynamic";

export default async function EditLookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const look = await db.query.looks.findFirst({
    where: (l, { eq }) => eq(l.id, id),
  });
  if (!look) notFound();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link
        href={`/looks/${look.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to look
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-normal tracking-tight">Edit look</h1>
        <DeleteLookButton id={look.id} />
      </div>

      <LookForm look={look} />
    </div>
  );
}
