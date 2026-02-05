import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context }) => {
    // Check for authentication
    // This is a placeholder - replace with actual auth check
    const isAuthenticated = await checkAuthentication();

    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.pathname,
        },
      });
    }
  },
  component: AuthenticatedLayout,
});

async function checkAuthentication(): Promise<boolean> {
  // Placeholder authentication check
  // Replace with actual authentication logic (e.g., check session, JWT, Convex auth)
  // For now, returns true to allow access during development

  // Example implementation with Convex:
  // const { isAuthenticated } = useConvexAuth();
  // return isAuthenticated;

  return true;
}

function AuthenticatedLayout() {
  return (
    <div className="min-h-screen">
      {/* Auth-specific wrapper if needed */}
      <Outlet />
    </div>
  );
}
