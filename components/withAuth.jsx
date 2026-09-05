'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getMemberProfile } from '@/lib/supabase'
import AppShell from './AppShell'

export default function withAuth(Component, { adminOnly = false } = {}) {
  return function ProtectedPage(props) {
    const router = useRouter()
    const [member, setMember] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      async function check() {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        const profile = await getMemberProfile(session.user.id)
        if (!profile) {
          router.push('/login')
          return
        }
        if (adminOnly && profile.role !== 'admin') {
          router.push('/dashboard')
          return
        }
        setMember(profile)
        setLoading(false)
      }
      check()

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') router.push('/login')
      })
      return () => subscription.unsubscribe()
    }, [router])

    if (loading) {
      return (
        <div style={{
          minHeight: '100vh', background: 'var(--ks-navy)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'var(--ks-crimson)', border: '2px solid var(--ks-gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <span style={{ color: 'var(--ks-gold)', fontWeight: 700 }}>ΚΣ</span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', color: '#94A3B8', fontSize: '0.875rem' }}>
              Loading…
            </p>
          </div>
        </div>
      )
    }

    return (
      <AppShell member={member}>
        <Component {...props} member={member} />
      </AppShell>
    )
  }
}
