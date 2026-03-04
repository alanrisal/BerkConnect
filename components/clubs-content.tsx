"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Calendar,
  MapPin,
  Search,
  Palette,
  Gamepad2,
  BookOpen,
  Trophy,
  Heart,
  Code,
  Crown,
  Loader2,
  Grid3X3,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { AdminClubImport } from "./admin-club-import"
import { ClaimClubDialog } from "./claim-club-dialog"
import { ClaimSponsorDialog } from "./claim-sponsor-dialog"
import { ManageLeadershipDialog } from "./manage-leadership-dialog"
import { CreatePostDialog } from "./create-post-dialog"

interface Club {
  id: string
  name: string
  description: string
  category: "academic" | "arts" | "sports" | "technology" | "service" | "hobby"
  member_count: number
  meeting_time: string | null
  location: string | null
  image_url: string | null
  is_joined?: boolean
  is_sponsor?: boolean
  is_claimed: boolean
  president_name?: string | null
  president_avatar?: string | null
  president_email?: string | null
  tags: string[]
  memberRole?: string | null
}

const categoryIcons = {
  academic: BookOpen,
  arts: Palette,
  sports: Trophy,
  technology: Code,
  service: Heart,
  hobby: Gamepad2,
}

const categoryColors = {
  academic: "bg-primary text-primary-foreground",
  arts: "bg-purple-600 text-white border-foreground",
  sports: "bg-green-600 text-white border-foreground",
  technology: "bg-orange-500 text-white border-foreground",
  service: "bg-red-600 text-white border-foreground",
  hobby: "bg-secondary text-secondary-foreground",
}

