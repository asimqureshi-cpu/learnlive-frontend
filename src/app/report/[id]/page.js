'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const API = process.env.NEXT_PUBLIC_BACKEND_URL;

function ScoreRing({ value, max = 10, label, size = 80 }) {
  const pct = value / max;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = value >= 7 ? '#2d6a4f' : value >= 4 ? '#8b6914' : '#8b3a2a';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e0d0" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }} fill="#1a1208" fontSize="16" fontFamily="'DM Mono', monospace" fontWeight="500">{value?.toFixed(1) || '—'}</text>
      </svg>
      <span style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

function BloomBadge({ level }) {
  const levels = { REMEMBER: 1, UNDERSTAND: 2, APPLY: 3, ANALYSE: 4, EVALUATE: 5, CREATE: 6 };
  const colors = { REMEMBER: '#a89878', UNDERSTAND: '#6b7c8b', APPLY: '#5c7a5e', ANALYSE: '#7a5c8b', EVALUATE: '#8b6914', CREATE: '#8b3a2a' };
  const n = levels[level] || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '3px' }}>
        {[1,2,3,4,5,6].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '1px', background: i <= n ? colors[level] : '#e8e0d0' }} />)}
      </div>
      <span style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: colors[level] || '#8b7355', letterSpacing: '0.08em' }}>{level || 'UNKNOWN'}</span>
    </div>
  );
}


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

