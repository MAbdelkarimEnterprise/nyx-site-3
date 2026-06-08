'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VoiceState, VoiceConversation, VoiceTurn } from '@/lib/types';
import type { VoiceIntent } from '@/lib/voice/commands';

const AGENT_CODENAMES: Record<string, string> = {
  ceo: 'APEX', research: 'ORACLE', marketing: 'SIGNAL',
  sales: 'CONVERT', developer: 'FORGE', finance: 'LEDGER',
};

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'STANDBY', listening: 'LISTENING', processing: 'PROCESSING',
  speaking: 'SPEAKING', error: 'ERROR',
};

const STATE_COLORS: Record<VoiceState, string> = {
  idle: 'var(--t4)', listening: 'var(--gold)', processing: 'var(--blue)',
  speaking: 'var(--green)', error: 'var(--red)',
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

function WaveformCanvas({ state, analyserRef }: { state: VoiceState; analyserRef: React.RefObject<AnalyserNode | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const gold = '#C4A97C';
    const goldDim = 'rgba(196, 169, 124, 0.25)';

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const cy = H / 2;

      if (state === 'listening' && analyserRef.current) {
        const analyser = analyserRef.current;
        const buf = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(buf);

        ctx.beginPath();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = gold;
        ctx.shadowBlur = 8;
        const sliceW = W / buf.length;
        let x = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = buf[i] / 128.0;
          const y = (v * H) / 2;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          x += sliceW;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (state === 'processing') {
        const bars = 32;
        const bw = W / bars - 2;
        for (let i = 0; i < bars; i++) {
          const t = Date.now() / 400;
          const h = (Math.sin(i * 0.4 + t) * 0.5 + 0.5) * (H * 0.7) + H * 0.05;
          const x = (i * W) / bars + 1;
          ctx.fillStyle = i % 3 === 0 ? gold : goldDim;
          ctx.fillRect(x, cy - h / 2, bw, h);
        }
      } else if (state === 'speaking') {
        const bars = 20;
        const bw = W / bars - 3;
        for (let i = 0; i < bars; i++) {
          const t = Date.now() / 200;
          const amp = 0.3 + Math.sin(t + i) * 0.25 + Math.sin(t * 1.7 + i * 0.5) * 0.2;
          const h = amp * H;
          const x = (i * W) / bars + 1;
          ctx.fillStyle = `rgba(90, 155, 120, ${0.4 + amp * 0.6})`;
          ctx.shadowColor = 'var(--green)';
          ctx.shadowBlur = 4;
          ctx.fillRect(x, cy - h / 2, bw, h);
        }
        ctx.shadowBlur = 0;
      } else {
        // Idle: gentle sine
        phaseRef.current += 0.02;
        ctx.beginPath();
        ctx.strokeStyle = goldDim;
        ctx.lineWidth = 1;
        for (let x = 0; x <= W; x++) {
          const y = cy + Math.sin((x / W) * Math.PI * 4 + phaseRef.current) * (H * 0.08);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(196, 169, 124, 0.06)';
        ctx.lineWidth = 0.5;
        ctx.moveTo(0, cy);
        ctx.lineTo(W, cy);
        ctx.stroke();
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [state, analyserRef]);

  return <canvas ref={canvasRef} className="voice-waveform-canvas" />;
}

export default function VoicePage() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<VoiceConversation[]>([]);
  const [activeTurns, setActiveTurns] = useState<VoiceTurn[]>([]);
  const [intent, setIntent] = useState<VoiceIntent | null>(null);
  const [agentRole, setAgentRole] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPTTHeld, setIsPTTHeld] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { setIsSupported(false); return; }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setInterimTranscript(interim);
      if (final) { setTranscript(final); setInterimTranscript(''); }
    };

    recognition.onend = () => {
      stopMicStream();
      if (transcript || interimTranscript) {
        const t = transcript || interimTranscript;
        if (t.trim()) processCommand(t);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        setVoiceState('error');
        setStatusMsg(`Speech error: ${e.error}`);
      } else {
        setVoiceState('idle');
      }
      stopMicStream();
    };

    recognitionRef.current = recognition;
  }, []); // eslint-disable-line

  useEffect(() => {
    fetch('/api/voice/conversations').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setConversations(d);
    });
  }, []);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  async function startMicStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch {}
  }

  function stopMicStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  async function startListening() {
    if (!recognitionRef.current || voiceState === 'listening') return;
    setTranscript('');
    setInterimTranscript('');
    setResponse('');
    setIntent(null);
    setAgentRole(null);
    setVoiceState('listening');
    setStatusMsg('');
    await startMicStream();
    try { recognitionRef.current.start(); } catch {}
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  async function speakText(text: string) {
    if (!autoSpeak || !text.trim()) return;

    // Try server TTS first
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 800) }),
      });
      if (res.ok && res.status !== 501) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        setIsSpeaking(true);
        setVoiceState('speaking');
        audio.onended = () => { setIsSpeaking(false); setVoiceState('idle'); URL.revokeObjectURL(url); };
        await audio.play();
        return;
      }
    } catch {}

    // Web Speech fallback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text.slice(0, 800));
      utter.rate = 0.95;
      utter.pitch = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Google US English') || v.name.includes('Samantha') || v.lang === 'en-US'
      );
      if (preferred) utter.voice = preferred;

      setVoiceState('speaking');
      setIsSpeaking(true);
      utter.onend = () => { setVoiceState('idle'); setIsSpeaking(false); };
      window.speechSynthesis.speak(utter);
    }
  }

  const processCommand = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setVoiceState('processing');
    setResponse('');
    setStatusMsg('Processing…');

    const newTurn: VoiceTurn = {
      id: crypto.randomUUID(), conversationId: conversationId ?? '', userId: '',
      role: 'user', text, intent: null, agentRole: null,
      tokensUsed: 0, durationMs: null, metadata: {}, createdAt: new Date().toISOString(),
    };
    setActiveTurns(t => [...t, newTurn]);

    try {
      const res = await fetch('/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, conversationId }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      let newConvId = conversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'intent') {
              setIntent(data.intent);
              setAgentRole(data.agentRole ?? null);
              if (data.conversationId) { newConvId = data.conversationId; setConversationId(data.conversationId); }
            }
            if (data.type === 'status') {
              const smap: Record<string, string> = {
                thinking: 'Thinking…', executing: `${data.agentRole ? AGENT_CODENAMES[data.agentRole] ?? data.agentRole.toUpperCase() : 'Agent'} executing…`,
                generating_briefing: 'Generating briefing…',
              };
              setStatusMsg(smap[data.status] ?? data.status);
            }
            if (data.type === 'token') {
              fullResponse += data.text ?? '';
              setResponse(r => r + (data.text ?? ''));
            }
            if (data.type === 'navigate' && data.path) {
              window.location.href = data.path;
            }
            if (data.type === 'complete') {
              setVoiceState('idle');
              setStatusMsg('');
              const nyxTurn: VoiceTurn = {
                id: crypto.randomUUID(), conversationId: newConvId ?? '',
                userId: '', role: 'nyx', text: fullResponse,
                intent: intent, agentRole, tokensUsed: data.tokensUsed ?? 0,
                durationMs: data.durationMs ?? null, metadata: {},
                createdAt: new Date().toISOString(),
              };
              setActiveTurns(t => [...t, nyxTurn]);
              await speakText(fullResponse);
              fetch('/api/voice/conversations').then(r => r.json()).then(d => { if (Array.isArray(d)) setConversations(d); });
            }
            if (data.type === 'error') {
              setVoiceState('error');
              setStatusMsg(data.message ?? 'Error occurred');
            }
          } catch {}
        }
      }
    } catch (e) {
      setVoiceState('error');
      setStatusMsg((e as Error).message);
    }
  }, [conversationId, intent, agentRole, autoSpeak]); // eslint-disable-line

  // PTT keyboard handler
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (!isPTTHeld) { setIsPTTHeld(true); startListening(); }
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') { setIsPTTHeld(false); stopListening(); }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [isPTTHeld, voiceState]); // eslint-disable-line

  async function loadConversation(id: string) {
    const res = await fetch(`/api/voice/conversations/${id}`);
    const data = await res.json();
    if (data.turns) {
      setActiveTurns(data.turns);
      setConversationId(id);
      setResponse('');
    }
  }

  async function generateBriefing() {
    setVoiceState('processing');
    setStatusMsg('Generating briefing…');
    setResponse('');
    const res = await fetch('/api/voice/briefing');
    const data = await res.json();
    if (data.briefing) {
      setResponse(data.briefing);
      setVoiceState('idle');
      setStatusMsg('');
      const nyxTurn: VoiceTurn = {
        id: crypto.randomUUID(), conversationId: conversationId ?? 'briefing',
        userId: '', role: 'nyx', text: data.briefing,
        intent: 'briefing', agentRole: 'ceo', tokensUsed: 0,
        durationMs: null, metadata: {}, createdAt: new Date().toISOString(),
      };
      setActiveTurns(t => [...t, nyxTurn]);
      await speakText(data.briefing);
    } else {
      setVoiceState('error');
      setStatusMsg(data.error ?? 'Failed to generate briefing');
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">
            <span>NYX</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-page-title">Voice</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-status">
            <span className="sdot" style={{ background: STATE_COLORS[voiceState] }} />
            <span className="topbar-status-text">{STATE_LABELS[voiceState]}</span>
          </div>
          <a href="/jarvis" className="btn btn-ghost btn-sm" style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            ◈ JARVIS MODE
          </a>
        </div>
      </div>

      <div className="page-content">
        <div className="voice-layout">
          {/* ── LEFT: COMMAND CENTER ── */}
          <div className="voice-main">
            <div className="voice-header">
              <div>
                <h1 className="page-title" style={{ marginBottom: 4 }}>Voice Command Center</h1>
                <p className="page-subtitle">Speak naturally. Hold <kbd className="voice-kbd">Space</kbd> or click the microphone to activate.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAutoSpeak(s => !s)}
                  style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.14em', color: autoSpeak ? 'var(--green)' : 'var(--t4)' }}
                >
                  {autoSpeak ? '◉ VOICE ON' : '○ VOICE OFF'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={generateBriefing}>
                  Morning Briefing
                </button>
              </div>
            </div>

            {!isSupported && (
              <div className="voice-unsupported">
                <span style={{ color: 'var(--amber)' }}>⚠</span>
                Web Speech API not available in this browser. Use Chrome or Edge for voice input.
              </div>
            )}

            {/* Waveform */}
            <div className={`voice-visualizer voice-visualizer-${voiceState}`}>
              <WaveformCanvas state={voiceState} analyserRef={analyserRef} />
              <div className="voice-state-overlay">
                <div className="voice-state-badge" style={{ color: STATE_COLORS[voiceState], borderColor: STATE_COLORS[voiceState] + '44' }}>
                  <span className="voice-state-dot" style={{ background: STATE_COLORS[voiceState] }} />
                  {STATE_LABELS[voiceState]}
                </div>
                {statusMsg && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '0.14em' }}>
                    {statusMsg}
                  </div>
                )}
                {intent && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--gold)', opacity: 0.7, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    {agentRole ? `${AGENT_CODENAMES[agentRole] ?? agentRole.toUpperCase()} · ` : ''}{intent.replace('_', ' ')}
                  </div>
                )}
              </div>
            </div>

            {/* Transcript */}
            {(transcript || interimTranscript) && (
              <div className="voice-transcript-box">
                <div className="voice-transcript-label">
                  <span className="sdot sdot-active" />
                  Transcript
                </div>
                <div className="voice-transcript-text">
                  {transcript || <span style={{ opacity: 0.5 }}>{interimTranscript}</span>}
                </div>
              </div>
            )}

            {/* Response */}
            {response && (
              <div className="voice-response-box" ref={responseRef}>
                <div className="voice-response-label">
                  <span style={{ color: 'var(--gold)', fontSize: 9 }}>◈</span>
                  NYX
                  {agentRole && (
                    <span style={{ marginLeft: 8, fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--gold)', opacity: 0.6, letterSpacing: '0.18em' }}>
                      via {AGENT_CODENAMES[agentRole] ?? agentRole.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="voice-response-text">
                  {response}
                  {voiceState === 'processing' && <span className="agent-cursor">▋</span>}
                </div>
              </div>
            )}

            {/* PTT Button */}
            <div className="voice-ptt-area">
              <button
                className={`voice-ptt-btn ${voiceState === 'listening' ? 'voice-ptt-active' : ''} ${!isSupported ? 'voice-ptt-disabled' : ''}`}
                onMouseDown={startListening}
                onMouseUp={stopListening}
                onTouchStart={startListening}
                onTouchEnd={stopListening}
                disabled={!isSupported || voiceState === 'processing'}
              >
                <svg viewBox="0 0 24 24" fill="none" className="voice-ptt-icon">
                  <rect x="8" y="2" width="8" height="13" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M4 11C4 16.523 7.582 21 12 21C16.418 21 20 16.523 20 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="12" y1="21" x2="12" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {voiceState === 'listening' ? 'Release to send' : voiceState === 'processing' ? 'Processing…' : 'Hold to speak'}
              </button>
              <div className="voice-ptt-hint">or hold <kbd className="voice-kbd">Space</kbd></div>
            </div>

            {/* Quick commands */}
            <div className="voice-quick-commands">
              <div className="voice-quick-label">Quick Commands</div>
              <div className="voice-quick-grid">
                {[
                  { label: 'Show my goals', cmd: 'Show today\'s priorities' },
                  { label: 'Research competitors', cmd: 'Research Agent, analyze the top AI automation competitors' },
                  { label: 'Content ideas', cmd: 'Marketing Agent, generate 10 content ideas for this week' },
                  { label: 'Strategic summary', cmd: 'CEO Agent, give me a strategic summary of where we stand' },
                  { label: 'System status', cmd: 'What\'s the status of NYX?' },
                  { label: 'Morning briefing', cmd: 'Generate my executive briefing' },
                ].map(({ label, cmd }) => (
                  <button
                    key={label}
                    className="voice-quick-btn"
                    onClick={() => { setTranscript(cmd); processCommand(cmd); }}
                    disabled={voiceState === 'processing' || voiceState === 'listening'}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: HISTORY ── */}
          <div className="voice-sidebar">
            {/* Active conversation */}
            {activeTurns.length > 0 && (
              <div className="voice-history-section">
                <div className="voice-history-label">Current Session</div>
                <div className="voice-turns" ref={turnsRef}>
                  {activeTurns.map(turn => (
                    <div key={turn.id} className={`voice-turn voice-turn-${turn.role}`}>
                      <div className="voice-turn-role">
                        {turn.role === 'user' ? '— YOU' : `◈ NYX${turn.agentRole ? ` · ${AGENT_CODENAMES[turn.agentRole] ?? turn.agentRole.toUpperCase()}` : ''}`}
                      </div>
                      <div className="voice-turn-text">{turn.text}</div>
                      {turn.tokensUsed > 0 && (
                        <div className="voice-turn-meta">{turn.tokensUsed.toLocaleString()} tokens</div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 8 }}
                  onClick={() => { setActiveTurns([]); setConversationId(null); setTranscript(''); setResponse(''); }}
                >
                  New Session
                </button>
              </div>
            )}

            {/* Past conversations */}
            <div className="voice-history-section">
              <div className="voice-history-label">Past Sessions</div>
              {conversations.length === 0 ? (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', padding: '12px 0', textAlign: 'center' }}>
                  No conversations yet
                </div>
              ) : (
                <div className="voice-conv-list">
                  {conversations.slice(0, 15).map(conv => (
                    <div
                      key={conv.id}
                      className={`voice-conv-item ${conv.id === conversationId ? 'voice-conv-active' : ''}`}
                      onClick={() => loadConversation(conv.id)}
                    >
                      <div className="voice-conv-title">{conv.title ?? 'Voice Session'}</div>
                      <div className="voice-conv-meta">
                        {conv.turnCount} turn{conv.turnCount !== 1 ? 's' : ''} · {new Date(conv.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agent network status */}
            <div className="voice-history-section">
              <div className="voice-history-label">Agent Network</div>
              <div className="voice-agent-status">
                {[
                  { codename: 'APEX', role: 'ceo', desc: 'Strategic Command' },
                  { codename: 'ORACLE', role: 'research', desc: 'Intelligence' },
                  { codename: 'SIGNAL', role: 'marketing', desc: 'Growth' },
                  { codename: 'CONVERT', role: 'sales', desc: 'Revenue' },
                  { codename: 'FORGE', role: 'developer', desc: 'Engineering' },
                  { codename: 'LEDGER', role: 'finance', desc: 'Finance' },
                ].map(a => (
                  <div key={a.codename} className={`voice-agent-row ${agentRole === a.role && voiceState === 'processing' ? 'voice-agent-active' : ''}`}>
                    <span className="sdot sdot-active" style={{ opacity: agentRole === a.role && voiceState === 'processing' ? 1 : 0.3 }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.14em', color: agentRole === a.role && voiceState === 'processing' ? 'var(--gold)' : 'var(--t2)' }}>
                      {a.codename}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--t4)', marginLeft: 'auto' }}>{a.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
