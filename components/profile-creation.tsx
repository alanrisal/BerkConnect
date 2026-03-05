"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { UserProfile } from "@/lib/auth-config"

export function ProfileCreation() {
  const { createProfile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    role: "student" as "student" | "sponsor" | "admin",
    grade: "",
    department: "",
    bio: "",
    interests: [] as string[],
  })
  const [newInterest, setNewInterest] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await createProfile(formData)
    } catch (error) {
      console.error("Error creating profile:", error)
      alert("Failed to create profile. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }))
      setNewInterest("")
    }
  }

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addInterest()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center px-4 sm:px-6 py-4 sm:py-6">
          <CardTitle className="text-2xl sm:text-3xl">Create Your Profile</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Complete your profile to start using BerkConnect
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Role Selection */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="role" className="text-sm">I am a:</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "student" | "sponsor" | "admin") =>
                  setFormData(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="sponsor">Club Sponsor</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Grade (for students) */}
            {formData.role === "student" && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="grade" className="text-sm">Grade Level:</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, grade: value }))
                  }
                >
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Select your grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">9th Grade</SelectItem>
                    <SelectItem value="10">10th Grade</SelectItem>
                    <SelectItem value="11">11th Grade</SelectItem>
                    <SelectItem value="12">12th Grade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Department (for sponsors) */}
            {formData.role === "sponsor" && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="department" className="text-sm">Department:</Label>
                <Input
                  id="department"
                  placeholder="e.g., Science, Arts, Athletics"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, department: e.target.value }))
                  }
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
            )}

            {/* Bio */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="bio" className="text-sm">Bio (Optional):</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a bit about yourself..."
                value={formData.bio}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, bio: e.target.value }))
                }
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Interests */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm">Interests (Optional):</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add an interest..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-9 sm:h-10 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addInterest}
                  disabled={!newInterest.trim()}
                  className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Display interests */}
              {formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                  {formData.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="gap-1 text-xs">
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-9 sm:h-10 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Profile..." : "Create Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
