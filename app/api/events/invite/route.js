import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendInvitationEmails } from '../create/route.js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(req) {
  try {
    const { eventId, senderId } = await req.json()
    const supabaseAdmin = getAdminClient()

    // Verify sender is admin
    const { data: sender } = await supabaseAdmin
      .from('members')
      .select('id, full_name, email, role')
      .eq('id', senderId)
      .single()

    if (!sender || sender.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admins only.' }, { status: 403 })
    }

    // Get event
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 })
    }

    const result = await sendInvitationEmails({ event, creator: sender, supabaseAdmin })

    return NextResponse.json({ success: true, sent: result.sent })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
