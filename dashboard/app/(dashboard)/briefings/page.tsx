'use client';

import { useState, useEffect } from 'react';
import type { Briefing, BriefingSectionType } from '@/lib/types';

const SECTION_ICONS: Record<BriefingSectionType, string> = {
  priorities: '◉',
  calendar: '◈',
  emails: '◻',
  projects: '◑',
  recommendations: '◆',
  risks: '▲',
  opportunities: '◇',
};

const SECTION_LABELS: Record<BriefingSectionType, string> = {
  priorities: 'Action Required',
  calendar: 'Intelligence',
  emails: 'Signal',
  projects: 'Project',
  recommendations: 'AI Recommended',
  risks: 'Risk',
  opportunities: 'Opportunity',
};

type BriefingWithId = Briefing & { id: string };

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatGeneratedAt(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.toISOString().split('T')[0]} at ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function ScoreRing({ score }: { score: number }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <svg width={60} height={60} viewBox="0 0 60 60" style={{ flexShrink: 0 }}>
      <circle cx={30} cy={30} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <circle cx={30} cy={30} r={r} fill="none" stroke="#C4A97C" strokeWidth={3}
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="butt" transform="rotate(-90 30 30)" />
      <text x={30} y={30} textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: 'var(--mono)', fontSize: 11, fill: '#C4A97C', letterSpacing: '0.04em' }}>
        {score}
      </text>
    </svg>
  );
}

export default function BriefingsPage() {
  const [briefing, setBriefing] = useState<BriefingWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/briefings?latest=1')
      .then(r => r.json())
      .then(data => { setBriefing(data?.id ? data : null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const generatedAt = briefing?.generatedAt ?? '';

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">
            <span>NYX</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-page-title">Briefings</span>
          </div>
        </div>
        <div className="topbar-right">
          {generatedAt && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--t3)' }}>
              Generated {formatGeneratedAt(generatedAt)}
            </span>
          )}
          <button className="btn btn-ghost btn-sm">Export PDF</button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="skeleton-row-group">
            {[1,2,3].map(i => <div key={i} className="skeleton-row" style={{ height: 120 }} />)}
          </div>
        ) : !briefing ? (
          <div className="empty-state">
            <span className="empty-state-label">No briefing available. The system will generate one automatically.</span>
          </div>
        ) : (
          <div className="briefing-wrapper">
            <div className="briefing-classification">{briefing.classification}</div>

            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.44em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 10 }}>
                Executive Intelligence Briefing
              </div>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 300, color: 'var(--t1)', letterSpacing: '0.04em', lineHeight: 1.1, marginBottom: 8 }}>
                {formatDate(briefing.date)}
              </h1>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', color: 'var(--t4)', textTransform: 'uppercase' }}>
                Produced by {briefing.generatedBy}
              </div>
            </div>

            <div className="briefing-meta">
              <div className="briefing-meta-item">
                <div className="briefing-meta-label">Classification</div>
                <div className="briefing-meta-value" style={{ color: 'var(--gold)' }}>Operator Level</div>
              </div>
              <div className="briefing-meta-item" style={{ textAlign: 'center' }}>
                <div className="briefing-meta-label" style={{ textAlign: 'center' }}>System Score</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <ScoreRing score={briefing.systemScore} />
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--t4)' }}>
                    Efficiency Rating
                  </div>
                </div>
              </div>
              <div className="briefing-meta-item" style={{ textAlign: 'right' }}>
                <div className="briefing-meta-label" style={{ textAlign: 'right' }}>Sections</div>
                <div className="briefing-meta-value">{briefing.sections.length} intelligence modules</div>
              </div>
            </div>

            <div className="briefing-summary">
              <div className="briefing-summary-label">Executive Summary</div>
              <div className="briefing-summary-text">{briefing.executiveSummary}</div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 32, flexWrap: 'wrap', borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
              {briefing.sections.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => { document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth' }); setActiveSection(s.id); }}
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase',
                    padding: '5px 12px',
                    background: activeSection === s.id ? 'var(--gold-bg)' : 'rgba(255,255,255,0.03)',
                    color: activeSection === s.id ? 'var(--gold)' : 'var(--t3)',
                    border: `1px solid ${activeSection === s.id ? 'rgba(196,169,124,0.3)' : 'var(--line)'}`,
                    cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span style={{ opacity: 0.6 }}>{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </button>
              ))}
            </div>

            {briefing.sections.map((section, idx) => (
              <div key={section.id} id={`section-${section.id}`} className="briefing-section">
                <div className="briefing-section-header">
                  <div className="briefing-section-title">
                    <span className="briefing-section-num">{String(idx + 1).padStart(2, '0')}</span>
                    <span style={{ color: 'var(--t4)', fontSize: 14 }}>{SECTION_ICONS[section.type]}</span>
                    {section.title}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--t4)', fontWeight: 300, fontStyle: 'normal' }}>
                      {SECTION_LABELS[section.type]}
                    </span>
                  </div>
                  <div className="briefing-section-summary">{section.summary}</div>
                </div>

                {section.items.map(item => (
                  <div key={item.id} className="briefing-item">
                    <div className={`briefing-item-priority-bar briefing-item-priority-${item.priority ?? 'low'}`} />
                    <div className="briefing-item-content">
                      {item.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span className="briefing-item-time">{item.time}</span>
                        </div>
                      )}
                      <div className="briefing-item-text">{item.content}</div>
                      {item.source && <div className="briefing-item-source">Source: {item.source}</div>}
                      {item.tags && item.tags.length > 0 && (
                        <div className="briefing-item-tags">
                          {item.tags.map(t => <span key={t} className="briefing-tag">{t}</span>)}
                        </div>
                      )}
                    </div>
                    {item.priority && (
                      <div style={{ flexShrink: 0, paddingTop: 3 }}>
                        <span className={`badge badge-${item.priority}`}>{item.priority}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div style={{ textAlign: 'center', paddingTop: 32, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 300, fontStyle: 'italic', color: 'var(--t3)', letterSpacing: '0.04em' }}>
                "What operates in the dark controls what happens in the light."
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--t4)' }}>
                NYX Autonomous AI Operating System — {briefing.date}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
