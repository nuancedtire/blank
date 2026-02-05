import {
  createRootRouteWithContext,
  Link,
  Outlet,
  ScrollRestoration,
} from "@tanstack/react-router";
import { Meta, Scripts } from "@tanstack/start";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ConvexQueryClient } from "@convex-dev/react-query";

interface RouterContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ED Guidelines" },
      { name: "description", content: "Emergency Department Clinical Guidelines" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
});

function RootComponent() {
  return (
    <RootDocument>
      <div className="min-h-screen flex flex-col">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-white">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-slate-700">
              <span className="text-xl font-bold">ED Guidelines</span>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
              <Link
                to="/"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 [&.active]:bg-slate-800"
              >
                Home
              </Link>
              <Link
                to="/"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800"
              >
                Guidelines
              </Link>
              <Link
                to="/"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800"
              >
                Assets
              </Link>
              <Link
                to="/"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800"
              >
                Calculators
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="md:pl-64 flex flex-col flex-1">
          <main className="flex-1 pb-16 md:pb-0">
            <Outlet />
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex justify-around items-center h-16">
            <Link
              to="/"
              className="flex flex-col items-center justify-center px-3 py-2 text-xs font-medium text-gray-600 hover:text-blue-600 [&.active]:text-blue-600"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>
            <Link
              to="/"
              className="flex flex-col items-center justify-center px-3 py-2 text-xs font-medium text-gray-600 hover:text-blue-600"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Guidelines
            </Link>
            <Link
              to="/"
              className="flex flex-col items-center justify-center px-3 py-2 text-xs font-medium text-gray-600 hover:text-blue-600"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Assets
            </Link>
            <Link
              to="/"
              className="flex flex-col items-center justify-center px-3 py-2 text-xs font-medium text-gray-600 hover:text-blue-600"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Calc
            </Link>
          </div>
        </nav>
      </div>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Meta />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
