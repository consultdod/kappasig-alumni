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
    const { subject, body, audience, senderId, isAdmin } = await req.json()

    if (!subject || !body || !senderId) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    // Verify sender exists and get their role
    const { data: sender, error: senderErr } = await supabaseAdmin
      .from('members')
      .select('id, full_name, email, role')
      .eq('id', senderId)
      .single()

    if (senderErr || !sender) {
      return NextResponse.json({ success: false, error: 'Sender not found.' }, { status: 403 })
    }

    const senderIsAdmin = sender.role === 'admin'

    // Non-admins can only send to opted-in members
    const effectiveAudience = senderIsAdmin ? audience : 'members_only'
    const isAdminMsg = senderIsAdmin && audience === 'all'

    // ── Determine recipient list ─────────────────────────────
    let recipientQuery = supabaseAdmin
      .from('members')
      .select('id, email, full_name')
      .eq('status', 'active')
      .neq('id', senderId) // don't send to yourself

    if (!isAdminMsg) {
      // Member-to-member: only opted-in members
      recipientQuery = recipientQuery.eq('opt_in_member_emails', true)
    }
    // Admin broadcast (isAdminMsg): all active members, no opt-out allowed

    const { data: recipients, error: recipErr } = await recipientQuery
    if (recipErr) {
      return NextResponse.json({ success: false, error: 'Failed to fetch recipients.' }, { status: 500 })
    }

    // ── Save message to DB ───────────────────────────────────
    const { data: message, error: msgErr } = await supabaseAdmin
      .from('messages')
      .insert({
        subject,
        body,
        sender_id: senderId,
        audience: effectiveAudience,
        is_admin_msg: isAdminMsg,
      })
      .select()
      .single()

    if (msgErr) {
      return NextResponse.json({ success: false, error: 'Failed to save message: ' + msgErr.message }, { status: 500 })
    }

    // ── Log recipients ───────────────────────────────────────
    if (recipients.length > 0) {
      const recipientRows = recipients.map(r => ({
        message_id: message.id,
        member_id: r.id,
      }))
      await supabaseAdmin.from('message_recipients').insert(recipientRows)
    }

    // ── Send emails via Resend (if configured) ───────────────
    const resendKey = process.env.RESEND_API_KEY
    let emailsSent = 0
    let emailErrors = []

    if (resendKey && resendKey !== 're_your_key_here' && recipients.length > 0) {
      const fromEmail = process.env.EMAIL_FROM || 'noreply@kappasigull.org'
      const replyTo = sender.email

      // Send in batches of 10 to avoid rate limits
      const batchSize = 10
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize)
        await Promise.all(batch.map(async (recipient) => {
          try {
            const emailBody = buildEmailHTML({
              subject,
              body,
              senderName: sender.full_name,
              isAdminMsg,
              recipientName: recipient.full_name,
            })

            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: `Kappa Sigma Alumni <${fromEmail}>`,
                to: [recipient.email],
                reply_to: replyTo,
                subject: `${isAdminMsg ? '[Chapter] ' : ''}${subject}`,
                html: emailBody,
              }),
            })
            if (res.ok) emailsSent++
            else emailErrors.push(recipient.email)
          } catch {
            emailErrors.push(recipient.email)
          }
        }))
      }
    }

    return NextResponse.json({
      success: true,
      messageId: message.id,
      recipientCount: recipients.length,
      emailsSent,
      emailErrors: emailErrors.length,
      emailNote: !resendKey || resendKey === 're_your_key_here'
        ? 'Email not configured — message saved to database only. Add RESEND_API_KEY to .env.local to send real emails.'
        : null,
    })

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

function buildEmailHTML({ subject, body, senderName, isAdminMsg, recipientName }) {
  const bodyHtml = body
    .split('\n')
    .map(line => line.trim() ? `<p style="margin:0 0 12px 0;line-height:1.7;">${line}</p>` : '<br>')
    .join('')

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
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="width:48px;height:48px;background:#8B1A1A;border-radius:50%;border:2px solid #C9A84C;
                    display:inline-flex;align-items:center;justify-content:center;
                    font-family:Georgia,serif;font-size:18px;font-weight:700;color:#C9A84C;
                    text-align:center;line-height:48px;">ΚΣ</div>
                </td>
                <td style="padding-left:12px;">
                  <div style="color:white;font-size:16px;font-weight:700;">Kappa Sigma Alumni</div>
                  <div style="color:#94A3B8;font-size:12px;font-family:Arial,sans-serif;">University of Louisiana at Lafayette</div>
                </td>
                ${isAdminMsg ? `<td align="right"><span style="background:#8B1A1A;color:white;font-size:11px;
                  font-family:Arial,sans-serif;padding:4px 10px;border-radius:12px;font-weight:600;">
                  Chapter Announcement</span></td>` : ''}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:white;padding:32px;border-left:1px solid #E2D9C8;border-right:1px solid #E2D9C8;">
            <h2 style="margin:0 0 8px 0;font-size:22px;color:#1C1917;">${subject}</h2>
            <p style="margin:0 0 24px 0;font-size:13px;color:#6B6560;font-family:Arial,sans-serif;
              border-bottom:1px solid #E2D9C8;padding-bottom:16px;">
              From <strong>${senderName}</strong>
            </p>
            <div style="font-size:16px;color:#1C1917;">
              ${bodyHtml}
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F7F6F3;padding:20px 32px;border:1px solid #E2D9C8;border-top:none;border-radius:0 0 8px 8px;">
            <p style="margin:0;font-size:12px;color:#94A3B8;font-family:Arial,sans-serif;text-align:center;">
              Kappa Sigma Alumni · University of Louisiana at Lafayette<br>
              ${isAdminMsg
                ? 'This is an official chapter communication. All members receive these messages.'
                : 'You received this because you opted in to member emails. <a href="#" style="color:#8B1A1A;">Manage preferences</a>'}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
