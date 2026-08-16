import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAuthorizedUser } from "@/lib/auth/session";
import { listServices } from "@/db/store";
import ClientOnboarding from "@/components/admin/clients/onboarding/ClientOnboarding";

export const metadata: Metadata = {
  title: "speclr",
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; the service library is live.
export const dynamic = "force-dynamic";

/**
 * Onboard a new client.
 *
 * Authorization is enforced AT THE RESOURCE, as on every other page — a layout
 * is not a security boundary.
 *
 * The services library is loaded here rather than inside the step: the step is
 * a client component, and a server component is where a database read belongs.
 */
export default async function NewClientPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : "";
    redirect(reason === "UNAUTHORIZED" ? "/no-access" : "/sign-in");
  }

  const services = await listServices();

  return (
    // Full height, so the flow can pin its step row and its button to the top
    // and bottom of the card and scroll only the fields between them.
    <div className="flex h-full flex-col p-6">
      <ClientOnboarding services={services} />
    </div>
  );
}