export default function ReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login?redirect=/report/' + id); return; }
      // Students cannot access reports
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('email', session.user.email)
        .single();
      if (!userRow || userRow.role === 'student') {
        router.push('/student');
        return;
      }
      setAuthChecked(true);
      fetch(API + '/api/reports/' + id)
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, [id]);

  if (!authChecked) return null;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Crimson Pro', Georgia, serif", color: '#8b7355', fontStyle: 'italic', fontSize: '1.2rem' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');`}</style>
      Generating report...
    </div>
  );

  if (!data || !data.report) return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Crimson Pro', Georgia, serif", color: '#8b7355', fontSize: '1.1rem' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');`}</style>
      Report not available yet.
    </div>
  );

  const { report, session, scores, transcripts } = data;
  const duration = session.started_at && session.ended_at ? Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 60000) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .section { background: #fff; border: 1px solid #e8e0d0; border-radius: 4px; padding: 2rem; margin-bottom: 1.5rem; }
        .label { font-size: 0.7rem; font-family: 'DM Mono', monospace; color: #8b7355; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.5rem; }
        .score-card { background: #fdfaf4; border: 1px solid #e8e0d0; border-radius: 4px; padding: 1.5rem; }
        .tag { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 2px; font-size: 0.72rem; font-family: 'DM Mono', monospace; letter-spacing: 0.06em; }
      `}</style>

      <header style={{ borderBottom: '1px solid #e8e0d0', background: '#fff', padding: '0 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355', fontSize: '0.85rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>← Sessions</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: '600', color: '#1a1208' }}>LearnLive</span>
          <span style={{ fontSize: '0.7rem', color: '#8b7355', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Report</span>
        </div>
        <button onClick={() => window.print()} style={{ background: 'none', border: '1px solid #d4c9b0', borderRadius: '3px', padding: '0.4rem 1rem', cursor: 'pointer', color: '#5c4a1e', fontSize: '0.85rem', fontFamily: "'DM Mono', monospace" }}>Print</button>
      </header>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #e8e0d0' }}>
          <p className="label">Post-Session Report</p>
          <h1 style={{ fontSize: '2.4rem', fontWeight: '400', color: '#1a1208', letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>{session.title}</h1>
          <p style={{ fontSize: '1.1rem', color: '#6b5b3e', fontStyle: 'italic', marginBottom: '1rem' }}>{session.topic}</p>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>{new Date(session.started_at || session.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {duration && <span style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>{duration} min</span>}
            <span style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>{transcripts?.length || 0} utterances</span>
            <span style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>{scores?.length || 0} participant{scores?.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="section">
          <p className="label">Executive Summary</p>
          <p style={{ fontSize: '1.15rem', lineHeight: 1.7, color: '#2a1f0e', fontWeight: '300' }}>{report.executive_summary}</p>
        </div>

        <div className="section">
          <p className="label">Group Performance</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#2d6a4f', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>STRENGTHS</p>
              {(report.group_performance?.strengths || []).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#2d6a4f', marginTop: '2px', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '0.95rem', color: '#2a1f0e', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#8b3a2a', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>GAPS</p>
              {(report.group_performance?.gaps || []).map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#8b3a2a', marginTop: '2px', flexShrink: 0 }}>△</span>
                  <span style={{ fontSize: '0.95rem', color: '#2a1f0e', lineHeight: 1.5 }}>{g}</span>
                </div>
              ))}
            </div>
          </div>
          {report.group_performance?.bloom_summary && (
            <div style={{ background: '#fdfaf4', border: '1px solid #e8e0d0', borderRadius: '3px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#8b6914', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>BLOOM'S TAXONOMY</p>
              <p style={{ fontSize: '0.95rem', color: '#2a1f0e', lineHeight: 1.5 }}>{report.group_performance.bloom_summary}</p>
            </div>
          )}
          {report.group_performance?.material_coverage && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0e8d8' }}>
              <p style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>MATERIAL COVERAGE</p>
              <p style={{ fontSize: '0.95rem', color: '#2a1f0e', lineHeight: 1.5 }}>{report.group_performance.material_coverage}</p>
            </div>
          )}
        </div>

        {report.individual_insights && Object.keys(report.individual_insights).length > 0 && (
          <div className="section">
            <p className="label">Individual Scorecards</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {Object.entries(report.individual_insights).map(([name, insight]) => {
                const scoreRow = scores?.find(s => s.speaker_tag === name);
                return (
                  <div key={name} className="score-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '500', color: '#1a1208', marginBottom: '0.3rem' }}>{name}</h3>
                        {insight.bloom_level_reached && <BloomBadge level={insight.bloom_level_reached} />}
                      </div>
                      {scoreRow && (
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                          <ScoreRing value={scoreRow.overall_score} label="Overall" size={72} />
                          <ScoreRing value={scoreRow.topic_adherence_score} label="Topic" size={72} />
                          <ScoreRing value={scoreRow.depth_score} label="Depth" size={72} />
                          <ScoreRing value={scoreRow.material_application_score} label="Material" size={72} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ background: '#f0f7f3', border: '1px solid #c8e0d4', borderRadius: '3px', padding: '0.875rem 1rem' }}>
                        <p style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: '#2d6a4f', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>HIGHLIGHT</p>
                        <p style={{ fontSize: '0.9rem', color: '#1a3328', lineHeight: 1.5 }}>{insight.highlight}</p>
                      </div>
                      <div style={{ background: '#fdf3f0', border: '1px solid #e0c8c4', borderRadius: '3px', padding: '0.875rem 1rem' }}>
                        <p style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: '#8b3a2a', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>GAP</p>
                        <p style={{ fontSize: '0.9rem', color: '#3a1a14', lineHeight: 1.5 }}>{insight.gap}</p>
                      </div>
                    </div>
                    {insight.recommendation && (
                      <div style={{ background: '#fdfaf4', border: '1px solid #e8d9b8', borderRadius: '3px', padding: '0.875rem 1rem' }}>
                        <p style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: '#8b6914', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>RECOMMENDATION</p>
                        <p style={{ fontSize: '0.9rem', color: '#2a1f0e', lineHeight: 1.5 }}>{insight.recommendation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {report.missed_concepts?.length > 0 && (
          <div className="section">
            <p className="label">Concepts Not Covered</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {report.missed_concepts.map((c, i) => <span key={i} className="tag" style={{ background: '#fdf3f0', color: '#8b3a2a', border: '1px solid #e0c8c4' }}>○ {c}</span>)}
            </div>
          </div>
        )}

        {report.facilitator_notes && (
          <div className="section" style={{ background: '#1a1208', border: '1px solid #1a1208' }}>
            <p style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#c9b890', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Facilitator Notes</p>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#f5edd8', fontWeight: '300' }}>{report.facilitator_notes}</p>
          </div>
        )}

        {transcripts?.length > 0 && (
          <div className="section">
            <p className="label">Session Transcript ({transcripts.length} utterances)</p>
            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {transcripts.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: i < transcripts.length - 1 ? '1px solid #f0e8d8' : 'none' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#8b6914', flexShrink: 0, paddingTop: '2px', minWidth: '70px' }}>{t.speaker_name}</span>
                  <span style={{ fontSize: '0.95rem', color: '#2a1f0e', lineHeight: 1.55 }}>{t.utterance}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <PoweredBy />
    </div>
  );
}
