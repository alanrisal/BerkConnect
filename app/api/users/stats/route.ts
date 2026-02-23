import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { getUserRoles } from "@/lib/auth/roles"

// GET /api/users/stats - Get user statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 }
      )
    }

    // Get user roles
    const roles = await getUserRoles(userId)

    // Get clubs joined count
    const clubsJoinedResult = await pool.query(
      `SELECT COUNT(*) as count FROM club_members WHERE user_id = $1`,
      [userId]
    )
    const clubsJoined = parseInt(clubsJoinedResult.rows[0]?.count || "0")

    // Get clubs where user is president
    const clubsPresidentResult = await pool.query(
      `SELECT COUNT(*) as count FROM club_members WHERE user_id = $1 AND role = 'president'`,
      [userId]
    )
    const clubsPresidentOf = parseInt(clubsPresidentResult.rows[0]?.count || "0")

    // Get clubs where user is officer
    const clubsOfficerResult = await pool.query(
      `SELECT COUNT(*) as count FROM club_members WHERE user_id = $1 AND role IN ('officer', 'vice_president')`,
      [userId]
    )
    const clubsOfficerOf = parseInt(clubsOfficerResult.rows[0]?.count || "0")

    // Get clubs sponsoring (if sponsor)
    const clubsSponsoringResult = await pool.query(
      `SELECT COUNT(*) as count FROM club_sponsors WHERE user_id = $1 AND status = 'active'`,
      [userId]
    )
    const clubsSponsoring = parseInt(clubsSponsoringResult.rows[0]?.count || "0")

    // Get posts created
    const postsCreatedResult = await pool.query(
      `SELECT COUNT(*) as count FROM posts WHERE user_id = $1`,
      [userId]
    )
    const postsCreated = parseInt(postsCreatedResult.rows[0]?.count || "0")

    // Get posts liked
    const postsLikedResult = await pool.query(
      `SELECT COUNT(*) as count FROM post_likes WHERE user_id = $1`,
      [userId]
    )
    const postsLiked = parseInt(postsLikedResult.rows[0]?.count || "0")

    return NextResponse.json({
      success: true,
      data: {
        clubsJoined,
        clubsPresidentOf,
        clubsOfficerOf,
        clubsSponsoring,
        postsCreated,
        postsLiked,
        isCoordinator: roles.isCoordinator,
        isSponsor: roles.isSponsor,
        isPresident: roles.isPresident,
        isOfficer: roles.isOfficer,
      },
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch user stats" },
      { status: 500 }
    )
  }
}
