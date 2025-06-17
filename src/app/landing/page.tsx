import LandingClient from "~/components/landing/LandingClient";

// The landing page is now purely a public page. Middleware handles redirecting
// authenticated users away from public routes, so doing another auth() check
// here can lead to inconsistent results between edge regions and ultimately
// redirect loops. We rely on middleware + optional client-side UX instead.

export default function LandingPage() {
  return <LandingClient />;
}
