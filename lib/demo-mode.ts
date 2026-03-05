// Demo mode configuration for testing without Azure authentication
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

export const DEMO_USER: any = {
  id: "demo-user-123",
  email: "demo@berkeleyprep.org",
  name: "Demo User",
  role: "student",
  grade: "11",
  bio: "This is a demo account for testing the BerkConnect interface.",
  interests: ["Technology", "Science", "Music"],
  profilePicture: "/placeholder-user.jpg",
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const DEMO_CLUBS = [
  {
    id: "demo-club-1",
    name: "Demo Robotics Club",
    description: "A demonstration club for testing the interface.",
    category: "technology",
    memberCount: 15,
    meetingTime: "Wednesdays, 3:30 PM",
    location: "Tech Lab",
    image: "/robotics-competition.png",
    isJoined: true,
    president: {
      name: "Demo President",
      avatar: "/placeholder-user.jpg",
    },
    tags: ["Demo", "Technology", "Testing"],
  },
]
