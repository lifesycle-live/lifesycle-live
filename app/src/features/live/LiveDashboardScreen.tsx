import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useQuery } from "@tanstack/react-query";
import { endBroadcast, getBroadcast, getStreamStatus } from "../../api/broadcasts";
import { convertEngagementToLead, convertEngagementToTask, getEngagementFeed } from "../../api/engagement";
import { USE_MOCKS } from "../../api/config";
import { useLiveSessionStore } from "../../state/liveSessionStore";
import { EngagementFeed } from "./components/EngagementFeed";
import { LiveCoach } from "./components/LiveCoach";
import { BroadcastPlayer } from "./components/BroadcastPlayer";
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
  const [camera, setCamera] = useState(false);
  const [filter, setFilter] = useState<PlatformId | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const detail = useQuery({ queryKey:['broadcast',broadcastId], queryFn:() => getBroadcast(broadcastId), initialData:stored?.id === broadcastId ? stored : undefined, enabled: !USE_MOCKS, staleTime:30000 });
  const broadcast = detail.data;
  const feed = useQuery({ queryKey:['live-feed',broadcastId],queryFn:() => getEngagementFeed(broadcastId),refetchInterval:4000 });
  const stream = useQuery({queryKey:['stream-status',broadcastId],queryFn:() => getStreamStatus(broadcastId),refetchInterval:15000,enabled:!USE_MOCKS && !ending});
  const events = feed.data ?? [];
  const statuses = stream.data?.platforms ?? [];
  const isLive = !stream.isError && !stream.data?.ended && statuses.some(p => p.status === 'live');
  const complete = stream.data?.ended || (statuses.length > 0 && statuses.every(p => p.status === 'complete'));
  const label = USE_MOCKS ? 'DEMO STUDIO' : complete ? 'ENDED' : isLive ? 'LIVE ON YOUTUBE' : stream.isError ? 'STATUS UNAVAILABLE' : statuses.some(p => p.status === 'ready' || p.status === 'created' || p.status === 'testing') ? 'WAITING FOR VIDEO' : 'CHECKING STREAM';
  useEffect(() => { const timer=setInterval(() => setElapsed(s=>s+1),1000); return ()=>clearInterval(timer); },[]);
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
  return <ScrollView style={styles.root} contentContainerStyle={{paddingBottom:30}}>
    <View style={styles.header}><View style={{flex:1}}><Text style={styles.status}>● {label}</Text><Text style={styles.address}>{broadcast.property.address}</Text><Text style={styles.hint}>Studio session · {Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</Text></View><TouchableOpacity disabled={ending} onPress={end} style={styles.smallButton}><Text style={styles.buttonText}>{ending?'Ending…':'End session'}</Text></TouchableOpacity></View>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <View style={styles.connection}>
      <Text style={styles.hint}>Your camera preview does not send video. Connect an external encoder to publish; the status above follows YouTube's response.</Text>
      <TouchableOpacity onPress={()=>setEncoder(v=>!v)} style={{paddingVertical:12}}><Text style={styles.link}>{encoder?'Hide':'Show'} streaming connection details {encoder?'↑':'↓'}</Text></TouchableOpacity>
      {encoder && <View>
        <TouchableOpacity onPress={()=>setShowKeys(v=>!v)}><Text style={styles.link}>{showKeys?'Hide stream keys':'Reveal stream keys'}</Text></TouchableOpacity>
        {Object.entries(broadcast.ingest ?? {}).map(([platform,info])=> info && <View key={platform} style={{paddingVertical:12}}><Text style={styles.section}>{platform.toUpperCase()}</Text><Text style={styles.hint}>Server URL</Text><Text selectable style={styles.value}>{info.rtmpUrl}</Text><Text style={styles.hint}>Stream key</Text><Text selectable={showKeys} style={styles.value}>{showKeys?info.streamKey:'••••••••••••'}</Text></View>)}
      </View>}
      <View style={styles.tabs}>{Object.entries(broadcast.ingest ?? {}).map(([platform,info])=>info?.watchUrl && <TouchableOpacity key={platform} style={styles.smallButton} onPress={()=>Linking.openURL(info.watchUrl!).catch(()=>setError('Could not open the live page.'))}><Text style={styles.buttonText}>Open {platform} live page ↗</Text></TouchableOpacity>)}</View>
    </View>
    <View style={{padding:16}}>
      <View style={styles.tabs}><TouchableOpacity onPress={()=>setCamera(false)}><Text style={[styles.link,!camera && styles.selected]}>Broadcast monitor</Text></TouchableOpacity><TouchableOpacity onPress={()=>setCamera(true)}><Text style={[styles.link,camera && styles.selected]}>Camera preview</Text></TouchableOpacity></View>
      <View style={styles.preview}>{camera ? permission?.granted ? <CameraView style={{flex:1}} facing="back" /> : <View style={styles.empty}><Text style={styles.hint}>Enable your camera for a local preview.</Text><TouchableOpacity onPress={()=>requestPermission().catch(()=>setError('Camera permission could not be requested.'))}><Text style={styles.link}>Enable camera</Text></TouchableOpacity></View> : <BroadcastPlayer videoId={broadcast.ingest?.youtube?.providerRef?.broadcastId} />}</View>
      <Text style={styles.hint}>{camera?'Local preview only · not transmitted':'Platform playback may be delayed or unavailable until the encoder sends video.'}</Text>
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
});
