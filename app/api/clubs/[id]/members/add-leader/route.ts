import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// POST /api/clubs/[id]/members/add-leader - Add a leader by email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clubId } = await params
    const body = await request.json()
    const { email, role, addedBy } = body

    if (!email || !role || !addedBy) {
      return NextResponse.json(
        { success: false, error: 'Email, role, and addedBy are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validLeaderRoles = ['officer', 'vice_president']
    if (!validLeaderRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid leadership role' },
        { status: 400 }
      )
    }

    // Verify the adder is the president or a sponsor of the club
    const [presidentResult, sponsorResult] = await Promise.all([
      pool.query('SELECT president_id FROM clubs WHERE id = $1', [clubId]),
      pool.query(
        `SELECT id FROM club_sponsors WHERE club_id = $1 AND user_id = $2 AND status = 'active'`,
        [clubId, addedBy]
      ),
    ])

    if (presidentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Club not found' },
        { status: 404 }
      )
    }

    const isPresident = presidentResult.rows[0].president_id === addedBy
    const isSponsor = sponsorResult.rows.length > 0

    if (!isPresident && !isSponsor) {
      return NextResponse.json(
        { success: false, error: 'Only the club president or sponsors can add leaders' },
        { status: 403 }
      )
    }

    // Find user by email
    const userQuery = 'SELECT id FROM users WHERE email = $1'
    const userResult = await pool.query(userQuery, [email])
    
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User with this email not found. They need to log in first.' },
        { status: 404 }
      )
    }

    const userId = userResult.rows[0].id

    // Check if user is already a member
    const memberQuery = 'SELECT role FROM club_members WHERE club_id = $1 AND user_id = $2'
    const memberResult = await pool.query(memberQuery, [clubId, userId])
    
    if (memberResult.rows.length > 0) {
      // User is already a member, update their role
      await pool.query(
        'UPDATE club_members SET role = $1 WHERE club_id = $2 AND user_id = $3',
        [role, clubId, userId]
      )
    } else {
      // User is not a member, add them with the leadership role
      await pool.query(
        'INSERT INTO club_members (club_id, user_id, role, joined_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [clubId, userId, role]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Leader added successfully',
    })
  } catch (error) {
    console.error('Error adding leader:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add leader' },
      { status: 500 }
    )
  }
}