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
    const { title, description, location, event_date, event_time, sendInvites, createdBy } = await req.json()

    if (!title || !event_date || !event_time || !createdBy) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    // Verify creator is admin
    const { data: creator } = await supabaseAdmin
      .from('members')
      .select('id, full_name, email, role')
      .eq('id', createdBy)
      .single()

    if (!creator || creator.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can create events.' }, { status: 403 })
    }

    // Combine date + time into full timestamp
    const eventDateTime = new Date(`${event_date}T${event_time}:00`)

    // Create the event
    const { data: event, error: evErr } = await supabaseAdmin
      .from('events')
      .insert({
        title,
        description: description || null,
        location: location || null,
        event_date: eventDateTime.toISOString(),
        created_by: createdBy,
      })
      .select()
      .single()

    if (evErr) {
      return NextResponse.json({ success: false, error: 'Failed to create event: ' + evErr.message }, { status: 500 })
    }

    // Send invitations if requested
    let emailsSent = 0
    if (sendInvites) {
      const result = await sendInvitationEmails({ event, creator, supabaseAdmin })
      emailsSent = result.sent
    }

    return NextResponse.json({
      success: true,
      eventId: event.id,
      emailsSent,
    })

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function sendInvitationEmails({ event, creator, supabaseAdmin }) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey || resendKey === 're_your_key_here') {
    return { sent: 0, note: 'Email not configured.' }
  }

  // Get all active members except the creator
  const { data: members } = await supabaseAdmin
    .from('members')
    .select('id, full_name, email')
    .eq('status', 'active')
    .neq('id', creator.id)

  if (!members || members.length === 0) return { sent: 0 }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const fromEmail = process.env.EMAIL_FROM || 'noreply@kappasigull.org'

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit'
  })

  let sent = 0
  const batchSize = 10

  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize)
    await Promise.all(batch.map(async (m) => {
      try {
        const yesUrl = `${appUrl}/api/events/rsvp?event=${event.id}&member=${m.id}&response=yes`
        const noUrl = `${appUrl}/api/events/rsvp?event=${event.id}&member=${m.id}&response=no`
        const maybeUrl = `${appUrl}/api/events/rsvp?event=${event.id}&member=${m.id}&response=maybe`

        const html = buildInviteEmail({
          memberName: m.full_name,
          eventTitle: event.title,
          eventDate: formatDate(event.event_date),
          eventTime: formatTime(event.event_date),
          location: event.location,
          description: event.description,
          creatorName: creator.full_name,
          eventUrl: `${appUrl}/events/${event.id}`,
          yesUrl, noUrl, maybeUrl,
        })

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `Kappa Sigma Alumni <${fromEmail}>`,
            to: [m.email],
            reply_to: creator.email,
            subject: `You're invited: ${event.title}`,
            html,
          }),
        })
        if (res.ok) sent++
      } catch { /* continue */ }
    }))
  }

  return { sent }
}

function buildInviteEmail({ memberName, eventTitle, eventDate, eventTime, location, description,
  creatorName, eventUrl, yesUrl, noUrl, maybeUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F6F3;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F3;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#1A2744;padding:24px 32px;border-radius:8px 8px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <span style="display:inline-block;width:48px;height:48px;background:#8B1A1A;
                  border-radius:50%;border:2px solid #C9A84C;font-family:Georgia,serif;
                  font-size:18px;font-weight:700;color:#C9A84C;text-align:center;line-height:48px;">ΚΣ</span>
              </td>
              <td style="padding-left:12px;">
                <div style="color:white;font-size:16px;font-weight:700;">Kappa Sigma Alumni</div>
                <div style="color:#94A3B8;font-size:12px;font-family:Arial,sans-serif;">University of Louisiana at Lafayette</div>
              </td>
              <td align="right">
                <span style="background:#C9A84C;color:#1A2744;font-size:11px;font-family:Arial,sans-serif;
                  padding:4px 12px;border-radius:12px;font-weight:700;">YOU'RE INVITED</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Event details -->
        <tr>
          <td style="background:white;padding:32px;border-left:1px solid #E2D9C8;border-right:1px solid #E2D9C8;">
            <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:13px;color:#6B6560;">
              Dear ${memberName},
            </p>
            <h2 style="margin:0 0 24px 0;font-size:24px;color:#8B1A1A;">${eventTitle}</h2>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDD6;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td style="padding:6px 16px;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#1C1917;">
                  📅 <strong>${eventDate}</strong>
                </p>
              </td></tr>
              <tr><td style="padding:6px 16px;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#1C1917;">
                  🕐 <strong>${eventTime}</strong>
                </p>
              </td></tr>
              ${location ? `<tr><td style="padding:6px 16px;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#1C1917;">
                  📍 <strong>${location}</strong>
                </p>
              </td></tr>` : ''}
            </table>

            ${description ? `<p style="margin:0 0 24px 0;font-size:15px;color:#1C1917;line-height:1.7;">${description}</p>` : ''}

            <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#1C1917;">
              Will you attend?
            </p>

            <!-- RSVP buttons -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding-right:8px;">
                  <a href="${yesUrl}" style="display:inline-block;background:#166534;color:white;
                    font-family:Arial,sans-serif;font-size:14px;font-weight:700;
                    padding:12px 24px;border-radius:5px;text-decoration:none;">
                    ✓ Yes, I'll attend
                  </a>
                </td>
                <td style="padding-right:8px;">
                  <a href="${maybeUrl}" style="display:inline-block;background:#92400E;color:white;
                    font-family:Arial,sans-serif;font-size:14px;font-weight:700;
                    padding:12px 24px;border-radius:5px;text-decoration:none;">
                    ? Maybe
                  </a>
                </td>
                <td>
                  <a href="${noUrl}" style="display:inline-block;background:#991B1B;color:white;
                    font-family:Arial,sans-serif;font-size:14px;font-weight:700;
                    padding:12px 24px;border-radius:5px;text-decoration:none;">
                    ✗ Can't make it
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#6B6560;">
              You can also <a href="${eventUrl}" style="color:#8B1A1A;">view this event online</a>
              to see who else is attending and update your response at any time.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F7F6F3;padding:20px 32px;border:1px solid #E2D9C8;
            border-top:none;border-radius:0 0 8px 8px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94A3B8;font-family:Arial,sans-serif;">
              Invitation sent by ${creatorName} · Kappa Sigma Alumni, ULL
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
