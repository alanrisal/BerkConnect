import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// POST /api/clubs/[id]/claim - Claim an unclaimed club
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clubId } = await params
    const body = await request.json()
    const { userId, confirmed } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }

    if (!confirmed) {
      return NextResponse.json(
        { success: false, error: 'You must confirm that you are the president of this club' },
        { status: 400 }
      )
    }

    // Check if club exists and is unclaimed
    const clubResult = await pool.query(
      'SELECT is_claimed, name FROM clubs WHERE id = $1',
      [clubId]
    )

    if (clubResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Club not found' },
        { status: 404 }
      )
    }

    const club = clubResult.rows[0]

    if (club.is_claimed) {
      return NextResponse.json(
        { success: false, error: 'Club is already claimed' },
        { status: 409 }
      )
    }

    // Simple transaction: claim club and add as president member
    await pool.query('BEGIN')

    try {
      // Check if club already has presidents
      const existingPresidents = await pool.query(
        'SELECT user_id FROM club_members WHERE club_id = $1 AND role = $2',
        [clubId, 'president']
      )

      // Update club to claimed and set first president as primary
      if (existingPresidents.rows.length === 0) {
        await pool.query(
          'UPDATE clubs SET is_claimed = TRUE, president_id = $1 WHERE id = $2',
          [userId, clubId]
        )
      } else {
        // Just mark as claimed if adding additional president
        await pool.query(
          'UPDATE clubs SET is_claimed = TRUE WHERE id = $1',
          [clubId]
        )
      }

      // Add user as president member (supports multiple presidents)
      await pool.query(
        'INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (club_id, user_id) DO UPDATE SET role = $3',
        [clubId, userId, 'president']
      )

      await pool.query('COMMIT')

      const message = existingPresidents.rows.length > 0
        ? `You are now a co-president of ${club.name}!`
        : `You are now the president of ${club.name}!`

      return NextResponse.json({
        success: true,
        message,
      })
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error claiming club:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to claim club' },
      { status: 500 }
    )
  }
}