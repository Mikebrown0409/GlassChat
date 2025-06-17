import { redirect } from "next/navigation";
import { LogoutButton } from "~/components/auth/LogoutButton";
import { auth } from "~/server/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) {
    redirect("/landing");
  }

  return (
    <main className="bg-surface-0 flex min-h-screen w-full items-center justify-center p-4">
      <div className="bg-surface-1 w-full max-w-md rounded-lg p-8 shadow-lg">
        <h1 className="text-text-primary mb-6 text-center text-3xl font-bold">
          Account Settings
        </h1>

        <div className="space-y-4">
          <div className="border-border-subtle rounded-md border p-4">
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="text-text-muted mt-2 text-sm">{session.user.email}</p>
          </div>

          {/* Add more settings sections here */}

          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
