import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Mock data for assets
const mockAssets = [
  {
    id: "1",
    name: "Ultrasound - Portable",
    location: "Bay 12",
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: "available" as const,
  },
  {
    id: "2",
    name: "Video Laryngoscope",
    location: "Resus 1",
    lastUpdated: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago (stale)
    status: "in-use" as const,
  },
  {
    id: "3",
    name: "Defibrillator #3",
    location: "Charging Station",
    lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    status: "charging" as const,
  },
  {
    id: "4",
    name: "Transport Monitor",
    location: "Unknown",
    lastUpdated: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago (stale)
    status: "available" as const,
  },
  {
    id: "5",
    name: "Portable X-Ray",
    location: "Bay 5",
    lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    status: "available" as const,
  },
  {
    id: "6",
    name: "IV Pump #12",
    location: "Resus 2",
    lastUpdated: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago (stale)
    status: "in-use" as const,
  },
];

type Asset = (typeof mockAssets)[number];

export const Route = createFileRoute("/_authed/assets/")({
  component: AssetsPage,
});

function isStale(lastUpdated: Date): boolean {
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  return lastUpdated.getTime() < twentyFourHoursAgo;
}

function formatLastUpdated(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}

function getStatusColor(status: Asset["status"]): string {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-800";
    case "in-use":
      return "bg-red-100 text-red-800";
    case "charging":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function AssetsPage() {
  const [assets] = useState<Asset[]>(mockAssets);

  const handleUpdateLocation = (assetId: string) => {
    // Placeholder: In a real app, this would open a modal or navigate to update the location
    console.log("Update location for asset:", assetId);
    alert(`Update location for asset ${assetId} - Feature coming soon!`);
  };

  const handleAddAsset = () => {
    // Placeholder: In a real app, this would open a modal or navigate to add a new asset
    console.log("Add new asset");
    alert("Add new asset - Feature coming soon!");
  };

  const staleCount = assets.filter((asset) => isStale(asset.lastUpdated)).length;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Asset Tracker</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track and manage department equipment locations
            </p>
          </div>
          <Button onClick={handleAddAsset}>
            <svg
              className="h-4 w-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Asset
          </Button>
        </div>
      </div>

      {/* Stale Assets Warning */}
      {staleCount > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-amber-600 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-sm font-medium text-amber-800">
                {staleCount} asset{staleCount > 1 ? "s" : ""} with location data
                older than 24 hours
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Asset Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => {
          const stale = isStale(asset.lastUpdated);
          return (
            <Card
              key={asset.id}
              className={stale ? "border-amber-300 bg-amber-50/50" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{asset.name}</CardTitle>
                    <CardDescription className="mt-1">
                      ID: {asset.id}
                    </CardDescription>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      asset.status
                    )}`}
                  >
                    {asset.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Location */}
                  <div className="flex items-center text-sm">
                    <svg
                      className="h-4 w-4 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-gray-700">{asset.location}</span>
                  </div>

                  {/* Last Updated */}
                  <div className="flex items-center text-sm">
                    <svg
                      className={`h-4 w-4 mr-2 ${
                        stale ? "text-amber-500" : "text-gray-400"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className={stale ? "text-amber-700 font-medium" : "text-gray-500"}>
                      Updated {formatLastUpdated(asset.lastUpdated)}
                      {stale && " (stale)"}
                    </span>
                  </div>

                  {/* Update Location Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleUpdateLocation(asset.id)}
                  >
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Update Location
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {assets.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No assets tracked
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started by adding your first asset.
            </p>
            <Button className="mt-4" onClick={handleAddAsset}>
              Add Asset
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
