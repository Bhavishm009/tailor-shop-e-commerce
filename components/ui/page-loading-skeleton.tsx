"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function ListingPageLoadingSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="rounded-lg border p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-full sm:w-80" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>

        <div className="rounded-md border">
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="grid grid-cols-4 md:grid-cols-8 gap-2">
                <Skeleton className="h-5 col-span-1" />
                <Skeleton className="h-5 col-span-2" />
                <Skeleton className="h-5 col-span-1" />
                <Skeleton className="h-5 col-span-2" />
                <Skeleton className="h-5 col-span-1" />
                <Skeleton className="h-5 col-span-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductGridLoadingSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-44 w-full rounded-md" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

