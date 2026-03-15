'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RootPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        // Not logged in — show landing page
        setAuthChecked(true);
        return;
      }
      // Logged in — redirect by role
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('email', session.user.email)
        .single();

      if (!userRow || userRow.role === 'student') {
        router.push('/student');
      } else {
        router.push('/sessions');
      }
    });
  }, []);

  // Still checking auth — blank screen briefly, avoids flash of landing for logged-in users
  if (!authChecked) return null;

  // ── Unauthenticated visitor — show landing page ──────────────────────────
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap" rel="stylesheet" />

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; background: #faf8f4; color: #1a1208; }

        .ll-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 3rem;
          background: #faf8f4;
          border-bottom: 1px solid #e8e0d0;
          position: sticky; top: 0; z-index: 100;
        }
        .ll-logo { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; color: #1a1208; letter-spacing: -0.02em; text-decoration: none; }
        .ll-logo span { color: #8b6914; }
        .ll-nav-links { display: flex; gap: 2rem; align-items: center; }
        .ll-nav-links a { font-size: 0.88rem; color: #5c4a1e; text-decoration: none; font-weight: 400; letter-spacing: 0.01em; transition: color 0.2s; }
        .ll-nav-links a:hover { color: #1a1208; }
        .ll-nav-cta { background: #1a1208 !important; color: #f5edd8 !important; padding: 0.5rem 1.25rem; border-radius: 3px; font-size: 0.85rem; font-weight: 500; transition: background 0.2s; }
        .ll-nav-cta:hover { background: #2d1f0a !important; }

        .ll-hero { background: #0e0b06; padding: 6rem 3rem 5rem; position: relative; overflow: hidden; }
        .ll-hero::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 20% 50%, rgba(139,105,20,0.18) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 20%, rgba(45,106,79,0.12) 0%, transparent 50%);
          pointer-events: none;
        }
        .ll-hero-inner { max-width: 960px; margin: 0 auto; position: relative; z-index: 1; }
        .ll-eyebrow { font-family: 'DM Mono', monospace; font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: #8b6914; margin-bottom: 1.5rem; }
        .ll-hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(2.8rem, 6vw, 5rem); font-weight: 400; line-height: 1.1; color: #f5edd8; letter-spacing: -0.02em; }
        .ll-hero h1 em { font-style: italic; color: #c9b890; }
        .ll-hero-sub { font-size: 1.15rem; color: rgba(245,237,216,0.6); max-width: 520px; line-height: 1.65; font-weight: 300; margin-top: 1.5rem; margin-bottom: 2.5rem; }
        .ll-hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
        .ll-btn-primary { background: #c9b890; color: #0e0b06; padding: 0.875rem 2rem; border-radius: 3px; font-size: 0.95rem; font-weight: 500; text-decoration: none; transition: all 0.2s; display: inline-block; }
        .ll-btn-primary:hover { background: #ddd0b0; }
        .ll-btn-ghost { border: 1px solid rgba(201,184,144,0.35); color: #c9b890; padding: 0.875rem 2rem; border-radius: 3px; font-size: 0.95rem; text-decoration: none; transition: all 0.2s; display: inline-block; }
        .ll-btn-ghost:hover { border-color: rgba(201,184,144,0.7); background: rgba(201,184,144,0.08); }

        .ll-stat-bar { margin-top: 4rem; border-top: 1px solid rgba(201,184,144,0.15); padding-top: 2rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .ll-stat-num { font-family: 'Playfair Display', serif; font-size: 2.4rem; color: #c9b890; line-height: 1; }
        .ll-stat-label { font-size: 0.78rem; color: rgba(245,237,216,0.45); margin-top: 0.35rem; font-weight: 300; line-height: 1.4; }

        .ll-logos { background: #fff; border-bottom: 1px solid #e8e0d0; padding: 1.75rem 3rem; text-align: center; }
        .ll-logos p { font-size: 0.72rem; font-family: 'DM Mono', monospace; letter-spacing: 0.12em; text-transform: uppercase; color: #a89878; margin-bottom: 1.25rem; }
        .ll-logo-list { display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap; align-items: center; }
        .ll-logo-pill { font-size: 0.82rem; font-weight: 500; color: #8b7355; padding: 0.35rem 0.875rem; border: 1px solid #d4c9b0; border-radius: 2px; letter-spacing: 0.04em; }

        .ll-section { padding: 5rem 3rem; max-width: 960px; margin: 0 auto; }
        .ll-section h2 { font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 400; color: #1a1208; line-height: 1.2; letter-spacing: -0.01em; }
        .ll-section h2 em { font-style: italic; }
        .ll-section-intro { font-size: 1.05rem; color: #6b5b3e; max-width: 540px; line-height: 1.7; margin-top: 1rem; font-weight: 300; }

        .ll-steps { margin-top: 3.5rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .ll-step { border-top: 2px solid #8b6914; padding-top: 1.5rem; }
        .ll-step-num { font-family: 'DM Mono', monospace; font-size: 0.65rem; color: #8b6914; letter-spacing: 0.1em; margin-bottom: 0.75rem; }
        .ll-step h3 { font-family: 'Playfair Display', serif; font-size: 1.15rem; font-weight: 400; color: #1a1208; margin-bottom: 0.6rem; line-height: 1.3; }
        .ll-step p { font-size: 0.88rem; color: #6b5b3e; line-height: 1.65; font-weight: 300; }

        .ll-split-outer { border-top: 1px solid #e8e0d0; border-bottom: 1px solid #e8e0d0; background: #fff; }
        .ll-split-outer.alt { background: #faf8f4; }
        .ll-split { max-width: 960px; margin: 0 auto; padding: 5rem 3rem; display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; }
        .ll-split.reverse { direction: rtl; }
        .ll-split.reverse > * { direction: ltr; }
        .ll-split-eyebrow { font-family: 'DM Mono', monospace; font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: #8b6914; margin-bottom: 1rem; }
        .ll-split h2 { font-family: 'Playfair Display', serif; font-size: 1.9rem; font-weight: 400; color: #1a1208; line-height: 1.25; letter-spacing: -0.01em; margin-bottom: 1rem; }
        .ll-split p { font-size: 0.95rem; color: #6b5b3e; line-height: 1.7; font-weight: 300; margin-bottom: 0.75rem; }

        .ll-visual { background: #0e0b06; border-radius: 6px; padding: 1.75rem; min-height: 260px; position: relative; overflow: hidden; }
        .ll-visual::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 40%, rgba(139,105,20,0.2) 0%, transparent 60%); pointer-events: none; }
        .ll-visual-inner { position: relative; z-index: 1; }
        .ll-visual-label { font-family: 'DM Mono', monospace; font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(201,184,144,0.4); margin-bottom: 1rem; }

        .ll-nudge-card { background: rgba(26,18,8,0.95); border: 1px solid rgba(201,184,144,0.35); border-left: 2px solid rgba(201,184,144,0.8); border-radius: 6px; padding: 1rem 1.125rem; margin-bottom: 0.75rem; }
        .ll-nudge-label { font-family: 'DM Mono', monospace; font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: #c9b890; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem; }
        .ll-nudge-dot { width: 5px; height: 5px; border-radius: 50%; background: #c9b890; display: inline-block; flex-shrink: 0; }
        .ll-nudge-text { font-size: 0.88rem; color: #f5edd8; line-height: 1.55; font-family: 'Playfair Display', serif; }
        .ll-nudge-card-group { background: rgba(14,22,36,0.95); border: 1px solid rgba(80,120,180,0.35); border-left: 2px solid rgba(100,148,200,0.8); border-radius: 6px; padding: 1rem 1.125rem; }
        .ll-nudge-label-blue { color: #8ab0d8; }

        .ll-score-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
        .ll-score-name { font-family: 'Playfair Display', serif; font-size: 0.88rem; color: #f5edd8; min-width: 72px; }
        .ll-score-bar-wrap { flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
        .ll-score-bar { height: 100%; border-radius: 3px; }
        .ll-score-val { font-family: 'DM Mono', monospace; font-size: 0.72rem; color: rgba(245,237,216,0.5); min-width: 28px; text-align: right; }
        .ll-bloom-badge { font-family: 'DM Mono', monospace; font-size: 0.55rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 2px; margin-bottom: 0.75rem; display: inline-block; }

        .ll-diff-outer { background: #faf8f4; padding: 5rem 3rem; border-bottom: 1px solid #e8e0d0; }
        .ll-diff-inner { max-width: 960px; margin: 0 auto; }
        .ll-diff-intro { font-size: 0.95rem; color: #6b5b3e; max-width: 520px; line-height: 1.7; margin-top: 1rem; font-weight: 300; }
        .ll-diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 3rem; }
        .ll-diff-col { background: #fff; border: 1px solid #e8e0d0; border-radius: 4px; padding: 2rem; }
        .ll-diff-col.featured { border-color: #8b6914; background: #fdfaf4; }
        .ll-diff-col-label { font-family: 'DM Mono', monospace; font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: #a89878; margin-bottom: 1.25rem; }
        .ll-diff-col.featured .ll-diff-col-label { color: #8b6914; }
        .ll-diff-item { display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.6rem 0; border-bottom: 1px solid #f0e8d8; font-size: 0.88rem; color: #5c4a1e; line-height: 1.5; }
        .ll-diff-item:last-child { border-bottom: none; }
        .ll-diff-check { color: #2d6a4f; font-size: 0.8rem; margin-top: 2px; flex-shrink: 0; }
        .ll-diff-x { color: #c4b49a; font-size: 0.8rem; margin-top: 2px; flex-shrink: 0; }

        .ll-quote-outer { background: #1a1208; padding: 5rem 3rem; }
        .ll-quote-inner { max-width: 700px; margin: 0 auto; text-align: center; }
        .ll-quote-inner blockquote { font-family: 'Playfair Display', serif; font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 400; font-style: italic; color: #f5edd8; line-height: 1.5; margin-bottom: 2rem; }
        .ll-quote-inner cite { font-size: 0.78rem; font-family: 'DM Mono', monospace; color: #8b7355; letter-spacing: 0.1em; text-transform: uppercase; font-style: normal; }

        .ll-usecases-outer { padding: 5rem 3rem; background: #fff; border-top: 1px solid #e8e0d0; }
        .ll-usecases-inner { max-width: 960px; margin: 0 auto; }
        .ll-usecase-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 3rem; }
        .ll-usecase-card { border: 1px solid #e8e0d0; border-radius: 4px; padding: 1.75rem; background: #fdfaf4; transition: all 0.2s; }
        .ll-usecase-card:hover { border-color: #8b6914; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(139,105,20,0.08); }
        .ll-usecase-icon { width: 36px; height: 36px; border-radius: 3px; background: #fdfaf4; border: 1px solid #e8d9b8; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
        .ll-usecase-card h3 { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 400; color: #1a1208; margin-bottom: 0.5rem; }
        .ll-usecase-card p { font-size: 0.84rem; color: #6b5b3e; line-height: 1.6; font-weight: 300; }

        .ll-cta-outer { background: #0e0b06; padding: 6rem 3rem; position: relative; overflow: hidden; }
        .ll-cta-outer::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 60% 50%, rgba(139,105,20,0.15) 0%, transparent 60%); pointer-events: none; }
        .ll-cta-inner { max-width: 640px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
        .ll-cta-inner h2 { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 400; color: #f5edd8; line-height: 1.2; margin-bottom: 1rem; letter-spacing: -0.02em; }
        .ll-cta-inner h2 em { font-style: italic; color: #c9b890; }
        .ll-cta-inner p { font-size: 1rem; color: rgba(245,237,216,0.55); line-height: 1.65; font-weight: 300; margin-bottom: 2.5rem; }
        .ll-cta-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

        .ll-footer { background: #1a1208; border-top: 1px solid rgba(201,184,144,0.1); padding: 2rem 3rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
        .ll-footer-logo { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: #c9b890; }
        .ll-footer-note { font-size: 0.72rem; font-family: 'DM Mono', monospace; color: #5c4a1e; letter-spacing: 0.08em; }

        @media (max-width: 768px) {
          .ll-nav { padding: 1rem 1.5rem; }
          .ll-nav-links { display: none; }
          .ll-hero { padding: 4rem 1.5rem 3rem; }
          .ll-stat-bar { grid-template-columns: 1fr; gap: 1.5rem; }
          .ll-logos { padding: 1.5rem; }
          .ll-section { padding: 3rem 1.5rem; }
          .ll-steps { grid-template-columns: 1fr; }
          .ll-split { grid-template-columns: 1fr; gap: 2rem; padding: 3rem 1.5rem; }
          .ll-split.reverse { direction: ltr; }
          .ll-diff-grid { grid-template-columns: 1fr; }
          .ll-usecase-grid { grid-template-columns: 1fr; }
          .ll-diff-outer, .ll-quote-outer, .ll-usecases-outer, .ll-cta-outer { padding: 3rem 1.5rem; }
          .ll-footer { padding: 1.5rem; flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div>
        {/* NAV */}
        <nav className="ll-nav">
          <a href="/" className="ll-logo">Learn<span>Live</span></a>
          <div className="ll-nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#for-professors">For professors</a>
            <a href="#difference">The difference</a>
            <a href="#use-cases">Use cases</a>
            <a href="/login" className="ll-nav-cta">Sign in</a>
          </div>
        </nav>

        {/* HERO */}
        <section className="ll-hero">
          <div className="ll-hero-inner">
            <p className="ll-eyebrow">Live academic intelligence</p>
            <h1>See how students<br />think — <em>in real time.</em></h1>
            <p className="ll-hero-sub">
              LearnLive runs inside your seminar. AI listens, scores every contribution
              against Bloom's Taxonomy, and guides students deeper — during the discussion,
              not after it.
            </p>
            <div className="ll-hero-actions">
              <a href="mailto:asim@thebrainsyndicate.com" className="ll-btn-primary">Request a demo</a>
              <a href="#how-it-works" className="ll-btn-ghost">See how it works</a>
            </div>
            <div className="ll-stat-bar">
              <div>
                <div className="ll-stat-num">Real-time</div>
                <div className="ll-stat-label">Scoring and nudges during the live session — not after it ends</div>
              </div>
              <div>
                <div className="ll-stat-num">6 levels</div>
                <div className="ll-stat-label">Bloom's Taxonomy classification per student, per utterance</div>
              </div>
              <div>
                <div className="ll-stat-num">Zero lag</div>
                <div className="ll-stat-label">Upload your case materials. LearnLive builds its knowledge base instantly.</div>
              </div>
            </div>
          </div>
        </section>

        {/* LOGO STRIP */}
        <div className="ll-logos">
          <p>Built for case-method institutions</p>
          <div className="ll-logo-list">
            <div className="ll-logo-pill">Ivey Business School</div>
            <div className="ll-logo-pill">MBA Programmes</div>
            <div className="ll-logo-pill">Executive Education</div>
            <div className="ll-logo-pill">Case Method Seminars</div>
            <div className="ll-logo-pill">Management Development</div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div id="how-it-works" style={{ background: '#faf8f4' }}>
          <div className="ll-section">
            <p className="ll-eyebrow">How it works</p>
            <h2>From case upload<br />to <em>complete analytics.</em></h2>
            <p className="ll-section-intro">Three steps. Your content. Your rubric. AI-powered insight into every student's thinking.</p>
            <div className="ll-steps">
              <div className="ll-step">
                <div className="ll-step-num">01 — SET UP</div>
                <h3>Define your session</h3>
                <p>Upload case materials, set learning objectives, configure discussion prompts, and set the Bloom's Taxonomy weights that matter for your course.</p>
              </div>
              <div className="ll-step">
                <div className="ll-step-num">02 — GO LIVE</div>
                <h3>Run your seminar</h3>
                <p>Students join via link. AI transcribes every contribution in real time. Targeted nudges appear privately on each student's screen when needed.</p>
              </div>
              <div className="ll-step">
                <div className="ll-step-num">03 — ANALYSE</div>
                <h3>Review the report</h3>
                <p>Immediately after the session: per-student scores, Bloom levels, participation charts, and facilitator notes — ready for grading or debrief.</p>
              </div>
            </div>
          </div>
        </div>

        {/* SPLIT: NUDGES */}
        <div id="for-professors" className="ll-split-outer">
          <div className="ll-split">
            <div>
              <p className="ll-split-eyebrow">Live intervention engine</p>
              <h2>AI that speaks — only when it needs to.</h2>
              <p>LearnLive monitors every student's contributions against your course materials. When a student drifts off-topic, goes silent, or stays at surface level, the AI sends a private, contextually grounded prompt directly to their screen.</p>
              <p>The professor never has to interrupt. Students receive guidance that feels like a natural part of the conversation — because it is.</p>
            </div>
            <div className="ll-visual">
              <div className="ll-visual-inner">
                <div className="ll-visual-label">Student view — private nudges</div>
                <div className="ll-nudge-card">
                  <div className="ll-nudge-label">
                    <span className="ll-nudge-dot"></span> For you
                  </div>
                  <div className="ll-nudge-text">You mentioned the sunk-cost example — but how does Hafenbrack's meditation finding change the decision? What's the mechanism?</div>
                </div>
                <div className="ll-nudge-card-group">
                  <div className="ll-nudge-label">
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6494c8', display: 'inline-block', flexShrink: 0 }}></span>
                    <span className="ll-nudge-label-blue">Discussion prompt</span>
                  </div>
                  <div className="ll-nudge-text">We're in the final minutes — who can summarise the key point of disagreement, and what evidence would change your position?</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SPLIT: SCORING */}
        <div className="ll-split-outer alt">
          <div className="ll-split reverse">
            <div>
              <p className="ll-split-eyebrow">Real-time scoring</p>
              <h2>Every contribution. Scored. Instantly.</h2>
              <p>Every three utterances, Claude scores each student across four dimensions: topic adherence, analytical depth, material application, and overall quality — all grounded in the actual case materials you uploaded.</p>
              <p>Bloom's Taxonomy classification per batch. The post-session report is ready the moment you end the session.</p>
            </div>
            <div className="ll-visual">
              <div className="ll-visual-inner">
                <div className="ll-visual-label">Live scores — facilitator view</div>
                <div className="ll-score-row">
                  <div className="ll-score-name">Amara K.</div>
                  <div className="ll-score-bar-wrap"><div className="ll-score-bar" style={{ width: '82%', background: '#c9b890' }}></div></div>
                  <div className="ll-score-val">8.2</div>
                </div>
                <div><span className="ll-bloom-badge" style={{ background: 'rgba(45,106,79,0.2)', color: '#5c7a5e' }}>EVALUATE</span></div>
                <div className="ll-score-row">
                  <div className="ll-score-name">James T.</div>
                  <div className="ll-score-bar-wrap"><div className="ll-score-bar" style={{ width: '45%', background: '#8b6914' }}></div></div>
                  <div className="ll-score-val">4.5</div>
                </div>
                <div><span className="ll-bloom-badge" style={{ background: 'rgba(107,124,139,0.2)', color: '#6b7c8b' }}>UNDERSTAND</span></div>
                <div className="ll-score-row">
                  <div className="ll-score-name">Priya M.</div>
                  <div className="ll-score-bar-wrap"><div className="ll-score-bar" style={{ width: '71%', background: '#2d6a4f' }}></div></div>
                  <div className="ll-score-val">7.1</div>
                </div>
                <div><span className="ll-bloom-badge" style={{ background: 'rgba(122,92,139,0.2)', color: '#7a5c8b' }}>ANALYSE</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* DIFFERENTIATOR */}
        <div id="difference" className="ll-diff-outer">
          <div className="ll-diff-inner">
            <p className="ll-eyebrow">The difference</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 400, color: '#1a1208', letterSpacing: '-0.01em' }}>
              Classroom intelligence,<br /><em style={{ fontStyle: 'italic' }}>not homework infrastructure.</em>
            </h2>
            <p className="ll-diff-intro">Other platforms evaluate after the session. LearnLive intervenes during it — inside the live seminar, with the professor present.</p>
            <div className="ll-diff-grid">
              <div className="ll-diff-col">
                <div className="ll-diff-col-label">Other platforms</div>
                <div className="ll-diff-item"><span className="ll-diff-x">—</span>Post-session AI evaluation only</div>
                <div className="ll-diff-item"><span className="ll-diff-x">—</span>Async homework tool, not live seminar</div>
                <div className="ll-diff-item"><span className="ll-diff-x">—</span>Fixed rubrics, no material grounding</div>
                <div className="ll-diff-item"><span className="ll-diff-x">—</span>No real-time intervention or nudging</div>
                <div className="ll-diff-item"><span className="ll-diff-x">—</span>No per-utterance Bloom's classification</div>
              </div>
              <div className="ll-diff-col featured">
                <div className="ll-diff-col-label">LearnLive</div>
                <div className="ll-diff-item"><span className="ll-diff-check">✓</span>Real-time scoring during the live discussion</div>
                <div className="ll-diff-item"><span className="ll-diff-check">✓</span>Runs inside the live classroom, professor present</div>
                <div className="ll-diff-item"><span className="ll-diff-check">✓</span>RAG on your uploaded case materials — every score is grounded</div>
                <div className="ll-diff-item"><span className="ll-diff-check">✓</span>Private AI nudges sent to individual students mid-session</div>
                <div className="ll-diff-item"><span className="ll-diff-check">✓</span>Bloom's Taxonomy per student, per batch, per session</div>
              </div>
            </div>
          </div>
        </div>

        {/* QUOTE */}
        <div className="ll-quote-outer">
          <div className="ll-quote-inner">
            <blockquote>"The seminar room is where thinking happens. LearnLive makes that thinking measurable — without changing what makes it work."</blockquote>
            <cite>Pilot faculty — Ivey Business School, 2026</cite>
          </div>
        </div>

        {/* USE CASES */}
        <div id="use-cases" className="ll-usecases-outer">
          <div className="ll-usecases-inner">
            <p className="ll-eyebrow">Use cases</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 400, color: '#1a1208', letterSpacing: '-0.01em' }}>
              Built for the seminar room.<br /><em style={{ fontStyle: 'italic' }}>Scales to the enterprise.</em>
            </h2>
            <div className="ll-usecase-grid">
              <div className="ll-usecase-card">
                <div className="ll-usecase-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#8b6914" strokeWidth="1.5">
                    <circle cx="9" cy="5" r="2.5" /><path d="M3 15c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                  </svg>
                </div>
                <h3>MBA case discussions</h3>
                <p>Score participation quality in case-method seminars. Every student contribution evaluated against Bloom's Taxonomy and your uploaded case materials.</p>
              </div>
              <div className="ll-usecase-card">
                <div className="ll-usecase-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#8b6914" strokeWidth="1.5">
                    <rect x="2" y="3" width="14" height="12" rx="1.5" /><path d="M6 7h6M6 10h4" />
                  </svg>
                </div>
                <h3>Oral assessments</h3>
                <p>Replace written exams with live oral responses. AI evaluates depth, evidence use, and critical thinking — at scale, consistently, against your rubric.</p>
              </div>
              <div className="ll-usecase-card">
                <div className="ll-usecase-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#8b6914" strokeWidth="1.5">
                    <path d="M9 2l2 5h5l-4 3 1.5 5L9 12l-4.5 3L6 10 2 7h5z" />
                  </svg>
                </div>
                <h3>Executive education</h3>
                <p>Premium corporate learning programmes. Real-time coaching for high-performing cohorts where the quality of thinking is the measure.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="ll-cta-outer">
          <div className="ll-cta-inner">
            <h2>Ready to see <em>inside</em><br />your seminar?</h2>
            <p>LearnLive is currently piloting at Ivey Business School. Request a demo to see real-time scoring and AI facilitation in action.</p>
            <div className="ll-cta-actions">
              <a href="mailto:asim@thebrainsyndicate.com" className="ll-btn-primary">Request a demo</a>
              <a href="/login" className="ll-btn-ghost">Sign in</a>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="ll-footer">
          <div className="ll-footer-logo">LearnLive</div>
          <div className="ll-footer-note">© 2026 The Brain Syndicate · Piloting at Ivey Business School</div>
        </footer>
      </div>
    </>
  );
}
