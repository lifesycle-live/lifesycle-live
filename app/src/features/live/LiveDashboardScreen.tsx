import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useQuery } from "@tanstack/react-query";
import { useIsFocused } from "@react-navigation/native";
import { endBroadcast, getBroadcast, getStreamStatus } from "../../api/broadcasts";
import { convertEngagementToLead, convertEngagementToTask, getEngagementFeed } from "../../api/engagement";
import { USE_MOCKS } from "../../api/config";
import { useLiveSessionStore } from "../../state/liveSessionStore";
import { EngagementFeed } from "./components/EngagementFeed";
import { LiveCoach } from "./components/LiveCoach";
import { BroadcastPlayer } from "./components/BroadcastPlayer";
import { LiveStudioOverlay } from "./components/LiveStudioOverlay";
import { colors } from "../../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LiveStackParamList } from "../../navigation/types";
import { EngagementEvent, PlatformId, PLATFORM_CATALOG } from "../../types/models";

type Props = NativeStackScreenProps<LiveStackParamList, "LiveDashboard">;
export function LiveDashboardScreen({ route, navigation }: Props) {
  const { broadcastId } = route.params;
  const stored = useLiveSessionStore(s => s.activeBroadcast);
  const [permission, requestPermission] = useCameraPermissions();
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const [encoder, setEncoder] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [camera, setCamera] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<CameraType>(Platform.OS === 'web' ? 'front' : 'back');
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [studioExpanded, setStudioExpanded] = useState(false);
  const isFocused = useIsFocused();
  const [filter, setFilter] = useState<PlatformId | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const detail = useQuery({ queryKey:['broadcast',broadcastId], queryFn:() => getBroadcast(broadcastId), initialData:stored?.id === broadcastId ? stored : undefined, enabled: !USE_MOCKS, staleTime:30000 });
  const broadcast = detail.data;
  const feed = useQuery({ queryKey:['live-feed',broadcastId],queryFn:() => getEngagementFeed(broadcastId),refetchInterval:1000 });
  const stream = useQuery({queryKey:['stream-status',broadcastId],queryFn:() => getStreamStatus(broadcastId),refetchInterval:5000,enabled:!USE_MOCKS && !ending});
  const events = feed.data ?? [];
  const statuses = stream.data?.platforms ?? [];
  const isLive = !stream.isError && !stream.data?.ended && statuses.some(p => p.status === 'live');
  const complete = stream.data?.ended || (statuses.length > 0 && statuses.every(p => p.status === 'complete'));
  const label = USE_MOCKS ? 'DEMO STUDIO' : complete ? 'ENDED' : isLive ? 'LIVE ON YOUTUBE' : stream.isError ? 'STATUS UNAVAILABLE' : statuses.some(p => p.status === 'ready' || p.status === 'created' || p.status === 'testing') ? 'NOT LIVE · CONNECT VIDEO' : 'CHECKING YOUTUBE';
  useEffect(() => { const timer=setInterval(() => setElapsed(s=>s+1),1000); return ()=>clearInterval(timer); },[]);
  function toggleFullscreen() { setStudioExpanded(value=>!value); }
  async function convert(event: EngagementEvent, kind: 'lead'|'task') {
    if(actionId) return;
    setActionId(event.id);setError(null);
    try { if(kind==='lead') await convertEngagementToLead(event.id); else await convertEngagementToTask(event.id); await feed.refetch(); }
    catch(e) {setError(e instanceof Error ? e.message : 'Could not save this action.');}
    finally {setActionId(null);}
  }
  async function end() {
    setEnding(true);setError(null);
    try {await endBroadcast(broadcastId);navigation.replace('BroadcastSummary',{broadcastId});}
    catch(e) {setError(e instanceof Error?e.message:'Could not end broadcast.');setEnding(false);}
  }
  if(!broadcast) return <View style={styles.empty}><Text style={styles.hint}>{detail.isLoading?'Loading studio…': detail.error instanceof Error ? detail.error.message : 'This demo session is no longer available.'}</Text><TouchableOpacity onPress={()=>navigation.navigate('GoLiveSetup')}><Text style={styles.link}>Back to properties</Text></TouchableOpacity></View>;
  const isLandscapeStudio = camera && studioExpanded && permission?.granted && isFocused && !cameraError;
  if(isLandscapeStudio) return <Modal visible onRequestClose={()=>setStudioExpanded(false)} supportedOrientations={['portrait', 'landscape']}><View style={styles.landscapeStudio}>
    <CameraView key={cameraAttempt} style={StyleSheet.absoluteFill} facing={cameraFacing} onMountError={({message})=>setCameraError(message || 'Could not start video source.')} />
    <LiveStudioOverlay elapsed={elapsed} events={events} label={label} property={broadcast.property} ending={ending} onEnd={()=>void end()} onFlip={Platform.OS === 'web' ? undefined : ()=>setCameraFacing(current=>current==='back'?'front':'back')} onFullscreen={()=>void toggleFullscreen()} fullscreen={studioExpanded} />
  </View></Modal>;
  return <ScrollView style={styles.root} contentContainerStyle={{paddingBottom:30}}>
    <View style={styles.header}><View style={{flex:1}}><Text style={styles.status}>● {label}</Text><Text style={styles.address}>{broadcast.property.address}</Text><Text style={styles.hint}>Studio session · {Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</Text></View><TouchableOpacity disabled={ending} onPress={end} style={styles.smallButton}><Text style={styles.buttonText}>{ending?'Ending…':'End session'}</Text></TouchableOpacity></View>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <View style={styles.connection}>
      <View style={[styles.youtubeState,isLive ? styles.youtubeLive : styles.youtubeWaiting]}><Text style={styles.youtubeStateText}>{isLive ? '✓ YouTube is receiving video — viewers can watch and chat.' : 'YouTube is not live yet. The studio camera is visible only to you until a video encoder is connected.'}</Text></View>
      <TouchableOpacity onPress={()=>setEncoder(v=>!v)} style={{paddingVertical:12}}><Text style={styles.link}>{encoder?'Hide':'Show'} streaming connection details {encoder?'↑':'↓'}</Text></TouchableOpacity>
      {encoder && <View>
        <TouchableOpacity onPress={()=>setShowKeys(v=>!v)}><Text style={styles.link}>{showKeys?'Hide stream keys':'Reveal stream keys'}</Text></TouchableOpacity>
        {Object.entries(broadcast.ingest ?? {}).map(([platform,info])=> info && <View key={platform} style={{paddingVertical:12}}><Text style={styles.section}>{platform.toUpperCase()}</Text><Text style={styles.hint}>Server URL</Text><Text selectable style={styles.value}>{info.rtmpUrl}</Text><Text style={styles.hint}>Stream key</Text><Text selectable={showKeys} style={styles.value}>{showKeys?info.streamKey:'••••••••••••'}</Text></View>)}
      </View>}
      <View style={styles.tabs}>{Object.entries(broadcast.ingest ?? {}).map(([platform,info])=>info?.watchUrl && <TouchableOpacity key={platform} style={styles.smallButton} onPress={()=>Linking.openURL(info.watchUrl!).catch(()=>setError('Could not open the live page.'))}><Text style={styles.buttonText}>Open {platform} live page ↗</Text></TouchableOpacity>)}</View>
    </View>
    <View style={{padding:16}}>
      <View style={styles.tabs}><TouchableOpacity onPress={()=>setCamera(true)}><Text style={[styles.link,camera && styles.selected]}>Camera preview</Text></TouchableOpacity><TouchableOpacity onPress={()=>setCamera(false)}><Text style={[styles.link,!camera && styles.selected]}>Broadcast monitor</Text></TouchableOpacity></View>
      <View style={styles.preview}>{camera ? cameraError ? <View style={styles.empty}><Text style={styles.cameraError}>Camera could not start</Text><Text style={[styles.hint,{textAlign:'center'}]}>Close Teams, Zoom, OBS, Windows Camera, or any other browser tab using the camera, then try again.</Text><TouchableOpacity style={[styles.smallButton,{marginTop:12}]} onPress={()=>{setCameraError(null);setCameraAttempt(value=>value+1);}}><Text style={styles.buttonText}>Retry camera</Text></TouchableOpacity></View> : permission?.granted && isFocused ? <View style={{flex:1}}><CameraView key={cameraAttempt} style={{flex:1}} facing={cameraFacing} onMountError={({message})=>setCameraError(message || 'Could not start video source.')} />{Platform.OS !== 'web' && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Switch camera" onPress={()=>setCameraFacing(current=>current==='back'?'front':'back')} style={styles.flipButton}><Text style={styles.buttonText}>↻ Flip camera</Text></TouchableOpacity>}<TouchableOpacity accessibilityRole="button" accessibilityLabel="Open full screen studio" onPress={()=>void toggleFullscreen()} style={styles.previewFullscreen}><Text style={styles.fullscreenText}>↗</Text></TouchableOpacity></View> : <View style={styles.empty}><Text style={styles.hint}>{permission === null ? 'Checking camera permission…' : permission.canAskAgain === false ? 'Camera access is blocked. Enable it in your browser or device settings.' : 'Camera access is required to show your preview.'}</Text>{permission && permission.canAskAgain !== false && <TouchableOpacity style={styles.smallButton} onPress={()=>requestPermission().catch(()=>setError('Camera permission could not be requested.'))}><Text style={styles.buttonText}>Enable camera</Text></TouchableOpacity>}</View> : <BroadcastPlayer videoId={broadcast.ingest?.youtube?.providerRef?.broadcastId} />}</View>
      <Text style={styles.hint}>{camera?'Studio preview · use the ↗ button for the full-screen camera overlay. This preview is not transmitted to YouTube.':'This player is the actual YouTube output. If it is waiting, YouTube has not received video from an encoder yet.'}</Text>
      <Text style={[styles.section,{marginTop:22}]}>Viewer comments</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(['all',...broadcast.platforms] as const).map(platform=><TouchableOpacity key={platform} onPress={()=>setFilter(platform)} style={[styles.filter,filter===platform && {backgroundColor:colors.primarySoft}]}><Text style={styles.link}>{platform==='all'?'All channels':PLATFORM_CATALOG[platform].label}</Text></TouchableOpacity>)}
      </ScrollView>
      {feed.isError && <TouchableOpacity onPress={()=>feed.refetch()}><Text style={styles.error}>Comments could not refresh. Tap to retry.</Text></TouchableOpacity>}
      {feed.isLoading && <ActivityIndicator color={colors.primary} />}
      {!events.length && !feed.isLoading && <Text style={styles.hint}>No comments yet. Viewer messages will appear here when received.</Text>}
      <EngagementFeed events={events.filter(e=>filter==='all'||e.platform===filter)} onConvertToLead={e=>void convert(e,'lead')} onConvertToTask={e=>void convert(e,'task')} />
      <LiveCoach key={broadcastId} property={broadcast.property} events={events} />
    </View>
  </ScrollView>;
}
const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:colors.bg},header:{padding:18,backgroundColor:'white',flexDirection:'row',alignItems:'center',gap:10},status:{fontSize:11,fontWeight:'800',color:colors.primaryDark},address:{fontSize:16,fontWeight:'700',color:colors.text,marginTop:6},hint:{fontSize:11,lineHeight:18,color:colors.textMuted,marginTop:6},connection:{padding:16,borderBottomWidth:1,borderBottomColor:colors.border},link:{fontSize:12,fontWeight:'700',color:colors.primaryDark},smallButton:{backgroundColor:colors.primary,padding:10,borderRadius:12},buttonText:{color:'white',fontSize:11,fontWeight:'700'},tabs:{flexDirection:'row',gap:12,flexWrap:'wrap',paddingVertical:12},section:{fontSize:17,fontWeight:'800',color:colors.text},value:{color:colors.text,fontSize:12},preview:{height:230,borderRadius:20,overflow:'hidden',backgroundColor:'#30242c'},empty:{flex:1,justifyContent:'center',alignItems:'center',padding:24},selected:{textDecorationLine:'underline'},filter:{padding:10,borderRadius:20,backgroundColor:'white'},error:{color:colors.live,fontSize:12,padding:12},
 flipButton:{position:'absolute',right:12,bottom:12,backgroundColor:'rgba(0,0,0,0.65)',paddingHorizontal:12,paddingVertical:9,borderRadius:16},
 cameraError:{color:'white',fontSize:15,fontWeight:'800'},
 landscapeStudio:{flex:1,backgroundColor:'#120c11'},
 previewFullscreen:{position:'absolute',right:10,bottom:10,width:38,height:38,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,0.68)'},
 fullscreenText:{color:'white',fontSize:21,fontWeight:'700'},
 youtubeState:{borderRadius:12,paddingHorizontal:12,paddingVertical:10,marginBottom:4},
 youtubeLive:{backgroundColor:'#dcfce7'},
 youtubeWaiting:{backgroundColor:'#fff7ed'},
 youtubeStateText:{color:colors.text,fontSize:11,lineHeight:16,fontWeight:'700'},
});
