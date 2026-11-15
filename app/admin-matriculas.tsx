import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { apagarToken, lerToken, requisicaoInterna, UsuarioInterno } from './services/auth';

type Participante = { id: number; nome: string; email: string; status: string; ativo: boolean };
type Turma = { id: number; nome: string; ativa: boolean; atividade?: { nome: string } };
type Matricula = { id: number; participanteId: number; turmaId: number; situacao: 'ativa' | 'encerrada'; matriculadaEm: string; encerradaEm?: string | null; participante: Participante; turma: Turma };

export default function AdminMatriculasScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [participanteId, setParticipanteId] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [filtroParticipante, setFiltroParticipante] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [situacao, setSituacao] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregarMatriculas = useCallback(async (auth: string, participante = filtroParticipante, turma = filtroTurma, estado = situacao) => {
    const query = new URLSearchParams();
    if (participante) query.set('participanteId', participante);
    if (turma) query.set('turmaId', turma);
    if (estado) query.set('situacao', estado);
    const result = await requisicaoInterna(`/admin/matriculas${query.size ? `?${query}` : ''}`, auth) as { dados: Matricula[] };
    setMatriculas(result.dados);
  }, [filtroParticipante, filtroTurma, situacao]);

  const carregar = useCallback(async (auth: string) => {
    try {
      const [listaParticipantes, listaTurmas] = await Promise.all([
        requisicaoInterna('/admin/participantes?status=aprovado&limit=50', auth) as Promise<{ dados: Participante[] }>,
        requisicaoInterna('/admin/turmas', auth) as Promise<{ dados: Turma[] }>,
      ]);
      setParticipantes(listaParticipantes.dados.filter(p => p.status === 'aprovado' && p.ativo));
      setTurmas(listaTurmas.dados);
      await carregarMatriculas(auth);
      setErro('');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.'); }
    finally { setCarregando(false); }
  }, [carregarMatriculas]);

  useEffect(() => {
    (async () => {
      const saved = await lerToken();
      if (!saved) { router.replace('/login'); return; }
      try {
        const me = await requisicaoInterna('/auth/me', saved) as { usuario: UsuarioInterno };
        if (me.usuario.papel !== 'administrador') { router.replace('/equipe'); return; }
        setToken(saved); await carregar(saved);
      } catch { await apagarToken(); router.replace('/login'); }
    })();
  }, [carregar, router]);

  async function criar() {
    if (!token) return;
    if (!participanteId || !turmaId) { setErro('Selecione um participante e uma turma ativa.'); return; }
    setSalvando(true); setErro(''); setAviso('');
    try {
      await requisicaoInterna('/admin/matriculas', token, { method: 'POST', body: JSON.stringify({ participanteId: Number(participanteId), turmaId: Number(turmaId) }) });
      setAviso('Matrícula criada.'); await carregarMatriculas(token); setParticipanteId(''); setTurmaId('');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível matricular.'); }
    finally { setSalvando(false); }
  }

  async function alterar(matricula: Matricula, novo: 'ativa' | 'encerrada') {
    if (!token) return;
    setErro(''); setAviso('');
    try {
      await requisicaoInterna(`/admin/matriculas/${matricula.id}/situacao`, token, { method: 'PATCH', body: JSON.stringify({ situacao: novo }) });
      setAviso(novo === 'encerrada' ? 'Matrícula encerrada; o histórico foi preservado.' : 'Matrícula reativada.'); await carregarMatriculas(token);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível alterar a matrícula.'); }
  }

  async function filtrar() {
    if (!token) return;
    try { await carregarMatriculas(token); setErro(''); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível filtrar matrículas.'); }
  }

  if (carregando) return <SafeAreaView style={styles.page}><ActivityIndicator color="#e8bd39" /></SafeAreaView>;
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.brand}>CINEQUEBRADA · ADMINISTRAÇÃO</Text><Text style={styles.title}>Matrículas</Text>
    <View style={styles.form}><Text style={styles.section}>Nova matrícula</Text>
      <Text style={styles.label}>Participante aprovado e ativo</Text><View style={styles.picker}><Picker selectedValue={participanteId} onValueChange={setParticipanteId} dropdownIconColor="#fff" style={styles.pickerText}><Picker.Item label="Selecione um participante" value="" />{participantes.map(p => <Picker.Item key={p.id} label={`${p.nome} · ${p.email}`} value={String(p.id)} />)}</Picker></View>
      <Text style={styles.label}>Turma ativa</Text><View style={styles.picker}><Picker selectedValue={turmaId} onValueChange={setTurmaId} dropdownIconColor="#fff" style={styles.pickerText}><Picker.Item label="Selecione uma turma" value="" />{turmas.filter(t => t.ativa).map(t => <Picker.Item key={t.id} label={`${t.nome}${t.atividade?.nome ? ` · ${t.atividade.nome}` : ''}`} value={String(t.id)} />)}</Picker></View>
      {!!erro && <Text accessibilityRole="alert" style={styles.error}>{erro}</Text>}{!!aviso && <Text style={styles.success}>{aviso}</Text>}
      <TouchableOpacity style={styles.primary} onPress={criar} disabled={salvando}><Text style={styles.primaryText}>{salvando ? 'Salvando…' : 'Matricular participante'}</Text></TouchableOpacity>
    </View>
    <View style={styles.form}><Text style={styles.section}>Consultar matrículas</Text>
      <Text style={styles.label}>Participante</Text><View style={styles.picker}><Picker selectedValue={filtroParticipante} onValueChange={setFiltroParticipante} dropdownIconColor="#fff" style={styles.pickerText}><Picker.Item label="Todos os participantes" value="" />{participantes.map(p => <Picker.Item key={p.id} label={p.nome} value={String(p.id)} />)}</Picker></View>
      <Text style={styles.label}>Turma</Text><View style={styles.picker}><Picker selectedValue={filtroTurma} onValueChange={setFiltroTurma} dropdownIconColor="#fff" style={styles.pickerText}><Picker.Item label="Todas as turmas" value="" />{turmas.map(t => <Picker.Item key={t.id} label={t.nome} value={String(t.id)} />)}</Picker></View>
      <Text style={styles.label}>Situação</Text><View style={styles.picker}><Picker selectedValue={situacao} onValueChange={setSituacao} dropdownIconColor="#fff" style={styles.pickerText}><Picker.Item label="Todas" value="" /><Picker.Item label="Ativas" value="ativa" /><Picker.Item label="Encerradas" value="encerrada" /></Picker></View>
      <TouchableOpacity style={styles.secondary} onPress={filtrar}><Text style={styles.secondaryText}>Aplicar filtros</Text></TouchableOpacity>
    </View>
    <Text style={styles.section}>Matrículas existentes ({matriculas.length})</Text>{matriculas.length === 0 ? <Text style={styles.empty}>Nenhuma matrícula encontrada para os filtros selecionados.</Text> : matriculas.map(m => <View key={m.id} style={styles.card}><Text style={styles.name}>{m.participante?.nome || `Participante #${m.participanteId}`}</Text><Text style={styles.detail}>{m.participante?.email || ''}</Text><Text style={styles.detail}>Turma: {m.turma?.nome || `#${m.turmaId}`}{m.turma?.atividade?.nome ? ` · ${m.turma.atividade.nome}` : ''}</Text><Text style={styles.status}>Situação: {m.situacao}</Text><Text style={styles.detail}>Matriculado em: {new Date(m.matriculadaEm).toLocaleDateString('pt-BR')}</Text>{m.encerradaEm && <Text style={styles.detail}>Encerrada em: {new Date(m.encerradaEm).toLocaleDateString('pt-BR')}</Text>}<TouchableOpacity style={styles.secondary} onPress={() => alterar(m, m.situacao === 'ativa' ? 'encerrada' : 'ativa')}><Text style={styles.secondaryText}>{m.situacao === 'ativa' ? 'Encerrar matrícula' : 'Reativar matrícula'}</Text></TouchableOpacity></View>)}
    {!!erro && <Text accessibilityRole="alert" style={styles.error}>{erro}</Text>}{!!aviso && <Text style={styles.success}>{aviso}</Text>}
    <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>Voltar à área da equipe</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101010' }, content: { padding: 20, paddingBottom: 40 }, brand: { color: '#e8bd39', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }, title: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 5 }, form: { backgroundColor: '#1c1c1c', padding: 16, borderRadius: 12, marginVertical: 18 }, section: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 }, label: { color: '#ddd', marginBottom: 5 }, picker: { backgroundColor: '#292929', borderRadius: 8, marginBottom: 12 }, pickerText: { color: '#fff' }, primary: { backgroundColor: '#e8bd39', borderRadius: 7, padding: 12, alignItems: 'center', marginTop: 8 }, primaryText: { color: '#171717', fontWeight: '700' }, secondary: { borderWidth: 1, borderColor: '#777', borderRadius: 7, padding: 10, alignSelf: 'flex-start', marginTop: 10 }, secondaryText: { color: '#fff', fontWeight: '600' }, card: { backgroundColor: '#1c1c1c', padding: 15, borderRadius: 10, marginBottom: 10 }, name: { color: '#fff', fontWeight: '700', fontSize: 16 }, detail: { color: '#ccc', marginTop: 5 }, status: { color: '#e8bd39', marginTop: 8, textTransform: 'capitalize' }, error: { color: '#ff8c8c', marginTop: 8 }, success: { color: '#94d3a2', marginTop: 8 }, empty: { color: '#aaa', marginVertical: 8 }, back: { color: '#e8bd39', textAlign: 'center', padding: 18 } });
