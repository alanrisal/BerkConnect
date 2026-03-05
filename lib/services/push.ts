// @ts-ignore - web-push doesn't have type declarations
import webpush from 'web-push'
import pool from '@/lib/db'

// Track if VAPID has been initialized
let vapidInitialized = false

/**
 * Initialize VAPID details - called at runtime to ensure env vars are available
 */
function ensureVapidInitialized() {
  if (vapidInitialized) return true

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

  console.log('[Push] Initializing VAPID:', {
    hasPublic: !!vapidPublicKey,
    hasPrivate: !!vapidPrivateKey,
    publicLength: vapidPublicKey?.length,
    privateLength: vapidPrivateKey?.length,
  })

  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
      'mailto:notifications@BerkConnect.app',
      vapidPublicKey,
      vapidPrivateKey
    )
    vapidInitialized = true
    console.log('[Push] VAPID initialized successfully')
    return true
  }

  console.warn('[Push] VAPID keys not available')
  return false
}

/**
 * Get VAPID configuration status for debugging
 */
export function getVapidStatus() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

  return {
    configured: !!(vapidPublicKey && vapidPrivateKey),
    hasPublicKey: !!vapidPublicKey,
    hasPrivateKey: !!vapidPrivateKey,
    publicKeyLength: vapidPublicKey?.length || 0,
    privateKeyLength: vapidPrivateKey?.length || 0,
    vapidInitialized,
  }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  clubId?: string
  postId?: string
  notificationId?: string
  tag?: string
}

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Send a push notification to a single subscription
 * Returns { success: true } or { success: false, error: string }
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string; details?: any }> {
  if (!ensureVapidInitialized()) {
    console.warn('[Push] VAPID keys not configured, skipping push notification')
    return { success: false, error: 'VAPID not configured' }
  }

  try {
    console.log('[Push] 📤 Sending notification to:', subscription.endpoint.substring(0, 80))
    console.log('[Push] 📦 Payload:', JSON.stringify(payload))
    
    const result = await webpush.sendNotification(
      subscription, 
      JSON.stringify(payload), 
      {
        TTL: 2419200, // 4 weeks (maximum for FCM)
        urgency: 'high',
      }
    )
    
    console.log('[Push] ✅ FCM Response:')
    console.log('  Status Code:', result.statusCode)
    console.log('  Headers:', JSON.stringify(result.headers, null, 2))
    console.log('  Body:', result.body)
    
    // Check if FCM returned any specific information
    if (result.statusCode === 201) {
      console.log('[Push] 🎉 FCM accepted the push!')
    }
    
    return { 
      success: true,
      details: {
        statusCode: result.statusCode,
        headers: result.headers,
        body: result.body
      }
    }
  } catch (error: any) {
    const errorDetails = `${error.statusCode || 'no status'}: ${error.message || error.body || 'unknown error'}`
    console.error('[Push] ❌ Send failed:', {
      statusCode: error.statusCode,
      message: error.message,
      body: error.body,
      headers: error.headers,
      endpoint: subscription.endpoint.substring(0, 80),
    })
    
    // Handle specific error codes - remove invalid subscriptions
    // 400 = malformed/invalid subscription
    // 404 = subscription not found
    // 410 = subscription expired/gone
    if (error.statusCode === 400 || error.statusCode === 404 || error.statusCode === 410) {
      console.log('[Push] 🗑️ Removing invalid subscription:', subscription.endpoint)
      await removeSubscription(subscription.endpoint)
    }
    
    return { 
      success: false, 
      error: errorDetails,
      details: {
        statusCode: error.statusCode,
        headers: error.headers,
        body: error.body
      }
    }
  }
}

/**
 * Send push notifications to all subscriptions for a user
 * Non-blocking - failures won't throw
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; errors?: string[]; details?: any[] }> {
  const result = { sent: 0, failed: 0 }

  console.log('[Push] 🚀 sendPushToUser called for user:', userId)

  if (!ensureVapidInitialized()) {
    console.warn('[Push] VAPID keys not configured, skipping push notifications')
    return result
  }

  try {
    // Get all subscriptions for this user
    const subscriptionsResult = await pool.query(
      'SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1',
      [userId]
    )

    console.log('[Push] 📋 Found subscriptions:', subscriptionsResult.rows.length)

    const subscriptions: PushSubscription[] = subscriptionsResult.rows.map((row) => ({
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh_key,
        auth: row.auth_key,
      },
    }))

    // Send to all subscriptions in parallel
    const results = await Promise.allSettled(
      subscriptions.map((sub, i) => {
        console.log(`[Push] 📨 Sending to subscription ${i + 1}:`, sub.endpoint.substring(0, 60) + '...')
        return sendPushNotification(sub, payload)
      })
    )

    const errors: string[] = []
    const details: any[] = []
    
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value?.success) {
        console.log(`[Push] ✅ Success for subscription ${i + 1}`)
        result.sent++
        if (r.value.details) {
          details.push({ index: i, success: true, ...r.value.details })
        }
      } else if (r.status === 'fulfilled' && !r.value?.success) {
        const errorMsg = r.value?.error || 'unknown error'
        console.log(`[Push] ❌ Failed for subscription ${i + 1}:`, errorMsg)
        errors.push(errorMsg)
        result.failed++
        if (r.value?.details) {
          details.push({ index: i, success: false, error: errorMsg, ...r.value.details })
        }
      } else {
        const errorMsg = r.status === 'rejected' ? r.reason?.message || String(r.reason) : 'unknown error'
        console.log(`[Push] ❌ Failed for subscription ${i + 1}:`, errorMsg)
        errors.push(errorMsg)
        result.failed++
        details.push({ index: i, success: false, error: errorMsg })
      }
    })
    
    // Attach errors and details to result for debugging
    if (errors.length > 0) {
      (result as any).errors = errors
    }
    if (details.length > 0) {
      (result as any).details = details
    }
  } catch (error) {
    console.error('[Push] Error sending push notifications to user:', error)
  }

  console.log('[Push] 📊 Final result:', result)
  return result
}

/**
 * Remove a subscription from the database by endpoint
 */
async function removeSubscription(endpoint: string): Promise<void> {
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint])
  } catch (error) {
    console.error('Error removing subscription:', error)
  }
}