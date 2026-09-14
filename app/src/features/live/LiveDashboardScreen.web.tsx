import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LiveStackParamList } from '../../navigation/types';
import { apiRequest } from '../../api/client';
import { USE_MOCKS } from '../../api/config';
import { endBroadcast, getBroadcast, getStreamStatus } from '../../api/broadcasts';
import { getEngagementFeed } from '../../api/engagement';
import { useLiveSessionStore } from '../../state/liveSessionStore';
import { useStudioLayout } from '../../state/studioLayout';
import { BroadcastPlayer } from './components/BroadcastPlayer';
import { LiveStudioOverlay } from './components/LiveStudioOverlay';
import { LiveCoach } from './components/LiveCoach';
import { colors } from '../../theme';

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
  const detail = useQuery({ queryKey: ['broadcast', id], queryFn: () => getBroadcast(id), initialData: stored?.id === id ? stored : undefined, enabled: !USE_MOCKS });
  const status = useQuery({ queryKey: ['stream-status', id], queryFn: () => getStreamStatus(id), refetchInterval: 5000, enabled: !USE_MOCKS });
  const feed = useQuery({ queryKey: ['live-feed', id], queryFn: () => getEngagementFeed(id), refetchInterval: 1000 });
  const broadcast = detail.data;
  const ended = status.data?.ended || broadcast?.status === 'ended';
  const live = !status.isError && !ended && status.data?.platforms.some(p => p.platform === 'youtube' && p.status === 'live');
  const label = ended ? 'ENDED' : live ? 'LIVE ON YOUTUBE' : status.isError ? 'YOUTUBE STATUS UNAVAILABLE' : sending ? 'SENDING · YOUTUBE STARTING' : 'NOT LIVE · START CAMERA';

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
      const session = await apiRequest<{ sessionId: string }>(`/broadcasts/${id}/video/start`, { method: 'POST' });
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
        chain = chain.then(async () => {
          if (cancelled.current) return;
          const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(event.data); });
          await apiRequest(`/broadcasts/${id}/video/chunk`, { method: 'POST', body: { sessionId: session.sessionId, sequence: sequence++, data } });
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
      {['Your Broadcast', 'YouTube Broadcast'].map((title, index) => <TouchableOpacity key={title} accessibilityRole="tab" accessibilityState={{ selected: monitor === (index === 1) }} onPress={() => setMonitor(index === 1)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9, backgroundColor: monitor === (index === 1) ? colors.surface : 'transparent' }}><Text style={{ fontSize: 12, fontWeight: '700', color: monitor === (index === 1) ? colors.primaryDark : colors.textMuted }}>{title}</Text></TouchableOpacity>)}
    </View>
    <View key="camera-surface" style={{ flex: landscape ? 1 : undefined, height: landscape ? undefined : 230, position: 'relative', backgroundColor: '#140e12', overflow: 'hidden' }}>
      <video ref={video} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', visibility: monitor ? 'hidden' : 'visible' }} />
      {monitor && <View style={{ position: 'absolute', inset: 0 }}><BroadcastPlayer videoId={broadcast.ingest?.youtube?.providerRef?.broadcastId} /></View>}
      {!monitor && sending && landscape && <LiveStudioOverlay property={broadcast.property} elapsed={elapsed} events={feed.data ?? []} label={label} ending={ending} onEnd={() => void end()} hideTopBar />}
      {!monitor && !sending && <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text style={{ color: 'white', fontWeight: '700' }}>{starting ? 'Connecting your camera…' : 'Your camera is off'}</Text>
        {!!error && <Text accessibilityRole="alert" style={{ color: '#fda4af', textAlign: 'center', fontSize: 12 }}>{error}</Text>}
        {button(starting ? 'Connecting…' : error ? 'Retry camera' : 'Start camera', () => void start(), starting || ending || !!ended)}
        <Text style={{ color: '#ddd', fontSize: 11, textAlign: 'center' }}>Camera and microphone will be broadcast to YouTube.</Text>
      </View>}
      {!monitor && sending && !landscape && <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: '#140e12bb', borderRadius: 8, padding: 8 }}><Text style={{ color: 'white', fontSize: 11 }}>{uploaded ? 'Camera connected' : 'Connecting…'}</Text></View>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={landscape ? 'Rotate phone to portrait' : 'Rotate phone to landscape'} onPress={() => setLandscape(!landscape)} style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: '#140e12bb', borderRadius: 10, padding: 10 }}><Text style={{ color: 'white', fontSize: 20 }}>{landscape ? '↙' : '↗'}</Text></TouchableOpacity>

    </View>
    {!!error && (monitor || sending) && <Text accessibilityRole="alert" style={{ color: '#b91c1c', padding: 10 }}>{error}</Text>}
    {!landscape && <ScrollView contentContainerStyle={{ padding: 14 }}>
      <Text style={{ fontWeight: '800' }}>Live chat</Text>
      {feed.isError && <Text>Chat connection failed. Reconnecting…</Text>}
      {!feed.data?.length && <Text>No viewer messages received yet.</Text>}
      {feed.data?.map(e => <View key={e.id} style={{ marginTop: 8 }}><Text style={{ fontWeight: '700' }}>{e.platform} · {e.authorName}</Text><Text>{e.text}</Text></View>)}
      <LiveCoach property={broadcast.property} events={feed.data ?? []} />
    </ScrollView>}
  </View>;
}
