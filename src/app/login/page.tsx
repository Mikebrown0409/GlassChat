import { redirect } from "next/navigation";
import { OAuthButton } from "~/components/auth/OAuthButton";
import { auth } from "~/server/auth";

export const dynamic = "force-dynamic"; // ensure server side render each time

export default async function LoginPage() {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  return (
    <main className="bg-surface-0 flex min-h-screen items-center justify-center px-4">
      <div className="bg-surface-1 w-full max-w-sm rounded-lg p-8 shadow-lg">
        <h1 className="text-text-primary mb-6 text-center text-3xl font-bold">
          Sign in to GlassChat
        </h1>
        <div className="flex flex-col gap-4">
          <OAuthButton provider="google">Continue with Google</OAuthButton>
          <OAuthButton provider="discord" variant="secondary">
            Continue with Discord
          </OAuthButton>
        </div>
        <p className="text-text-muted mt-6 text-center text-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
