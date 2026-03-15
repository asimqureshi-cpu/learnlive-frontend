'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const API = process.env.NEXT_PUBLIC_BACKEND_URL;

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');`;
const STEPS = [
  { id: 1, label: 'Outcome' }, { id: 2, label: 'Content' },
  { id: 3, label: 'Discussion' }, { id: 4, label: 'Interventions' },
  { id: 5, label: 'Evaluation' }, { id: 6, label: 'Launch' },
];

const inputStyle = { width: '100%', padding: '0.7rem 0.875rem', border: '1px solid #d4c9b0', borderRadius: '3px', fontFamily: "'Crimson Pro', Georgia, serif", fontSize: '1rem', color: '#1a1208', background: '#fdfaf4', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#5c4a1e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' };
const hintStyle = { fontSize: '0.78rem', color: '#a89878', fontStyle: 'italic', marginTop: '0.35rem', lineHeight: 1.4 };
const sectionStyle = { marginBottom: '1.75rem' };

// ── Tone / Sensitivity slider labels ─────────────────────────────────────────
const TONE_LABELS = {
  1: 'Encouraging', 2: 'Supportive', 3: 'Socratic', 4: 'Challenging', 5: 'Demanding',
};
const TONE_HINTS = {
  1: 'Warm, affirming — celebrates contributions before pushing further',
  2: 'Acknowledges the point, then gently questions it',
  3: 'Neutral Socratic questioning — no praise, no criticism',
  4: 'Direct and rigorous — calls out gaps plainly',
  5: 'Sharp and uncompromising — expects students to defend every claim',
};
const SENSITIVITY_LABELS = {
  1: 'Conservative', 2: 'Measured', 3: 'Balanced', 4: 'Proactive', 5: 'Aggressive',
};
const SENSITIVITY_HINTS = {
  1: 'Only fire if the problem is severe and sustained across multiple exchanges',
  2: 'Fire when a clear pattern is established over at least 2 exchanges',
  3: 'Fire when the pattern is clear — one exchange is enough if it is stark',
  4: 'Fire at the first clear sign — do not wait for it to develop',
  5: 'Fire immediately at any hint of the problem, even partial signals',
};

function ProgressBar({ current }) {
  return (
    <div style={{ display: 'flex', marginBottom: '2.5rem' }}>
      {STEPS.map(s => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: '3px', background: done ? '#2d6a4f' : active ? '#8b6914' : '#e8e0d0', marginBottom: '0.5rem', transition: 'background 0.3s' }} />
            <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', color: done ? '#2d6a4f' : active ? '#8b6914' : '#c4b49a' }}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Toggle({ value, onChange, label, hint }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '0.875rem 1rem', background: '#fdfaf4', border: '1px solid #e8e0d0', borderRadius: '3px', marginBottom: '0.75rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.95rem', color: '#1a1208', marginBottom: hint ? '0.2rem' : 0 }}>{label}</div>
        {hint && <div style={hintStyle}>{hint}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', background: value ? '#2d6a4f' : '#d4c9b0', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: '3px', left: value ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </button>
    </div>
  );
}

function WeightSlider({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#2a1f0e' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontFamily: "'DM Mono', monospace", color: '#8b6914' }}>{value}%</span>
      </div>
      <input type="range" min="0" max="100" step="5" value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: '#8b6914' }} />
    </div>
  );
}

// ── Intent slider — 1 to 5 with labelled endpoints ───────────────────────────
function IntentSlider({ label, value, onChange, labels, hints, leftLabel, rightLabel }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#2a1f0e', fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '0.78rem', fontFamily: "'DM Mono', monospace", color: '#8b6914' }}>{labels[value]}</span>
      </div>
      <input
        type="range" min="1" max="5" step="1" value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#8b6914', marginBottom: '0.35rem' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: '#a89878' }}>{leftLabel}</span>
        <span style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: '#a89878' }}>{rightLabel}</span>
      </div>
      {hints && <p style={hintStyle}>{hints[value]}</p>}
    </div>
  );
}

function PromptItem({ value, index, onChange, onRemove, placeholder }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#a89878', paddingTop: '0.75rem', minWidth: '18px' }}>{index + 1}.</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} style={{ ...inputStyle, resize: 'vertical', flex: 1, fontSize: '0.95rem' }} />
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9b890', fontSize: '1rem', paddingTop: '0.6rem', flexShrink: 0 }}>✕</button>
    </div>
  );
}

function readinessWarnings(config, materials) {
  const w = [];
  if (!config.objectives?.trim()) w.push('No learning objectives defined — AI scoring will be generic');
  if (materials.length === 0) w.push('No materials uploaded — RAG context unavailable for scoring');
  if (!config.openingQuestion?.trim()) w.push('No opening question set — discussion may lack direction');
  if (!config.discussionPrompts?.filter(p => p.trim()).length) w.push('No discussion prompts configured');
  return w;
}

// ── Default intent ────────────────────────────────────────────────────────────
const DEFAULT_INTENT = {
  enabled_types: { silence: true, dominating: true, off_topic: true, shallow: true, time_running_out: true },
  tone: 3,
  sensitivity: 3,
  cooldown_minutes: 5,
  must_cover_concepts: [],
  constraints: { never_name_in_group: false, always_reference_materials: true },
};

