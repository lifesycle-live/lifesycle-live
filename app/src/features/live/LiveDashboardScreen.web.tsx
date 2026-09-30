import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LiveStackParamList } from '../../navigation/types';
import { ApiError, apiRequest } from '../../api/client';
import { USE_MOCKS } from '../../api/config';
import { endBroadcast, getBroadcast, getStreamStatus } from '../../api/broadcasts';
import { getEngagementFeed } from '../../api/engagement';
import { useLiveSessionStore } from '../../state/liveSessionStore';
import { useStudioLayout } from '../../state/studioLayout';
import { BroadcastPlayer } from './components/BroadcastPlayer';
import { LiveStudioOverlay } from './components/LiveStudioOverlay';
import { LiveCoach } from './components/LiveCoach';
import { MANUAL_PLATFORMS, PLATFORM_CATALOG, PlatformId } from '../../types/models';
import { colors } from '../../theme';

/** What the relay reports per destination — see server/src/services/videoRelay.ts. */
interface RelayHealth {
  sending: boolean;
  destinations: { platform: string; error?: string; detail?: string; backlogBytes: number; reconnects: number; reconnecting: boolean; behindSeconds?: number; connectSeconds?: number }[];
  /** Seconds of camera the browser has handed over, against how long the relay has run. */
  cameraSeconds: number;
  relaySeconds: number;
}

