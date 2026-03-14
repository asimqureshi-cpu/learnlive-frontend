'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const API = process.env.NEXT_PUBLIC_BACKEND_URL;

// ─── Vibrant palette matching warm parchment ──────────────────────────────────
const CHART_COLORS = [
  '#c9631c', '#2d6a4f', '#7a5c8b', '#8b6914', '#285f8f',
  '#8b3a2a', '#5c7a5e', '#6b7c8b', '#a89230', '#5c4a8b',
];

const BLOOM_CHART_COLORS = {
  REMEMBER: '#a89878', UNDERSTAND: '#6b7c8b', APPLY: '#5c7a5e',
  ANALYSE: '#7a5c8b', EVALUATE: '#c9631c', CREATE: '#8b3a2a',
};

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
        {[1,2,3,4,5,6].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '1px', background: i <= n ? (colors[level] || '#a89878') : '#e8e0d0' }} />)}
      </div>
      <span style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: colors[level] || '#8b7355', letterSpacing: '0.08em' }}>{level || 'UNKNOWN'}</span>
    </div>
  );
}

// ─── Chart components using Canvas API directly ───────────────────────────────

function ParticipationPieChart({ transcripts, scores }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !transcripts?.length) return;

    // Count utterances per speaker
    const counts = {};
    transcripts.forEach(t => {
      const name = t.speaker_name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const values = Object.values(counts);
    const total = values.reduce((a, b) => a + b, 0);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W * 0.38;
    const cy = H / 2;
    const radius = Math.min(cx, cy) - 20;

    ctx.clearRect(0, 0, W, H);

    // Draw pie
    let startAngle = -Math.PI / 2;
    labels.forEach((label, i) => {
      const slice = (values[i] / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#faf8f3';
      ctx.lineWidth = 2;
      ctx.stroke();
      startAngle += slice;
    });

    // Draw legend
    const legendX = W * 0.68;
    let legendY = H / 2 - (labels.length * 22) / 2;
    labels.forEach((label, i) => {
      const pct = Math.round((values[i] / total) * 100);
      ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
      ctx.fillRect(legendX, legendY - 8, 12, 12);
      ctx.fillStyle = '#1a1208';
      ctx.font = '12px DM Mono, monospace';
      ctx.fillText(`${label}`, legendX + 18, legendY + 2);
      ctx.fillStyle = '#8b7355';
      ctx.font = '11px DM Mono, monospace';
      ctx.fillText(`${pct}% · ${values[i]} contributions`, legendX + 18, legendY + 16);
      legendY += 36;
    });
  }, [transcripts]);

  if (!transcripts?.length) return null;
  return <canvas ref={canvasRef} width={520} height={260} style={{ width: '100%', maxWidth: '520px' }} />;
}

function BloomBarChart({ scores }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !scores?.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const BLOOM_ORDER = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYSE', 'EVALUATE', 'CREATE'];
    const BLOOM_VALUES = { REMEMBER: 1, UNDERSTAND: 2, APPLY: 3, ANALYSE: 4, EVALUATE: 5, CREATE: 6 };

    ctx.clearRect(0, 0, W, H);

    const padL = 110, padR = 20, padT = 20, padB = 30;
    const chartW = W - padL - padR;
    const barH = 24;
    const gap = 12;
    const totalH = scores.length * (barH + gap) - gap;
    const offsetY = padT + (H - padT - padB - totalH) / 2;

    // Draw grid lines
    for (let i = 0; i <= 6; i++) {
      const x = padL + (i / 6) * chartW;
      ctx.strokeStyle = '#e8e0d0';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + totalH + gap);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw bars
    scores.forEach((s, i) => {
      const level = s.bloom_level || 'REMEMBER';
      const val = BLOOM_VALUES[level] || 1;
      const barW = (val / 6) * chartW;
      const y = offsetY + i * (barH + gap);
      const color = BLOOM_CHART_COLORS[level] || '#a89878';

      // Bar background
      ctx.fillStyle = '#f0e8d8';
      ctx.beginPath();
      ctx.roundRect(padL, y, chartW, barH, 3);
      ctx.fill();

      // Bar fill
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(padL, y, barW, barH, 3);
      ctx.fill();

      // Name label
      ctx.fillStyle = '#2a1f0e';
      ctx.font = '12px Crimson Pro, Georgia, serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.speaker_tag, padL - 8, y + barH / 2);

      // Bloom level label on bar
      ctx.fillStyle = '#fff';
      ctx.font = '500 10px DM Mono, monospace';
      ctx.textAlign = 'left';
      if (barW > 60) ctx.fillText(level, padL + 8, y + barH / 2);
    });

    // X axis labels
    BLOOM_ORDER.forEach((l, i) => {
      const x = padL + (i / 6) * chartW;
      ctx.fillStyle = '#a89878';
      ctx.font = '9px DM Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(l.slice(0, 3), x, padT + totalH + 8);
    });

  }, [scores]);

  if (!scores?.length) return null;
  return <canvas ref={canvasRef} width={520} height={Math.max(120, scores.length * 36 + 60)} style={{ width: '100%', maxWidth: '520px' }} />;
}

