"use client"

import type React from "react"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { LogOut, Menu, Home, User, Package, Ruler } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, isLoading } = useAuth("CUSTOMER")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading || !session) return null

  const navItems = [
    { href: "/customer/dashboard", label: "Dashboard", icon: Home },
    { href: "/customer/profile", label: "Profile", icon: User },
    { href: "/customer/measurements", label: "Measurements", icon: Ruler },
    { href: "/customer/orders", label: "Orders", icon: Package },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="md:hidden border-b sticky top-0 z-40 bg-background">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">Customer Hub</h1>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <button onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`w-64 border-r bg-card transition-transform md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed md:static h-screen overflow-y-auto`}
        >
          <div className="p-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold">TailorHub</h2>
              <NotificationsDropdown className="hidden md:inline-flex" />
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="absolute bottom-0 w-full p-6 border-t">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              onClick={() => {
                signOut()
                setSidebarOpen(false)
              }}
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