export default function NewSessionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const fileRef = useRef(null);
  const audioRef = useRef(null);

  // Step 1
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [topicId, setTopicId] = useState(null);         // course_topics.id if linked
  const [sessionType, setSessionType] = useState('group');
  const [isAsync, setIsAsync] = useState(false);
  const [classSize, setClassSize] = useState('');
  const [duration, setDuration] = useState('60');
  const [gradingWeight, setGradingWeight] = useState('');
  const [objectives, setObjectives] = useState('');
  const [objectiveScoring, setObjectiveScoring] = useState(false);
  const [groupName, setGroupName] = useState('');

  // Step 2
  const [materials, setMaterials] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [contentTags, setContentTags] = useState({});
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Library
  const [libraryMaterials, setLibraryMaterials] = useState([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState({});  // materialId → bool
  const [savedToLibrary, setSavedToLibrary] = useState(new Set());  // materialIds saved this session
  const [orgId, setOrgId] = useState(null);

  // Step 3
  const [openingQuestion, setOpeningQuestion] = useState('');
  const [discussionPrompts, setDiscussionPrompts] = useState(['', '', '']);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [rolePlayInstructions, setRolePlayInstructions] = useState('');
  const [groupMode, setGroupMode] = useState('debate');
  const [breakoutSize, setBreakoutSize] = useState('4');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());

  // Step 4 — Intent configuration (replaces old prompt-text interventions)
  const [intentConfig, setIntentConfig] = useState(DEFAULT_INTENT);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentFromHistory, setIntentFromHistory] = useState(false);
  const [intentHistorySummary, setIntentHistorySummary] = useState(null);
  const [newConcept, setNewConcept] = useState('');

  // Step 5
  const [weights, setWeights] = useState({ topic_adherence: 25, depth: 35, material_application: 25, participation: 15 });
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [individualScoring, setIndividualScoring] = useState(true);
  const [autoFeedback, setAutoFeedback] = useState(true);
  const [flagThreshold, setFlagThreshold] = useState('4');

  // Step 6
  const [ackMaterials, setAckMaterials] = useState(false);
  const [ackObjectives, setAckObjectives] = useState(false);
  const [ackPrompts, setAckPrompts] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      const { data: userRow } = await supabase.from('users').select('role, organisation_id').eq('email', session.user.email).single();
      if (!userRow || userRow.role === 'student') { router.push('/student'); return; }
      if (userRow.organisation_id) setOrgId(userRow.organisation_id);
      setAuthChecked(true);
    });
  }, []);

  // Auto-load AI suggestions on entering Step 3
  useEffect(() => {
    if (step !== 3 || suggestionsLoaded || suggestionsLoading) return;
    if (!sessionId || materials.length === 0) return;
    loadAiSuggestions();
  }, [step]);

  // Auto-load intent defaults from history when entering Step 4
  useEffect(() => {
    if (step !== 4 || intentLoading || intentFromHistory) return;
    loadIntentDefaults();
  }, [step]);

  // Auto-extract must-cover concepts from materials metadata + objectives
  useEffect(() => {
    if (step !== 4) return;
    const extractedConcepts = [];
    materials.forEach(m => {
      const topics = m.metadata?.key_topics || m.metadata?.key_concepts || [];
      extractedConcepts.push(...topics);
    });
    const objConcepts = objectives.split('\n').map(o => o.trim()).filter(Boolean);
    const all = [...new Set([...extractedConcepts, ...objConcepts])].slice(0, 8);
    if (all.length > 0 && intentConfig.must_cover_concepts.length === 0) {
      setIntentConfig(prev => ({ ...prev, must_cover_concepts: all }));
    }
  }, [step]);

  async function loadAiSuggestions() {
    setSuggestionsLoading(true);
    try {
      const objList = objectives.split('\n').map(o => o.trim()).filter(Boolean);
      const existingPrompts = discussionPrompts.filter(p => p.trim());
      const res = await fetch(API + '/api/sessions/' + sessionId + '/suggest-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, objectives: objList, professorPrompts: existingPrompts }),
      });
      const data = await res.json();
      if (data.suggestions?.length) { setAiSuggestions(data.suggestions); setSuggestionsLoaded(true); }
    } catch (err) { console.error('Suggestions failed:', err); }
    setSuggestionsLoading(false);
  }

  async function loadIntentDefaults() {
    setIntentLoading(true);
    try {
      const tid = topicId || 'none';
      const res = await fetch(API + '/api/sessions/intent-defaults/' + tid);
      const data = await res.json();
      if (data.intent_config) {
        setIntentConfig(prev => ({
          ...DEFAULT_INTENT,
          ...data.intent_config,
          // Preserve any concepts already extracted from materials
          must_cover_concepts: data.intent_config.must_cover_concepts?.length
            ? data.intent_config.must_cover_concepts
            : prev.must_cover_concepts,
        }));
        if (data.has_history && data.intent_config._ai_populated) {
          setIntentFromHistory(true);
          setIntentHistorySummary(data.intent_config._intelligence_summary);
        }
      }
    } catch (err) { /* silent — defaults already set */ }
    setIntentLoading(false);
  }

  async function loadLibraryMaterials() {
    if (!orgId || libraryLoaded) return;
    try {
      const params = new URLSearchParams({ organisation_id: orgId });
      if (topicId) params.append('topic_id', topicId);
      const res = await fetch(`${API}/api/library?${params}`);
      const data = await res.json();
      setLibraryMaterials(Array.isArray(data) ? data : []);
      setLibraryLoaded(true);
    } catch (err) { console.error('Library load failed:', err); }
  }

  async function saveToLibrary(materialId) {
    if (!orgId || !sessionId) return;
    setSavingToLibrary(prev => ({ ...prev, [materialId]: true }));
    try {
      await fetch(`${API}/api/library/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          session_id: sessionId,
          topic_ids: topicId ? [topicId] : [],
          organisation_id: orgId,
        }),
      });
      setSavedToLibrary(prev => new Set([...prev, materialId]));
      setLibraryLoaded(false); // Refresh on next open
    } catch (err) { alert('Failed to save to library: ' + err.message); }
    setSavingToLibrary(prev => ({ ...prev, [materialId]: false }));
  }

  async function attachFromLibrary(libraryMaterialId) {
    const id = sessionId || await ensureSessionCreated().catch(err => { alert(err.message); return null; });
    if (!id) return;
    try {
      const res = await fetch(`${API}/api/library/${libraryMaterialId}/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: id }),
      });
      const data = await res.json();
      if (data.material) {
        setMaterials(prev => [...prev, { ...data.material, tag: 'ai_context', from_library: true }]);
        setShowLibrary(false);
      }
    } catch (err) { alert('Failed to attach material: ' + err.message); }
  }

  function updateIntent(key, value) {
    setIntentConfig(prev => ({ ...prev, [key]: value }));
  }

  function updateEnabledType(type, value) {
    setIntentConfig(prev => ({
      ...prev,
      enabled_types: { ...prev.enabled_types, [type]: value },
    }));
  }

  function updateConstraint(key, value) {
    setIntentConfig(prev => ({
      ...prev,
      constraints: { ...prev.constraints, [key]: value },
    }));
  }

  function addConcept() {
    const c = newConcept.trim();
    if (!c) return;
    setIntentConfig(prev => ({
      ...prev,
      must_cover_concepts: [...(prev.must_cover_concepts || []).filter(x => x !== c), c],
    }));
    setNewConcept('');
  }

  function removeConcept(c) {
    setIntentConfig(prev => ({
      ...prev,
      must_cover_concepts: prev.must_cover_concepts.filter(x => x !== c),
    }));
  }

  async function ensureSessionCreated() {
    if (sessionId) return sessionId;
    const res = await fetch(API + '/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(), topic: topic.trim(),
        group_name: groupName.trim() || null,
        topic_id: topicId || null,
        session_config: buildConfig(),
      }),
    });
    const data = await res.json();
    if (!data.id) throw new Error('Session creation failed');
    setSessionId(data.id);
    return data.id;
  }

  function buildConfig() {
    return {
      session_type: sessionType, is_async: isAsync,
      class_size: classSize ? Number(classSize) : null,
      duration_minutes: duration ? Number(duration) : 60,
      grading_weight: gradingWeight ? Number(gradingWeight) : null,
      objectives: objectives.trim().split('\n').map(o => o.trim()).filter(Boolean),
      objective_scoring_enabled: objectiveScoring,
      youtube_url: youtubeUrl.trim() || null,
      has_audio_prework: !!audioFile,
      content_tags: contentTags,
      opening_question: openingQuestion.trim(),
      discussion_prompts: discussionPrompts.filter(p => p.trim()),
      poll_question: pollQuestion.trim() || null,
      poll_options: pollOptions.filter(o => o.trim()),
      role_play_instructions: rolePlayInstructions.trim() || null,
      group_mode: groupMode,
      breakout_size: breakoutSize ? Number(breakoutSize) : 4,
      // Phase 2: intervention_intent replaces old interventions object
      intervention_intent: intentConfig,
      scoring_weights: weights,
      bloom_enabled: bloomEnabled,
      individual_scoring: individualScoring,
      auto_feedback: autoFeedback,
      flag_threshold: Number(flagThreshold),
    };
  }

  async function publish() {
    setCreating(true);
    try {
      const id = sessionId || await ensureSessionCreated();
      await fetch(API + '/api/sessions/' + id + '/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_config: buildConfig() }),
      });
      router.push('/admin/' + id);
    } catch (err) { alert('Failed to publish session: ' + err.message); }
    setCreating(false);
  }

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
        setSuggestionsLoaded(false); setAiSuggestions([]);
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

  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightValid = weightSum === 100;

  function canProceed() {
    if (step === 1) return title.trim() && topic.trim();
    if (step === 6) return ackMaterials && ackObjectives && ackPrompts;
    return true;
  }

  async function next() {
    if (step === 1) {
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
        .concept-tag { display: inline-flex; align-items: center; gap: 0.35rem; background: #1a1208; color: #c9b890; border-radius: 2px; padding: 0.2rem 0.5rem 0.2rem 0.65rem; font-size: 0.72rem; font-family: 'DM Mono', monospace; margin: 0.2rem; }
        .concept-tag button { background: none; border: none; cursor: pointer; color: #8b7355; font-size: 0.8rem; padding: 0; line-height: 1; transition: color 0.15s; }
        .concept-tag button:hover { color: #f5edd8; }
        .intervention-card { background: #fff; border: 1px solid #e8e0d0; border-radius: 4px; overflow: hidden; margin-bottom: 0.875rem; transition: border-color 0.2s; }
        .intervention-card.active { border-color: #8b6914; }
        .intervention-card-header { padding: 0.875rem 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
        .ai-badge { font-size: 0.6rem; font-family: 'DM Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase; color: #2d6a4f; background: #f0f7f3; border: 1px solid #c8e0d4; border-radius: 2px; padding: 0.15rem 0.45rem; }
      `}</style>

      <header style={{ borderBottom: '1px solid #e8e0d0', background: '#fff', padding: '0 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => router.push('/sessions')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355', fontSize: '0.85rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>← Sessions</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1a1208' }}>LearnLive</span>
          <span style={{ fontSize: '0.7rem', color: '#8b7355', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>New Session</span>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#a89878' }}>Step {step} of 6</span>
      </header>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 2rem 6rem' }}>
        <ProgressBar current={step} />

        {/* ── Step 1: Outcome ── */}
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
            <div style={sectionStyle}><Toggle value={isAsync} onChange={setIsAsync} label="Asynchronous session" hint="Students complete this individually in their own time rather than in a live group." /></div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Learning objectives</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }} placeholder={'One objective per line, e.g.\nApply stakeholder theory to a real business case\nEvaluate competing ethical frameworks\nDefend a position using evidence'} value={objectives} onChange={e => setObjectives(e.target.value)} />
              <p style={hintStyle}>Used to evaluate whether the discussion achieved its intended goals, and to auto-fill must-cover concepts in Step 4.</p>
            </div>
            <div style={sectionStyle}><Toggle value={objectiveScoring} onChange={setObjectiveScoring} label="Enable objective-aware AI scoring" hint="Claude evaluates each contribution against your specific learning objectives. Slightly slower per batch." /></div>
          </div>
        )}

        {/* ── Step 2: Content ── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Add content</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>Upload materials students will use and that the AI will use to evaluate discussion quality.</p>
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Documents (PDF)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => { loadLibraryMaterials(); setShowLibrary(v => !v); }}
                    style={{ background: 'none', border: '1px solid #d4c9b0', borderRadius: '3px', padding: '0.35rem 0.875rem', cursor: 'pointer', color: '#5c4a1e', fontSize: '0.72rem', fontFamily: "'DM Mono', monospace" }}>
                    {showLibrary ? 'Hide library' : '📚 From library'}
                  </button>
                  <input type="file" accept=".pdf" ref={fileRef} onChange={uploadPDF} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: 'none', border: '1px solid #d4c9b0', borderRadius: '3px', padding: '0.35rem 0.875rem', cursor: 'pointer', color: '#5c4a1e', fontSize: '0.82rem', fontFamily: "'DM Mono', monospace" }}>
                    {uploading ? 'Uploading...' : '+ Upload PDF'}
                  </button>
                </div>
              </div>

              {/* Library browser */}
              {showLibrary && (
                <div style={{ background: '#fdfaf4', border: '1px solid #e8d9b8', borderRadius: '3px', padding: '1rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: '#8b6914', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    Course library — reuse materials without re-uploading
                  </p>
                  {!libraryLoaded ? (
                    <p style={{ fontSize: '0.85rem', color: '#a89878', fontStyle: 'italic' }}>Loading...</p>
                  ) : libraryMaterials.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#a89878', fontStyle: 'italic' }}>No library materials yet. Upload a PDF and save it to the library to reuse it across sessions.</p>
                  ) : (
                    libraryMaterials.map(lm => {
                      const alreadyAttached = materials.some(m => m.library_material_id === lm.id || m.file_path === lm.file_path);
                      return (
                        <div key={lm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: '#fff', border: '1px solid #e8e0d0', borderRadius: '3px', marginBottom: '0.5rem', gap: '0.75rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.9rem', color: '#2a1f0e', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📄 {lm.file_name}</div>
                            {lm.metadata?.key_topics?.length > 0 && (
                              <div style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: '#a89878', marginTop: '2px' }}>
                                {lm.metadata.key_topics.slice(0, 3).join(' · ')}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => !alreadyAttached && attachFromLibrary(lm.id)}
                            disabled={alreadyAttached}
                            style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", background: alreadyAttached ? 'transparent' : '#1a1208', color: alreadyAttached ? '#a89878' : '#f5edd8', border: alreadyAttached ? '1px solid #d4c9b0' : 'none', borderRadius: '2px', padding: '0.25rem 0.75rem', cursor: alreadyAttached ? 'default' : 'pointer', flexShrink: 0 }}>
                            {alreadyAttached ? 'Added' : 'Use'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Uploaded materials list */}
              {materials.length === 0 ? (
                <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #d4c9b0', borderRadius: '4px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}>
                  <p style={{ color: '#a89878', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Click to upload case document, reading pack, or notes</p>
                  <p style={{ color: '#c9b890', fontSize: '0.72rem', fontFamily: "'DM Mono', monospace" }}>PDF · Max 20MB</p>
                </div>
              ) : (
                <div>
                  {materials.map(m => {
                    const isLibrary = !!m.from_library;
                    const isSaved = savedToLibrary.has(m.id);
                    const isSaving = savingToLibrary[m.id];
                    return (
                      <div key={m.id} style={{ background: '#fdfaf4', border: '1px solid #e8e0d0', borderRadius: '3px', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.9rem', color: '#2a1f0e', fontWeight: '500' }}>📄 {m.file_name}</span>
                            {isLibrary && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.62rem', fontFamily: "'DM Mono', monospace", color: '#2d6a4f', background: '#f0f7f3', border: '1px solid #c8e0d4', borderRadius: '2px', padding: '0.1rem 0.4rem' }}>library</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                            {/* Save to library button — only for fresh uploads, not library materials */}
                            {!isLibrary && sessionId && (
                              <button
                                onClick={() => !isSaved && !isSaving && saveToLibrary(m.id)}
                                disabled={isSaved || isSaving}
                                style={{ fontSize: '0.62rem', fontFamily: "'DM Mono', monospace", background: 'none', border: `1px solid ${isSaved ? '#c8e0d4' : '#d4c9b0'}`, borderRadius: '2px', padding: '0.15rem 0.5rem', cursor: isSaved ? 'default' : 'pointer', color: isSaved ? '#2d6a4f' : '#8b7355', whiteSpace: 'nowrap' }}>
                                {isSaving ? 'Saving...' : isSaved ? '✓ Saved to library' : '+ Save to library'}
                              </button>
                            )}
                            <button onClick={() => deleteMaterial(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9b890', fontSize: '0.8rem' }}>✕</button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {['required_prework', 'optional_reference', 'ai_context', 'instructor_only'].map(tag => (
                            <button key={tag} className={`tag-btn${m.tag === tag ? ' active' : ''}`} onClick={() => updateTag(m.id, tag)}>
                              {tag === 'required_prework' ? 'Required pre-work' : tag === 'optional_reference' ? 'Optional reference' : tag === 'ai_context' ? 'AI context only' : 'Instructor only'}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '0.6rem', border: '1px dashed #d4c9b0', borderRadius: '3px', background: 'none', cursor: 'pointer', color: '#a89878', fontSize: '0.85rem', fontFamily: "'Crimson Pro', Georgia, serif", marginTop: '0.25rem' }}>+ Add another PDF</button>
                </div>
              )}
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Video (YouTube URL)</label>
              <input style={inputStyle} placeholder="https://youtube.com/watch?v=..." value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
              <p style={hintStyle}>Students will see this as pre-work.</p>
            </div>
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
                  <button onClick={() => audioRef.current?.click()} style={{ width: '100%', padding: '1rem', border: '2px dashed #d4c9b0', borderRadius: '4px', background: 'none', cursor: 'pointer', color: '#a89878', fontSize: '0.88rem', fontFamily: "'Crimson Pro', Georgia, serif" }}>🎙 Upload podcast or voice note (MP3, M4A, WAV)</button>
                </div>
              )}
              <p style={hintStyle}>Audio pre-work helps students engage before the live discussion.</p>
            </div>
          </div>
        )}

        {/* ── Step 3: Discussion ── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Build the discussion</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>Design prompts that drive deep engagement. The more friction you build in, the deeper the thinking.</p>
            <div style={sectionStyle}>
              <label style={labelStyle}>Opening question</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} placeholder="The question that kicks off the discussion. Should be complex enough that reasonable people disagree." value={openingQuestion} onChange={e => setOpeningQuestion(e.target.value)} />
              <p style={hintStyle}>This is the first thing students see when the session starts.</p>
            </div>
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Your discussion prompts (up to 6)</label>
                {materials.length > 0 && !suggestionsLoaded && (
                  <button onClick={loadAiSuggestions} disabled={suggestionsLoading} style={{ background: 'none', border: '1px solid #d4c9b0', borderRadius: '3px', padding: '0.25rem 0.75rem', cursor: 'pointer', color: '#5c4a1e', fontSize: '0.72rem', fontFamily: "'DM Mono', monospace" }}>
                    {suggestionsLoading ? 'Generating...' : '✦ AI suggestions'}
                  </button>
                )}
              </div>
              {aiSuggestions.filter((_, i) => !dismissedSuggestions.has(i)).length > 0 && (
                <div style={{ background: '#fdfaf4', border: '1px solid #e8d9b8', borderRadius: '3px', padding: '0.875rem 1rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: '#8b6914', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>AI suggested prompts — based on your materials</p>
                  {aiSuggestions.map((s, i) => dismissedSuggestions.has(i) ? null : (
                    <div key={i} style={{ background: '#fff', border: '1px solid #e8d9b8', borderRadius: '3px', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                      <p style={{ fontSize: '0.9rem', color: '#2a1f0e', lineHeight: 1.5, marginBottom: '0.4rem' }}>{s.prompt}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: '#a89878' }}>{s.bloom_level} · {s.rationale}</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { if (discussionPrompts.filter(p => p.trim()).length < 6) setDiscussionPrompts(prev => { const empty = prev.findIndex(p => !p.trim()); return empty >= 0 ? prev.map((v, j) => j === empty ? s.prompt : v) : [...prev, s.prompt].slice(0, 6); }); setDismissedSuggestions(prev => new Set([...prev, i])); }} style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", background: '#1a1208', color: '#f5edd8', border: 'none', borderRadius: '2px', padding: '0.2rem 0.6rem', cursor: 'pointer' }}>Use</button>
                          <button onClick={() => setDismissedSuggestions(prev => new Set([...prev, i]))} style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", background: 'none', border: '1px solid #d4c9b0', borderRadius: '2px', padding: '0.2rem 0.6rem', cursor: 'pointer', color: '#8b7355' }}>Dismiss</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {discussionPrompts.map((p, i) => (
                <PromptItem key={i} value={p} index={i} onChange={val => setDiscussionPrompts(prev => prev.map((v, j) => j === i ? val : v))} onRemove={() => setDiscussionPrompts(prev => prev.filter((_, j) => j !== i))} placeholder={i === 0 ? 'e.g. Who bears the most responsibility here — and why?' : i === 1 ? 'e.g. What would a stakeholder theorist say? Do you agree?' : 'Next prompt...'} />
              ))}
              {discussionPrompts.length < 6 && (
                <button onClick={() => setDiscussionPrompts(prev => [...prev, ''])} style={{ background: 'none', border: '1px dashed #d4c9b0', borderRadius: '3px', padding: '0.5rem 1rem', cursor: 'pointer', color: '#8b7355', fontSize: '0.85rem', width: '100%', fontFamily: "'Crimson Pro', Georgia, serif" }}>+ Add prompt</button>
              )}
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Forced-choice poll <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0, color: '#a89878' }}>(optional)</span></label>
              <input style={{ ...inputStyle, marginBottom: '0.5rem' }} placeholder="e.g. Was the CEO's decision ethically defensible?" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} />
              {pollOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#a89878', minWidth: '14px' }}>{String.fromCharCode(65 + i)}.</span>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder={i === 0 ? 'Yes — because...' : i === 1 ? 'No — because...' : 'Option...'} value={opt} onChange={e => setPollOptions(prev => prev.map((v, j) => j === i ? e.target.value : v))} />
                  {pollOptions.length > 2 && <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9b890' }}>✕</button>}
                </div>
              ))}
              {pollOptions.length < 4 && <button onClick={() => setPollOptions(prev => [...prev, ''])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355', fontSize: '0.82rem', fontFamily: "'DM Mono', monospace", padding: 0, marginTop: '0.25rem' }}>+ Add option</button>}
              <p style={hintStyle}>Forces students to commit to a position before speaking.</p>
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Role-play instructions <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0, color: '#a89878' }}>(optional)</span></label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }} placeholder="e.g. Each student is assigned a stakeholder role. Student 1 represents the board..." value={rolePlayInstructions} onChange={e => setRolePlayInstructions(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={labelStyle}>Discussion mode</label>
                <select value={groupMode} onChange={e => setGroupMode(e.target.value)} style={{ ...inputStyle }}>
                  <option value="debate">Open debate</option>
                  <option value="consensus">Reach consensus</option>
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

        {/* ── Step 4: Intervention Intent ── */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Set intervention intent</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '1.5rem', fontStyle: 'italic' }}>Tell the AI how to facilitate — it will write every nudge from scratch based on the live conversation. You set the intent, AI writes the words.</p>

            {/* History banner */}
            {intentLoading && (
              <div style={{ background: '#fdfaf4', border: '1px solid #e8d9b8', borderRadius: '3px', padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.82rem', color: '#8b6914', fontFamily: "'DM Mono', monospace" }}>Loading defaults from past sessions...</p>
              </div>
            )}
            {intentFromHistory && intentHistorySummary && (
              <div style={{ background: '#f0f7f3', border: '1px solid #c8e0d4', borderRadius: '3px', padding: '0.875rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#2d6a4f', flexShrink: 0, marginTop: '1px' }}>✦</span>
                <div>
                  <p style={{ fontSize: '0.82rem', color: '#2d6a4f', fontWeight: '500', marginBottom: '0.25rem' }}>Pre-filled from {intentHistorySummary.based_on_sessions} past session{intentHistorySummary.based_on_sessions > 1 ? 's' : ''} on this topic</p>
                  <p style={{ fontSize: '0.78rem', color: '#5c7a5e', lineHeight: 1.5 }}>
                    Cohort trend: {intentHistorySummary.avg_bloom_trend} · SHALLOW nudge effectiveness: {intentHistorySummary.shallow_nudge_effectiveness}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#5c7a5e', marginTop: '0.25rem', fontStyle: 'italic' }}>Adjust freely — these are suggestions based on what worked before.</p>
                </div>
              </div>
            )}

            {/* Global sliders */}
            <div style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <p style={{ ...labelStyle, marginBottom: '1.25rem' }}>Global nudge behaviour</p>

              <IntentSlider
                label="Tone"
                value={intentConfig.tone}
                onChange={v => updateIntent('tone', v)}
                labels={TONE_LABELS}
                hints={TONE_HINTS}
                leftLabel="Encouraging"
                rightLabel="Demanding"
              />

              <IntentSlider
                label="Sensitivity"
                value={intentConfig.sensitivity}
                onChange={v => updateIntent('sensitivity', v)}
                labels={SENSITIVITY_LABELS}
                hints={SENSITIVITY_HINTS}
                leftLabel="Conservative"
                rightLabel="Aggressive"
              />

              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#2a1f0e', fontWeight: '500' }}>Student cooldown</span>
                  <span style={{ fontSize: '0.78rem', fontFamily: "'DM Mono', monospace", color: '#8b6914' }}>
                    {intentConfig.cooldown_minutes === 0 ? 'No limit' : `${intentConfig.cooldown_minutes} min`}
                  </span>
                </div>
                <input
                  type="range" min="0" max="15" step="1"
                  value={intentConfig.cooldown_minutes}
                  onChange={e => updateIntent('cooldown_minutes', Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#8b6914', marginBottom: '0.35rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: '#a89878' }}>No limit</span>
                  <span style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: '#a89878' }}>15 min</span>
                </div>
                <p style={hintStyle}>Minimum time before the same student can receive another nudge.</p>
              </div>
            </div>

            {/* Intervention types */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Enabled intervention types</p>
              <p style={{ ...hintStyle, marginBottom: '1rem' }}>The AI writes all nudge text dynamically. You are only enabling the conditions it should watch for.</p>
              {[
                { key: 'silence', label: 'Silence', description: 'A participant has not contributed enough — AI invites them in' },
                { key: 'dominating', label: 'Dominating', description: 'One participant is taking over — AI redistributes airtime' },
                { key: 'off_topic', label: 'Off-topic', description: 'Discussion drifts from the session topic or must-cover concepts' },
                { key: 'shallow', label: 'Shallow thinking', description: 'Students are recalling or summarising but not analysing or evaluating' },
                { key: 'time_running_out', label: 'Time running out', description: 'Session nearing end — AI prompts for synthesis or decision' },
              ].map(({ key, label, description }) => {
                const enabled = intentConfig.enabled_types[key] !== false;
                return (
                  <div key={key} className={`intervention-card${enabled ? ' active' : ''}`}>
                    <div className="intervention-card-header">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.95rem', color: '#1a1208', fontWeight: '500' }}>{label}</span>
                          <span className="ai-badge">AI writes text</span>
                        </div>
                        <div style={hintStyle}>{description}</div>
                      </div>
                      <button
                        onClick={() => updateEnabledType(key, !enabled)}
                        style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', background: enabled ? '#2d6a4f' : '#d4c9b0', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                        <span style={{ position: 'absolute', top: '3px', left: enabled ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Must-cover concepts */}
            <div style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <p style={{ ...labelStyle, marginBottom: '0.35rem' }}>Must-cover concepts</p>
              <p style={{ ...hintStyle, marginBottom: '1rem' }}>Concepts the AI will actively steer the conversation toward. Auto-filled from your materials and objectives — edit freely.</p>
              <div style={{ marginBottom: '0.875rem', minHeight: '2rem' }}>
                {(intentConfig.must_cover_concepts || []).map(c => (
                  <span key={c} className="concept-tag">
                    {c}
                    <button onClick={() => removeConcept(c)}>✕</button>
                  </span>
                ))}
                {(intentConfig.must_cover_concepts || []).length === 0 && (
                  <span style={{ fontSize: '0.78rem', color: '#c4b49a', fontStyle: 'italic' }}>No concepts added yet</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  style={{ ...inputStyle, flex: 1, fontSize: '0.9rem' }}
                  placeholder="e.g. sunk-cost bias, present-moment awareness..."
                  value={newConcept}
                  onChange={e => setNewConcept(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addConcept(); } }}
                />
                <button onClick={addConcept} style={{ background: '#1a1208', color: '#f5edd8', border: 'none', borderRadius: '3px', padding: '0 1rem', cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>Add</button>
              </div>
            </div>

            {/* Constraints */}
            <div style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: '4px', padding: '1.5rem' }}>
              <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Hard constraints</p>
              <Toggle
                value={intentConfig.constraints?.always_reference_materials}
                onChange={v => updateConstraint('always_reference_materials', v)}
                label="Always reference course materials"
                hint="AI must ground every off-topic or shallow nudge in a specific concept from your uploaded materials."
              />
              <Toggle
                value={intentConfig.constraints?.never_name_in_group}
                onChange={v => updateConstraint('never_name_in_group', v)}
                label="Never name students in group-broadcast nudges"
                hint="Group-level prompts will not address any student by name — only individual nudges will."
              />
            </div>
          </div>
        )}

        {/* ── Step 5: Evaluation ── */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Set evaluation</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>Configure how contributions are scored and what triggers instructor review.</p>
            <div style={sectionStyle}>
              <label style={labelStyle}>Scoring dimension weights</label>
              <p style={{ ...hintStyle, marginBottom: '1rem' }}>Weights must sum to 100%.</p>
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
              <Toggle value={bloomEnabled} onChange={setBloomEnabled} label="Bloom's Taxonomy scoring" hint="Claude classifies each contribution: Remember → Understand → Apply → Analyse → Evaluate → Create." />
              <Toggle value={individualScoring} onChange={setIndividualScoring} label="Individual scoring" hint="Score each participant individually. Disable for purely group-level evaluation." />
              <Toggle value={autoFeedback} onChange={setAutoFeedback} label="Automatic student feedback" hint="Students receive AI-generated feedback after the session ends." />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Flag for instructor review — score threshold</label>
              <select value={flagThreshold} onChange={e => setFlagThreshold(e.target.value)} style={{ ...inputStyle }}>
                <option value="3">3 or below (flag struggling students)</option>
                <option value="4">4 or below</option>
                <option value="5">5 or below (flag anyone below average)</option>
                <option value="0">Don't flag automatically</option>
              </select>
              <p style={hintStyle}>Participants at or below this threshold will be flagged in the post-session report.</p>
            </div>
          </div>
        )}

        {/* ── Step 6: Launch ── */}
        {step === 6 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.4rem' }}>Review & launch</h2>
            <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>Check everything before publishing. Once live, materials cannot be added.</p>
            <div style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <p style={{ ...labelStyle, marginBottom: '1rem' }}>Session summary</p>
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {[
                  ['Title', title], ['Topic', topic],
                  ['Type', sessionType + (isAsync ? ' · async' : ' · synchronous')],
                  ['Duration', duration + ' minutes'],
                  ['Materials', materials.length + ' uploaded'],
                  ['Your prompts', discussionPrompts.filter(p => p.trim()).length + ' configured'],
                  ['Nudge tone', TONE_LABELS[intentConfig.tone]],
                  ['Sensitivity', SENSITIVITY_LABELS[intentConfig.sensitivity]],
                  ['Must-cover concepts', (intentConfig.must_cover_concepts || []).length + ' defined'],
                  ['Interventions', Object.values(intentConfig.enabled_types || {}).filter(Boolean).length + ' active'],
                  ['Scoring', `Topic ${weights.topic_adherence}% · Depth ${weights.depth}% · Material ${weights.material_application}% · Participation ${weights.participation}%`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                    <span style={{ color: '#8b7355', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', minWidth: '160px', paddingTop: '2px' }}>{k}</span>
                    <span style={{ color: '#2a1f0e' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {warnings.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ ...labelStyle, color: '#8b6914', marginBottom: '0.75rem' }}>Readiness warnings</p>
                {warnings.map((w, i) => <div key={i} className="warning-item"><span style={{ color: '#8b6914', flexShrink: 0 }}>△</span><span style={{ fontSize: '0.88rem', color: '#5c4a1e', lineHeight: 1.5 }}>{w}</span></div>)}
              </div>
            )}
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Before you publish</p>
              <p style={{ fontSize: '0.85rem', color: '#8b7355', marginBottom: '1rem', lineHeight: 1.5 }}>Once the session starts, materials cannot be added. If you've missed something, create a new session.</p>
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

        {/* Navigation */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8e0d0', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
          <button onClick={back} disabled={step === 1} style={{ background: 'none', border: '1px solid #d4c9b0', borderRadius: '3px', padding: '0.6rem 1.25rem', cursor: step === 1 ? 'default' : 'pointer', color: step === 1 ? '#c9b890' : '#5c4a1e', fontSize: '0.95rem', fontFamily: "'Crimson Pro', Georgia, serif", opacity: step === 1 ? 0.4 : 1 }}>← Back</button>
          <div style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>
            {step === 5 && !weightValid && <span style={{ color: '#8b3a2a' }}>Weights must sum to 100%</span>}
          </div>
          {step < 6 ? (
            <button onClick={next} disabled={!canProceed() || (step === 5 && !weightValid)} style={{ background: canProceed() && (step !== 5 || weightValid) ? '#1a1208' : '#d4c9b0', color: canProceed() && (step !== 5 || weightValid) ? '#f5edd8' : '#a89878', border: 'none', borderRadius: '3px', padding: '0.6rem 1.5rem', cursor: canProceed() ? 'pointer' : 'default', fontSize: '0.95rem', fontFamily: "'Crimson Pro', Georgia, serif", transition: 'all 0.2s' }}>Continue →</button>
          ) : (
            <button onClick={publish} disabled={!canProceed() || creating} style={{ background: canProceed() ? '#2d6a4f' : '#d4c9b0', color: canProceed() ? '#fff' : '#a89878', border: 'none', borderRadius: '3px', padding: '0.6rem 1.75rem', cursor: canProceed() ? 'pointer' : 'default', fontSize: '1rem', fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: '500', transition: 'all 0.2s' }}>{creating ? 'Publishing...' : 'Publish Session →'}</button>
          )}
        </div>
      </main>
    </div>
  );
}
