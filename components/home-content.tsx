"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, Users, Loader2, Newspaper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { renderTextWithLinks } from "@/lib/render-text-with-links"

interface ClubPost {
  id: string
  club_id: string
  club_name?: string
  club_avatar?: string
  author_name: string
  author_avatar: string | null
  author_email: string
  content: string
  image_url: string | null
  likes_count: number
  comments_count: number
  created_at: string
  isLiked?: boolean
}

export function HomeContent() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<ClubPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Load posts with pagination
  const loadPosts = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const url = user?.id
        ? `/api/feed?page=${pageNum}&limit=20&userId=${user.id}`
        : `/api/feed?page=${pageNum}&limit=20`

      const response = await fetch(url)
      if (!response.ok) return

      const result = await response.json()

      if (append) {
        setPosts((prev) => [...prev, ...result.data])
      } else {
        setPosts(result.data)
      }

      setHasMore(result.pagination.hasMore)
      setPage(pageNum)
    } catch (error) {
      console.error("Error loading posts:", error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Load more posts
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadPosts(page + 1, true)
    }
  }

  useEffect(() => {
    loadPosts(1, false)
  }, [user?.id])

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user?.id) {
      alert("Please log in to like posts")
      return
    }

    try {
      let response

      if (isLiked) {
        // Unlike: send DELETE request with userId in query params
        response = await fetch(`/api/posts/${postId}/like?userId=${encodeURIComponent(user.id)}`, {
          method: "DELETE",
        })
      } else {
        // Like: send POST request with userId in body
        response = await fetch(`/api/posts/${postId}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        })
      }

      if (response.ok) {
        const data = await response.json()
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  isLiked: data.liked,
                  likes_count: data.likeCount,
                }
              : post
          )
        )
      } else {
        const error = await response.json()
        console.error("Error toggling like:", error)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block p-4 bg-secondary border-2 border-foreground shadow-brutal mb-4 animate-bounce-brutal">
            <Loader2 className="h-10 w-10 animate-spin text-secondary-foreground" />
          </div>
          <p className="text-muted-foreground font-bold uppercase tracking-wide">Loading club posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground border-2 border-foreground shadow-brutal transform -rotate-1">
          <Newspaper className="h-5 w-5" />
          <span className="font-bold uppercase tracking-wide text-sm">Latest Updates</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight uppercase">
          Club Feed
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-medium">
          Posts from all school clubs
        </p>
        <div className="w-24 h-1 bg-primary mx-auto" />
      </div>

      {/* Posts Feed */}
      <div className="space-y-4 sm:space-y-6">
        {posts.length === 0 && !loading ? (
          <Card className="hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-brutal-lg transition-all">
            <CardContent className="py-12 sm:py-16 text-center">
              <div className="inline-block p-4 bg-muted border-2 border-foreground mb-4">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
              </div>
              <p className="text-lg sm:text-xl text-foreground font-bold uppercase">No club posts yet</p>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                Join a club to see posts from your clubs!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {posts.map((post, index) => (
              <Card
                key={post.id}
                className="overflow-hidden hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-brutal-lg transition-all animate-pop-in"
                style={{
                  animationDelay: `${index * 50}ms`,
                  transform: index % 2 === 0 ? 'rotate(-0.3deg)' : 'rotate(0.3deg)'
                }}
              >
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Link href={`/clubs/${post.club_id}`} className="flex-shrink-0">
                        <Avatar className="h-11 w-11 sm:h-12 sm:w-12 border-2 border-foreground shadow-brutal-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all">
                          <AvatarImage src={post.club_avatar || "/placeholder.svg"} alt={post.club_name || "Club"} />
                          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                            {(post.club_name || "C")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/clubs/${post.club_id}`} className="hover:underline underline-offset-2">
                            <h3 className="font-bold text-sm sm:text-base text-card-foreground uppercase tracking-wide truncate">
                              {post.club_name || "Club"}
                            </h3>
                          </Link>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold uppercase border border-foreground">
                            <Users className="h-3 w-3" />
                            Club
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium flex-wrap">
                          <span className="truncate">by {post.author_name}</span>
                          <span className="text-foreground/30">•</span>
                          <span className="font-bold">{formatTimestamp(post.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  <p className="text-sm sm:text-base text-card-foreground leading-relaxed whitespace-pre-wrap">{renderTextWithLinks(post.content)}</p>

                  {post.image_url && (
                    <div className="border-2 border-foreground shadow-brutal overflow-hidden -mx-4 sm:mx-0">
                      <img
                        src={post.image_url.startsWith("data:") ? post.image_url : post.image_url}
                        alt="Post content"
                        className="w-full h-48 sm:h-64 object-cover"
                      />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-3 border-t-2 border-foreground/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id, post.isLiked || false)}
                      className={`gap-2 h-9 px-3 border-2 ${
                        post.isLiked
                          ? "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20"
                          : "border-transparent hover:border-foreground hover:bg-secondary/20"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${post.isLiked ? "fill-current" : ""}`} />
                      <span className="font-bold">{post.likes_count || 0}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="secondary"
                  className="w-full sm:w-auto min-w-[200px]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Posts'
                  )}
                </Button>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-6">
                <div className="inline-block px-4 py-2 bg-muted border-2 border-foreground/30 text-sm text-muted-foreground font-bold uppercase">
                  You've reached the end
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
