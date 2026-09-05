import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(req) {
  try {
    const { members, sendInvites } = await req.json()

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ success: false, error: 'No members provided.' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()
    const results = []

    for (const m of members) {
      const { full_name, email, phone, grad_year, bio } = m

      try {
        // Step 1: Create the auth user via invite (or plain create if no invite)
        let userId = null

        if (sendInvites) {
          // Invite sends an email so they can set their own password
          const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/register`,
            data: { full_name }
          })
          if (inviteErr) throw new Error(inviteErr.message)
          userId = inviteData?.user?.id
        } else {
          // Create user with a random temporary password they'll reset
          const tempPassword = crypto.randomUUID().slice(0, 16) + 'Aa1!'
          const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name }
          })
          if (createErr) throw new Error(createErr.message)
          userId = createData?.user?.id
        }

        if (!userId) throw new Error('User creation returned no ID.')

        // Step 2: Insert member profile
        const { error: profileErr } = await supabaseAdmin
          .from('members')
          .insert({
            id: userId,
            email: email.toLowerCase().trim(),
            full_name: full_name.trim(),
            phone: phone?.trim() || null,
            grad_year: grad_year ? parseInt(grad_year) : null,
            bio: bio?.trim() || null,
            role: 'member',
            status: 'active',
            opt_in_member_emails: true,
            show_phone: true,
          })

        if (profileErr) {
          // Auth user was created but profile failed — attempt cleanup
          await supabaseAdmin.auth.admin.deleteUser(userId)
          throw new Error(`Profile creation failed: ${profileErr.message}`)
        }

        results.push({ full_name, email, success: true })

      } catch (err) {
        // Friendly duplicate-email message
        const msg = err.message.includes('already registered') || err.message.includes('already been registered')
          ? 'Email already exists in the system.'
          : err.message

        results.push({ full_name, email, success: false, error: msg })
      }
    }

    const anySuccess = results.some(r => r.success)
    return NextResponse.json({ success: anySuccess, results })

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
