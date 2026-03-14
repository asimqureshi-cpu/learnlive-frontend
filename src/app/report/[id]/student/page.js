'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const API = process.env.NEXT_PUBLIC_BACKEND_URL;

// ─── Design primitives (match /report/[id] exactly) ──────────────────────────

function ScoreRing({ value, max = 10, label, size = 80 }) {
  const pct = (value || 0) / max;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = value >= 7 ? '#2d6a4f' : value >= 4 ? '#8b6914' : '#8b3a2a';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e0d0" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}
          fill="#1a1208" fontSize="14" fontFamily="'DM Mono', monospace" fontWeight="500">
          {value != null ? value.toFixed(1) : '—'}
        </text>
      </svg>
      <span style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: '#8b7355',
        letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>{label}</span>
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
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '1px',
            background: i <= n ? (colors[level] || '#8b7355') : '#e8e0d0' }} />
        ))}
      </div>
      <span style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace",
        color: colors[level] || '#8b7355', letterSpacing: '0.08em' }}>{level || 'UNKNOWN'}</span>
    </div>
  );
}

function BloomExplainer({ level }) {
  const explainers = {
    REMEMBER:   'You demonstrated recall of key facts and concepts from the session material.',
    UNDERSTAND: 'You showed comprehension — interpreting and summarising ideas in your own words.',
    APPLY:      'You applied frameworks and concepts to the problem at hand.',
    ANALYSE:    'You broke down complex ideas, examined relationships, and drew comparisons.',
    EVALUATE:   'You made and defended judgements, weighing evidence and critiquing arguments.',
    CREATE:     'You synthesised ideas to generate original arguments or novel perspectives.',
  };
  return (
    <p style={{ fontSize: '0.92rem', color: '#4a3a22', lineHeight: 1.6, fontStyle: 'italic' }}>
      {explainers[level] || 'Your Bloom level could not be determined for this session.'}
    </p>
  );
}

function PoweredBy() {
  return (
    <div style={{ position: 'fixed', bottom: '1rem', right: '1.25rem', zIndex: 50,
      opacity: 0.35, transition: 'opacity 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.35'}>
      <a href="https://thebrainsyndicate.com" target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
        <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", color: '#8b7355',
          letterSpacing: '0.1em', textTransform: 'uppercase' }}>Powered by</span>
        <span style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#5c4a1e',
          fontWeight: '500', letterSpacing: '0.06em' }}>The Brain Syndicate</span>
      </a>
    </div>
  );
}

// ─── Participation bar ────────────────────────────────────────────────────────

