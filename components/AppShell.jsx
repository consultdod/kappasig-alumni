'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Calendar, Mail, Image, FolderOpen,
  Users, User, Settings, LogOut, Menu, X, ShieldCheck, Upload
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/events',     label: 'Events',     icon: Calendar },
  { href: '/messages',   label: 'Messages',   icon: Mail },
  { href: '/photos',     label: 'Photos',     icon: Image },
  { href: '/files',      label: 'Documents',  icon: FolderOpen },
  { href: '/directory',  label: 'Directory',  icon: Users },
  { href: '/profile',    label: 'My Profile', icon: User },
]

const ADMIN_ITEMS = [
  { href: '/admin/members',  label: 'Manage Members', icon: ShieldCheck },
  { href: '/admin/invite',   label: 'Send Invites',   icon: Mail },
  { href: '/admin/import',   label: 'Import CSV',     icon: Upload },
]

export default function AppShell({ children, member }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = member?.role === 'admin'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ks-fog)' }}>
      {/* Sidebar — desktop */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: 'var(--ks-navy)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
      }} className="sidebar-desktop">
        <SidebarContent
          pathname={pathname}
          isAdmin={isAdmin}
          member={member}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile top bar */}
      <div style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--ks-navy)',
        padding: '0.75rem 1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(201,168,76,0.3)'
      }} className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--ks-crimson)', border: '2px solid var(--ks-gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: 'var(--ks-gold)', fontSize: '0.75rem', fontWeight: 700 }}>ΚΣ</span>
          </div>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>KΣ Alumni</span>
        </div>
        <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex'
        }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileOpen(false)} />
          <div style={{
            width: '240px', background: 'var(--ks-navy)',
            display: 'flex', flexDirection: 'column', height: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              isAdmin={isAdmin}
              member={member}
              onSignOut={handleSignOut}
              onNav={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{
        flex: 1,
        marginLeft: '220px',
        padding: '2rem',
        maxWidth: '1100px',
      }} className="main-content">
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .main-content { margin-left: 0 !important; padding-top: 4.5rem !important; }
        }
      `}</style>
    </div>
  )
}

function SidebarContent({ pathname, isAdmin, member, onSignOut, onNav }) {
  return (
    <>
      {/* Logo */}
      <div style={{
        padding: '1.5rem 1rem 1rem',
        borderBottom: '1px solid rgba(201,168,76,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--ks-crimson)', border: '2px solid var(--ks-gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <span style={{ color: 'var(--ks-gold)', fontSize: '0.95rem', fontWeight: 700 }}>ΚΣ</span>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>Kappa Sigma</div>
            <div style={{ color: '#94A3B8', fontSize: '0.7rem', fontFamily: 'Inter, sans-serif' }}>Alumni · ULL</div>
          </div>
        </div>

        {member && (
          <div style={{
            marginTop: '1rem',
            padding: '0.6rem 0.75rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '5px'
          }}>
            <div style={{ color: '#E2E8F0', fontSize: '0.8rem', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
              {member.full_name}
            </div>
            <div style={{ color: '#94A3B8', fontSize: '0.7rem', fontFamily: 'Inter, sans-serif', marginTop: '0.15rem' }}>
              {isAdmin ? '⭐ Administrator' : 'Member'}
            </div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${active ? 'active' : ''}`}
              onClick={onNav}
              style={{ marginBottom: '0.15rem' }}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div style={{
              color: '#64748B', fontSize: '0.65rem', fontFamily: 'Inter, sans-serif',
              fontWeight: 600, letterSpacing: '0.08em',
              margin: '1.25rem 0 0.5rem 0.5rem'
            }}>
              ADMINISTRATION
            </div>
            {ADMIN_ITEMS.map(item => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? 'active' : ''}`}
                  onClick={onNav}
                  style={{ marginBottom: '0.15rem' }}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={onSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            width: '100%', padding: '0.55rem 0.9rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94A3B8', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
            borderRadius: '5px',
            transition: 'all 0.15s'
          }}
          onMouseOver={e => e.currentTarget.style.color = '#FCA5A5'}
          onMouseOut={e => e.currentTarget.style.color = '#94A3B8'}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </>
  )
}