function ScoreComparisonChart({ scores }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !scores?.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const metrics = [
      { key: 'overall_score', label: 'Overall', color: '#c9631c' },
      { key: 'depth', label: 'Depth', color: '#2d6a4f' },
      { key: 'topic_adherence', label: 'Topic', color: '#7a5c8b' },
      { key: 'material_application', label: 'Material', color: '#285f8f' },
    ];

    const padL = 110, padR = 100, padT = 30, padB = 20;
    const chartW = W - padL - padR;
    const groupH = 18;
    const groupGap = 8;
    const metricGap = 14;
    const totalGroupH = metrics.length * groupH + (metrics.length - 1) * groupGap;
    const totalH = scores.length * (totalGroupH + metricGap) - metricGap;

    // Student name labels and bar groups
    scores.forEach((s, si) => {
      const groupY = padT + si * (totalGroupH + metricGap);

      // Student name
      ctx.fillStyle = '#2a1f0e';
      ctx.font = '500 13px Crimson Pro, Georgia, serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.speaker_tag, padL - 10, groupY + totalGroupH / 2);

      metrics.forEach((m, mi) => {
        const val = s[m.key] || 0;
        const barW = (val / 10) * chartW;
        const y = groupY + mi * (groupH + groupGap);

        // Bar bg
        ctx.fillStyle = '#f0e8d8';
        ctx.beginPath();
        ctx.roundRect(padL, y, chartW, groupH, 2);
        ctx.fill();

        // Bar fill
        ctx.fillStyle = m.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(padL, y, barW, groupH, 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Value label
        ctx.fillStyle = '#5c4a1e';
        ctx.font = '10px DM Mono, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(val.toFixed(1), padL + chartW + 8, y + groupH / 2);

        // Metric label (right side, first student only or always)
        if (si === 0) {
          ctx.fillStyle = m.color;
          ctx.font = '9px DM Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(m.label.toUpperCase(), padL + chartW + 30, y + groupH / 2);
        }
      });
    });

    // X axis ticks
    for (let i = 0; i <= 10; i += 2) {
      const x = padL + (i / 10) * chartW;
      ctx.strokeStyle = '#e8e0d0';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padT - 10);
      ctx.lineTo(x, padT + totalH + 5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#c4b49a';
      ctx.font = '9px DM Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(i, x, padT - 4);
    }

  }, [scores]);

  if (!scores?.length) return null;
  return <canvas ref={canvasRef} width={520} height={Math.max(160, scores.length * 100 + 50)} style={{ width: '100%', maxWidth: '520px' }} />;
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

const btnStyle = { background: 'none', border: '1px solid #d4c9b0', borderRadius: '3px', padding: '0.4rem 1rem', cursor: 'pointer', color: '#5c4a1e', fontSize: '0.85rem', fontFamily: "'DM Mono', monospace" };

