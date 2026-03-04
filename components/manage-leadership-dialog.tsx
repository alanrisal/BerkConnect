"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserCog, Crown, Users, Trash2, Plus } from "lucide-react"

interface ClubMember {
  id: string
  user_id: string
  name: string
  email: string
  avatar_url?: string
  role: string
  joined_at: string
}

interface ManageLeadershipDialogProps {
  clubId: string
  clubName: string
  currentUserId: string
  isPresident: boolean
  isSponsor?: boolean
}

const LEADERSHIP_ROLES = [
  { value: 'president', label: 'Co-President', icon: Crown },
  { value: 'vice_president', label: 'Vice President', icon: UserCog },
  { value: 'officer', label: 'Officer', icon: Users },
]

export function ManageLeadershipDialog({ clubId, clubName, currentUserId, isPresident, isSponsor }: ManageLeadershipDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [leaders, setLeaders] = useState<ClubMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newLeaderEmail, setNewLeaderEmail] = useState("")
  const [newLeaderRole, setNewLeaderRole] = useState("officer")

  const loadMembers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/clubs/${clubId}/members`)
      if (response.ok) {
        const data = await response.json()
        const allMembers = data.data || []
        
        // Separate leaders from regular members
        const leaderRoles = ['president', 'vice_president', 'officer']
        const leadersList = allMembers.filter((member: ClubMember) => leaderRoles.includes(member.role))
        const membersList = allMembers.filter((member: ClubMember) => !leaderRoles.includes(member.role))
        
        setLeaders(leadersList)
        setMembers(membersList)
      }
    } catch (error) {
      console.error("Error loading members:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadMembers()
    }
  }, [isOpen, clubId])

  const handlePromoteMember = async (memberId: string, role: string) => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/members/${memberId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, updatedBy: currentUserId }),
      })

      if (response.ok) {
        await loadMembers()
        alert(`Member promoted to ${LEADERSHIP_ROLES.find(r => r.value === role)?.label} successfully!`)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to promote member")
      }
    } catch (error) {
      console.error("Error promoting member:", error)
      alert("Failed to promote member. Please try again.")
    }
  }

  const handleDemoteLeader = async (leaderId: string, leaderRole: string) => {
    if (leaderId === currentUserId) {
      alert("You cannot demote yourself. Use the transfer presidency feature instead.")
      return
    }

    const confirmMessage = leaderRole === 'president' 
      ? "Are you sure you want to remove this co-president? They will become a regular member."
      : "Are you sure you want to demote this leader to a regular member?"

    if (confirm(confirmMessage)) {
      try {
        const response = await fetch(`/api/clubs/${clubId}/members/${leaderId}/role`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "member", updatedBy: currentUserId }),
        })

        if (response.ok) {
          await loadMembers()
          alert("Leader demoted successfully!")
        } else {
          const data = await response.json()
          alert(data.error || "Failed to demote leader")
        }
      } catch (error) {
        console.error("Error demoting leader:", error)
        alert("Failed to demote leader. Please try again.")
      }
    }
  }

  const handleAddLeaderByEmail = async () => {
    if (!newLeaderEmail.trim()) {
      alert("Please enter an email address")
      return
    }

    try {
      const response = await fetch(`/api/clubs/${clubId}/members/add-leader`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newLeaderEmail,
          role: newLeaderRole,
          addedBy: currentUserId,
        }),
      })

      if (response.ok) {
        await loadMembers()
        setNewLeaderEmail("")
        setNewLeaderRole("officer")
        alert("Leader added successfully!")
      } else {
        const data = await response.json()
        alert(data.error || "Failed to add leader")
      }
    } catch (error) {
      console.error("Error adding leader:", error)
      alert("Failed to add leader. Please try again.")
    }
  }

  const getRoleIcon = (role: string) => {
    const roleConfig = LEADERSHIP_ROLES.find(r => r.value === role)
    return roleConfig?.icon || Users
  }

  const getRoleLabel = (role: string) => {
    const roleConfig = LEADERSHIP_ROLES.find(r => r.value === role)
    return roleConfig?.label || role
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'president': return 'bg-sky-100 text-sky-800'
      case 'vice_president': return 'bg-blue-100 text-blue-800'
      case 'officer': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isPresident && !isSponsor) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Manage Leadership">
          <UserCog className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <UserCog className="h-4 w-4 sm:h-5 sm:w-5" />
            Manage Leadership - {clubName}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Add, promote, or manage leadership roles for your club members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Current Leaders */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-base sm:text-lg font-semibold">Current Leadership</h3>
            {leaders.length > 0 ? (
              <div className="space-y-2">
                {leaders.map((leader) => {
                  const RoleIcon = getRoleIcon(leader.role)
                  return (
                    <div key={leader.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 border rounded-lg">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                          <AvatarImage src={leader.avatar_url || "/placeholder.svg"} alt={leader.name} />
                          <AvatarFallback className="text-xs">
                            {leader.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{leader.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{leader.email}</p>
                        </div>
                        <Badge className={`${getRoleBadgeColor(leader.role)} text-xs flex-shrink-0`}>
                          <RoleIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          <span className="hidden xs:inline">{getRoleLabel(leader.role)}</span>
                        </Badge>
                      </div>
                      {leader.user_id !== currentUserId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDemoteLeader(leader.user_id, leader.role)}
                          className="h-8 text-xs sm:text-sm w-full sm:w-auto"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          {leader.role === 'president' ? 'Remove' : 'Demote'}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No other leaders assigned yet.</p>
            )}
          </div>

          {/* Add Leader by Email */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-base sm:text-lg font-semibold">Add New Leader</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Label htmlFor="leader-email" className="text-sm">Email Address</Label>
                <Input
                  id="leader-email"
                  type="email"
                  placeholder="Enter member's email"
                  value={newLeaderEmail}
                  onChange={(e) => setNewLeaderEmail(e.target.value)}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="w-full sm:w-40">
                <Label htmlFor="leader-role" className="text-sm">Role</Label>
                <Select value={newLeaderRole} onValueChange={setNewLeaderRole}>
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEADERSHIP_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddLeaderByEmail} disabled={!newLeaderEmail.trim()} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Promote Members */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-base sm:text-lg font-semibold">Promote Members</h3>
            {members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 border rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                        <AvatarImage src={member.avatar_url || "/placeholder.svg"} alt={member.name} />
                        <AvatarFallback className="text-xs">
                          {member.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{member.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">Member</Badge>
                    </div>
                    <div className="flex gap-1 flex-wrap sm:flex-nowrap">
                      {LEADERSHIP_ROLES.map((role) => (
                        <Button
                          key={role.value}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePromoteMember(member.user_id, role.value)}
                          className="h-8 text-xs flex-1 sm:flex-none"
                        >
                          <span className="hidden sm:inline">{role.label}</span>
                          <span className="sm:hidden">{role.value === 'vice_president' ? 'VP' : role.value === 'president' ? 'Pres' : role.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No regular members to promote.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}