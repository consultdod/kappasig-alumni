import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/events/rsvp?event=xxx&member=xxx&response=yes
// Called from one-click links in invitation emails
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event')
  const memberId = searchParams.get('member')
  const response = searchParams.get('response')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!eventId || !memberId || !['yes', 'no', 'maybe'].includes(response)) {
    return NextResponse.redirect(`${appUrl}/events?rsvp=invalid`)
  }

  try {
    const supabaseAdmin = getAdminClient()

    // Verify event and member exist
    const [{ data: event }, { data: member }] = await Promise.all([
      supabaseAdmin.from('events').select('id, title').eq('id', eventId).single(),
      supabaseAdmin.from('members').select('id').eq('id', memberId).single(),
    ])

    if (!event || !member) {
      return NextResponse.redirect(`${appUrl}/events?rsvp=invalid`)
    }

    // Upsert RSVP
    const { error } = await supabaseAdmin
      .from('rsvps')
      .upsert(
        { event_id: eventId, member_id: memberId, response, responded_at: new Date().toISOString() },
        { onConflict: 'event_id,member_id' }
      )

    if (error) {
      return NextResponse.redirect(`${appUrl}/events/${eventId}?rsvp=error`)
    }

    // Redirect to event page with success message
    return NextResponse.redirect(`${appUrl}/events/${eventId}?rsvp=${response}`)

  } catch {
    return NextResponse.redirect(`${appUrl}/events?rsvp=error`)
  }
}
