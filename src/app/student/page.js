'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function PoweredBy() {
  return (
    <div style={{ position: 'fixed', bottom: '1rem', right: '1.25rem', zIndex: 50, opacity: 0.35, transition: 'opacity 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.35'}>
      <a href="https://thebrainsyndicate.com" target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
        <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Powered by</span>
        <span style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#5c4a1e', fontWeight: '500', letterSpacing: '0.06em' }}>The Brain Syndicate</span>
      </a>
    </div>
  );
}

export default function StudentHomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0b06', fontFamily: "'Crimson Pro', Georgia, serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeup { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(201,184,144,0.1)', padding: '0 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: '600', color: '#c9b890' }}>LearnLive</span>
          <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Academic</span>
        </div>
        <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid rgba(201,184,144,0.2)', borderRadius: '3px', padding: '0.4rem 0.875rem', color: 'rgba(201,184,144,0.5)', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem', cursor: 'pointer', letterSpacing: '0.06em' }}>
          Sign Out
        </button>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', animation: 'fadeup 0.6s ease' }}>

        {/* Session link instruction */}
        <div style={{ textAlign: 'center', maxWidth: '560px', marginBottom: '5rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '1px solid rgba(201,184,144,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', fontSize: '1.5rem' }}>⬡</div>
          <p style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>Welcome{user ? ', ' + (user.email?.split('@')[0]) : ''}</p>
          <h1 style={{ fontSize: '2.8rem', fontWeight: '300', color: '#f5edd8', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
            Ready to<br /><em style={{ fontWeight: '400', fontStyle: 'italic' }}>discuss?</em>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(245,237,216,0.5)', lineHeight: 1.7, fontWeight: '300', marginBottom: '2.5rem' }}>
            Your facilitator will share a session link or QR code when your discussion begins. Use that to join your group.
          </p>
          <div style={{ background: 'rgba(201,184,144,0.06)', border: '1px solid rgba(201,184,144,0.15)', borderRadius: '6px', padding: '1.25rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📱</span>
            <span style={{ fontSize: '0.88rem', color: 'rgba(245,237,216,0.5)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em' }}>Scan the QR code or open your session link</span>
          </div>
        </div>

        {/* What to expect section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', maxWidth: '760px', width: '100%' }}>
          {[
            { icon: '🎙', title: 'Speak naturally', body: 'AI listens and transcribes your discussion in real time.' },
            { icon: '📊', title: 'Scored live', body: 'Your contributions are evaluated across Bloom\'s taxonomy levels.' },
            { icon: '🧠', title: 'AI-assisted', body: 'Your facilitator receives live prompts to guide the discussion.' },
          ].map((card, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,184,144,0.1)', borderRadius: '6px', padding: '1.5rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{card.icon}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#c9b890', marginBottom: '0.5rem' }}>{card.title}</h3>
              <p style={{ fontSize: '0.88rem', color: 'rgba(245,237,216,0.4)', lineHeight: 1.6, fontWeight: '300' }}>{card.body}</p>
            </div>
          ))}
        </div>
      </main>
      <PoweredBy />
    </div>
  );
}

