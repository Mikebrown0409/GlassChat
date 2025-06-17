import { redirect } from "next/navigation";
import LandingClient from "~/components/landing/LandingClient";
import { auth } from "~/server/auth";

export default async function LandingPage() {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  return <LandingClient />;
}
