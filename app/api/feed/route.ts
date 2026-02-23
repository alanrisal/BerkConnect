import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/feed - Get paginated feed of all club posts
 * Query params:
 * - page: page number (default: 1)
 * - limit: posts per page (default: 20, max: 50)
 * - userId: optional user ID to check liked posts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Max 50 posts per page
    const userId = searchParams.get('userId')
    const offset = (page - 1) * limit

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    // Single optimized query to get all posts with club info and like counts
    const postsQuery = `
      SELECT 
        p.id,
        p.club_id,
        p.content,
        p.image_url,
        COUNT(DISTINCT pl.id)::int as likes_count,
        0 as comments_count,
        p.created_at,
        p.user_id as author_id,
        u.name as author_name,
        u.avatar_url as author_avatar,
        u.email as author_email,
        c.name as club_name,
        c.image_url as club_avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN clubs c ON p.club_id = c.id
      LEFT JOIN post_likes pl ON p.id = pl.post_id
      GROUP BY p.id, u.id, u.name, u.avatar_url, u.email, c.name, c.image_url
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `

    const postsResult = await pool.query(postsQuery, [limit, offset])

    // Get total count for pagination metadata
    const countQuery = 'SELECT COUNT(*) as total FROM posts'
    const countResult = await pool.query(countQuery)
    const totalPosts = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalPosts / limit)

    // Check which posts user has liked
    let posts = postsResult.rows
    if (userId && posts.length > 0 && userId !== 'demo-user-123') {
      const postIds = posts.map((p: any) => p.id)
      const likesQuery = `
        SELECT post_id FROM post_likes 
        WHERE user_id = $1 AND post_id = ANY($2::uuid[])
      `
      const likesResult = await pool.query(likesQuery, [userId, postIds])
      const likedPostIds = new Set(likesResult.rows.map((r: any) => r.post_id))

      posts = posts.map((post: any) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      }))
    } else {
      posts = posts.map((post: any) => ({
        ...post,
        isLiked: false,
      }))
    }

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total: totalPosts,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching feed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feed' },
      { status: 500 }
    )
  }
}
