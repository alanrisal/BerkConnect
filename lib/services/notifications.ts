import pool from '@/lib/db'
import { sendPushToUser, PushPayload } from './push'

interface CreateNotificationOptions {
  userId: string
  clubId?: string
  postId?: string
  type: 'new_post' | 'club_update' | 'leadership_request' | 'membership_approved'
  title: string
  body: string
}

export async function createNotification(options: CreateNotificationOptions) {
  const { userId, clubId, postId, type, title, body } = options

  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, club_id, post_id, type, title, body)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, clubId || null, postId || null, type, title, body]
    )

    return result.rows[0]
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

export async function createNotificationsForClubMembers(
  clubId: string,
  postId: string,
  type: 'new_post' | 'club_update',
  title: string,
  body: string,
  excludeUserId?: string
) {
  try {
    // Get all club members except the poster
    let memberQuery = `
      SELECT user_id FROM club_members WHERE club_id = $1
    `
    const params: any[] = [clubId]

    if (excludeUserId) {
      memberQuery += ` AND user_id != $2`
      params.push(excludeUserId)
    }

    const membersResult = await pool.query(memberQuery, params)

    // Create notifications for all members
    const notifications = []
    for (const member of membersResult.rows) {
      // Check if user has push enabled and filter allows this notification
      const prefsResult = await pool.query(
        'SELECT push_enabled, filter_mode FROM notification_preferences WHERE user_id = $1',
        [member.user_id]
      )

      const prefs = prefsResult.rows[0]
      // Default to enabled if no preferences set
      if (!prefs || prefs.push_enabled !== false) {
        const notification = await createNotification({
          userId: member.user_id,
          clubId,
          postId,
          type,
          title,
          body,
        })
        notifications.push(notification)

        // Send push notification to user's devices (non-blocking)
        const pushPayload: PushPayload = {
          title,
          body,
          url: `/clubs/${clubId}`,
          clubId,
          postId,
          notificationId: notification.id,
          tag: `club-${clubId}-post`,
        }
        sendPushToUser(member.user_id, pushPayload).catch((err) => {
          console.error('Push notification failed for user:', member.user_id, err)
        })
      }
    }

    return notifications
  } catch (error) {
    console.error('Error creating notifications for club members:', error)
    throw error
  }
}

export async function createNotificationsForAllFollowingClub(
  clubId: string,
  postId: string,
  type: 'new_post' | 'club_update',
  title: string,
  body: string,
  excludeUserId?: string
) {
  // This creates notifications based on user filter preferences
  // Users with 'all' filter will get notifications for all clubs
  // Users with 'my_clubs' filter will only get notifications for clubs they're members of

  try {
    // For 'my_clubs' filter users, only members get notifications
    // For 'all' filter users, they can opt-in to all club posts (future feature)
    // For now, we only notify members of the club
    return createNotificationsForClubMembers(clubId, postId, type, title, body, excludeUserId)
  } catch (error) {
    console.error('Error creating notifications:', error)
    throw error
  }
}

// Get subscriptions for a user to send push notifications
export async function getUserPushSubscriptions(userId: string) {
  try {
    const result = await pool.query(
      'SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1',
      [userId]
    )

    return result.rows.map((row) => ({
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh_key,
        auth: row.auth_key,
      },
    }))
  } catch (error) {
    console.error('Error fetching push subscriptions:', error)
    return []
  }
}
