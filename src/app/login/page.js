'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
        <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", color: '#c9b890', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Powered by</span>
        <span style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#a89878', fontWeight: '500', letterSpacing: '0.06em' }}>The Brain Syndicate</span>
      </a>
    </div>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already logged in, respect redirect param or route by role
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const urlRedirect = searchParams.get('redirect');
      if (urlRedirect) { router.push(urlRedirect); return; }
      // No redirect param — route by role
      const { data: userRow } = await supabase.from('users').select('role').eq('email', session.user.email).single();
      if (userRow?.role === 'student') router.push('/student');
      else router.push('/');
    });
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Fetch role from public users table
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single();
      const role = userRow?.role;
      if (role === 'student') {
        // Students go back to their session link if they came from one, else student landing
        // URL param takes priority (set by QR code / direct link), then sessionStorage
        const urlRedirect = searchParams.get('redirect');
        const storedRedirect = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('redirectAfterLogin') : null;
        if (storedRedirect) sessionStorage.removeItem('redirectAfterLogin');
        const destination = urlRedirect || storedRedirect || '/student';
        router.push(destination);
      } else if (role === 'staff' || role === 'super_admin') {
        router.push('/');
      } else {
        // Unknown role — send to student landing as safe default
        router.push('/student');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    }
    setLoading(false);
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      setMessage('Check your email for a password reset link.');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0b06', display: 'flex', fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(201,184,144,0.2); border-radius: 4px; padding: 14px 16px; color: #f5edd8; font-family: 'Crimson Pro', Georgia, serif; font-size: 1.05rem; outline: none; transition: border-color 0.2s; }
        .input:focus { border-color: rgba(201,184,144,0.6); background: rgba(255,255,255,0.08); }
        .input::placeholder { color: rgba(245,237,216,0.25); }
        .btn-primary { width: 100%; background: #c9b890; color: #0e0b06; border: none; padding: 14px; border-radius: 4px; font-family: 'Crimson Pro', Georgia, serif; font-size: 1.05rem; font-weight: 600; cursor: pointer; transition: all 0.2s; letter-spacing: 0.02em; }
        .btn-primary:hover:not(:disabled) { background: #ddd0b0; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .link-btn { background: none; border: none; cursor: pointer; color: rgba(201,184,144,0.6); font-family: 'DM Mono', monospace; font-size: 0.75rem; letter-spacing: 0.08em; text-decoration: underline; transition: color 0.2s; }
        .link-btn:hover { color: #c9b890; }
        @keyframes fadeup { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Left panel — branding */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem', borderRight: '1px solid rgba(201,184,144,0.1)', background: 'linear-gradient(135deg, rgba(45,35,15,0.4) 0%, transparent 60%)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '4rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '600', color: '#c9b890' }}>LearnLive</span>
            <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Academic</span>
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '300', color: '#f5edd8', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
            Elevating<br /><em style={{ fontStyle: 'italic' }}>academic</em><br />discussion.
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(245,237,216,0.4)', lineHeight: 1.7, maxWidth: '360px', fontWeight: '300' }}>
            AI-powered analysis of group discussions, Bloom's taxonomy scoring, and real-time facilitation support.
          </p>
        </div>
        <div>
          {[
            { n: '94%', label: 'transcription accuracy' },
            { n: '6', label: 'Bloom\'s taxonomy levels' },
            { n: 'Real-time', label: 'AI facilitation' },
          ].map((stat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.1rem', fontFamily: "'DM Mono', monospace", color: '#c9b890', minWidth: '80px' }}>{stat.n}</span>
              <span style={{ fontSize: '0.85rem', color: 'rgba(245,237,216,0.35)', fontStyle: 'italic' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ width: '460px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', flexShrink: 0 }}>
        <div style={{ width: '100%', animation: 'fadeup 0.5s ease' }}>
          {mode === 'login' ? (
            <>
              <h2 style={{ fontSize: '2rem', fontWeight: '400', color: '#f5edd8', marginBottom: '0.5rem' }}>Welcome back</h2>
              <p style={{ fontSize: '0.9rem', color: 'rgba(245,237,216,0.4)', marginBottom: '2.5rem', fontFamily: "'DM Mono', monospace" }}>Sign in with your institution email</p>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Email</label>
                  <input className="input" type="email" placeholder="you@university.edu" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Password</label>
                    <button type="button" className="link-btn" onClick={() => { setMode('forgot'); setError(''); }}>Forgot password?</button>
                  </div>
                  <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>

                {error && (
                  <div style={{ background: 'rgba(139,58,42,0.2)', border: '1px solid rgba(139,58,42,0.4)', borderRadius: '4px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#e8a090', fontFamily: "'DM Mono', monospace" }}>{error}</p>
                  </div>
                )}

                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: 'rgba(245,237,216,0.2)', fontFamily: "'DM Mono', monospace', lineHeight: 1.6" }}>
                Don't have an account? Contact your institution administrator.
              </p>
            </>
          ) : (
            <>
              <button className="link-btn" onClick={() => { setMode('login'); setError(''); setMessage(''); }} style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>← Back to sign in</button>
              <h2 style={{ fontSize: '2rem', fontWeight: '400', color: '#f5edd8', marginBottom: '0.5rem' }}>Reset password</h2>
              <p style={{ fontSize: '0.9rem', color: 'rgba(245,237,216,0.4)', marginBottom: '2.5rem', fontFamily: "'DM Mono', monospace" }}>We'll send a reset link to your email</p>

              <form onSubmit={handleForgot}>
                <div style={{ marginBottom: '1.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Email</label>
                  <input className="input" type="email" placeholder="you@university.edu" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>

                {error && <div style={{ background: 'rgba(139,58,42,0.2)', border: '1px solid rgba(139,58,42,0.4)', borderRadius: '4px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}><p style={{ fontSize: '0.875rem', color: '#e8a090', fontFamily: "'DM Mono', monospace" }}>{error}</p></div>}
                {message && <div style={{ background: 'rgba(45,106,79,0.2)', border: '1px solid rgba(45,106,79,0.4)', borderRadius: '4px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}><p style={{ fontSize: '0.875rem', color: '#90c8a8', fontFamily: "'DM Mono', monospace" }}>{message}</p></div>}

                <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
              </form>
            </>
          )}
        </div>
      </div>
      <PoweredBy />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
