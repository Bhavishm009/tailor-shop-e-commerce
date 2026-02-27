"use client"

import type React from "react"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, Home, Package, DollarSign, Star, User, LogOut, Settings, Wallet } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"

export default function TailorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, isLoading } = useAuth("TAILOR")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading || !session) return null

  const navItems = [
    { href: "/tailor/dashboard", label: "Dashboard", icon: Home },
    { href: "/tailor/orders", label: "Assigned Orders", icon: Package },
    { href: "/tailor/earnings", label: "Earnings", icon: DollarSign },
    { href: "/tailor/account", label: "Account Panel", icon: Wallet },
    { href: "/tailor/profile", label: "Profile", icon: Star },
  ]

  const initials = (session.user.name || "T")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="border-b shrink-0 bg-background">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Tailor Hub</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Open profile menu">
                  <Avatar className="size-9 border">
                    <AvatarImage src={session.user.image || ""} alt={session.user.name || "Tailor"} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{session.user.name}</span>
                    <span className="text-xs text-muted-foreground">{session.user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/tailor/profile" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/tailor/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    signOut()
                    setSidebarOpen(false)
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {sidebarOpen ? (
          <button
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          />
        ) : null}

        <aside
          className={`w-64 border-r bg-card transition-transform md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed md:static z-50 md:z-auto h-full md:h-auto overflow-y-auto`}
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-8">TailorHub</h2>
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
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
