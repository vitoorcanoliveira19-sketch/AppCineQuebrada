import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { apagarToken, lerToken, requisicaoInterna, UsuarioInterno } from './services/auth';

type Turma = { id: number; nome: string; atividade?: { nome: string } };
type Participante = { matriculaId: number; participanteId: number; nome: string; situacao: 'presente' | 'ausente' };
type ChamadaPayload = { chamadaId: number | null; participantes: Participante[]; turma: Turma; dataAula: string };

function hoje() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

export default function ChamadasScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [data, setData] = useState(hoje());
  const [lista, setLista] = useState<ChamadaPayload | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await lerToken();
      if (!saved) { router.replace('/login'); return; }
      try {
        const me = await requisicaoInterna('/auth/me', saved) as { usuario: UsuarioInterno };
        if (!['administrador', 'educador'].includes(me.usuario.papel)) { router.replace('/login'); return; }
        const resposta = await requisicaoInterna('/chamadas/turmas', saved) as { dados: Turma[] };
        setToken(saved); setTurmas(resposta.dados); if (resposta.dados[0]) setTurmaId(String(resposta.dados[0].id));
      } catch (e) {
        await apagarToken(); router.replace('/login'); setErro(e instanceof Error ? e.message : 'Não foi possível carregar as turmas.');
      } finally { setCarregando(false); }
    })();
  }, [router]);

  async function carregar() {
    if (!token || !turmaId) { setErro('Selecione uma turma disponível.'); return; }
    setBuscando(true); setErro(''); setAviso(''); setLista(null);
    try {
      const resposta = await requisicaoInterna(`/chamadas?turmaId=${encodeURIComponent(turmaId)}&data=${encodeURIComponent(data)}`, token) as { dados: ChamadaPayload };
      setLista(resposta.dados);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar a chamada.'); }
    finally { setBuscando(false); }
  }

  function marcar(matriculaId: number, situacao: Participante['situacao']) {
    setLista(atual => atual ? { ...atual, participantes: atual.participantes.map(p => p.matriculaId === matriculaId ? { ...p, situacao } : p) } : atual);
  }

  async function salvar() {
    if (!token || !lista) return;
    setSalvando(true); setErro(''); setAviso('');
    try {
      const resposta = await requisicaoInterna('/chamadas', token, { method: 'PUT', body: JSON.stringify({ turmaId: Number(turmaId), dataAula: data, presencas: lista.participantes.map(p => ({ matriculaId: p.matriculaId, situacao: p.situacao })) }) }) as { mensagem: string };
      setAviso(resposta.mensagem || 'Chamada salva com sucesso.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a chamada. Recarregue antes de tentar novamente.');
      setLista(null);
    } finally { setSalvando(false); }
  }

  if (carregando) return <SafeAreaView style={styles.page}><ActivityIndicator color="#e8bd39" /></SafeAreaView>;
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.brand}>CINEQUEBRADA · EQUIPE</Text><Text style={styles.title}>Chamada e frequência</Text>
    <View style={styles.form}>
      <Text style={styles.label}>Turma</Text><View style={styles.picker}><Picker selectedValue={turmaId} onValueChange={v => { setTurmaId(String(v)); setLista(null); setAviso(''); }} dropdownIconColor="#fff" style={styles.pickerText}><Picker.Item label="Selecione uma turma" value="" />{turmas.map(t => <Picker.Item key={t.id} label={`${t.nome}${t.atividade?.nome ? ` · ${t.atividade.nome}` : ''}`} value={String(t.id)} />)}</Picker></View>
      {!turmas.length && <Text style={styles.empty}>Nenhuma turma está vinculada a você.</Text>}
      <Text style={styles.label}>Data da aula (AAAA-MM-DD)</Text><TextInput value={data} onChangeText={v => { setData(v); setLista(null); setAviso(''); }} placeholder="2026-11-15" placeholderTextColor="#888" style={styles.input} keyboardType="numbers-and-punctuation" maxLength={10} />
      <TouchableOpacity style={styles.primary} onPress={carregar} disabled={buscando || !turmas.length}><Text style={styles.primaryText}>{buscando ? 'Carregando…' : 'Carregar chamada'}</Text></TouchableOpacity>
    </View>
    {!!erro && <Text accessibilityRole="alert" style={styles.error}>{erro}</Text>}
    {!!aviso && <Text accessibilityRole="alert" style={styles.success}>{aviso}</Text>}
    {lista && <View><Text style={styles.section}>{lista.chamadaId ? 'Editar chamada registrada' : 'Nova chamada'} · {lista.participantes.length} participantes</Text>
      {!lista.participantes.length && <Text style={styles.empty}>Não há matrículas ativas nesta turma para a data escolhida.</Text>}
      {lista.participantes.map(p => <View key={p.matriculaId} style={styles.card}><Text style={styles.name}>{p.nome}</Text><View style={styles.actions}><TouchableOpacity onPress={() => marcar(p.matriculaId, 'presente')} style={[styles.choice, p.situacao === 'presente' && styles.selected]}><Text style={[styles.choiceText, p.situacao === 'presente' && styles.selectedText]}>Presente</Text></TouchableOpacity><TouchableOpacity onPress={() => marcar(p.matriculaId, 'ausente')} style={[styles.choice, p.situacao === 'ausente' && styles.selected]}><Text style={[styles.choiceText, p.situacao === 'ausente' && styles.selectedText]}>Ausente</Text></TouchableOpacity></View></View>)}
      <TouchableOpacity style={styles.primary} onPress={salvar} disabled={salvando}><Text style={styles.primaryText}>{salvando ? 'Salvando…' : lista.chamadaId ? 'Salvar alterações' : 'Registrar chamada'}</Text></TouchableOpacity>
    </View>}
    <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>Voltar</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101010' }, content: { padding: 20, paddingBottom: 40 }, brand: { color: '#e8bd39', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }, title: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 5, marginBottom: 18 }, form: { backgroundColor: '#1c1c1c', padding: 16, borderRadius: 12, marginBottom: 18 }, label: { color: '#ddd', marginBottom: 5 }, picker: { backgroundColor: '#292929', borderRadius: 8, marginBottom: 12 }, pickerText: { color: '#fff' }, input: { color: '#fff', backgroundColor: '#292929', borderRadius: 8, padding: 12, marginBottom: 12 }, primary: { backgroundColor: '#e8bd39', borderRadius: 7, padding: 12, alignItems: 'center', marginTop: 8 }, primaryText: { color: '#171717', fontWeight: '700' }, section: { color: '#fff', fontSize: 18, fontWeight: '700', marginVertical: 12 }, card: { backgroundColor: '#1c1c1c', padding: 15, borderRadius: 10, marginBottom: 10 }, name: { color: '#fff', fontWeight: '700', fontSize: 16 }, actions: { flexDirection: 'row', gap: 8, marginTop: 10 }, choice: { borderWidth: 1, borderColor: '#777', borderRadius: 7, padding: 9 }, choiceText: { color: '#fff' }, selected: { backgroundColor: '#e8bd39', borderColor: '#e8bd39' }, selectedText: { color: '#171717', fontWeight: '700' }, error: { color: '#ff8c8c', marginVertical: 8 }, success: { color: '#94d3a2', marginVertical: 8 }, empty: { color: '#aaa', marginVertical: 8 }, back: { color: '#e8bd39', textAlign: 'center', padding: 18 } });
