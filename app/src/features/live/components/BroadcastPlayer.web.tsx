import React from 'react';
import { Text, View } from 'react-native';
export function BroadcastPlayer({ videoId }: { videoId?: string }) {
  if (!videoId || !/^[a-zA-Z0-9_-]+$/.test(videoId)) return <View style={{height:230,justifyContent:'center',padding:24,backgroundColor:'#30242c'}}><Text style={{color:'white',textAlign:'center'}}>No embedded player for this platform. Use Open live page to monitor your broadcast.</Text></View>;
  return React.createElement('iframe', { title: 'YouTube live broadcast', src: `https://www.youtube.com/embed/${videoId}`, allow: 'autoplay; encrypted-media; picture-in-picture', allowFullScreen: true, style: { width:'100%',height:230,border:0,background:'#30242c' } });
}
