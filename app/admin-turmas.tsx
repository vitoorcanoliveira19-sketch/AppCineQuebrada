import { voltarComFallback } from '@/utils/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apagarToken, lerToken, requisicaoInterna, UsuarioInterno } from '@/services/auth';

type Opcao = { id: number; nome: string; ativa?: boolean; ativo?: boolean };
type Turma = { id: number; nome: string; atividadeId: number; educadorId: number; salaId: number; ativa: boolean; atividade: Opcao; educador: Opcao; sala: Opcao };
type Recurso = 'atividades' | 'educadores' | 'salas';
const labels: Record<Recurso, string> = { atividades: 'Atividade', educadores: 'Educador', salas: 'Sala' };

export default function AdminTurmasScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [opcoes, setOpcoes] = useState<Record<Recurso, Opcao[]>>({ atividades: [], educadores: [], salas: [] });
  const [nome, setNome] = useState(''); const [atividadeId, setAtividadeId] = useState<number | null>(null); const [educadorId, setEducadorId] = useState<number | null>(null); const [salaId, setSalaId] = useState<number | null>(null);
  const [editando, setEditando] = useState<number | null>(null); const [erro, setErro] = useState(''); const [aviso, setAviso] = useState(''); const [carregando, setCarregando] = useState(true); const [salvando, setSalvando] = useState(false);
  const carregar = useCallback(async (auth: string) => {
    try {
      const [lista, atividades, educadores, salas] = await Promise.all([
        requisicaoInterna('/admin/turmas', auth) as Promise<{ dados: Turma[] }>,
        requisicaoInterna('/admin/cadastros/atividades', auth) as Promise<{ dados: Opcao[] }>,
        requisicaoInterna('/admin/cadastros/educadores', auth) as Promise<{ dados: Opcao[] }>,
        requisicaoInterna('/admin/cadastros/salas', auth) as Promise<{ dados: Opcao[] }>,
      ]);
      setTurmas(lista.dados); setOpcoes({ atividades: atividades.dados.filter(x => x.ativa !== false), educadores: educadores.dados.filter(x => x.ativo !== false), salas: salas.dados.filter(x => x.ativa !== false) }); setErro('');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.'); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { (async () => { const saved = await lerToken(); if (!saved) { router.replace('/login'); return; } try { const me = await requisicaoInterna('/auth/me', saved) as { usuario: UsuarioInterno }; if (me.usuario.papel !== 'administrador') { router.replace('/equipe'); return; } setToken(saved); await carregar(saved); } catch { await apagarToken(); router.replace('/login'); } })(); }, [carregar, router]);
  function limpar() { setEditando(null); setNome(''); setAtividadeId(null); setEducadorId(null); setSalaId(null); }
  function editar(t: Turma) { setEditando(t.id); setNome(t.nome); setAtividadeId(t.atividadeId); setEducadorId(t.educadorId); setSalaId(t.salaId); setErro(''); setAviso(''); }
  async function salvar() {
    if (!token) return;
    if (!nome.trim() || !atividadeId || !educadorId || !salaId) { setErro('Informe o nome e selecione uma atividade, um educador e uma sala ativos.'); return; }
    setErro(''); setAviso(''); setSalvando(true);
    try { await requisicaoInterna(`/admin/turmas${editando ? `/${editando}` : ''}`, token, { method: editando ? 'PUT' : 'POST', body: JSON.stringify({ nome: nome.trim(), atividadeId, educadorId, salaId }) }); setAviso(editando ? 'Turma atualizada.' : 'Turma criada.'); limpar(); await carregar(token); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar a turma.'); } finally { setSalvando(false); }
  }
  async function alternar(t: Turma) { if (!token) return; try { await requisicaoInterna(`/admin/turmas/${t.id}`, token, { method: 'PATCH', body: JSON.stringify({ ativa: !t.ativa }) }); setAviso('Situação atualizada.'); await carregar(token); } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível atualizar.'); } }
  function seletor(tipo: Recurso, valor: number | null, escolher: (id: number) => void) { return <View style={styles.options}>{opcoes[tipo].length ? opcoes[tipo].map(x => <TouchableOpacity key={x.id} style={[styles.option, valor === x.id && styles.chosen]} onPress={() => escolher(x.id)}><Text style={[styles.optionText, valor === x.id && styles.chosenText]}>{x.nome}</Text></TouchableOpacity>) : <Text style={styles.empty}>Nenhum {labels[tipo].toLowerCase()} ativo cadastrado.</Text>}</View>; }
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}><Text style={styles.brand}>CINEQUEBRADA · ADMINISTRAÇÃO</Text><Text style={styles.title}>Turmas</Text>
    <View style={styles.form}><Text style={styles.section}>{editando ? 'Editar turma' : 'Nova turma'}</Text><Text style={styles.label}>Nome ou identificação</Text><TextInput style={styles.input} value={nome} onChangeText={setNome} maxLength={120} />
      {(['atividades', 'educadores', 'salas'] as Recurso[]).map(tipo => <View key={tipo}><Text style={styles.label}>{labels[tipo]}</Text>{seletor(tipo, tipo === 'atividades' ? atividadeId : tipo === 'educadores' ? educadorId : salaId, id => tipo === 'atividades' ? setAtividadeId(id) : tipo === 'educadores' ? setEducadorId(id) : setSalaId(id))}</View>)}
      {!!erro && <Text accessibilityRole="alert" style={styles.error}>{erro}</Text>}{!!aviso && <Text style={styles.success}>{aviso}</Text>}<View style={styles.actions}><TouchableOpacity style={styles.primary} onPress={salvar} disabled={salvando}><Text style={styles.primaryText}>{salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar turma'}</Text></TouchableOpacity>{!!editando && <TouchableOpacity style={styles.secondary} onPress={limpar}><Text style={styles.actionText}>Cancelar</Text></TouchableOpacity>}</View>
    </View><Text style={styles.section}>Turmas cadastradas</Text>{carregando ? <ActivityIndicator color="#e8bd39" /> : turmas.length === 0 ? <Text style={styles.empty}>Nenhuma turma cadastrada.</Text> : turmas.map(t => <View key={t.id} style={styles.card}><Text style={styles.name}>{t.nome}</Text><Text style={styles.detail}>Atividade: {t.atividade?.nome || '—'}</Text><Text style={styles.detail}>Educador: {t.educador?.nome || '—'}</Text><Text style={styles.detail}>Sala: {t.sala?.nome || '—'}</Text><Text style={styles.status}>{t.ativa ? 'Ativa' : 'Inativa'}</Text><View style={styles.actions}><TouchableOpacity style={styles.secondary} onPress={() => editar(t)}><Text style={styles.actionText}>Editar</Text></TouchableOpacity><TouchableOpacity style={styles.secondary} onPress={() => alternar(t)}><Text style={styles.actionText}>{t.ativa ? 'Inativar' : 'Reativar'}</Text></TouchableOpacity></View></View>)}<TouchableOpacity onPress={() => voltarComFallback(router, '/equipe')}><Text style={styles.back}>Voltar à área da equipe</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101010' }, content: { padding: 20, paddingBottom: 40 }, brand: { color: '#e8bd39', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }, title: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 5 }, form: { backgroundColor: '#1c1c1c', padding: 16, borderRadius: 12, marginVertical: 18 }, section: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 }, label: { color: '#ddd', marginBottom: 7 }, input: { color: '#fff', borderWidth: 1, borderColor: '#555', borderRadius: 8, padding: 11, marginBottom: 12 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }, option: { borderWidth: 1, borderColor: '#666', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 11 }, chosen: { backgroundColor: '#e8bd39', borderColor: '#e8bd39' }, optionText: { color: '#eee' }, chosenText: { color: '#171717', fontWeight: '700' }, actions: { flexDirection: 'row', gap: 8, marginTop: 10 }, primary: { backgroundColor: '#e8bd39', borderRadius: 7, paddingVertical: 10, paddingHorizontal: 14 }, primaryText: { color: '#171717', fontWeight: '700' }, secondary: { borderWidth: 1, borderColor: '#777', borderRadius: 7, paddingVertical: 9, paddingHorizontal: 12 }, actionText: { color: '#fff', fontWeight: '600' }, card: { backgroundColor: '#1c1c1c', padding: 15, borderRadius: 10, marginBottom: 10 }, name: { color: '#fff', fontWeight: '700', fontSize: 16 }, detail: { color: '#ccc', marginTop: 5 }, status: { color: '#e8bd39', marginTop: 8 }, error: { color: '#ff8c8c', marginTop: 4 }, success: { color: '#94d3a2', marginTop: 4 }, empty: { color: '#aaa', marginVertical: 8 }, back: { color: '#e8bd39', textAlign: 'center', padding: 18 } });
