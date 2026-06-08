'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VoiceState } from '@/lib/types';
import type { VoiceIntent } from '@/lib/voice/commands';

const AGENTS = [
  { codename: 'APEX',    role: 'ceo',       desc: 'STRATEGIC COMMAND',  angle: 270 },
  { codename: 'ORACLE',  role: 'research',  desc: 'INTELLIGENCE',        angle: 330 },
  { codename: 'SIGNAL',  role: 'marketing', desc: 'GROWTH OPS',          angle: 30  },
  { codename: 'CONVERT', role: 'sales',     desc: 'REVENUE',             angle: 90  },
  { codename: 'FORGE',   role: 'developer', desc: 'ENGINEERING',         angle: 150 },
  { codename: 'LEDGER',  role: 'finance',   desc: 'FINANCIAL OPS',       angle: 210 },
];

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'STANDBY — AWAITING COMMAND', listening: '● LISTENING — SPEAK NOW',
  processing: '◌ PROCESSING — STAND BY', speaking: '◈ TRANSMITTING RESPONSE',
  error: '✗ SIGNAL LOST',
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

function OrbCanvas({ state, analyserRef }: { state: VoiceState; analyserRef: React.RefObject<AnalyserNode | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const DPR = window.devicePixelRatio || 1;
    const S = 320;
    canvas.width = S * DPR;
    canvas.height = S * DPR;
    canvas.style.width = `${S}px`;
    canvas.style.height = `${S}px`;
    ctx.scale(DPR, DPR);
    const cx = S / 2, cy = S / 2;

    function draw() {
      ctx.clearRect(0, 0, S, S);
      phaseRef.current += state === 'processing' ? 0.05 : state === 'listening' ? 0.03 : 0.01;
      const phase = phaseRef.current;

      // Outer glow ring
      const outerR = state === 'listening' ? 130 + Math.sin(phase * 3) * 8 : 128;
      const grad = ctx.createRadialGradient(cx, cy, outerR - 20, cx, cy, outerR + 2);
      grad.addColorStop(0, state === 'listening' ? 'rgba(196,169,124,0.15)' : state === 'processing' ? 'rgba(92,124,180,0.1)' : state === 'speaking' ? 'rgba(90,155,120,0.1)' : 'rgba(196,169,124,0.04)');
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = state === 'listening' ? 'rgba(196,169,124,0.6)' : state === 'processing' ? 'rgba(92,124,180,0.5)' : state === 'speaking' ? 'rgba(90,155,120,0.5)' : 'rgba(196,169,124,0.15)';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // Rotating dashed ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(phase * (state === 'processing' ? 1.5 : 0.3));
      ctx.setLineDash([8, 14]);
      ctx.beginPath();
      ctx.arc(0, 0, 104, 0, Math.PI * 2);
      ctx.strokeStyle = state === 'processing' ? 'rgba(92,124,180,0.4)' : 'rgba(196,169,124,0.2)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Counter-rotating ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-phase * 0.7);
      ctx.setLineDash([4, 20]);
      ctx.beginPath();
      ctx.arc(0, 0, 86, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(196,169,124,0.12)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Waveform or pulse in middle ring
      if (state === 'listening' && analyserRef.current) {
        const buf = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(buf);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        for (let i = 0; i < buf.length; i++) {
          const angle = (i / buf.length) * Math.PI * 2;
          const r = 60 + ((buf[i] / 128) - 1) * 24;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(196,169,124,0.7)';
        ctx.lineWidth = 1;
        ctx.shadowColor = '#C4A97C';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        // Pulsing inner ring
        const innerAmp = state === 'processing' ? 12 : state === 'speaking' ? 8 : 4;
        const innerR = 60 + Math.sin(phase * 2) * innerAmp;
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.strokeStyle = state === 'speaking' ? 'rgba(90,155,120,0.4)' : 'rgba(196,169,124,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Core dot
      const coreR = state === 'listening' ? 16 + Math.sin(phase * 4) * 4 : state === 'processing' ? 14 : 12;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, state === 'processing' ? 'rgba(92,124,180,0.9)' : state === 'speaking' ? 'rgba(90,155,120,0.9)' : 'rgba(196,169,124,0.8)');
      coreGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Tick marks on outer ring
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const len = i % 6 === 0 ? 8 : i % 3 === 0 ? 5 : 2;
        const r1 = outerR + 4;
        const r2 = r1 + len;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.strokeStyle = i % 6 === 0 ? 'rgba(196,169,124,0.5)' : 'rgba(196,169,124,0.15)';
        ctx.lineWidth = i % 6 === 0 ? 1 : 0.5;
        ctx.stroke();
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [state, analyserRef]);

  return <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />;
}

export default function JarvisPage() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [intent, setIntent] = useState<VoiceIntent | null>(null);
  const [time, setTime] = useState('');
  const [isPTTHeld, setIsPTTHeld] = useState(false);
  const [turns, setTurns] = useState<{ role: 'user' | 'nyx'; text: string; agent?: string }[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [statusLine, setStatusLine] = useState('');

  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setTime(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e: any) => {
      let interim = '', final = '';
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
      const t = transcript || interimTranscript;
      if (t.trim()) processCommand(t);
    };
    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') { setVoiceState('error'); setStatusLine(`Error: ${e.error}`); }
      else setVoiceState('idle');
      stopMicStream();
    };
    recognitionRef.current = recognition;
  }, []); // eslint-disable-line

  async function startMicStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
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
    if (voiceState === 'listening' || !recognitionRef.current) return;
    setTranscript(''); setInterimTranscript(''); setResponse('');
    setActiveAgent(null); setIntent(null); setStatusLine('');
    setVoiceState('listening');
    await startMicStream();
    try { recognitionRef.current.start(); } catch {}
  }

  function stopListening() { recognitionRef.current?.stop(); }

  async function speakText(text: string) {
    if (!autoSpeak || !text.trim()) return;
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 800) }),
      });
      if (res.ok && res.status !== 501) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        setVoiceState('speaking');
        audio.onended = () => { setVoiceState('idle'); URL.revokeObjectURL(url); };
        await audio.play(); return;
      }
    } catch {}
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text.slice(0, 800));
      utter.rate = 0.92; utter.pitch = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find(v => v.name.includes('Google US English') || v.lang === 'en-US');
      if (v) utter.voice = v;
      setVoiceState('speaking');
      utter.onend = () => setVoiceState('idle');
      window.speechSynthesis.speak(utter);
    }
  }

  const processCommand = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setVoiceState('processing');
    setTurns(t => [...t, { role: 'user', text }]);
    setResponse('');

    try {
      const res = await fetch('/api/voice/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, conversationId }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

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
            if (data.type === 'intent') { setIntent(data.intent); setActiveAgent(data.agentRole ?? null); if (data.conversationId) setConversationId(data.conversationId); }
            if (data.type === 'status') setStatusLine(data.status?.replace('_', ' ').toUpperCase() ?? '');
            if (data.type === 'token') { fullResponse += data.text ?? ''; setResponse(r => r + (data.text ?? '')); }
            if (data.type === 'navigate' && data.path) window.location.href = data.path;
            if (data.type === 'complete') {
              setVoiceState('idle'); setStatusLine('');
              setTurns(t => [...t, { role: 'nyx', text: fullResponse, agent: data.agentRole }]);
              await speakText(fullResponse);
            }
            if (data.type === 'error') { setVoiceState('error'); setStatusLine(data.message ?? 'ERROR'); }
          } catch {}
        }
      }
    } catch (e) { setVoiceState('error'); setStatusLine((e as Error).message); }
  }, [conversationId, autoSpeak]); // eslint-disable-line

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault(); if (!isPTTHeld) { setIsPTTHeld(true); startListening(); }
      }
      if (e.code === 'Escape') window.location.href = '/voice';
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') { setIsPTTHeld(false); stopListening(); }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [isPTTHeld, voiceState]); // eslint-disable-line

  const currentAgent = activeAgent ? AGENTS.find(a => a.role === activeAgent) : null;

  return (
    <div className="jarvis-root">
      {/* Scan line overlay */}
      <div className="jarvis-scanlines" />
      {/* Grid */}
      <div className="jarvis-grid-bg" />

      {/* ── TOP HUD ── */}
      <div className="jarvis-topbar">
        <div className="jarvis-hud-block">
          <span className="jarvis-hud-label">SYSTEM</span>
          <span className="jarvis-hud-value">NYX OS 1.0</span>
        </div>
        <div className="jarvis-hud-block jarvis-hud-center">
          <span className="jarvis-hud-label">OPERATOR CONTROL INTERFACE</span>
          <span className="jarvis-hud-value" style={{ color: 'var(--gold)', letterSpacing: '0.28em', fontSize: 11 }}>
            {STATE_LABELS[voiceState]}
          </span>
        </div>
        <div className="jarvis-hud-block" style={{ textAlign: 'right' }}>
          <span className="jarvis-hud-label">UTC</span>
          <span className="jarvis-hud-value">{time}</span>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="jarvis-main">
        {/* Left agent column */}
        <div className="jarvis-agents-left">
          {AGENTS.filter((_, i) => i % 2 === 0).map(agent => (
            <div key={agent.codename} className={`jarvis-agent-pod ${activeAgent === agent.role ? 'jarvis-agent-active' : ''}`}>
              <div className="jarvis-agent-codename">{agent.codename}</div>
              <div className="jarvis-agent-desc">{agent.desc}</div>
              <div className="jarvis-agent-status-row">
                <span className={`jarvis-agent-dot ${activeAgent === agent.role && voiceState === 'processing' ? 'jarvis-dot-busy' : 'jarvis-dot-ready'}`} />
                <span className="jarvis-agent-status-text">
                  {activeAgent === agent.role && voiceState === 'processing' ? 'EXECUTING' : 'STANDBY'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Center orb */}
        <div className="jarvis-center">
          <div className="jarvis-orb-container">
            <OrbCanvas state={voiceState} analyserRef={analyserRef} />
            <div className="jarvis-orb-label">
              <div className="jarvis-orb-title">NYX</div>
              <div className="jarvis-orb-sub">{currentAgent?.codename ?? 'AUTONOMOUS OS'}</div>
            </div>
          </div>

          {/* Response */}
          <div className="jarvis-response-area">
            {response ? (
              <div className="jarvis-response-text">
                {response.slice(-400)}
                {voiceState === 'processing' && <span className="agent-cursor">▋</span>}
              </div>
            ) : (
              <div className="jarvis-response-placeholder">
                {voiceState === 'idle' ? 'AWAITING COMMAND — HOLD SPACE OR CLICK MIC' : statusLine || ''}
              </div>
            )}
          </div>

          {/* Transcript */}
          {(transcript || interimTranscript) && (
            <div className="jarvis-transcript">
              <span className="jarvis-transcript-arrow">›</span>
              {transcript || <span style={{ opacity: 0.5 }}>{interimTranscript}</span>}
            </div>
          )}
        </div>

        {/* Right agent column */}
        <div className="jarvis-agents-right">
          {AGENTS.filter((_, i) => i % 2 === 1).map(agent => (
            <div key={agent.codename} className={`jarvis-agent-pod ${activeAgent === agent.role ? 'jarvis-agent-active' : ''}`}>
              <div className="jarvis-agent-codename">{agent.codename}</div>
              <div className="jarvis-agent-desc">{agent.desc}</div>
              <div className="jarvis-agent-status-row">
                <span className={`jarvis-agent-dot ${activeAgent === agent.role && voiceState === 'processing' ? 'jarvis-dot-busy' : 'jarvis-dot-ready'}`} />
                <span className="jarvis-agent-status-text">
                  {activeAgent === agent.role && voiceState === 'processing' ? 'EXECUTING' : 'STANDBY'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM VOICE BAR ── */}
      <div className="jarvis-bottombar">
        <div className="jarvis-bottom-left">
          <a href="/voice" className="jarvis-exit-btn">← DASHBOARD</a>
          <button
            className={`jarvis-mute-btn ${autoSpeak ? 'jarvis-mute-on' : 'jarvis-mute-off'}`}
            onClick={() => setAutoSpeak(s => !s)}
          >
            {autoSpeak ? '◉ VOICE' : '○ MUTE'}
          </button>
        </div>

        <div className="jarvis-ptt-center">
          <button
            className={`jarvis-ptt-btn ${voiceState === 'listening' ? 'jarvis-ptt-listening' : ''}`}
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            disabled={voiceState === 'processing'}
          >
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <rect x="8" y="2" width="8" height="13" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 11C4 16.523 7.582 21 12 21C16.418 21 20 16.523 20 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="12" y1="21" x2="12" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="jarvis-ptt-label">
            {voiceState === 'listening' ? 'RELEASE TO SEND' : voiceState === 'processing' ? 'PROCESSING' : 'HOLD SPACE / CLICK MIC'}
          </div>
        </div>

        <div className="jarvis-bottom-right">
          <div className="jarvis-metric">
            <span className="jarvis-metric-label">SESSIONS</span>
            <span className="jarvis-metric-value">{turns.filter(t => t.role === 'user').length}</span>
          </div>
          <div className="jarvis-metric">
            <span className="jarvis-metric-label">EFFICIENCY</span>
            <span className="jarvis-metric-value">91%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
