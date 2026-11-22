import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { lerToken, requisicaoInterna, PerfilSessao } from '../services/auth';
type Conta = { id: number; nome: string; email: string; papel: string; educador?: { nome: string } };
type Educador = { id: number; nome: string; email: string; ativo: boolean };
export default function ContasScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [educadores, setEducadores] = useState<Educador[]>([]);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [educadorId, setEducadorId] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function carregar(saved: string, page = pagina) {
    const result = await requisicaoInterna('/admin/usuarios?page=' + page, saved) as { dados: Conta[]; paginacao: { paginas: number } };
    setContas(result.dados); setPagina(page); setPaginas(result.paginacao.paginas);
  }
  useEffect(() => {
    (async () => {
      try {
        const saved = await lerToken();
        if (!saved) { router.replace('/login'); return; }
        const perfil = await requisicaoInterna('/auth/me', saved) as PerfilSessao;
        if (perfil.precisaMfa) { router.replace('/seguranca'); return; }
        if (perfil.usuario.papel !== 'administrador') { router.replace('/equipe'); return; }
        setToken(saved);
        const data = await requisicaoInterna('/admin/cadastros/educadores', saved) as { dados: Educador[] };
        setEducadores(data.dados.filter(e => e.ativo));
        await carregar(saved, 1);
      } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar.'); }
    })();
    // Initial load only; subsequent pages are explicit user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
  async function criar() {
    if (!token) return;
    setOcupado(true); setErro('');
    try {
      await requisicaoInterna('/admin/educadores', token, { method: 'POST', body: JSON.stringify({ nome, email, senha, educadorId: Number(educadorId) }) });
      setSenha(''); setNome(''); setEmail(''); setEducadorId('');
      await carregar(token, 1);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível criar.'); }
    finally { setOcupado(false); }
  }
  async function alternar(conta: Conta) {
    if (!token) return;
    setOcupado(true); setErro('');
    try {
      await requisicaoInterna('/admin/usuarios/' + conta.id + '/ativo', token, { method: 'PATCH', body: JSON.stringify({ ativo: conta.papel === 'bloqueado' }) });
      await carregar(token);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível atualizar.'); }
    finally { setOcupado(false); }
  }
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Contas da equipe</Text>
    {!!erro && <Text accessibilityRole="alert" style={styles.error}>{erro}</Text>}
    {!token ? <ActivityIndicator color="#e8bd39" /> : <>
      <Text style={styles.label}>Criar acesso de educador</Text>
      <Picker selectedValue={educadorId} onValueChange={value => { setEducadorId(value); const e = educadores.find(item => String(item.id) === value); if (e) { setNome(e.nome); setEmail(e.email); } }} style={[styles.input, { backgroundColor: '#eee', color: '#111' }]}>
        <Picker.Item label="Selecione um educador cadastrado" value="" />{educadores.map(e => <Picker.Item key={e.id} label={e.nome} value={String(e.id)} />)}
      </Picker>
      <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome" placeholderTextColor="#aaa" />
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email de acesso" placeholderTextColor="#aaa" autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} value={senha} onChangeText={setSenha} placeholder="Senha inicial (mínimo 12 caracteres)" placeholderTextColor="#aaa" secureTextEntry autoComplete="new-password" />
      <TouchableOpacity disabled={ocupado || !educadorId} style={styles.button} onPress={criar}><Text>Criar conta</Text></TouchableOpacity>
      <Text style={styles.label}>Bloquear encerra as sessões existentes. Reativar exige um novo login.</Text>
      {contas.map(conta => <React.Fragment key={conta.id}>
        <Text style={styles.name}>{conta.nome} · {conta.papel}</Text><Text style={styles.label}>{conta.email}{conta.educador ? ' · ' + conta.educador.nome : ''}</Text>
        {conta.papel !== 'administrador' && <TouchableOpacity disabled={ocupado} style={styles.button} onPress={() => alternar(conta)}><Text>{conta.papel === 'bloqueado' ? 'Reativar conta' : 'Bloquear conta'}</Text></TouchableOpacity>}
      </React.Fragment>)}
      <Text style={styles.label}>Página {pagina} de {Math.max(1, paginas)}</Text>
      {pagina > 1 && <TouchableOpacity disabled={ocupado} onPress={async () => { try { await carregar(token, pagina - 1); } catch (e) { setErro(String(e)); } }}><Text style={styles.back}>Anterior</Text></TouchableOpacity>}
      {pagina < paginas && <TouchableOpacity disabled={ocupado} onPress={async () => { try { await carregar(token, pagina + 1); } catch (e) { setErro(String(e)); } }}><Text style={styles.back}>Próxima</Text></TouchableOpacity>}
    </>}
    <TouchableOpacity onPress={() => router.replace('/equipe')}><Text style={styles.back}>Voltar à equipe</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101010' }, content: { padding: 24, maxWidth: 700, width: '100%', alignSelf: 'center' }, title: { color: '#fff', fontSize: 26, marginBottom: 20 }, name: { color: '#fff', fontSize: 18 }, label: { color: '#ccc', marginVertical: 12 }, input: { color: '#fff', borderColor: '#666', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 }, button: { backgroundColor: '#e8bd39', padding: 13, borderRadius: 8, alignItems: 'center', marginBottom: 18 }, back: { color: '#ddd', padding: 18, textAlign: 'center' }, error: { color: '#ff8c8c', marginBottom: 16 } });
