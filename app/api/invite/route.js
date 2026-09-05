import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(req) {
  const supabaseAdmin = getAdminClient()
  try {
    const { emails, invitedBy } = await req.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ success: false, error: 'No email addresses provided.' }, { status: 400 })
    }

    const results = []

    for (const email of emails) {
      // Generate invite via Supabase Auth
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/register`,
        data: { invited_by: invitedBy }
      })

      if (error) {
        results.push({ email, success: false, error: error.message })
      } else {
        results.push({ email, success: true })
      }
    }

    const allOk = results.every(r => r.success)
    return NextResponse.json({
      success: allOk,
      results,
      error: allOk ? null : 'Some invitations failed. Check results for details.'
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
