import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAuthorizedUser } from "@/lib/auth/session";
import { listEmployees, listServices } from "@/db/store";
import { studioMemberOf } from "@/lib/profile";
import ClientOnboarding from "@/components/admin/clients/onboarding/ClientOnboarding";
import { PageBody } from '@/components/patterns/Page';

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

  /*
    Both reads happen here because this is a server component and a step is not.

    The employees are **narrowed at the boundary**, not passed on and narrowed
    later: `studioMemberOf` drops the salary, the PAN, the UAN and the home
    address, so what crosses into the client profile is four fields the cards
    actually draw. Narrowing further down would mean the payroll record had
    already been serialised into the page.
  */
  const [services, employees] = await Promise.all([listServices(), listEmployees()]);
  const people = employees.map(studioMemberOf);

  return (
    // Full height, so the flow can pin its step row and its button to the top
    // and bottom of the card and scroll only the fields between them. No gap:
    // the flow spaces its own three regions.
    <PageBody className="h-full gap-0">
      <ClientOnboarding services={services} people={people} />
    </PageBody>
  );
}
