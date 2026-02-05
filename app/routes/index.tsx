import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search guidelines, protocols, calculators..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Pinned Guidelines Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pinned Guidelines</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Placeholder pinned items */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-red-100 text-red-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">STEMI Protocol</h3>
                <p className="mt-1 text-xs text-gray-500">Cardiac emergencies</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100 text-blue-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Sepsis Bundle</h3>
                <p className="mt-1 text-xs text-gray-500">Infectious disease</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-yellow-100 text-yellow-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Stroke Code</h3>
                <p className="mt-1 text-xs text-gray-500">Neurology</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Category Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { name: "Cardiac", color: "bg-red-50 text-red-700 border-red-200" },
            { name: "Respiratory", color: "bg-blue-50 text-blue-700 border-blue-200" },
            { name: "Neurology", color: "bg-purple-50 text-purple-700 border-purple-200" },
            { name: "Trauma", color: "bg-orange-50 text-orange-700 border-orange-200" },
            { name: "Pediatrics", color: "bg-green-50 text-green-700 border-green-200" },
            { name: "Toxicology", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
            { name: "Infectious", color: "bg-pink-50 text-pink-700 border-pink-200" },
            { name: "Procedures", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
          ].map((category) => (
            <button
              key={category.name}
              className={`px-4 py-3 rounded-lg border text-sm font-medium hover:shadow-sm transition-shadow ${category.color}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      {/* Asset Tracker Preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Asset Tracker</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">Quick access to department equipment locations</p>
          </div>
          <div className="divide-y divide-gray-200">
            {[
              { name: "Ultrasound - Portable", location: "Bay 12", status: "available" },
              { name: "Video Laryngoscope", location: "Resus 1", status: "in-use" },
              { name: "Defibrillator #3", location: "Charging Station", status: "charging" },
            ].map((asset, index) => (
              <div key={index} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                  <p className="text-xs text-gray-500">{asset.location}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    asset.status === "available"
                      ? "bg-green-100 text-green-800"
                      : asset.status === "in-use"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {asset.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
