import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// PUT /api/clubs/[id]/members/[memberId]/role - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: clubId, memberId } = await params
    const body = await request.json()
    const { role, updatedBy } = body

    if (!role || !updatedBy) {
      return NextResponse.json(
        { success: false, error: 'Role and updatedBy are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['member', 'officer', 'vice_president', 'president']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Verify the updater is a president or sponsor of the club
    const [presidentResult, sponsorResult] = await Promise.all([
      pool.query(
        `SELECT role FROM club_members WHERE club_id = $1 AND user_id = $2 AND role = 'president'`,
        [clubId, updatedBy]
      ),
      pool.query(
        `SELECT id FROM club_sponsors WHERE club_id = $1 AND user_id = $2 AND status = 'active'`,
        [clubId, updatedBy]
      ),
    ])

    if (presidentResult.rows.length === 0 && sponsorResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Only club presidents or sponsors can update member roles' },
        { status: 403 }
      )
    }

    // Update member role (supports multiple presidents - co-presidency)
    await pool.query(
      'UPDATE club_members SET role = $1 WHERE club_id = $2 AND user_id = $3',
      [role, clubId, memberId]
    )
    
    // If promoting to president and this is the first president, update club's president_id
    if (role === 'president') {
      const currentPresidentCheck = await pool.query(
        'SELECT president_id FROM clubs WHERE id = $1',
        [clubId]
      )
      
      // Only update president_id if it's not set (first president)
      if (!currentPresidentCheck.rows[0].president_id) {
        await pool.query(
          'UPDATE clubs SET president_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [memberId, clubId]
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Member role updated successfully',
    })
  } catch (error) {
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update member role' },
      { status: 500 }
    )
  }
}