'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

function ScoreBadge({ value }) {
  const color = value >= 7 ? 'text-emerald-400' : value >= 4 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-display text-3xl font-bold ${color}`}>{value?.toFixed(1) ?? '—'}</span>;
}

export default function ReportPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/reports/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-slate-400">Loading report...</p>
    </div>
  );

  if (!data?.report) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400 mb-4">Report not available yet.</p>
        <Link href="/" className="text-accent hover:underline text-sm">← Back to Sessions</Link>
      </div>
    </div>
  );

  const { session, report, scores } = data;

  // Build radar chart data per participant
  const radarData = ['Participation', 'Topic Adherence', 'Depth', 'Material Application'].map(dim => {
    const entry = { dimension: dim.split(' ')[0] };
    scores.forEach(s => {
      const key = dim.toLowerCase().replace(' ', '_') + '_score';
      entry[s.speaker_tag] = s[key] ?? 0;
    });
    return entry;
  });

  const COLORS = ['#e8622a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div>
          <Link href="/" className="text-slate-500 text-sm hover:text-white">← Sessions</Link>
          <h1 className="font-display text-2xl font-bold mt-1">{session.title}</h1>
          <p className="text-slate-400 text-sm">{session.topic}</p>
        </div>
        <div className="text-right text-slate-500 text-sm">
          <p>{session.started_at ? new Date(session.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</p>
          <p>{session.ended_at && session.started_at
            ? `Duration: ${Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 60000)} minutes`
            : ''}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-10 space-y-8">

        {/* Executive Summary */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
          <h2 className="font-display text-lg font-semibold mb-3 text-accent">Executive Summary</h2>
          <p className="text-slate-300 leading-relaxed">{report.executive_summary}</p>
        </div>

        {/* Group Performance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 col-span-2">
            <h2 className="font-display text-base font-semibold mb-4">Group Performance</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-emerald-400 text-xs uppercase tracking-wider mb-2">Strengths</h3>
                <ul className="space-y-1.5">
                  {(report.group_performance?.strengths || []).map((s, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2"><span className="text-emerald-500">✓</span>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-red-400 text-xs uppercase tracking-wider mb-2">Gaps</h3>
                <ul className="space-y-1.5">
                  {(report.group_performance?.gaps || []).map((g, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2"><span className="text-red-500">△</span>{g}</li>
                  ))}
                </ul>
              </div>
            </div>
            {report.group_performance?.material_coverage && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Material Coverage</h3>
                <p className="text-slate-300 text-sm">{report.group_performance.material_coverage}</p>
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="font-display text-base font-semibold mb-3">Missed Concepts</h2>
            {(report.missed_concepts || []).length === 0 ? (
              <p className="text-slate-500 text-sm">All key concepts were covered.</p>
            ) : (
              <ul className="space-y-2">
                {report.missed_concepts.map((c, i) => (
                  <li key={i} className="text-slate-300 text-sm flex gap-2">
                    <span className="text-amber-500 shrink-0">○</span>{c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Participant Radar Chart */}
        {scores.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
            <h2 className="font-display text-base font-semibold mb-5">Participant Score Comparison</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#ffffff15" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  {scores.map((s, i) => (
                    <Radar key={s.speaker_tag} name={s.speaker_tag} dataKey={s.speaker_tag}
                      stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.1} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center mt-2">
              {scores.map((s, i) => (
                <div key={s.speaker_tag} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></span>
                  {s.speaker_tag}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual scorecards */}
        <div>
          <h2 className="font-display text-lg font-semibold mb-4">Individual Scorecards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {scores.map((s, i) => {
              const insight = report.individual_insights?.[s.speaker_tag] || {};
              return (
                <div key={s.speaker_tag} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold">{s.speaker_tag}</h3>
                      <p className="text-slate-500 text-xs">Overall Score</p>
                    </div>
                    <ScoreBadge value={s.overall_score} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-center">
                    {[
                      { label: 'Participation', val: s.participation_score },
                      { label: 'Topic Adherence', val: s.topic_adherence_score },
                      { label: 'Depth', val: s.depth_score },
                      { label: 'Material Application', val: s.material_application_score },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-white/5 rounded-lg p-2">
                        <div className="text-white font-semibold">{val?.toFixed(1) ?? '—'}</div>
                        <div className="text-slate-500 text-xs">{label}</div>
                      </div>
                    ))}
                  </div>

                  {insight.highlight && (
                    <div className="mb-2">
                      <span className="text-emerald-400 text-xs font-medium uppercase tracking-wider">Highlight: </span>
                      <span className="text-slate-300 text-sm">{insight.highlight}</span>
                    </div>
                  )}
                  {insight.gap && (
                    <div className="mb-2">
                      <span className="text-amber-400 text-xs font-medium uppercase tracking-wider">Gap: </span>
                      <span className="text-slate-300 text-sm">{insight.gap}</span>
                    </div>
                  )}
                  {insight.recommendation && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Recommendation: </span>
                      <span className="text-slate-300 text-sm">{insight.recommendation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Facilitator notes */}
        {report.facilitator_notes && (
          <div className="bg-brand/20 border border-brand-light/30 rounded-2xl p-7">
            <h2 className="font-display text-base font-semibold mb-3 text-brand-light">Facilitator Notes</h2>
            <p className="text-slate-300 leading-relaxed">{report.facilitator_notes}</p>
          </div>
        )}

      </main>
    </div>
  );
}
