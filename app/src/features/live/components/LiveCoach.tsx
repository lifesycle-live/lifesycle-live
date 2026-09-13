import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { EngagementEvent, Property, PLATFORM_CATALOG } from '../../../types/models';
import { colors } from '../../../theme';
export function LiveCoach({ property, events }: { property: Property; events: EngagementEvent[] }) {
  const [covered, setCovered] = useState<string[]>([]);
  const points = [`Introduce ${property.address}`, ...(property.price ? [`Explain the asking price: ${property.price}`] : []), ...(property.bedrooms != null ? [`Show the ${property.bedrooms} bedrooms`] : []), ...(property.features ?? [])];
  const questions = events.filter(e => e.intent === 'question' || e.intent === 'viewing_request' || (e.intent !== 'spam' && e.text.includes('?'))).slice(-3).reverse();
  const [answered, setAnswered] = useState<string[]>([]);
  return <View style={{backgroundColor:colors.primarySoft,padding:18,borderRadius:20,marginVertical:16}}>
    <Text style={{fontSize:18,fontWeight:'800',color:colors.primaryDark}}>✦ Your live guide</Text>
    <Text style={{fontSize:11,lineHeight:17,color:colors.textMuted,marginTop:6}}>Rule-based guidance from property details and viewer questions. Mark what you have covered; speech is not being transcribed.</Text>
    {questions.filter(q => !answered.includes(q.id)).map(q => <View key={q.id} style={{backgroundColor:'white',padding:12,borderRadius:12,marginTop:12}}>
      <Text style={{color:colors.primaryDark,fontWeight:'700',fontSize:12}}>Answer next · {PLATFORM_CATALOG[q.platform]?.label} · {q.authorName}</Text>
      <Text style={{color:colors.text,lineHeight:20,marginTop:5}}>{q.text}</Text>
      <Text style={{color:colors.textMuted,fontSize:12,marginTop:5}}>{q.intent === 'viewing_request' ? 'Explain how to arrange a viewing and point them to the contact form.' : 'Address this question on camera. Use confirmed property details; offer to check anything you do not know.'}</Text>
      <TouchableOpacity onPress={() => setAnswered(a => [...a, q.id])} style={{paddingTop:10}}><Text style={{color:colors.primaryDark,fontWeight:'600'}}>Answered ✓</Text></TouchableOpacity>
    </View>)}
    <Text style={{fontWeight:'700',color:colors.text,marginTop:16,marginBottom:6}}>Tour checklist · {covered.length}/{points.length}</Text>
    {[...new Set(points)].map(point => <TouchableOpacity key={point} accessibilityRole="checkbox" accessibilityState={{checked:covered.includes(point)}} onPress={() => setCovered(p => p.includes(point) ? p.filter(x => x !== point) : [...p,point])} style={{paddingVertical:9,flexDirection:'row',gap:8}}>
      <Text style={{color:colors.primaryDark}}>{covered.includes(point) ? '✓' : '○'}</Text><Text style={{flex:1,color:colors.text,textDecorationLine:covered.includes(point)?'line-through':'none'}}>{point}</Text>
    </TouchableOpacity>)}
    {!questions.length && <Text style={{color:colors.textMuted,fontSize:12,marginTop:8}}>Viewer questions will appear here as they arrive.</Text>}
  </View>;
}
