import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get user's notification preferences
    const prefsResult = await pool.query(
      'SELECT filter_mode FROM notification_preferences WHERE user_id = $1',
      [userId]
    )
    const filterMode = prefsResult.rows[0]?.filter_mode || 'all'

    let query = `
      SELECT
        n.*,
        c.name as club_name,
        c.image_url as club_image
      FROM notifications n
      LEFT JOIN clubs c ON n.club_id = c.id
      WHERE n.user_id = $1
    `
    const params: any[] = [userId]

    // Apply filter based on user preferences
    if (filterMode === 'my_clubs') {
      query += `
        AND (n.club_id IS NULL OR n.club_id IN (
          SELECT club_id FROM club_members WHERE user_id = $1
        ))
      `
    }

    if (unreadOnly) {
      query += ` AND n.is_read = FALSE`
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // Get unread count
    let countQuery = `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE`
    if (filterMode === 'my_clubs') {
      countQuery += ` AND (club_id IS NULL OR club_id IN (SELECT club_id FROM club_members WHERE user_id = $1))`
    }
    const countResult = await pool.query(countQuery, [userId])

    return NextResponse.json({
      success: true,
      data: result.rows,
      unreadCount: parseInt(countResult.rows[0].count),
      filterMode,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, notificationIds, markAllRead } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }

    if (markAllRead) {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
        [userId]
      )
    } else if (notificationIds && notificationIds.length > 0) {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2::uuid[])',
        [userId, notificationIds]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read',
    })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}
