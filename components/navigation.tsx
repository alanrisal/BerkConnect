"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Home, Users, Bell, GraduationCap, Settings, LogOut, Menu, HelpCircle } from "lucide-react"
import { UserProfile } from "@/lib/auth-config"
import { UserSettingsDialog } from "./user-settings-dialog"
import Link from "next/link"

type ActiveSection = "home" | "clubs"

interface NavigationProps {
  activeSection: ActiveSection
  onSectionChange: (section: ActiveSection) => void
  user: UserProfile | null
  onLogout: () => void
}

export function Navigation({ activeSection, onSectionChange, user, onLogout }: NavigationProps) {
  const { isTeacher } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  const fetchNotificationCount = useCallback(async () => {
    if (!user?.id || document.hidden) return
    try {
      const response = await fetch(`/api/notifications/count?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setNotificationCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }, [user?.id])

  useEffect(() => {
    fetchNotificationCount()
    // Poll every 3 minutes — reduces Vercel function invocations significantly
    const interval = setInterval(fetchNotificationCount, 3 * 60 * 1000)

    // Pause polling while tab is hidden; fetch immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchNotificationCount()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchNotificationCount])

  const handleOpenSettings = () => {
    // Close dropdown first
    setDropdownOpen(false)
    setMobileDropdownOpen(false)
    // Blur any active element to remove focus
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    // Open settings dialog after a brief delay
    setTimeout(() => setSettingsOpen(true), 100)
  }

  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "clubs" as const, label: "Clubs", icon: Users },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b-2 border-foreground">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo and brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary border-2 border-foreground shadow-brutal-sm">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-base sm:text-xl font-black text-foreground tracking-tight">
                BERK<span className="text-secondary">CONNECT</span>
              </span>
            </div>
          </div>

          {/* Navigation items - Desktop only */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id

              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "outline"}
                  className={`gap-2 ${isActive ? "" : "bg-background"}`}
                  onClick={() => onSectionChange(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications */}
            <Link href="/notifications">
              <Button variant="outline" size="icon" className="relative hidden xs:flex h-9 w-9 sm:h-10 sm:w-10 bg-background">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 bg-secondary border-2 border-foreground flex items-center justify-center text-[8px] font-bold text-secondary-foreground">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* User menu - Desktop */}
            {user ? (
              <>
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 sm:h-11 sm:w-11 p-0 hidden md:flex border-2 border-foreground shadow-brutal-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={user.profilePicture || "/placeholder-user.jpg"} alt="Profile" />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm font-bold">
                          {user.name?.split(" ").map(n => n[0]).join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 border-2 border-foreground shadow-brutal" align="end" forceMount>
                    <div className="flex flex-col space-y-1 p-3 bg-secondary/10 border-b-2 border-foreground -m-1 mb-1">
                      <p className="text-sm font-bold leading-none uppercase">{user.name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground font-medium">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {isTeacher ? (
                          <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground border border-foreground font-bold uppercase">
                            Teacher
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground border border-foreground/30 font-bold uppercase">
                            {user.role}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenuItem
                      className="font-bold uppercase text-xs tracking-wide cursor-pointer"
                      onSelect={(e) => {
                        e.preventDefault()
                        handleOpenSettings()
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <Link href="/faq">
                      <DropdownMenuItem className="font-bold uppercase text-xs tracking-wide cursor-pointer">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        <span>FAQ & Support</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator className="bg-foreground/20" />
                    <DropdownMenuItem onClick={onLogout} className="font-bold uppercase text-xs tracking-wide cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Settings Dialog */}
                {settingsOpen && (
                  <UserSettingsDialog
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    user={user}
                    isTeacher={isTeacher}
                  />
                )}
              </>
            ) : (
              // Show placeholder when no user (during loading or not authenticated)
              <div className="h-10 w-10 sm:h-11 sm:w-11 bg-muted border-2 border-foreground animate-pulse hidden md:block" />
            )}

            {/* Mobile navigation menu */}
            <div className="md:hidden">
              <DropdownMenu open={mobileDropdownOpen} onOpenChange={setMobileDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 bg-background">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 border-2 border-foreground shadow-brutal" align="end">
                  {/* User info on mobile */}
                  {user && (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-secondary/10 border-b-2 border-foreground -m-1 mb-1">
                        <Avatar className="h-10 w-10 border-2 border-foreground">
                          <AvatarImage src={user.profilePicture || "/placeholder-user.jpg"} alt="Profile" />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                            {user.name?.split(" ").map(n => n[0]).join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold leading-none truncate uppercase">{user.name || "User"}</p>
                          <p className="text-xs leading-none text-muted-foreground mt-1 truncate">{user.email}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Navigation items */}
                  {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={`font-bold uppercase text-xs tracking-wide cursor-pointer ${activeSection === item.id ? "bg-secondary text-secondary-foreground" : ""}`}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    )
                  })}

                  <DropdownMenuSeparator className="bg-foreground/20" />

                  {/* Mobile-only menu items */}
                  <Link href="/notifications">
                    <DropdownMenuItem className="font-bold uppercase text-xs tracking-wide cursor-pointer">
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Notifications</span>
                      {notificationCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-bold border border-foreground">
                          {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                      )}
                    </DropdownMenuItem>
                  </Link>

                  <DropdownMenuItem
                    className="font-bold uppercase text-xs tracking-wide cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault()
                      handleOpenSettings()
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>

                  <Link href="/faq">
                    <DropdownMenuItem className="font-bold uppercase text-xs tracking-wide cursor-pointer">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <span>FAQ & Support</span>
                    </DropdownMenuItem>
                  </Link>

                  <DropdownMenuSeparator className="bg-foreground/20" />

                  <DropdownMenuItem onClick={onLogout} className="font-bold uppercase text-xs tracking-wide cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