function ParticipationBar({ studentCount, studentUtterances, totalUtterances }) {
  const pct = totalUtterances > 0 ? Math.round((studentUtterances / totalUtterances) * 100) : 0;
  const fairShare = studentCount > 0 ? Math.round(100 / studentCount) : 0;
  const barColor = pct >= fairShare ? '#2d6a4f' : pct >= fairShare * 0.5 ? '#8b6914' : '#8b3a2a';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#8b7355',
          letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your participation share</span>
        <span style={{ fontSize: '1.1rem', fontFamily: "'DM Mono', monospace", color: barColor, fontWeight: '500' }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', background: '#e8e0d0', borderRadius: '3px', position: 'relative', overflow: 'visible' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor,
          borderRadius: '3px', transition: 'width 1s ease' }} />
        {/* Fair share marker */}
        <div style={{ position: 'absolute', top: '-4px', left: `${fairShare}%`,
          width: '1px', height: '14px', background: '#c4b49a' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.35rem' }}>
        <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: '#a89878',
          letterSpacing: '0.06em' }}>Fair share: {fairShare}% · {studentUtterances} of {totalUtterances} contributions</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [studentName, setStudentName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login?redirect=/report/' + id + '/student');
        return;
      }

      // Only students can access this page
      const { data: userRow } = await supabase
        .from('users')
        .select('role, id')
        .eq('email', session.user.email)
        .single();

      if (!userRow || userRow.role !== 'student') {
        // Staff/admin redirected to the full report
        router.push('/report/' + id);
        return;
      }

      // Derive student's display name from email (matches how participants join)
      // Convention: student logs in as student1@ivey.ca → name is "student1"
      const emailName = session.user.email.split('@')[0];
      setStudentName(emailName);

      // Fetch report data
      try {
        const res = await fetch(API + '/api/reports/' + id);
        if (!res.ok) throw new Error('Report not found');
        const d = await res.json();
        setData(d);
      } catch (e) {
        setError('Your report is not available yet. Check back after your session ends.');
      } finally {
        setLoading(false);
      }
    });
  }, [id]);

  const fonts = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');`;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: "'Crimson Pro', Georgia, serif",
      color: '#8b7355', fontStyle: 'italic', fontSize: '1.2rem' }}>
      <style>{fonts}</style>
      Preparing your feedback...
    </div>
  );

  if (error || !data || !data.report) return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'Crimson Pro', Georgia, serif",
      color: '#8b7355', gap: '1rem' }}>
      <style>{fonts}</style>
      <p style={{ fontSize: '1.1rem' }}>{error || 'Report not available yet.'}</p>
      <button onClick={() => router.push('/student')}
        style={{ background: 'none', border: '1px solid #d4c9b0', borderRadius: '3px',
          padding: '0.4rem 1rem', cursor: 'pointer', color: '#5c4a1e',
          fontSize: '0.85rem', fontFamily: "'DM Mono', monospace" }}>
        ← Back
      </button>
    </div>
  );

  const { report, session, scores, transcripts } = data;

  // Find this student's data
  const myScore = scores?.find(s => s.speaker_tag === studentName);
  const myInsight = report.individual_insights?.[studentName];
  const myTranscripts = transcripts?.filter(t => t.speaker_name === studentName) || [];
  const totalUtterances = transcripts?.length || 0;
  const participantCount = scores?.length || 1;

  // If student has no data in this session
  const hasData = myScore || myInsight || myTranscripts.length > 0;

  const duration = session.started_at && session.ended_at
    ? Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 60000)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{`
        ${fonts}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .section { background: #fff; border: 1px solid #e8e0d0; border-radius: 4px; padding: 2rem; margin-bottom: 1.5rem; }
        .label { font-size: 0.7rem; font-family: 'DM Mono', monospace; color: #8b7355; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.75rem; }
        .feedback-card { border-radius: 3px; padding: 1rem 1.125rem; }
        @media print {
          header { position: static !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #e8e0d0', background: '#fff', padding: '0 3rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '72px', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => router.push('/student')}
          className="no-print"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355',
            fontSize: '0.85rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>
          ← My Sessions
        </button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: '600', color: '#1a1208' }}>LearnLive</span>
          <span style={{ fontSize: '0.7rem', color: '#8b7355', fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your Feedback</span>
        </div>
        <button onClick={() => window.print()}
          className="no-print"
          style={{ background: 'none', border: '1px solid #d4c9b0', borderRadius: '3px',
            padding: '0.4rem 1rem', cursor: 'pointer', color: '#5c4a1e',
            fontSize: '0.85rem', fontFamily: "'DM Mono', monospace" }}>
          Print
        </button>
      </header>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Session header */}
        <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #e8e0d0' }}>
          <p className="label">Personal Feedback Report</p>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '400', color: '#1a1208',
            letterSpacing: '-0.01em', marginBottom: '0.5rem', lineHeight: 1.2 }}>
            {session.title}
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#6b5b3e', fontStyle: 'italic', marginBottom: '1rem' }}>
            {session.topic}
          </p>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>
              {new Date(session.started_at || session.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {duration && (
              <span style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>
                {duration} min
              </span>
            )}
            <span style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>
              {studentName}
            </span>
          </div>
        </div>

        {/* No data state */}
        {!hasData && (
          <div className="section" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <p style={{ fontSize: '1.1rem', color: '#8b7355', fontStyle: 'italic' }}>
              No contributions were recorded for you in this session.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#a89878', marginTop: '0.75rem', fontFamily: "'DM Mono', monospace" }}>
              Check that your microphone was active during the discussion.
            </p>
          </div>
        )}

        {hasData && (<>

          {/* Scores */}
          {myScore && (
            <div className="section">
              <p className="label">Your Scores</p>
              <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center',
                flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <ScoreRing value={myScore.overall_score} label="Overall" size={76} />
                <ScoreRing value={myScore.topic_adherence} label="Topic" size={76} />
                <ScoreRing value={myScore.depth} label="Depth" size={76} />
                <ScoreRing value={myScore.material_application} label="Material" size={76} />
              </div>

              {/* Bloom level */}
              {myScore.bloom_level && (
                <div style={{ background: '#fdfaf4', border: '1px solid #e8e0d0',
                  borderRadius: '3px', padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem',
                    marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace",
                      color: '#8b6914', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Bloom's level reached
                    </p>
                    <BloomBadge level={myScore.bloom_level} />
                  </div>
                  <BloomExplainer level={myScore.bloom_level} />
                </div>
              )}
            </div>
          )}

          {/* Participation */}
          {myTranscripts.length > 0 && (
            <div className="section">
              <p className="label">Participation</p>
              <ParticipationBar
                studentCount={participantCount}
                studentUtterances={myTranscripts.length}
                totalUtterances={totalUtterances}
              />
            </div>
          )}

          {/* Personal insights */}
          {myInsight && (
            <div className="section">
              <p className="label">Feedback</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                {myInsight.contribution_quality && (
                  <div className="feedback-card"
                    style={{ background: '#fdfaf4', border: '1px solid #e8d9b8' }}>
                    <p style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace",
                      color: '#8b6914', letterSpacing: '0.1em', textTransform: 'uppercase',
                      marginBottom: '0.4rem' }}>Overall assessment</p>
                    <p style={{ fontSize: '0.95rem', color: '#2a1f0e', lineHeight: 1.6 }}>
                      {myInsight.contribution_quality}
                    </p>
                  </div>
                )}

                {myInsight.highlight && (
                  <div className="feedback-card"
                    style={{ background: '#f0f7f3', border: '1px solid #c8e0d4' }}>
                    <p style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace",
                      color: '#2d6a4f', letterSpacing: '0.1em', textTransform: 'uppercase',
                      marginBottom: '0.4rem' }}>What you did well</p>
                    <p style={{ fontSize: '0.95rem', color: '#1a3328', lineHeight: 1.6 }}>
                      {myInsight.highlight}
                    </p>
                  </div>
                )}

                {myInsight.gap && (
                  <div className="feedback-card"
                    style={{ background: '#fdf3f0', border: '1px solid #e0c8c4' }}>
                    <p style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace",
                      color: '#8b3a2a', letterSpacing: '0.1em', textTransform: 'uppercase',
                      marginBottom: '0.4rem' }}>Area to develop</p>
                    <p style={{ fontSize: '0.95rem', color: '#3a1a14', lineHeight: 1.6 }}>
                      {myInsight.gap}
                    </p>
                  </div>
                )}

                {myInsight.recommendation && (
                  <div className="feedback-card"
                    style={{ background: '#fff', border: '1px solid #e8e0d0',
                      borderLeft: '3px solid #8b6914' }}>
                    <p style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace",
                      color: '#8b6914', letterSpacing: '0.1em', textTransform: 'uppercase',
                      marginBottom: '0.4rem' }}>Recommendation</p>
                    <p style={{ fontSize: '0.95rem', color: '#2a1f0e', lineHeight: 1.6 }}>
                      {myInsight.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Student's own transcript */}
          {myTranscripts.length > 0 && (
            <div className="section">
              <p className="label">Your contributions ({myTranscripts.length})</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {myTranscripts.map((t, i) => (
                  <div key={i} style={{
                    padding: '0.75rem 0',
                    borderBottom: i < myTranscripts.length - 1 ? '1px solid #f0e8d8' : 'none',
                    display: 'flex', gap: '1rem', alignItems: 'flex-start'
                  }}>
                    <span style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace",
                      color: '#c4b49a', flexShrink: 0, paddingTop: '3px', minWidth: '24px' }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '0.95rem', color: '#2a1f0e', lineHeight: 1.6 }}>
                      {t.utterance}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>)}

        {/* Footer note */}
        <p style={{ fontSize: '0.78rem', fontFamily: "'DM Mono', monospace", color: '#c4b49a',
          letterSpacing: '0.06em', textAlign: 'center', marginTop: '2rem' }}>
          Scored by AI against Bloom's Taxonomy · {session.title}
        </p>

      </main>
      <PoweredBy />
    </div>
  );
}
