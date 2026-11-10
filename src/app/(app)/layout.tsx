import { redirect } from 'next/navigation';

import { AppSidebar } from '@/components/shell/app-sidebar';
import { Topbar } from '@/components/shell/topbar';
import { getCurrentUser, requireSession } from '@/server/services/auth';

/**
 * The authenticated shell (UI-02 chrome, FR-004…FR-006).
 *
 * `requireSession()` is the authorization boundary; the middleware that gates
 * the same paths is UX only and can be bypassed. The guard throws, because a
 * service must not know about HTTP, and this adapter maps the refusal to the
 * redirect spec §4 E-2 asks for. Nothing is rendered and no query is issued
 * before that.
 *
 * The name in the topbar is read back out of the user's **own** workspace
 * (`getCurrentUser(businessId, userId)`, NFR-005) rather than taken from the
 * cookie, so a token naming a user of another business renders no shell at all.
 */
export default async function AppLayout({ children }: { readonly children: React.ReactNode }) {
  // Any failure of the guard is the anonymous case: absence, expiry and
  // tampering are deliberately indistinguishable here (AC-001-12).
  const claims = await requireSession().catch(() => null);

  if (claims === null) {
    redirect('/');
  }

  const user = await getCurrentUser(claims.businessId, claims.userId);

  if (user === null) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={user.name} />
        <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
