import { Shirt } from "lucide-react";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { isDemoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** The only public page (#119). A single "Sign in with Google" action; the
 *  signIn callback then rejects anyone who isn't the owner. */
export default function SignInPage() {
  // Demo mode (local demos only) has no sign-in to offer.
  if (isDemoMode()) redirect("/");
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <Shirt className="size-10 text-muted-foreground" />
        <h1 className="font-serif text-3xl font-normal tracking-tight">Sil</h1>
        <p className="font-serif text-base text-muted-foreground italic">
          Silhouettes, Styled in Loop
        </p>
        <p className="text-sm text-muted-foreground">
          A private wardrobe. Sign in to continue.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <Button type="submit" size="lg">
          Sign in with Google
        </Button>
      </form>
    </div>
  );
}
