'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const API = process.env.NEXT_PUBLIC_BACKEND_URL;

// ─── Design tokens ────────────────────────────────────────────────────────────
const fonts = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');`;

const STEPS = [
  { id: 1, label: 'Outcome' },
  { id: 2, label: 'Content' },
  { id: 3, label: 'Discussion' },
  { id: 4, label: 'Interventions' },
  { id: 5, label: 'Evaluation' },
  { id: 6, label: 'Launch' },
];

// ─── Shared input styles ──────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '0.7rem 0.875rem',
  border: '1px solid #d4c9b0', borderRadius: '3px',
  fontFamily: "'Crimson Pro', Georgia, serif", fontSize: '1rem',
  color: '#1a1208', background: '#fdfaf4', outline: 'none',
};

const labelStyle = {
  display: 'block', fontSize: '0.7rem',
  fontFamily: "'DM Mono', monospace", color: '#5c4a1e',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem',
};

const hintStyle = {
  fontSize: '0.78rem', color: '#a89878', fontStyle: 'italic',
  marginTop: '0.35rem', lineHeight: 1.4,
};

const sectionStyle = {
  marginBottom: '1.75rem',
};

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current }) {
  return (
    <div style={{ display: 'flex', gap: '0', marginBottom: '2.5rem' }}>
      {STEPS.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: '3px',
              background: done ? '#2d6a4f' : active ? '#8b6914' : '#e8e0d0',
              marginBottom: '0.5rem',
              transition: 'background 0.3s',
            }} />
            <span style={{
              fontSize: '0.6rem', fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: done ? '#2d6a4f' : active ? '#8b6914' : '#c4b49a',
            }}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, hint }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '0.875rem 1rem', background: '#fdfaf4', border: '1px solid #e8e0d0', borderRadius: '3px', marginBottom: '0.75rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.95rem', color: '#1a1208', marginBottom: hint ? '0.2rem' : 0 }}>{label}</div>
        {hint && <div style={hintStyle}>{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '40px', height: '22px', borderRadius: '11px', border: 'none',
          background: value ? '#2d6a4f' : '#d4c9b0', cursor: 'pointer',
          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        }}>
        <span style={{
          position: 'absolute', top: '3px',
          left: value ? '21px' : '3px',
          width: '16px', height: '16px', borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────
function WeightSlider({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#2a1f0e' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontFamily: "'DM Mono', monospace", color: '#8b6914' }}>{value}%</span>
      </div>
      <input
        type="range" min="0" max="100" step="5" value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#8b6914' }}
      />
    </div>
  );
}

// ─── Prompt item ──────────────────────────────────────────────────────────────
function PromptItem({ value, index, onChange, onRemove, placeholder }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#a89878', paddingTop: '0.75rem', minWidth: '18px' }}>{index + 1}.</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        style={{ ...inputStyle, resize: 'vertical', flex: 1, fontSize: '0.95rem' }}
      />
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9b890', fontSize: '1rem', paddingTop: '0.6rem', flexShrink: 0 }}>✕</button>
    </div>
  );
}

// ─── Readiness check ─────────────────────────────────────────────────────────
function readinessWarnings(config, materials) {
  const warnings = [];
  if (!config.objectives || config.objectives.trim().length === 0)
    warnings.push('No learning objectives defined — AI scoring will be generic');
  if (materials.length === 0)
    warnings.push('No materials uploaded — RAG context unavailable for scoring');
  if (!config.openingQuestion || config.openingQuestion.trim().length === 0)
    warnings.push('No opening question set — discussion may lack direction');
  if (!config.discussionPrompts || config.discussionPrompts.filter(p => p.trim()).length === 0)
    warnings.push('No discussion prompts configured');
  return warnings;
}

// ─── Main wizard ──────────────────────────────────────────────────────────────
export default function NewSessionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const fileRef = useRef(null);
  const audioRef = useRef(null);

  // ── Step 1: Outcome
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [sessionType, setSessionType] = useState('group'); // solo | group | hybrid
  const [isAsync, setIsAsync] = useState(false);
  const [classSize, setClassSize] = useState('');
  const [duration, setDuration] = useState('60');
  const [gradingWeight, setGradingWeight] = useState('');
  const [objectives, setObjectives] = useState('');
  const [objectiveScoring, setObjectiveScoring] = useState(false);
  const [groupName, setGroupName] = useState('');

  // ── Step 2: Content
  const [materials, setMaterials] = useState([]); // uploaded files (after session created)
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [contentTags, setContentTags] = useState({}); // materialId → tag
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState(null); // created after step 1 save
  const [audioUploading, setAudioUploading] = useState(false);

  // ── Step 3: Discussion
  const [openingQuestion, setOpeningQuestion] = useState('');
  const [discussionPrompts, setDiscussionPrompts] = useState(['', '', '']);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [rolePlayInstructions, setRolePlayInstructions] = useState('');
  const [groupMode, setGroupMode] = useState('debate'); // debate | consensus
  const [breakoutSize, setBreakoutSize] = useState('4');

  // ── Step 4: Interventions
  const [interventions, setInterventions] = useState({
    silence: { enabled: true, prompt: 'Someone who hasn\'t spoken yet — what\'s your take on this?' },
    dominance: { enabled: true, prompt: 'Let\'s hear from someone else — who wants to build on or challenge that?' },
    offTopic: { enabled: true, prompt: 'Let\'s bring this back to the core question. How does this connect to our topic?' },
    shallow: { enabled: true, prompt: 'Interesting point — can you back that up with specific evidence or a concrete example?' },
    timeRunningOut: { enabled: true, prompt: 'We have a few minutes left. Can someone summarise the key points of disagreement?' },
  });

  // ── Step 5: Evaluation
  const [weights, setWeights] = useState({
    topic_adherence: 25, depth: 35, material_application: 25, participation: 15,
  });
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [individualScoring, setIndividualScoring] = useState(true);
  const [autoFeedback, setAutoFeedback] = useState(true);
  const [flagThreshold, setFlagThreshold] = useState('4');

  // ── Step 6: Launch acknowledgements
  const [ackMaterials, setAckMaterials] = useState(false);
  const [ackObjectives, setAckObjectives] = useState(false);
  const [ackPrompts, setAckPrompts] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      const { data: userRow } = await supabase
        .from('users').select('role').eq('email', session.user.email).single();
      if (!userRow || userRow.role === 'student') { router.push('/student'); return; }
      setAuthChecked(true);
    });
  }, []);

  // Weight auto-balance — keep sum at 100
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightValid = weightSum === 100;

  // ── Create session in DB (called at end of step 1 to get an ID for file uploads)
  async function ensureSessionCreated() {
    if (sessionId) return sessionId;
    const config = buildConfig();
    const res = await fetch(API + '/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        topic: topic.trim(),
        group_name: groupName.trim() || null,
        session_config: config,
      }),
    });
    const data = await res.json();
    if (!data.id) throw new Error('Session creation failed');
    setSessionId(data.id);
    return data.id;
  }

  function buildConfig() {
    return {
      // Step 1
      session_type: sessionType,
      is_async: isAsync,
      class_size: classSize ? Number(classSize) : null,
      duration_minutes: duration ? Number(duration) : 60,
      grading_weight: gradingWeight ? Number(gradingWeight) : null,
      objectives: objectives.trim().split('\n').map(o => o.trim()).filter(Boolean),
      objective_scoring_enabled: objectiveScoring,
      // Step 2
      youtube_url: youtubeUrl.trim() || null,
      has_audio_prework: !!audioFile,
      content_tags: contentTags,
      // Step 3
      opening_question: openingQuestion.trim(),
      discussion_prompts: discussionPrompts.filter(p => p.trim()),
      poll_question: pollQuestion.trim() || null,
      poll_options: pollOptions.filter(o => o.trim()),
      role_play_instructions: rolePlayInstructions.trim() || null,
      group_mode: groupMode,
      breakout_size: breakoutSize ? Number(breakoutSize) : 4,
      // Step 4
      interventions,
      // Step 5
      scoring_weights: weights,
      bloom_enabled: bloomEnabled,
      individual_scoring: individualScoring,
      auto_feedback: autoFeedback,
      flag_threshold: Number(flagThreshold),
    };
  }

  // ── Final publish
  async function publish() {
    setCreating(true);
    try {
      const id = sessionId || await ensureSessionCreated();
      // Update with final config
      await fetch(API + '/api/sessions/' + id + '/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_config: buildConfig() }),
      });
      router.push('/admin/' + id);
    } catch (err) {
      alert('Failed to publish session: ' + err.message);
    }
    setCreating(false);
  }

  // ── PDF upload (needs sessionId, so session must be created first)
  async function uploadPDF(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const id = await ensureSessionCreated();
      const tempId = 'temp-' + Date.now();
      setMaterials(prev => [...prev, { id: tempId, file_name: file.name, metadata: null, tag: 'ai_context' }]);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(API + '/api/materials/' + id + '/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.material) {
        setMaterials(prev => prev.map(m => m.id === tempId ? { ...data.material, tag: 'ai_context' } : m));
        setContentTags(prev => ({ ...prev, [data.material.id]: 'ai_context' }));
        // Poll for metadata
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const matRes = await fetch(API + '/api/materials/' + id);
          const matData = await matRes.json();
          const updated = matData.find(m => m.id === data.material.id);
          if (updated?.metadata || attempts >= 10) {
            clearInterval(poll);
            setMaterials(Array.isArray(matData) ? matData.map(m => ({ ...m, tag: contentTags[m.id] || 'ai_context' })) : []);
          }
        }, 3000);
      }
    } catch (err) { alert('Upload failed: ' + err.message); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function deleteMaterial(materialId) {
    if (!confirm('Remove this material?')) return;
    setMaterials(prev => prev.filter(m => m.id !== materialId));
    setContentTags(prev => { const n = { ...prev }; delete n[materialId]; return n; });
    await fetch(API + '/api/materials/' + materialId, { method: 'DELETE' });
  }

  function updateTag(materialId, tag) {
    setContentTags(prev => ({ ...prev, [materialId]: tag }));
    setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, tag } : m));
  }

  function updateIntervention(key, field, value) {
    setInterventions(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  function canProceed() {
    if (step === 1) return title.trim() && topic.trim();
    if (step === 6) return ackMaterials && ackObjectives && ackPrompts;
    return true;
  }

  async function next() {
    if (step === 1) {
      // Create session now so uploads in step 2 have an ID
      if (!title.trim() || !topic.trim()) return;
      try { await ensureSessionCreated(); } catch (err) { alert(err.message); return; }
    }
    if (step < 6) setStep(s => s + 1);
  }

  function back() { if (step > 1) setStep(s => s - 1); }

  if (!authChecked) return null;

  const warnings = readinessWarnings({ objectives, openingQuestion, discussionPrompts }, materials);

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{`
        ${fonts}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea, select { transition: border-color 0.2s; }
        input:focus, textarea:focus, select:focus { border-color: #8b6914 !important; outline: none; background: #fff !important; }
        input[type=range] { accent-color: #8b6914; }
        .tag-btn { font-size: 0.65rem; font-family: 'DM Mono', monospace; padding: 0.2rem 0.5rem; border-radius: 2px; border: 1px solid #d4c9b0; cursor: pointer; background: none; color: #8b7355; transition: all 0.15s; }
        .tag-btn.active { background: #1a1208; color: #f5edd8; border-color: #1a1208; }
        .tag-btn:hover:not(.active) { border-color: #8b6914; color: #1a1208; }
        .ack-row { display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.875rem 1rem; background: #fdfaf4; border: 1px solid #e8e0d0; border-radius: 3px; margin-bottom: 0.75rem; cursor: pointer; transition: border-color 0.2s; }
        .ack-row:hover { border-color: #8b6914; }
        .ack-row.checked { border-color: #2d6a4f; background: #f0f7f3; }
        .warning-item { display: flex; gap: 0.5rem; padding: 0.6rem 0.875rem; background: #fdf8ec; border: 1px solid #e8d9b8; border-radius: 3px; margin-bottom: 0.5rem; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #e8e0d0', background: '#fff', padding: '0 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355', fontSize: '0.85rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>← Sessions</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1a1208' }}>LearnLive</span>
          <span style={{ fontSize: '0.7rem', color: '#8b7355', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>New Session</span>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#a89878' }}>Step {step} of 6</span>
      </header>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 2rem 6rem' }}>
        <ProgressBar current={step} />

        {/* ── Step 1: Define Outcome ───────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Define the outcome</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>What should students be able to do or demonstrate by the end of this session?</p>

            <div style={sectionStyle}>
              <label style={labelStyle}>Session title <span style={{ color: '#8b3a2a' }}>*</span></label>
              <input style={inputStyle} placeholder="e.g. Week 4 — Ethical Frameworks in Business" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Discussion topic <span style={{ color: '#8b3a2a' }}>*</span></label>
              <input style={inputStyle} placeholder="e.g. When do fiduciary duties override ethical obligations?" value={topic} onChange={e => setTopic(e.target.value)} />
              <p style={hintStyle}>This is the central question the AI uses to evaluate relevance throughout the session.</p>
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Course / cohort group</label>
              <input style={inputStyle} placeholder="e.g. MBA 2026 — Section A" value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={labelStyle}>Session type</label>
                <select value={sessionType} onChange={e => setSessionType(e.target.value)} style={{ ...inputStyle }}>
                  <option value="group">Group discussion</option>
                  <option value="solo">Solo oral response</option>
                  <option value="hybrid">Hybrid (solo + group)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Duration (minutes)</label>
                <input style={inputStyle} type="number" min="10" max="180" value={duration} onChange={e => setDuration(e.target.value)} placeholder="60" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={labelStyle}>Class size</label>
                <input style={inputStyle} type="number" min="1" max="500" value={classSize} onChange={e => setClassSize(e.target.value)} placeholder="e.g. 40" />
              </div>
              <div>
                <label style={labelStyle}>Grading weight (%)</label>
                <input style={inputStyle} type="number" min="0" max="100" value={gradingWeight} onChange={e => setGradingWeight(e.target.value)} placeholder="e.g. 20" />
              </div>
            </div>

            <div style={sectionStyle}>
              <Toggle
                value={isAsync}
                onChange={setIsAsync}
                label="Asynchronous session"
                hint="Students complete this individually in their own time rather than in a live group."
              />
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Learning objectives</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }}
                placeholder={'One objective per line, e.g.\nApply stakeholder theory to a real business case\nEvaluate competing ethical frameworks\nDefend a position using evidence'}
                value={objectives}
                onChange={e => setObjectives(e.target.value)}
              />
              <p style={hintStyle}>These are used to evaluate whether the discussion achieved its intended goals.</p>
            </div>

            <div style={sectionStyle}>
              <Toggle
                value={objectiveScoring}
                onChange={setObjectiveScoring}
                label="Enable objective-aware AI scoring"
                hint="Claude will evaluate each contribution against your specific learning objectives. Note: this makes scoring slightly slower (additional context in each prompt)."
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Add Content ──────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Add content</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>Upload materials students will use and that the AI will use to evaluate discussion quality.</p>

            {/* PDF upload */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Documents (PDF)</label>
                <div>
                  <input type="file" accept=".pdf" ref={fileRef} onChange={uploadPDF} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    style={{ background: 'none', border: '1px solid #d4c9b0', borderRadius: '3px', padding: '0.35rem 0.875rem', cursor: 'pointer', color: '#5c4a1e', fontSize: '0.82rem', fontFamily: "'DM Mono', monospace" }}>
                    {uploading ? 'Uploading...' : '+ Upload PDF'}
                  </button>
                </div>
              </div>

              {materials.length === 0 ? (
                <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #d4c9b0', borderRadius: '4px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}>
                  <p style={{ color: '#a89878', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Click to upload case document, reading pack, or notes</p>
                  <p style={{ color: '#c9b890', fontSize: '0.72rem', fontFamily: "'DM Mono', monospace" }}>PDF · Max 20MB</p>
                </div>
              ) : (
                <div>
                  {materials.map(m => (
                    <div key={m.id} style={{ background: '#fdfaf4', border: '1px solid #e8e0d0', borderRadius: '3px', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#2a1f0e', fontWeight: '500' }}>📄 {m.file_name}</span>
                        <button onClick={() => deleteMaterial(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9b890', fontSize: '0.8rem' }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {['required_prework', 'optional_reference', 'ai_context', 'instructor_only'].map(tag => (
                          <button key={tag} className={`tag-btn${m.tag === tag ? ' active' : ''}`} onClick={() => updateTag(m.id, tag)}>
                            {tag === 'required_prework' ? 'Required pre-work' : tag === 'optional_reference' ? 'Optional reference' : tag === 'ai_context' ? 'AI context only' : 'Instructor only'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '0.6rem', border: '1px dashed #d4c9b0', borderRadius: '3px', background: 'none', cursor: 'pointer', color: '#a89878', fontSize: '0.85rem', fontFamily: "'Crimson Pro', Georgia, serif", marginTop: '0.25rem' }}>
                    + Add another PDF
                  </button>
                </div>
              )}
            </div>

            {/* YouTube */}
            <div style={sectionStyle}>
              <label style={labelStyle}>Video (YouTube URL)</label>
              <input style={inputStyle} placeholder="https://youtube.com/watch?v=..." value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
              <p style={hintStyle}>Students will see this as pre-work. The URL is stored for the student pre-work view.</p>
            </div>

            {/* Audio */}
            <div style={sectionStyle}>
              <label style={labelStyle}>Audio / podcast pre-work</label>
              {audioFile ? (
                <div style={{ background: '#fdfaf4', border: '1px solid #e8e0d0', borderRadius: '3px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#2a1f0e' }}>🎧 {audioFile.name}</span>
                  <button onClick={() => setAudioFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9b890', fontSize: '0.8rem' }}>✕</button>
                </div>
              ) : (
                <div>
                  <input type="file" accept="audio/*" ref={audioRef} onChange={e => setAudioFile(e.target.files[0])} style={{ display: 'none' }} />
                  <button onClick={() => audioRef.current?.click()} style={{ width: '100%', padding: '1rem', border: '2px dashed #d4c9b0', borderRadius: '4px', background: 'none', cursor: 'pointer', color: '#a89878', fontSize: '0.88rem', fontFamily: "'Crimson Pro', Georgia, serif" }}>
                    🎙 Upload podcast or voice note (MP3, M4A, WAV)
                  </button>
                </div>
              )}
              <p style={hintStyle}>Audio pre-work helps students engage before the live discussion. Stored as student pre-work reference.</p>
            </div>
          </div>
        )}

        {/* ── Step 3: Build Discussion ─────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Build the discussion</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>Design the prompts and structure that will drive the discussion. The more friction you build in, the deeper the thinking.</p>

            <div style={sectionStyle}>
              <label style={labelStyle}>Opening question</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                placeholder="The question that kicks off the discussion. Should be complex enough that reasonable people disagree."
                value={openingQuestion}
                onChange={e => setOpeningQuestion(e.target.value)}
              />
              <p style={hintStyle}>This is the first thing students see when the session starts.</p>
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Discussion prompts (up to 6)</label>
              <p style={hintStyle} style={{ marginBottom: '0.75rem' }}>Sequence of prompts the facilitator can inject or that fire automatically. Build in moments of complexity — force students to take a position.</p>
              {discussionPrompts.map((p, i) => (
                <PromptItem
                  key={i} value={p} index={i}
                  onChange={val => setDiscussionPrompts(prev => prev.map((v, j) => j === i ? val : v))}
                  onRemove={() => setDiscussionPrompts(prev => prev.filter((_, j) => j !== i))}
                  placeholder={i === 0 ? 'e.g. Who bears the most responsibility here — and why?' : i === 1 ? 'e.g. What would a stakeholder theorist say? Do you agree?' : 'Next prompt...'}
                />
              ))}
              {discussionPrompts.length < 6 && (
                <button onClick={() => setDiscussionPrompts(prev => [...prev, ''])}
                  style={{ background: 'none', border: '1px dashed #d4c9b0', borderRadius: '3px', padding: '0.5rem 1rem', cursor: 'pointer', color: '#8b7355', fontSize: '0.85rem', width: '100%', fontFamily: "'Crimson Pro', Georgia, serif" }}>
                  + Add prompt
                </button>
              )}
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Forced-choice poll question <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0, color: '#a89878' }}>(optional)</span></label>
              <input style={{ ...inputStyle, marginBottom: '0.5rem' }} placeholder="e.g. Was the CEO's decision ethically defensible?" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} />
              {pollOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#a89878', minWidth: '14px' }}>{String.fromCharCode(65 + i)}.</span>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder={i === 0 ? 'Yes — because...' : i === 1 ? 'No — because...' : 'Option...'} value={opt} onChange={e => setPollOptions(prev => prev.map((v, j) => j === i ? e.target.value : v))} />
                  {pollOptions.length > 2 && <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9b890' }}>✕</button>}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button onClick={() => setPollOptions(prev => [...prev, ''])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355', fontSize: '0.82rem', fontFamily: "'DM Mono', monospace', padding: 0, marginTop: '0.25rem" }}>+ Add option</button>
              )}
              <p style={hintStyle}>Forces students to commit to a position before speaking — creates psychological investment in the debate.</p>
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Role-play instructions <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0, color: '#a89878' }}>(optional)</span></label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
                placeholder="e.g. Each student is assigned a stakeholder role. Student 1 represents the board, Student 2 represents employees..."
                value={rolePlayInstructions}
                onChange={e => setRolePlayInstructions(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={labelStyle}>Discussion mode</label>
                <select value={groupMode} onChange={e => setGroupMode(e.target.value)} style={{ ...inputStyle }}>
                  <option value="debate">Open debate — no consensus needed</option>
                  <option value="consensus">Reach group consensus</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Breakout group size</label>
                <select value={breakoutSize} onChange={e => setBreakoutSize(e.target.value)} style={{ ...inputStyle }}>
                  {[2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} students</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Interventions ────────────────────────────────── */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Set interventions</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '0.75rem', fontStyle: 'italic' }}>Configure the AI facilitation rules. These fire automatically during the live session.</p>
            <div style={{ background: '#fdfaf4', border: '1px solid #e8d9b8', borderRadius: '3px', padding: '0.75rem 1rem', marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.82rem', color: '#8b6914', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>The group analysis runs every 60 seconds. Enabled interventions fire when conditions are detected.</p>
            </div>

            {[
              { key: 'silence', label: 'Silence nudge', hint: 'Fires when a participant hasn\'t spoken in 3+ minutes' },
              { key: 'dominance', label: 'Dominance nudge', hint: 'Fires when one participant is taking more than their fair share' },
              { key: 'offTopic', label: 'Off-topic redirect', hint: 'Fires when discussion drifts from the session topic' },
              { key: 'shallow', label: 'Depth prompt', hint: 'Fires when discussion lacks analytical depth or evidence' },
              { key: 'timeRunningOut', label: 'Time warning', hint: 'Fires in the final 5 minutes to prompt summary or decision' },
            ].map(({ key, label, hint }) => (
              <div key={key} style={{ marginBottom: '1.25rem', background: '#fff', border: '1px solid #e8e0d0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.95rem', color: '#1a1208', marginBottom: '0.2rem', fontWeight: '500' }}>{label}</div>
                    <div style={hintStyle}>{hint}</div>
                  </div>
                  <button
                    onClick={() => updateIntervention(key, 'enabled', !interventions[key].enabled)}
                    style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', background: interventions[key].enabled ? '#2d6a4f' : '#d4c9b0', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: '3px', left: interventions[key].enabled ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>
                {interventions[key].enabled && (
                  <div style={{ borderTop: '1px solid #f0e8d8', padding: '0.75rem 1rem', background: '#fdfaf4' }}>
                    <label style={{ ...labelStyle, marginBottom: '0.4rem' }}>Prompt text</label>
                    <textarea
                      value={interventions[key].prompt}
                      onChange={e => updateIntervention(key, 'prompt', e.target.value)}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', fontSize: '0.92rem' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 5: Evaluation ──────────────────────────────────── */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Set evaluation</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>Configure how contributions are scored and what triggers instructor review.</p>

            <div style={sectionStyle}>
              <label style={labelStyle}>Scoring dimension weights</label>
              <p style={hintStyle} style={{ marginBottom: '1rem' }}>Weights must sum to 100%. Adjust to reflect what matters most for this session.</p>
              <WeightSlider label="Topic adherence" value={weights.topic_adherence} onChange={v => setWeights(w => ({ ...w, topic_adherence: v }))} />
              <WeightSlider label="Analytical depth" value={weights.depth} onChange={v => setWeights(w => ({ ...w, depth: v }))} />
              <WeightSlider label="Material application" value={weights.material_application} onChange={v => setWeights(w => ({ ...w, material_application: v }))} />
              <WeightSlider label="Participation" value={weights.participation} onChange={v => setWeights(w => ({ ...w, participation: v }))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.875rem', background: weightValid ? '#f0f7f3' : '#fdf3f0', border: `1px solid ${weightValid ? '#c8e0d4' : '#e0c8c4'}`, borderRadius: '3px' }}>
                <span style={{ fontSize: '0.85rem', color: weightValid ? '#2d6a4f' : '#8b3a2a' }}>Total</span>
                <span style={{ fontSize: '0.85rem', fontFamily: "'DM Mono', monospace", fontWeight: '500', color: weightValid ? '#2d6a4f' : '#8b3a2a' }}>{weightSum}%</span>
              </div>
            </div>

            <div style={sectionStyle}>
              <Toggle value={bloomEnabled} onChange={setBloomEnabled} label="Bloom's Taxonomy scoring" hint="Claude classifies each contribution by cognitive level: Remember → Understand → Apply → Analyse → Evaluate → Create." />
              <Toggle value={individualScoring} onChange={setIndividualScoring} label="Individual scoring" hint="Score each participant individually. Disable for purely group-level evaluation." />
              <Toggle value={autoFeedback} onChange={setAutoFeedback} label="Automatic student feedback" hint="Students receive AI-generated feedback on their contributions after the session ends." />
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Flag for instructor review — score threshold</label>
              <select value={flagThreshold} onChange={e => setFlagThreshold(e.target.value)} style={{ ...inputStyle }}>
                <option value="3">3 or below (flag struggling students)</option>
                <option value="4">4 or below</option>
                <option value="5">5 or below (flag anyone below average)</option>
                <option value="0">Don't flag automatically</option>
              </select>
              <p style={hintStyle}>Participants with an overall score at or below this threshold will be flagged in the post-session report for follow-up.</p>
            </div>
          </div>
        )}

        {/* ── Step 6: Review & Launch ──────────────────────────────── */}
        {step === 6 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Review & launch</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>Check everything before publishing. Once live, materials cannot be added — only prompts can be issued manually.</p>

            {/* Summary */}
            <div style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <p style={{ ...labelStyle, marginBottom: '1rem' }}>Session summary</p>
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {[
                  ['Title', title],
                  ['Topic', topic],
                  ['Type', sessionType + (isAsync ? ' · async' : ' · synchronous')],
                  ['Duration', duration + ' minutes'],
                  ['Class size', classSize || 'Not specified'],
                  ['Grading weight', gradingWeight ? gradingWeight + '%' : 'Not specified'],
                  ['Materials', materials.length + ' uploaded'],
                  ['Discussion prompts', discussionPrompts.filter(p => p.trim()).length + ' configured'],
                  ['Interventions', Object.values(interventions).filter(i => i.enabled).length + ' active'],
                  ['Scoring', `Topic ${weights.topic_adherence}% · Depth ${weights.depth}% · Material ${weights.material_application}% · Participation ${weights.participation}%`],
                  ['Objective-aware scoring', objectiveScoring ? 'Enabled' : 'Disabled'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                    <span style={{ color: '#8b7355', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', minWidth: '160px', paddingTop: '2px' }}>{k}</span>
                    <span style={{ color: '#2a1f0e' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ ...labelStyle, color: '#8b6914', marginBottom: '0.75rem' }}>Readiness warnings</p>
                {warnings.map((w, i) => (
                  <div key={i} className="warning-item">
                    <span style={{ color: '#8b6914', flexShrink: 0 }}>△</span>
                    <span style={{ fontSize: '0.88rem', color: '#5c4a1e', lineHeight: 1.5 }}>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Acknowledgements */}
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Before you publish</p>
              <p style={{ fontSize: '0.85rem', color: '#8b7355', marginBottom: '1rem', lineHeight: 1.5 }}>
                Once the session starts, materials cannot be added. If you realise you've missed something after starting, you'll need to create a new session.
              </p>
              {[
                { key: 'ackMaterials', value: ackMaterials, set: setAckMaterials, label: 'All required materials have been uploaded and tagged correctly' },
                { key: 'ackObjectives', value: ackObjectives, set: setAckObjectives, label: 'Learning objectives are defined and accurately reflect what I want to assess' },
                { key: 'ackPrompts', value: ackPrompts, set: setAckPrompts, label: 'Discussion prompts are ready and the opening question will generate genuine debate' },
              ].map(({ key, value, set, label }) => (
                <div key={key} className={`ack-row${value ? ' checked' : ''}`} onClick={() => set(v => !v)}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '2px', border: `1.5px solid ${value ? '#2d6a4f' : '#d4c9b0'}`, background: value ? '#2d6a4f' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {value && <span style={{ color: '#fff', fontSize: '11px', lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '0.92rem', color: value ? '#1a3328' : '#2a1f0e', lineHeight: 1.5 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Navigation ───────────────────────────────────────────── */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8e0d0', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
          <button
            onClick={back}
            disabled={step === 1}
            style={{ background: 'none', border: '1px solid #d4c9b0', borderRadius: '3px', padding: '0.6rem 1.25rem', cursor: step === 1 ? 'default' : 'pointer', color: step === 1 ? '#c9b890' : '#5c4a1e', fontSize: '0.95rem', fontFamily: "'Crimson Pro', Georgia, serif" }}>
            ← Back
          </button>

          <div style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#a89878' }}>
            {step === 5 && !weightValid && <span style={{ color: '#8b3a2a' }}>Weights must sum to 100%</span>}
          </div>

          {step < 6 ? (
            <button
              onClick={next}
              disabled={!canProceed() || (step === 5 && !weightValid)}
              style={{ background: canProceed() && (step !== 5 || weightValid) ? '#1a1208' : '#d4c9b0', color: canProceed() && (step !== 5 || weightValid) ? '#f5edd8' : '#a89878', border: 'none', borderRadius: '3px', padding: '0.6rem 1.5rem', cursor: canProceed() ? 'pointer' : 'default', fontSize: '0.95rem', fontFamily: "'Crimson Pro', Georgia, serif", transition: 'all 0.2s' }}>
              Continue →
            </button>
          ) : (
            <button
              onClick={publish}
              disabled={!canProceed() || creating}
              style={{ background: canProceed() ? '#2d6a4f' : '#d4c9b0', color: canProceed() ? '#fff' : '#a89878', border: 'none', borderRadius: '3px', padding: '0.6rem 1.75rem', cursor: canProceed() ? 'pointer' : 'default', fontSize: '1rem', fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: '500', transition: 'all 0.2s' }}>
              {creating ? 'Publishing...' : 'Publish Session →'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
