import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/clubs/[id]/details - Get complete club details including members and posts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clubId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Get club details with primary president info (for backward compatibility)
    let clubQuery = `
      SELECT 
        c.*,
        u.name as president_name,
        u.avatar_url as president_avatar,
        u.email as president_email
      FROM clubs c
      LEFT JOIN users u ON c.president_id = u.id
      WHERE c.id = $1
    `
    
    const clubResult = await pool.query(clubQuery, [clubId])
    
    if (clubResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Club not found' },
        { status: 404 }
      )
    }

    const club = clubResult.rows[0]

    // Get all presidents (supports multiple presidents)
    const presidentsQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        cm.joined_at
      FROM club_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.club_id = $1 AND cm.role = 'president'
      ORDER BY cm.joined_at ASC
    `
    const presidentsResult = await pool.query(presidentsQuery, [clubId])
    club.presidents = presidentsResult.rows

    // Get all sponsors
    const sponsorsQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar_url
      FROM club_sponsors cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.club_id = $1 AND cs.status = 'active'
      ORDER BY cs.assigned_at ASC
    `
    const sponsorsResult = await pool.query(sponsorsQuery, [clubId])
    club.sponsors = sponsorsResult.rows
    
    // Try to get tags, fallback to empty array if table doesn't exist
    let tags = []
    try {
      const tagsResult = await pool.query(
        'SELECT tag FROM club_tags WHERE club_id = $1',
        [clubId]
      )
      tags = tagsResult.rows.map(row => row.tag)
    } catch (error) {
      console.log('club_tags table not found, using empty tags array')
    }
    
    club.tags = tags

    // Get member count and list (including sponsors)
    const membersQuery = `
      SELECT * FROM (
        SELECT 
          cm.id,
          cm.user_id,
          cm.role,
          cm.joined_at,
          u.name,
          u.email,
          u.avatar_url
        FROM club_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.club_id = $1
        UNION ALL
        SELECT 
          cs.id,
          cs.user_id,
          'sponsor'::text as role,
          cs.assigned_at as joined_at,
          u.name,
          u.email,
          u.avatar_url
        FROM club_sponsors cs
        JOIN users u ON cs.user_id = u.id
        WHERE cs.club_id = $1 AND cs.status = 'active'
      ) combined
      ORDER BY 
        CASE combined.role 
          WHEN 'sponsor' THEN 0
          WHEN 'president' THEN 1
          WHEN 'vice_president' THEN 2
          WHEN 'officer' THEN 3
          ELSE 4
        END,
        combined.joined_at ASC
    `
    const membersResult = await pool.query(membersQuery, [clubId])

    // Get recent posts (limit to 20 for performance)
    // Handle case where posts table might not exist yet
    let postsResult
    try {
      const postsQuery = `
        SELECT 
          p.id,
          p.content,
          p.image_url,
          p.created_at,
          u.name as author_name,
          u.avatar_url as author_avatar
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.club_id = $1
        ORDER BY p.created_at DESC
        LIMIT 20
      `
      postsResult = await pool.query(postsQuery, [clubId])
    } catch (error) {
      console.log('Posts table not found or error fetching posts, returning empty array')
      postsResult = { rows: [] }
    }

    // Check if current user is a member and their role
    let userMembership = null
    if (userId) {
      const membershipQuery = `
        SELECT role FROM club_members WHERE club_id = $1 AND user_id = $2
      `
      const membershipResult = await pool.query(membershipQuery, [clubId, userId])
      if (membershipResult.rows.length > 0) {
        userMembership = membershipResult.rows[0].role
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        club: {
          ...club,
          member_count: membersResult.rows.length,
          is_joined: userMembership !== null,
          memberRole: userMembership,
        },
        members: membersResult.rows,
        posts: postsResult.rows,
      },
    })
  } catch (error) {
    console.error('Error fetching club details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch club details' },
      { status: 500 }
    )
  }
}
