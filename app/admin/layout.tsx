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
import { Menu, BarChart3, Users, Package, Scissors, Settings, Star, FileText, User, LogOut, Bell, Wallet, MessageSquare } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useIsMobile } from "@/hooks/use-mobile"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, isLoading } = useAuth("ADMIN")
  const isMobile = useIsMobile()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)

  if (isLoading || !session) return null

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/tailors", label: "Tailors", icon: Scissors },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/product-masters", label: "Product Masters", icon: Settings },
    { href: "/admin/blogs", label: "Blogs", icon: FileText },
    { href: "/admin/ready-made-orders", label: "Ready-Made Orders", icon: Package },
    { href: "/admin/custom-orders", label: "Custom Orders", icon: Scissors },
    { href: "/admin/chats", label: "Order Chats", icon: MessageSquare },
    { href: "/admin/tailor-accounts", label: "Tailor Accounts", icon: Wallet },
    { href: "/admin/stitching-services", label: "Stitching Services", icon: Scissors },
    { href: "/admin/reviews", label: "Reviews", icon: Star },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ]

  const initials = (session.user.name || "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen((prev) => !prev)
      return
    }
    setDesktopSidebarOpen((prev) => !prev)
  }

  const isSidebarVisible = isMobile ? mobileSidebarOpen : desktopSidebarOpen

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="sticky top-0 z-30 shrink-0 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} aria-label="Toggle admin menu">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">TailorHub</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Open profile menu">
                  <Avatar className="size-9 border">
                    <AvatarImage src={session.user.image || ""} alt={session.user.name || "Admin"} />
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
                  <Link href="/admin/profile" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    signOut()
                    setMobileSidebarOpen(false)
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
        {mobileSidebarOpen ? (
          <button
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close admin menu"
          />
        ) : null}

        <aside
          className={`border-r bg-card transition-all duration-200 md:translate-x-0 ${
            isSidebarVisible ? "w-64 translate-x-0" : "w-0 -translate-x-full md:translate-x-0"
          } fixed md:static z-50 md:z-auto h-full md:h-auto overflow-y-auto`}
        >
          <div className={`p-6 ${isSidebarVisible ? "block" : "hidden"}`}>
            <h2 className="text-2xl font-bold mb-8"></h2>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => setMobileSidebarOpen(false)}
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
