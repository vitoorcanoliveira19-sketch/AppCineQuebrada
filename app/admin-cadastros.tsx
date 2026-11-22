import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apagarToken, lerToken, requisicaoInterna, UsuarioInterno } from '@/services/auth';

type Tipo = 'atividades' | 'salas' | 'educadores';
type Registro = { id: number; nome: string; descricao?: string | null; email?: string; contato?: string; ativa?: boolean; ativo?: boolean };
const tipos: { id: Tipo; label: string }[] = [{ id: 'atividades', label: 'Atividades' }, { id: 'salas', label: 'Salas' }, { id: 'educadores', label: 'Educadores' }];

export default function AdminCadastrosScreen() {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>('atividades');
  const [token, setToken] = useState<string | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [editando, setEditando] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [email, setEmail] = useState('');
  const [contato, setContato] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async (authToken: string) => {
    try {
      const resultado = await requisicaoInterna(`/admin/cadastros/${tipo}`, authToken) as { dados: Registro[] };
      setRegistros(resultado.dados); setErro('');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar os cadastros.'); }
    finally { setCarregando(false); }
  }, [tipo]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const saved = await lerToken();
      if (!saved) { router.replace('/login'); return; }
      try {
        const perfil = await requisicaoInterna('/auth/me', saved) as { usuario: UsuarioInterno };
        if (perfil.usuario.papel !== 'administrador') { router.replace('/equipe'); return; }
        if (ativo) { setToken(saved); await carregar(saved); }
      } catch { await apagarToken(); router.replace('/login'); }
    })();
    return () => { ativo = false; };
  }, [carregar, router]);

  function limparFormulario() { setEditando(null); setNome(''); setDescricao(''); setEmail(''); setContato(''); }
  function prepararEdicao(item: Registro) { setEditando(item.id); setNome(item.nome); setDescricao(item.descricao || ''); setEmail(item.email || ''); setContato(item.contato || ''); setErro(''); setAviso(''); }
  async function salvar() {
    if (!token) return;
    setErro(''); setAviso(''); setSalvando(true);
    const dados: Record<string, string> = { nome: nome.trim() };
    if (tipo === 'atividades') dados.descricao = descricao.trim();
    if (tipo === 'educadores') { dados.email = email.trim(); dados.contato = contato.trim(); }
    try {
      const path = `/admin/cadastros/${tipo}${editando ? `/${editando}` : ''}`;
      await requisicaoInterna(path, token, { method: editando ? 'PUT' : 'POST', body: JSON.stringify(dados) });
      setAviso(editando ? 'Cadastro atualizado.' : 'Cadastro criado.'); limparFormulario(); await carregar(token);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar. Confira os campos e tente novamente.'); }
    finally { setSalvando(false); }
  }
  async function alternar(item: Registro) {
    if (!token) return;
    const campo = tipo === 'educadores' ? 'ativo' : 'ativa';
    try {
      await requisicaoInterna(`/admin/cadastros/${tipo}/${item.id}`, token, { method: 'PATCH', body: JSON.stringify({ [campo]: !(item[campo] ?? true) }) });
      setAviso('Situação atualizada.'); await carregar(token);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível atualizar a situação.'); }
  }

  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.brand}>CINEQUEBRADA · ADMINISTRAÇÃO</Text><Text style={styles.title}>Cadastros</Text>
    <View style={styles.tabs}>{tipos.map((item) => <TouchableOpacity key={item.id} style={[styles.tab, tipo === item.id && styles.selectedTab]} onPress={() => { if (tipo !== item.id) { setTipo(item.id); limparFormulario(); setAviso(''); } }}><Text style={[styles.tabText, tipo === item.id && styles.selectedTabText]}>{item.label}</Text></TouchableOpacity>)}</View>
    <View style={styles.form}><Text style={styles.section}>{editando ? 'Editar cadastro' : `Novo cadastro · ${tipos.find((item) => item.id === tipo)?.label}`}</Text>
      <Text style={styles.label}>{tipo === 'salas' ? 'Nome ou identificação' : 'Nome'}</Text><TextInput style={styles.input} value={nome} onChangeText={setNome} maxLength={tipo === 'atividades' ? 120 : tipo === 'salas' ? 120 : 255} />
      {tipo === 'atividades' && <><Text style={styles.label}>Descrição (opcional)</Text><TextInput style={[styles.input, styles.multiline]} value={descricao} onChangeText={setDescricao} multiline maxLength={5000} /></>}
      {tipo === 'educadores' && <><Text style={styles.label}>Email</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={255} /><Text style={styles.label}>Contato</Text><TextInput style={styles.input} value={contato} onChangeText={setContato} maxLength={60} /></>}
      {!!erro && <Text accessibilityRole="alert" style={styles.error}>{erro}</Text>}{!!aviso && <Text style={styles.success}>{aviso}</Text>}
      <View style={styles.actions}><TouchableOpacity style={styles.primary} onPress={salvar} disabled={salvando}><Text style={styles.primaryText}>{salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar'}</Text></TouchableOpacity>{!!editando && <TouchableOpacity style={styles.secondary} onPress={limparFormulario}><Text style={styles.actionText}>Cancelar</Text></TouchableOpacity>}</View>
    </View>
    <Text style={styles.section}>Cadastros existentes</Text>
    {carregando ? <ActivityIndicator color="#e8bd39" /> : registros.length === 0 ? <Text style={styles.empty}>Nenhum cadastro encontrado.</Text> : registros.map((item) => { const ativo = tipo === 'educadores' ? item.ativo !== false : item.ativa !== false; return <View key={item.id} style={styles.card}><Text style={styles.name}>{item.nome}</Text>{tipo === 'atividades' && !!item.descricao && <Text style={styles.detail}>{item.descricao}</Text>}{tipo === 'educadores' && <Text style={styles.detail}>{item.email} · {item.contato}</Text>}<Text style={styles.status}>{ativo ? 'Ativo' : 'Inativo'}</Text><View style={styles.actions}><TouchableOpacity style={styles.secondary} onPress={() => prepararEdicao(item)}><Text style={styles.actionText}>Editar</Text></TouchableOpacity><TouchableOpacity style={styles.secondary} onPress={() => alternar(item)}><Text style={styles.actionText}>{ativo ? 'Inativar' : 'Reativar'}</Text></TouchableOpacity></View></View>; })}
    <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>Voltar à área da equipe</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101010' }, content: { padding: 20, paddingBottom: 40 }, brand: { color: '#e8bd39', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }, title: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 5 }, tabs: { flexDirection: 'row', gap: 8, marginVertical: 18 }, tab: { flex: 1, borderColor: '#555', borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' }, selectedTab: { backgroundColor: '#e8bd39', borderColor: '#e8bd39' }, tabText: { color: '#ddd', fontWeight: '600' }, selectedTabText: { color: '#171717' }, form: { backgroundColor: '#1c1c1c', padding: 16, borderRadius: 12 }, section: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 }, label: { color: '#ddd', marginBottom: 5 }, input: { color: '#fff', borderWidth: 1, borderColor: '#555', borderRadius: 8, padding: 11, marginBottom: 12 }, multiline: { minHeight: 84, textAlignVertical: 'top' }, actions: { flexDirection: 'row', gap: 8, marginTop: 10 }, primary: { backgroundColor: '#e8bd39', borderRadius: 7, paddingVertical: 10, paddingHorizontal: 14 }, primaryText: { color: '#171717', fontWeight: '700' }, secondary: { borderWidth: 1, borderColor: '#777', borderRadius: 7, paddingVertical: 9, paddingHorizontal: 12 }, actionText: { color: '#fff', fontWeight: '600' }, card: { backgroundColor: '#1c1c1c', padding: 15, borderRadius: 10, marginBottom: 10 }, name: { color: '#fff', fontWeight: '700', fontSize: 16 }, detail: { color: '#ccc', marginTop: 5 }, status: { color: '#e8bd39', marginTop: 8 }, error: { color: '#ff8c8c', marginTop: 4 }, success: { color: '#94d3a2', marginTop: 4 }, empty: { color: '#aaa', marginVertical: 12 }, back: { color: '#e8bd39', textAlign: 'center', padding: 18 } });
