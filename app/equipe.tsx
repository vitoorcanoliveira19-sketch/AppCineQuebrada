import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { apagarToken, lerToken, requisicaoInterna, UsuarioInterno } from '@/services/auth';

type Inscricao = { id: number; nome: string; email: string; celular?: string; telefone?: string; dataNascimento?: string; atividadeInteresse: string; status: string; ativo: boolean; analisadoEm?: string };
const atividades = ['Futebol', 'Karatê', 'Capoeira', 'Ballet', 'FitDance', 'Horta Orgânica', 'Reforço escolar', 'CineQuebrada'];
export default function EquipeScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioInterno | null>(null);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState('pendente');
  const [nome, setNome] = useState('');
  const [atividade, setAtividade] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [editando, setEditando] = useState<number | null>(null);
  const [emailEdicao, setEmailEdicao] = useState('');
  const [celularEdicao, setCelularEdicao] = useState('');
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [atividadeEdicao, setAtividadeEdicao] = useState('');

  const carregar = useCallback(async (p = pagina) => {
    const saved = token || await lerToken();
    if (!saved) { router.replace('/login'); return; }
    setToken(saved);
    try {
      const me = await requisicaoInterna('/auth/me', saved) as { usuario: UsuarioInterno };
      setUsuario(me.usuario);
      if (me.usuario.papel !== 'administrador') {
        setInscricoes([]);
        setPaginas(1);
        setErro('');
        return;
      }
      const query = new URLSearchParams({ status, page: String(p), limit: '20' });
      if (nome.trim()) query.set('nome', nome.trim());
      if (atividade) query.set('atividade', atividade);
      const lista = await requisicaoInterna(`/admin/participantes?${query}`, saved) as { dados: Inscricao[]; paginacao: { paginas: number } };
      setInscricoes(lista.dados); setPaginas(lista.paginacao.paginas); setErro('');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar.'); }
    finally { setCarregando(false); }
  }, [router, token, status, nome, atividade, pagina]);
  useEffect(() => { carregar(1); }, [status, atividade]);
  useEffect(() => { (async () => { const saved = await lerToken(); if (!saved) router.replace('/login'); else { setToken(saved); setCarregando(false); } })(); }, [router]);
  useEffect(() => { if (token) carregar(pagina); }, [pagina]);

  function decidir(item: Inscricao, decisao: 'aprovado' | 'recusado') {
    Alert.alert(`${decisao === 'aprovado' ? 'Aprovar' : 'Recusar'} inscrição`, `Confirmar ${decisao === 'aprovado' ? 'a aprovação' : 'a recusa'} de ${item.nome}?`, [
      { text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', style: decisao === 'recusado' ? 'destructive' : 'default', onPress: async () => {
        if (!token) return;
        try { await requisicaoInterna(`/admin/participantes/${item.id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status: decisao }) }); await carregar(pagina); }
        catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível analisar.'); }
      } },
    ]);
  }
  async function salvarEdicao(item: Inscricao) {
    if (!token) return;
    try { await requisicaoInterna(`/admin/participantes/${item.id}`, token, { method: 'PUT', body: JSON.stringify({ nome: nomeEdicao, email: emailEdicao, celular: celularEdicao, atividadeInteresse: atividadeEdicao }) }); setEditando(null); await carregar(pagina); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
  }
  function inativar(item: Inscricao) {
    Alert.alert('Inativar participante', `Inativar ${item.nome}? O cadastro será mantido.`, [
      { text: 'Cancelar', style: 'cancel' }, { text: 'Inativar', style: 'destructive', onPress: async () => { if (!token) return; try { await requisicaoInterna(`/admin/participantes/${item.id}/inativar`, token, { method: 'PATCH' }); await carregar(pagina); } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível inativar.'); } } },
    ]);
  }
  async function sair() { await apagarToken(); router.replace('/login'); }

  if (carregando) return <SafeAreaView style={styles.page}><ActivityIndicator color="#e8bd39" /></SafeAreaView>;
  return <SafeAreaView style={styles.page}><View style={styles.header}><View><Text style={styles.brand}>ÁREA DA EQUIPE</Text><Text style={styles.title}>{usuario?.nome}</Text><Text style={styles.role}>{usuario?.papel === 'administrador' ? 'Administrador' : 'Educador'}</Text></View><TouchableOpacity onPress={sair}><Text style={styles.logout}>Sair</Text></TouchableOpacity></View>
    {usuario?.papel === 'administrador' && <>
      <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin-cadastros')}><Text style={styles.adminButtonText}>Gerenciar atividades, salas e educadores</Text></TouchableOpacity>
      <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin-turmas')}><Text style={styles.adminButtonText}>Gerenciar turmas</Text></TouchableOpacity>
      <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin-matriculas')}><Text style={styles.adminButtonText}>Gerenciar matrículas</Text></TouchableOpacity>
    </>}
    <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/chamadas')}><Text style={styles.adminButtonText}>Registrar chamada e frequência</Text></TouchableOpacity>
    <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/historico-frequencia')}><Text style={styles.adminButtonText}>Consultar histórico de frequência</Text></TouchableOpacity>
    <ScrollView contentContainerStyle={styles.list}>{!!erro && <Text style={styles.error}>{erro}</Text>}
      {usuario?.papel === 'administrador' ? <>
      <Text style={styles.section}>Inscrições e participantes</Text>
      <Text style={styles.label}>Status</Text><View style={styles.picker}><Picker selectedValue={status} onValueChange={(v) => { setStatus(v); setPagina(1); }} dropdownIconColor="#fff" style={styles.pickerText}><Picker.Item label="Pendentes" value="pendente" /><Picker.Item label="Aprovados" value="aprovado" /><Picker.Item label="Recusados" value="recusado" /><Picker.Item label="Todos" value="todos" /></Picker></View>
      <TextInput value={nome} onChangeText={setNome} placeholder="Filtrar por nome" placeholderTextColor="#aaa" style={styles.input} />
      <View style={styles.picker}><Picker selectedValue={atividade} onValueChange={(v) => { setAtividade(v); setPagina(1); }} dropdownIconColor="#fff" style={styles.pickerText}><Picker.Item label="Todas as atividades" value="" />{atividades.map((a) => <Picker.Item key={a} label={a} value={a} />)}</Picker></View>
      <TouchableOpacity style={styles.filterButton} onPress={() => { setPagina(1); carregar(1); }}><Text style={styles.adminButtonText}>Aplicar filtros</Text></TouchableOpacity>
      {inscricoes.map((item) => <View key={item.id} style={styles.card}><Text style={styles.name}>{item.nome}</Text><Text style={styles.detail}>{item.atividadeInteresse} · {item.email}</Text>{item.celular ? <Text style={styles.detail}>Celular: {item.celular}</Text> : null}{item.dataNascimento ? <Text style={styles.detail}>Nascimento: {item.dataNascimento}</Text> : null}<Text style={styles.status}>Status: {item.status}{item.status === 'aprovado' ? ` · ${item.ativo ? 'ativo' : 'inativo'}` : ''}</Text>{item.analisadoEm ? <Text style={styles.detail}>Analisado em: {new Date(item.analisadoEm).toLocaleDateString('pt-BR')}</Text> : null}
        {item.status === 'pendente' && <View style={styles.actions}><TouchableOpacity style={styles.action} onPress={() => decidir(item, 'aprovado')}><Text style={styles.actionText}>Aprovar</Text></TouchableOpacity><TouchableOpacity style={styles.action} onPress={() => decidir(item, 'recusado')}><Text style={styles.actionText}>Recusar</Text></TouchableOpacity></View>}
        {item.status === 'aprovado' && item.ativo && <><TouchableOpacity style={styles.action} onPress={() => { setEditando(editando === item.id ? null : item.id); setNomeEdicao(item.nome); setEmailEdicao(item.email); setCelularEdicao(item.celular || ''); setAtividadeEdicao(item.atividadeInteresse); }}><Text style={styles.actionText}>Editar participante</Text></TouchableOpacity><TouchableOpacity style={styles.action} onPress={() => inativar(item)}><Text style={styles.actionText}>Inativar</Text></TouchableOpacity>{editando === item.id && <View><TextInput value={nomeEdicao} onChangeText={setNomeEdicao} placeholder="Nome" placeholderTextColor="#aaa" style={styles.input}/><TextInput value={emailEdicao} onChangeText={setEmailEdicao} placeholder="Email" placeholderTextColor="#aaa" style={styles.input} keyboardType="email-address" autoCapitalize="none"/><TextInput value={celularEdicao} onChangeText={setCelularEdicao} placeholder="Celular" placeholderTextColor="#aaa" style={styles.input} keyboardType="phone-pad"/><View style={styles.picker}><Picker selectedValue={atividadeEdicao} onValueChange={setAtividadeEdicao} dropdownIconColor="#fff" style={styles.pickerText}>{atividades.map((a) => <Picker.Item key={a} label={a} value={a} />)}</Picker></View><TouchableOpacity style={styles.filterButton} onPress={() => salvarEdicao(item)}><Text style={styles.adminButtonText}>Salvar</Text></TouchableOpacity></View>}</>}
      </View>)}
      <View style={styles.actions}><TouchableOpacity disabled={pagina <= 1} style={styles.action} onPress={() => setPagina(Math.max(1, pagina - 1))}><Text style={styles.actionText}>Anterior</Text></TouchableOpacity><Text style={styles.detail}>Página {pagina} de {paginas}</Text><TouchableOpacity disabled={pagina >= paginas} style={styles.action} onPress={() => setPagina(Math.min(paginas, pagina + 1))}><Text style={styles.actionText}>Próxima</Text></TouchableOpacity></View>
      </> : <Text style={styles.detail}>Use os atalhos acima para registrar chamadas e consultar o histórico das suas turmas.</Text>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101010', padding: 20 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }, brand: { color: '#e8bd39', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4 }, role: { color: '#aaa', textTransform: 'capitalize' }, logout: { color: '#e8bd39', fontWeight: '700', padding: 10 }, adminButton: { backgroundColor: '#e8bd39', padding: 13, borderRadius: 8, marginVertical: 5 }, adminButtonText: { color: '#171717', fontWeight: '700', textAlign: 'center' }, list: { paddingBottom: 30 }, section: { color: '#fff', fontSize: 18, fontWeight: '700', marginVertical: 14 }, card: { backgroundColor: '#1c1c1c', borderRadius: 12, padding: 16, marginBottom: 12 }, name: { color: '#fff', fontSize: 17, fontWeight: '700' }, detail: { color: '#ccc', marginTop: 5 }, status: { color: '#e8bd39', marginTop: 8, textTransform: 'capitalize' }, actions: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }, action: { borderWidth: 1, borderColor: '#777', borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10, marginTop: 8 }, actionText: { color: '#fff', textTransform: 'capitalize' }, error: { color: '#ff8c8c' }, label: { color: '#ddd' }, picker: { backgroundColor: '#1c1c1c', borderRadius: 8, marginVertical: 6 }, pickerText: { color: '#fff' }, input: { color: '#fff', backgroundColor: '#1c1c1c', borderRadius: 8, padding: 12, marginVertical: 6 }, filterButton: { backgroundColor: '#e8bd39', borderRadius: 8, padding: 12, marginVertical: 6 } });
