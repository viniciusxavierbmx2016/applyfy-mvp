// Nested layout for the /landing route.
//
// Next.js app router enforces a single root <html>/<body>, declared in
// src/app/layout.tsx. This nested layout cannot redeclare them, so it acts
// as a passthrough. The root providers (AuthProvider, ThemeProvider,
// PWARegister) still wrap the page but render no visible UI for an
// unauthenticated visitor. The landing's CSS overrides the body background
// (with !important) so this route stays visually self-contained.
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