export default function ReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login?redirect=/report/' + id); return; }
      const { data: userRow } = await supabase.from('users').select('role').eq('email', session.user.email).single();
      if (!userRow || userRow.role === 'student') { router.push('/student'); return; }
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
  const duration = session.started_at && session.ended_at
    ? Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 60000)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .section { background: #fff; border: 1px solid #e8e0d0; border-radius: 4px; padding: 2rem; margin-bottom: 1.5rem; }
        .label { font-size: 0.7rem; font-family: 'DM Mono', monospace; color: #8b7355; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.5rem; }
        .score-card { background: #fdfaf4; border: 1px solid #e8e0d0; border-radius: 4px; padding: 1.5rem; }
        .tag { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 2px; font-size: 0.72rem; font-family: 'DM Mono', monospace; letter-spacing: 0.06em; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <header style={{ borderBottom: '1px solid #e8e0d0', background: '#fff', padding: '0 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => router.push('/')} className="no-print" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355', fontSize: '0.85rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>← Sessions</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: '600', color: '#1a1208' }}>LearnLive</span>
          <span style={{ fontSize: '0.7rem', color: '#8b7355', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Report</span>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={btnStyle} onClick={() => window.open(API + '/api/reports/' + id + '/export/csv')}>CSV</button>
          <button style={btnStyle} onClick={() => window.open(API + '/api/reports/' + id + '/export/pdf')}>PDF</button>
          <button style={btnStyle} onClick={() => window.print()}>Print</button>
        </div>
      </header>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Session header */}
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

        {/* Executive summary */}
        <div className="section">
          <p className="label">Executive Summary</p>
          <p style={{ fontSize: '1.15rem', lineHeight: 1.7, color: '#2a1f0e', fontWeight: '300' }}>{report.executive_summary}</p>
        </div>

        {/* ── CHARTS ── */}
        {scores?.length > 0 && (
          <div className="section">
            <p className="label">Session Analytics</p>

            {/* Participation pie */}
            {transcripts?.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#8b6914', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>Participation share</p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ParticipationPieChart transcripts={transcripts} scores={scores} />
                </div>
              </div>
            )}

            {/* Bloom bar */}
            <div style={{ marginBottom: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f0e8d8' }}>
              <p style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#7a5c8b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>Bloom's taxonomy levels</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <BloomBarChart scores={scores} />
              </div>
            </div>

            {/* Score comparison */}
            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid #f0e8d8' }}>
              <p style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#c9631c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>Score breakdown by participant</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ScoreComparisonChart scores={scores} />
              </div>
            </div>
          </div>
        )}

        {/* Group performance */}
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
            <div style={{ background: '#fdfaf4', border: '1px solid #e8e0d0', borderRadius: '3px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#8b6914', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>BLOOM'S TAXONOMY</p>
              <p style={{ fontSize: '0.95rem', color: '#2a1f0e', lineHeight: 1.5 }}>{report.group_performance.bloom_summary}</p>
            </div>
          )}
          {report.group_performance?.objective_achievement && (
            <div style={{ background: '#f0f7f3', border: '1px solid #c8e0d4', borderRadius: '3px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#2d6a4f', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>LEARNING OBJECTIVES</p>
              <p style={{ fontSize: '0.95rem', color: '#1a3328', lineHeight: 1.5 }}>{report.group_performance.objective_achievement}</p>
            </div>
          )}
          {report.group_performance?.material_coverage && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0e8d8' }}>
              <p style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>MATERIAL COVERAGE</p>
              <p style={{ fontSize: '0.95rem', color: '#2a1f0e', lineHeight: 1.5 }}>{report.group_performance.material_coverage}</p>
            </div>
          )}
        </div>

        {/* Flagged for review */}
        {report.flagged_for_review?.length > 0 && (
          <div className="section" style={{ border: '1px solid #e0c8c4' }}>
            <p className="label" style={{ color: '#8b3a2a' }}>Flagged for instructor follow-up</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {report.flagged_for_review.map((name, i) => (
                <span key={i} style={{ background: '#fdf3f0', color: '#8b3a2a', border: '1px solid #e0c8c4', padding: '0.3rem 0.75rem', borderRadius: '3px', fontSize: '0.88rem' }}>
                  ⚑ {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Individual scorecards */}
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
                        {insight.bloom_level && <BloomBadge level={insight.bloom_level} />}
                      </div>
                      {scoreRow && (
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                          <ScoreRing value={scoreRow.overall_score} label="Overall" size={72} />
                          <ScoreRing value={scoreRow.topic_adherence} label="Topic" size={72} />
                          <ScoreRing value={scoreRow.depth} label="Depth" size={72} />
                          <ScoreRing value={scoreRow.material_application} label="Material" size={72} />
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
                      <div style={{ background: '#fdfaf4', border: '1px solid #e8d9b8', borderLeft: '3px solid #8b6914', borderRadius: '3px', padding: '0.875rem 1rem' }}>
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