export function ClubsContent() {
  const { user, isTeacher } = useAuth()
  const router = useRouter()
  const [clubs, setClubs] = useState<Club[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [transferUserId, setTransferUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAdmin, setShowAdmin] = useState(false)

  // Load clubs from API
  const loadClubs = useCallback(async () => {
    try {
      setLoading(true)
      const url = user?.id ? `/api/clubs?userId=${user.id}` : "/api/clubs"
      const response = await fetch(url)

      if (response.ok) {
        const result = await response.json()
        setClubs(result.data || [])
      }
    } catch (error) {
      console.error("Error loading clubs:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadClubs()
  }, [loadClubs])


  const handleJoinLeave = useCallback(async (clubId: string, isJoined: boolean) => {
    if (!user?.id) return

    try {
      if (isJoined) {
        // Leave club
        const response = await fetch(`/api/clubs/${clubId}/join?userId=${user.id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          await loadClubs()
        }
      } else {
        // Join club
        const response = await fetch(`/api/clubs/${clubId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        })
        if (response.ok) {
          await loadClubs()
        }
      }
    } catch (error) {
      console.error("Error joining/leaving club:", error)
      alert("Failed to update membership. Please try again.")
    }
  }, [user?.id, loadClubs])

  const handleClaimSuccess = useCallback(() => {
    loadClubs()
  }, [loadClubs])

  const handleLeaveSponsor = useCallback(async (clubId: string) => {
    if (!user?.id) return
    if (!confirm("Are you sure you want to leave your sponsorship of this club?")) return

    try {
      const response = await fetch(`/api/clubs/${clubId}/leave-sponsor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      if (response.ok) {
        await loadClubs()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to leave sponsorship")
      }
    } catch (error) {
      console.error("Error leaving sponsorship:", error)
      alert("Failed to leave sponsorship. Please try again.")
    }
  }, [user?.id, loadClubs])

  const handleTransferPresidency = useCallback(async () => {
    if (!selectedClub || !transferUserId || !user?.id) return

    try {
      const response = await fetch(`/api/clubs/${selectedClub.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: user.id,
          toUserId: transferUserId,
        }),
      })

      if (response.ok) {
        setIsTransferDialogOpen(false)
        setTransferUserId("")
        await loadClubs()
        alert("Presidency transferred successfully!")
      } else {
        const data = await response.json()
        alert(data.error || "Failed to transfer presidency")
      }
    } catch (error) {
      console.error("Error transferring presidency:", error)
      alert("Failed to transfer presidency. Please try again.")
    }
  }, [selectedClub, transferUserId, user?.id, loadClubs])

  const filteredClubs = useMemo(() => {
    return clubs
      .filter((club) => {
        const matchesSearch =
          club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          club.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          club.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesCategory = selectedCategory === "all" || club.category === selectedCategory

        return matchesSearch && matchesCategory
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [clubs, searchTerm, selectedCategory])

  const joinedClubs = useMemo(() => filteredClubs.filter((club) => club.is_joined), [filteredClubs])
  const unclaimedClubs = useMemo(() => filteredClubs.filter((club) => !club.is_claimed), [filteredClubs])

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "academic", label: "Academic" },
    { value: "arts", label: "Arts" },
    { value: "sports", label: "Sports" },
    { value: "technology", label: "Technology" },
    { value: "service", label: "Service" },
    { value: "hobby", label: "Hobby" },
  ]

  const renderClubCard = (club: Club, showLeadershipBadge: boolean = false, index: number = 0) => {
    const CategoryIcon = categoryIcons[club.category]
    const isLeader = club.memberRole && ['president', 'vice_president', 'officer'].includes(club.memberRole)

    const handleCardClick = (e: React.MouseEvent) => {
      // Only navigate if not clicking on a button or interactive element
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('a[href]')) {
        return
      }
      router.push(`/clubs/${club.id}`)
    }

    return (
      <Card
        key={club.id}
        className="overflow-hidden cursor-pointer group hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-brutal-lg transition-all animate-pop-in"
        style={{
          animationDelay: `${index * 50}ms`,
          transform: index % 3 === 0 ? 'rotate(-0.5deg)' : index % 3 === 1 ? 'rotate(0.3deg)' : 'rotate(-0.2deg)'
        }}
        onClick={handleCardClick}
        role="article"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            router.push(`/clubs/${club.id}`)
          }
        }}
      >
        <div className="aspect-video relative overflow-hidden border-b-2 border-foreground">
          <img
            src={club.image_url || "/placeholder.svg"}
            alt={club.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
            <Badge className={`${categoryColors[club.category]} text-xs border-2`}>
              <CategoryIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
              <span className="hidden xs:inline uppercase">{club.category}</span>
            </Badge>
          </div>
          {!club.is_claimed && (
            <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
              <Badge variant="secondary" className="text-xs border-2 border-foreground transform rotate-2">
                Unclaimed
              </Badge>
            </div>
          )}
          {showLeadershipBadge && isLeader && (
            <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
              <Badge className="bg-primary text-primary-foreground text-xs border-2 border-foreground">
                <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                {club.memberRole === 'president' ? 'President' : club.memberRole === 'vice_president' ? 'VP' : 'Officer'}
              </Badge>
            </div>
          )}
        </div>

        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <Link href={`/clubs/${club.id}`}>
                <CardTitle className="text-base sm:text-lg hover:text-secondary transition-colors cursor-pointer truncate">
                  {club.name}
                </CardTitle>
              </Link>
              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-bold">{club.member_count || 0}</span> members
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 pt-0">
          <CardDescription className="line-clamp-3 text-xs sm:text-sm">{club.description}</CardDescription>

          {club.is_claimed && club.meeting_time && (
            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate font-medium">{club.meeting_time}</span>
              </div>
              {club.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate font-medium">{club.location}</span>
                </div>
              )}
            </div>
          )}

          {club.is_claimed && club.president_name && (
            <div className="flex items-center gap-2 min-w-0 p-2 bg-muted/50 border border-foreground/20">
              <Avatar className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 border-2 border-foreground">
                <AvatarImage src={club.president_avatar || "/placeholder.svg"} alt={club.president_name} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">
                  {club.president_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 truncate font-medium">
                <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 text-secondary" />
                <span className="truncate">{club.president_name}</span>
              </span>
            </div>
          )}

          {club.tags && club.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {club.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {club.tags.length > 3 && (
                <Badge variant="muted" className="text-xs">
                  +{club.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 border-t-2 border-foreground/20">
            {/* Sponsor Claim Button — shown for verified teachers who haven't
                already sponsored this specific club. Multiple teachers can
                sponsor the same club; is_sponsor is per-user from /api/clubs. */}
            {user?.id && isTeacher && !club.is_sponsor && (
              <ClaimSponsorDialog
                clubId={club.id}
                clubName={club.name}
                userId={user.id}
                userName={user.name || "User"}
                userEmail={user.email}
                isVerifiedTeacher={isTeacher}
                isAlreadySponsor={!!club.is_sponsor}
                onClaimSuccess={handleClaimSuccess}
              />
            )}

            {/* Leave Sponsorship button for active sponsors */}
            {user?.id && isTeacher && club.is_sponsor && (
              <Button
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation()
                  handleLeaveSponsor(club.id)
                }}
              >
                Leave Sponsorship
              </Button>
            )}

            {!club.is_claimed ? (
              user?.id ? (
                <ClaimClubDialog
                  clubId={club.id}
                  clubName={club.name}
                  userId={user.id}
                  userName={user.name || "User"}
                  userEmail={user.email}
                  userRole={user.role}
                  userGrade={user.grade}
                  userDepartment={user.department}
                  userBio={user.bio}
                  userAvatar={user.profilePicture}
                  onClaimSuccess={handleClaimSuccess}
                />
              ) : (
                <Button disabled className="w-full" variant="default">
                  <Crown className="h-4 w-4 mr-2" />
                  Login to Claim
                </Button>
              )
            ) : (
              <>
                {user?.id && (club.is_joined || club.is_sponsor) && (
                  <div className="flex gap-2">
                    <CreatePostDialog
                      clubId={club.id}
                      clubName={club.name}
                      userId={user.id}
                      onPostCreated={loadClubs}
                    />

                    {(club.memberRole === "president" || club.is_sponsor) && (
                      <ManageLeadershipDialog
                        clubId={club.id}
                        clubName={club.name}
                        currentUserId={user?.id || ""}
                        isPresident={club.memberRole === "president"}
                        isSponsor={!!club.is_sponsor}
                      />
                    )}

                    {club.memberRole === "president" && (
                      <Dialog
                        open={isTransferDialogOpen && selectedClub?.id === club.id}
                        onOpenChange={(open) => {
                          setIsTransferDialogOpen(open)
                          if (open) setSelectedClub(club)
                          else {
                            setSelectedClub(null)
                            setTransferUserId("")
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" title="Transfer Presidency">
                            <Crown className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="border-2 border-foreground shadow-brutal">
                          <DialogHeader>
                            <DialogTitle className="uppercase font-bold">Transfer Presidency</DialogTitle>
                            <DialogDescription>
                              Transfer club presidency to another member by their user ID
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="transfer-user-id" className="font-bold uppercase text-xs">User ID</Label>
                              <Input
                                id="transfer-user-id"
                                placeholder="Enter user ID to transfer to"
                                value={transferUserId}
                                onChange={(e) => setTransferUserId(e.target.value)}
                              />
                            </div>
                            <Button onClick={handleTransferPresidency} className="w-full" disabled={!transferUserId}>
                              Transfer
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
                {!club.is_sponsor && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleJoinLeave(club.id, club.is_joined || false)
                    }}
                    variant={club.is_joined ? "secondary" : "default"}
                    className={club.is_joined ? "flex-1" : "flex-1"}
                  >
                    {club.is_joined ? "Joined" : "Join Club"}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block p-4 bg-secondary border-2 border-foreground shadow-brutal mb-4 animate-bounce-brutal">
            <Loader2 className="h-10 w-10 animate-spin text-secondary-foreground" />
          </div>
          <p className="text-muted-foreground font-bold uppercase tracking-wide">Loading clubs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground border-2 border-foreground shadow-brutal transform rotate-1">
          <Grid3X3 className="h-5 w-5" />
          <span className="font-bold uppercase tracking-wide text-sm">Browse & Join</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight uppercase">
          School Clubs
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-2xl mx-auto">
          Discover and join clubs, or claim an unclaimed club to become its president.
        </p>
        <div className="w-24 h-1 bg-secondary mx-auto" />

        {user?.role === "admin" && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdmin(!showAdmin)}
              className="text-xs sm:text-sm"
            >
              {showAdmin ? "Hide" : "Show"} Admin
            </Button>
          </div>
        )}
      </div>

      {showAdmin && user?.role === "admin" && (
        <div className="mb-8">
          <AdminClubImport />
        </div>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto bg-muted border-2 border-foreground p-1">
          <TabsTrigger
            value="all"
            className="text-xs sm:text-sm py-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brutal-sm"
          >
            All Clubs
          </TabsTrigger>
          <TabsTrigger
            value="my-clubs"
            className="text-xs sm:text-sm py-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brutal-sm"
          >
            My Clubs
          </TabsTrigger>
          <TabsTrigger
            value="unclaimed"
            className="text-xs sm:text-sm py-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-brutal-sm"
          >
            Unclaimed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 sm:space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clubs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-base"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48 border-2 border-foreground font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-2 border-foreground shadow-brutal">
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value} className="font-medium">
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="inline-block px-3 py-1 bg-muted border-2 border-foreground/30 text-xs sm:text-sm text-muted-foreground font-bold uppercase">
            Showing {filteredClubs.length} clubs
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredClubs.map((club, index) => renderClubCard(club, false, index))}
          </div>

          {filteredClubs.length === 0 && (
            <Card className="hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-brutal-lg transition-all">
              <CardContent className="py-12 sm:py-16 text-center">
                <div className="inline-block p-4 bg-muted border-2 border-foreground mb-4">
                  <Search className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                </div>
                <p className="text-lg sm:text-xl text-foreground font-bold uppercase">No clubs found</p>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-clubs" className="space-y-4 sm:space-y-6 mt-6">
          <div className="inline-block px-3 py-1 bg-muted border-2 border-foreground/30 text-xs sm:text-sm text-muted-foreground font-bold uppercase">
            {joinedClubs.length} joined clubs
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {joinedClubs.map((club, index) => renderClubCard(club, true, index))}
          </div>
          {joinedClubs.length === 0 && (
            <Card className="hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-brutal-lg transition-all">
              <CardContent className="py-12 sm:py-16 text-center">
                <div className="inline-block p-4 bg-muted border-2 border-foreground mb-4">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                </div>
                <p className="text-lg sm:text-xl text-foreground font-bold uppercase">No clubs joined yet</p>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Browse all clubs and join one!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unclaimed" className="space-y-4 sm:space-y-6 mt-6">
          <div className="inline-block px-3 py-1 bg-secondary border-2 border-foreground text-xs sm:text-sm text-secondary-foreground font-bold uppercase transform -rotate-1">
            {unclaimedClubs.length} unclaimed clubs available
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {unclaimedClubs.map((club, index) => renderClubCard(club, false, index))}
          </div>
          {unclaimedClubs.length === 0 && (
            <Card className="hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-brutal-lg transition-all">
              <CardContent className="py-12 sm:py-16 text-center">
                <div className="inline-block p-4 bg-secondary border-2 border-foreground mb-4">
                  <Crown className="h-10 w-10 sm:h-12 sm:w-12 text-secondary-foreground" />
                </div>
                <p className="text-lg sm:text-xl text-foreground font-bold uppercase">All clubs claimed!</p>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Every club has a president now
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
