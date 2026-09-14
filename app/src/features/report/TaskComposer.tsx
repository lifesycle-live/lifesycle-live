import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask, draftTask, getAiStatus } from '../../api/tasks';
import { colors } from '../../theme';

export function TaskComposer() {
  const queryClient = useQueryClient();
  const ai = useQuery({ queryKey: ['ai-status'], queryFn: getAiStatus });
  const [expanded, setExpanded] = useState(false);
  const [context, setContext] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function generate() {
    setBusy(true); setNotice('');
    try { const draft = await draftTask(context); setTitle(draft.title); setDescription(draft.description); setNotice('AI draft ready. Review and edit before saving.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'AI draft failed'); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setNotice('');
    try { await createTask({ title, description }); await queryClient.invalidateQueries({ queryKey: ['tasks'] }); setTitle(''); setDescription(''); setContext(''); setNotice('Task saved.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save task'); }
    finally { setBusy(false); }
  }
  const field = { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, backgroundColor: colors.surface };
  return <View style={{ padding: 16, backgroundColor: colors.surface, borderRadius: 14, marginTop: 14, gap: 10 }}>
    <Text style={{ fontWeight: '700', color: colors.primaryDark }}>{ai.isLoading ? 'Checking AI…' : ai.isError ? 'AI status unavailable' : ai.data?.taskDrafting ? 'Groq AI configured · ' + ai.data.model : 'Groq AI not configured'}</Text>
    {!ai.isLoading && !ai.isError && !ai.data?.taskDrafting && <Text style={{ color: colors.textMuted, fontSize: 12 }}>AI task drafts need Groq to be configured. You can create tasks manually.</Text>}
    <TouchableOpacity accessibilityRole="button" onPress={() => setExpanded(!expanded)}><Text style={{ color: colors.primary, fontWeight: '700' }}>{expanded ? 'Close task editor' : '+ Add task'}</Text></TouchableOpacity>
    {expanded && <>
      <TextInput accessibilityLabel="Comment or task notes" multiline value={context} onChangeText={setContext} editable={!busy} maxLength={6000} placeholder="Paste a viewer comment or describe the follow-up…" style={[field, { minHeight: 80 }]} />
      <TouchableOpacity accessibilityRole="button" disabled={busy || !ai.data?.taskDrafting || context.trim().length < 3} onPress={() => void generate()} style={{ opacity: busy || !ai.data?.taskDrafting || context.trim().length < 3 ? 0.45 : 1 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>{busy ? 'Working…' : '✦ Draft task with AI'}</Text></TouchableOpacity>
      <TextInput accessibilityLabel="Task title" value={title} onChangeText={setTitle} editable={!busy} maxLength={1000} placeholder="Task title" style={field} />
      <TextInput accessibilityLabel="Task description" multiline value={description} onChangeText={setDescription} editable={!busy} maxLength={10000} placeholder="Description and next steps" style={[field, { minHeight: 150 }]} />
      <TouchableOpacity accessibilityRole="button" disabled={busy || !title.trim()} onPress={() => void save()} style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 10, opacity: busy || !title.trim() ? 0.45 : 1 }}><Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Save task</Text></TouchableOpacity>
    </>}
    {!!notice && <Text accessibilityRole="alert" style={{ color: colors.primaryDark }}>{notice}</Text>}
  </View>;
}
