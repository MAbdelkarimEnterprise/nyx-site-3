import { NextResponse } from 'next/server';
import type { VoiceDevice, DeviceType, InputMethod } from '@/lib/types';

function detectDevice(userAgent: string): VoiceDevice {
  const ua = userAgent.toLowerCase();

  let deviceType: DeviceType = 'desktop';
  if (/iphone|android.*mobile|mobile/.test(ua)) deviceType = 'mobile';
  else if (/ipad|android(?!.*mobile)|tablet/.test(ua)) deviceType = 'tablet';

  let platform: VoiceDevice['platform'] = 'web';
  if (/iphone|ipad/.test(ua)) platform = 'ios';
  else if (/android/.test(ua)) platform = 'android';
  else if (/macintosh|mac os x/.test(ua)) platform = 'macos';
  else if (/windows/.test(ua)) platform = 'windows';

  const inputMethod: InputMethod = 'microphone';

  return { deviceType, platform, inputMethod, userAgent };
}

// GET /api/voice/device — detect device capabilities from User-Agent
export async function GET(req: Request) {
  const ua = req.headers.get('user-agent') ?? '';
  const device = detectDevice(ua);

  const capabilities = {
    webSpeechApi: device.platform === 'macos' || device.platform === 'windows' || device.platform === 'web',
    mediaDevices: true,
    audioContext: true,
    bluetooth: device.platform === 'macos' || device.platform === 'windows',
    pushToTalk: true,
    wakeWord: false,
  };

  return NextResponse.json({ device, capabilities });
}

// POST /api/voice/device — register device for session
export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') ?? '';
  const body = await req.json().catch(() => ({})) as Partial<VoiceDevice>;

  const detected = detectDevice(ua);
  const device: VoiceDevice = {
    ...detected,
    deviceType: body.deviceType ?? detected.deviceType,
    inputMethod: body.inputMethod ?? detected.inputMethod,
  };

  return NextResponse.json({ device, registered: true, timestamp: new Date().toISOString() });
}