type Props = NativeStackScreenProps<LiveStackParamList, 'LiveDashboard'>;
export function LiveDashboardScreen({ route, navigation }: Props) {
  const id = route.params.broadcastId;
  const stored = useLiveSessionStore(s => s.activeBroadcast);
  const landscape = useStudioLayout(s => s.landscape);
  const setLandscape = useStudioLayout(s => s.setLandscape);
  const focused = useIsFocused();
  const video = useRef<HTMLVideoElement>(null);
  const capture = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const cancelled = useRef(false);
  const busy = useRef(false);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [monitor, setMonitor] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Which destination the camera publishes to. YouTube's ingest is created by
  // the adapter when the broadcast starts; Instagram has no API to create a
  // broadcast, so its RTMP URL and stream key are pasted from Instagram's own
  // Live Producer — see docs/04-technical-feasibility.md.
  // The camera can go to several platforms at once — one encoder per
  // destination, since they disagree on frame size.
  const [chosen, setChosen] = useState<PlatformId[]>([]);
  const [forms, setForms] = useState<Partial<Record<PlatformId, { rtmpUrl: string; streamKey: string; saved: boolean }>>>({});
  const [savingTarget, setSavingTarget] = useState<PlatformId | null>(null);
  const detail = useQuery({ queryKey: ['broadcast', id], queryFn: () => getBroadcast(id), initialData: stored?.id === id ? stored : undefined, enabled: !USE_MOCKS });
  const status = useQuery({ queryKey: ['stream-status', id], queryFn: () => getStreamStatus(id), refetchInterval: 5000, enabled: !USE_MOCKS });
  const feed = useQuery({ queryKey: ['live-feed', id], queryFn: () => getEngagementFeed(id), refetchInterval: 1000 });
  // Each destination is a separate upload from the server, and one of them
  // falling behind shows up on the platform as a paused or buffering stream
  // rather than as an error. Polling the encoders is the only way to tell the
  // agent which one is struggling while they are still on camera.
  const health = useQuery({ queryKey: ['relay-health', id], queryFn: () => apiRequest<RelayHealth>(`/broadcasts/${id}/video/health`, { method: 'POST' }), refetchInterval: 3000, enabled: sending && !USE_MOCKS });
  const broadcast = detail.data;
  const ended = status.data?.ended || broadcast?.status === 'ended';
  // Only YouTube reports back whether it is actually live. For a manual
  // destination the platform's own page is the source of truth — claiming a
  // status we cannot read would be worse than saying what we do know.
  const destinationName = chosen.map((p) => PLATFORM_CATALOG[p].label.replace(' Live', '')).join(' + ').toUpperCase() || 'NO DESTINATION';
  const tracked = chosen.includes('youtube');
  const live = tracked && !status.isError && !ended && status.data?.platforms.some(p => p.platform === 'youtube' && p.status === 'live');
  const label = ended ? 'ENDED'
    : live ? 'LIVE ON YOUTUBE'
    : sending ? `SENDING TO ${destinationName}`
    : tracked && status.isError ? 'YOUTUBE STATUS UNAVAILABLE'
    : 'NOT LIVE · START CAMERA';

  // The camera can go to any platform this broadcast was started with.
  const destinations = (broadcast?.platforms ?? ['youtube']).filter(p => p in PLATFORM_CATALOG) as PlatformId[];
  const formOf = (platform: PlatformId) => forms[platform] ?? { rtmpUrl: PLATFORM_CATALOG[platform].ingestUrl ?? '', streamKey: '', saved: false };
  const setForm = (platform: PlatformId, patch: Partial<{ rtmpUrl: string; streamKey: string; saved: boolean }>) =>
    setForms((current) => ({ ...current, [platform]: { ...formOf(platform), ...patch } }));
  // A manual destination is only usable once its pasted address is saved.
  const ready = chosen.length > 0 && chosen.every((p) => !MANUAL_PLATFORMS.includes(p) || formOf(p).saved);

  function release() {
    cancelled.current = true;
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
    recorder.current = null;
    capture.current?.getTracks().forEach(track => track.stop());
    capture.current = null;
    setSending(false);
    setUploaded(false);
  }
  async function stop() {
    release();
    if (!USE_MOCKS) await apiRequest(`/broadcasts/${id}/video/stop`, { method: 'POST' });
  }
  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { clearInterval(timer); release(); setLandscape(false); if (!USE_MOCKS) void apiRequest(`/broadcasts/${id}/video/stop`, { method: 'POST' }).catch(() => {}); };
  }, [id]);
  useEffect(() => { if (!focused || ended) { setLandscape(false); void stop().catch(() => {}); } }, [focused, ended]);
  // Start with every platform this broadcast was created for selected.
  useEffect(() => { setChosen((current) => (current.length ? current.filter(p => destinations.includes(p)) : destinations)); }, [destinations.join()]);

  async function start() {
    if (busy.current || sending) return;
    busy.current = true; cancelled.current = false; setStarting(true); setError('');
    let sessionId: string | undefined;
    try {
      if (USE_MOCKS) throw new Error('Connect a real server and YouTube account to transmit video.');
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Use Chrome or Edge on HTTPS or localhost for camera streaming.');
      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('This browser cannot encode WebM camera video. Use Chrome or Edge.');
      const media = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }, audio: { echoCancellation: true, noiseSuppression: true } });
      if (cancelled.current) { media.getTracks().forEach(t => t.stop()); return; }
      capture.current = media;
      if (video.current) { video.current.srcObject = media; await video.current.play(); }
      // Clear a relay left behind by a reloaded or crashed tab, so retrying
      // works now instead of after the server's inactivity watchdog.
      await apiRequest(`/broadcasts/${id}/video/stop`, { method: 'POST' }).catch(() => {});
      const session = await apiRequest<{ sessionId: string }>(`/broadcasts/${id}/video/start`, { method: 'POST', body: { platforms: chosen } });
      sessionId = session.sessionId;
      if (cancelled.current) { await apiRequest(`/broadcasts/${id}/video/stop`, { method: 'POST' }); return; }
      const active = new MediaRecorder(media, { mimeType, videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 });
      recorder.current = active;
      let chain = Promise.resolve(); let sequence = 0; let queued = 0;
      const fail = (e: unknown) => { if (cancelled.current) return; setError(e instanceof Error ? e.message : 'Camera transmission failed'); void stop().catch(() => {}); };
      media.getTracks().forEach(track => { track.onended = () => fail(new Error('Camera or microphone disconnected. Restart transmission.')); });
      active.onerror = () => fail(new Error('Browser video encoder failed.'));
      active.ondataavailable = event => {
        if (!event.data.size || cancelled.current) return;
        queued += event.data.size;
        if (queued > 4 * 1024 * 1024) { fail(new Error('Upload is too slow. Transmission stopped to prevent delay.')); return; }
        // Encode now rather than inside the chain: done in turn, the encoder's
        // input sat idle for the length of every read, and the relay has no
        // jitter buffer — a gap on its input reaches the platform as a paused
        // stream. Split on ";base64," and not on the first comma: the media
        // type carries one of its own (video/webm;codecs=vp8,opus), so
        // splitting on "," hands the server "opus;base64" instead of the
        // payload.
        const encoded = new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(';base64,').pop() ?? ''); reader.onerror = reject; reader.readAsDataURL(event.data); });
        encoded.catch(() => { /* surfaced by the chain below */ });
        chain = chain.then(async () => {
          if (cancelled.current) return;
          const data = await encoded;
          const body = { sessionId: session.sessionId, sequence: sequence++, data };
          try {
            await apiRequest(`/broadcasts/${id}/video/chunk`, { method: 'POST', body });
          } catch (e) {
            // A single unreachable request used to end the broadcast. Chunks
            // are sent one at a time and the server ignores a repeat of the
            // chunk it just took, so resending is safe and rides out a blip.
            if (!(e instanceof ApiError) || e.status !== 0 || cancelled.current) throw e;
            await apiRequest(`/broadcasts/${id}/video/chunk`, { method: 'POST', body });
          }
          if (!cancelled.current) setUploaded(true);
          queued -= event.data.size;
        }).catch(fail);
      };
      active.start(500); setSending(true);
    } catch (e) {
      release(); setError(e instanceof Error ? e.message : 'Could not start camera');
      if (sessionId) void apiRequest(`/broadcasts/${id}/video/stop`, { method: 'POST' }).catch(() => {});
    } finally { busy.current = false; setStarting(false); }
  }
  async function saveTarget(platform: PlatformId) {
    const form = formOf(platform);
    setSavingTarget(platform); setError('');
    try {
      await apiRequest(`/broadcasts/${id}/video/target`, { method: 'POST', body: { platform, rtmpUrl: form.rtmpUrl.trim(), streamKey: form.streamKey.trim() } });
      setForm(platform, { saved: true });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save this destination'); }
    finally { setSavingTarget(null); }
  }
  async function end() {
    setEnding(true);
    try { await stop(); await endBroadcast(id); navigation.replace('BroadcastSummary', { broadcastId: id }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not end broadcast'); setEnding(false); }
  }
  const button = (text: string, action: () => void, disabled = false) => <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={action} style={{ backgroundColor: colors.primary, borderRadius: 10, padding: 10, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{text}</Text></TouchableOpacity>;
  if (!broadcast) return <Text>{detail.error instanceof Error ? detail.error.message : 'Loading studio…'}</Text>;
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <View style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: live ? '#15803d' : colors.primaryDark, fontWeight: '800', fontSize: 11 }}>{label}</Text>
        {!landscape && <Text numberOfLines={1} style={{ fontWeight: '700', marginTop: 4 }}>{broadcast.property.address}</Text>}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</Text>
      {button(ending ? 'Ending…' : 'End Live', () => void end(), ending)}
    </View>
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', marginHorizontal: 14, marginBottom: 10, borderRadius: 12, backgroundColor: colors.primarySoft, padding: 3 }}>
      {(tracked ? ['Your Broadcast', 'YouTube Broadcast'] : ['Your Broadcast']).map((title, index) => <TouchableOpacity key={title} accessibilityRole="tab" accessibilityState={{ selected: monitor === (index === 1) }} onPress={() => setMonitor(index === 1)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9, backgroundColor: monitor === (index === 1) ? colors.surface : 'transparent' }}><Text style={{ fontSize: 12, fontWeight: '700', color: monitor === (index === 1) ? colors.primaryDark : colors.textMuted }}>{title}</Text></TouchableOpacity>)}
    </View>
    <View key="camera-surface" style={{ flex: landscape ? 1 : undefined, height: landscape ? undefined : 230, position: 'relative', backgroundColor: '#140e12', overflow: 'hidden' }}>
      <video ref={video} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', visibility: monitor ? 'hidden' : 'visible' }} />
      {monitor && <View style={{ position: 'absolute', inset: 0 }}><BroadcastPlayer videoId={broadcast.ingest?.youtube?.providerRef?.broadcastId} /></View>}
      {!monitor && sending && landscape && <LiveStudioOverlay property={broadcast.property} elapsed={elapsed} events={feed.data ?? []} label={label} ending={ending} onEnd={() => void end()} hideTopBar />}
      {!monitor && !sending && <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text style={{ color: 'white', fontWeight: '700' }}>{starting ? 'Connecting your camera…' : 'Your camera is off'}</Text>
        {!!error && <Text accessibilityRole="alert" style={{ color: '#fda4af', textAlign: 'center', fontSize: 12 }}>{error}</Text>}
        {button(starting ? 'Connecting…' : error ? 'Retry camera' : 'Start camera', () => void start(), starting || ending || !!ended || !ready)}
        <Text style={{ color: '#ddd', fontSize: 11, textAlign: 'center' }}>
          {ready ? `Camera and microphone will be sent to ${chosen.map(p => PLATFORM_CATALOG[p].label.replace(' Live', '')).join(' and ')}.` : 'Choose a destination below and save its key first.'}
        </Text>
      </View>}
      {!monitor && sending && !landscape && <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: '#140e12bb', borderRadius: 8, padding: 8 }}><Text style={{ color: 'white', fontSize: 11 }}>{uploaded ? 'Camera connected' : 'Connecting…'}</Text></View>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={landscape ? 'Rotate phone to portrait' : 'Rotate phone to landscape'} onPress={() => setLandscape(!landscape)} style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: '#140e12bb', borderRadius: 10, padding: 10 }}><Text style={{ color: 'white', fontSize: 20 }}>{landscape ? '↙' : '↗'}</Text></TouchableOpacity>

    </View>
    {!!error && (monitor || sending) && <Text accessibilityRole="alert" style={{ color: '#b91c1c', padding: 10 }}>{error}</Text>}
    {sending && !landscape && !!health.data?.destinations.length && <View style={{ paddingHorizontal: 14, paddingTop: 8, gap: 3 }}>
      {health.data.destinations.map(leg => {
        const name = PLATFORM_CATALOG[leg.platform as PlatformId]?.label.replace(' Live', '') ?? leg.platform;
        // How far what the platform has received trails real time. A few
        // seconds is just connection latency; a number that keeps climbing is
        // the camera feed starving, which is what makes the platform pause.
        const lag = leg.behindSeconds;
        const behind = lag !== undefined && lag > 6;
        // A reconnect keeps the platform's own page on "paused" for a few
        // seconds rather than ending the broadcast, so it is worth saying.
        const dropped = leg.reconnects > 0 ? ` · reconnected ${leg.reconnects}×` : '';
        const trailing = lag === undefined ? '' : ` · ${lag.toFixed(1)}s behind`;
        // How long this destination took to accept the connection. Anything
        // buffered during that wait is published afterwards at real time and
        // never catches up, so it is the size of the permanent delay.
        const connect = leg.connectSeconds === undefined ? '' : ` · connected in ${leg.connectSeconds.toFixed(1)}s`;
        const message = leg.error ? leg.error
          : leg.reconnecting ? `${name} — connection dropped, reconnecting…`
          : behind ? `${name} — ${lag.toFixed(1)}s behind real time${connect}${dropped}`
          : `${name} — sending${trailing}${connect}${dropped}`;
        return <Text key={leg.platform} style={{ fontSize: 11, color: leg.error ? '#b91c1c' : leg.reconnecting || behind ? '#b45309' : colors.textMuted }}>{message}</Text>;
      })}
      {/* Camera time handed over against relay runtime: if these track each
          other the browser is keeping up and any lag is downstream. */}
      <Text style={{ fontSize: 11, color: health.data.cameraSeconds < health.data.relaySeconds - 5 ? '#b45309' : colors.textMuted }}>
        Camera uploaded {health.data.cameraSeconds.toFixed(1)}s of {health.data.relaySeconds.toFixed(1)}s
      </Text>
    </View>}
    {!landscape && <ScrollView contentContainerStyle={{ padding: 14 }}>
      <Text style={{ fontWeight: '800' }}>Where the camera goes</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Pick every platform this broadcast should reach. Each one gets its own encoder.</Text>
      <View style={{ gap: 8, marginTop: 8 }}>
        {destinations.map((platform) => {
          const picked = chosen.includes(platform);
          const manual = MANUAL_PLATFORMS.includes(platform);
          const form = formOf(platform);
          const name = PLATFORM_CATALOG[platform].label.replace(' Live', '');
          return (
            <View key={platform} style={{ borderWidth: 1, borderColor: picked ? colors.primary : colors.border, borderRadius: 12, padding: 10, gap: 8, backgroundColor: picked ? colors.primarySoft : 'transparent' }}>
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: picked, disabled: sending }}
                disabled={sending}
                onPress={() => { setError(''); setChosen(current => picked ? current.filter(p => p !== platform) : [...current, platform]); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: sending ? 0.5 : 1 }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PLATFORM_CATALOG[platform].color }} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: picked ? colors.primaryDark : colors.textMuted }}>{name}</Text>
                <Text style={{ fontSize: 11, color: picked ? colors.primaryDark : colors.textMuted }}>{manual ? (form.saved ? 'key saved ✓' : 'needs key') : 'automatic'}</Text>
                <Text style={{ fontSize: 14, color: picked ? colors.primaryDark : colors.textMuted }}>{picked ? '✓' : '+'}</Text>
              </TouchableOpacity>
              {picked && manual && <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, lineHeight: 16 }}>
                  {platform === 'instagram'
                    ? 'On instagram.com open Create → Live, copy both fields here, and leave that tab open — the key dies when it closes, and a new one is issued for every broadcast.'
                    : 'On facebook.com/live/producer pick where to post, choose Streaming software, copy the stream key here, and leave that tab open.'}
                </Text>
                <TextInput
                  value={form.rtmpUrl}
                  onChangeText={(text) => setForm(platform, { rtmpUrl: text, saved: false })}
                  editable={!sending}
                  placeholder="rtmps://…"
                  accessibilityLabel={`${name} stream URL`}
                  style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 12, backgroundColor: colors.surface }}
                />
                <TextInput
                  value={form.streamKey}
                  onChangeText={(text) => setForm(platform, { streamKey: text, saved: false })}
                  editable={!sending}
                  placeholder="Stream key"
                  accessibilityLabel={`${name} stream key`}
                  style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 12, backgroundColor: colors.surface }}
                />
                {button(
                  savingTarget === platform ? 'Saving…' : form.saved ? 'Key saved ✓' : `Save ${name} key`,
                  () => void saveTarget(platform),
                  savingTarget !== null || sending || !form.rtmpUrl.trim() || !form.streamKey.trim(),
                )}
              </View>}
            </View>
          );
        })}
      </View>
      {!ready && !sending && <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
        {chosen.length ? 'Save the key for every selected platform, then start the camera.' : 'Select at least one destination.'}
      </Text>}
      <Text style={{ fontWeight: '800', marginTop: 18 }}>Live chat</Text>
      {feed.isError && <Text>Chat connection failed. Reconnecting…</Text>}
      {!feed.data?.length && <Text>No viewer messages received yet.</Text>}
      {feed.data?.map(e => <View key={e.id} style={{ marginTop: 8 }}><Text style={{ fontWeight: '700' }}>{e.platform} · {e.authorName}</Text><Text>{e.text}</Text></View>)}
      <LiveCoach property={broadcast.property} events={feed.data ?? []} />
    </ScrollView>}
  </View>;
}
