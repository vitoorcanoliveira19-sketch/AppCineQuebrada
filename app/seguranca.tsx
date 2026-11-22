import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { apagarToken, lerToken, requisicaoInterna, PerfilSessao } from '@/services/auth';

export default function SegurancaScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilSessao | null>(null);
  const [segredo, setSegredo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [recuperacao, setRecuperacao] = useState<string[]>([]);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const saved = await lerToken();
        if (!saved) { router.replace('/login'); return; }
        setToken(saved);
        const me = await requisicaoInterna('/auth/me', saved) as PerfilSessao;
        setPerfil(me);
        if (me.precisaMfa && me.configurarMfa) {
          const setup = await requisicaoInterna('/auth/mfa/configurar', saved, { method: 'POST' }) as { segredo: string };
          setSegredo(setup.segredo);
        }
      } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar.'); }
    })();
  }, [router]);

  async function confirmar() {
    if (!token || !perfil) return;
    setErro(''); setOcupado(true);
    try {
      const result = await requisicaoInterna(perfil.configurarMfa ? '/auth/mfa/confirmar' : '/auth/mfa/verificar', token, {
        method: 'POST', body: JSON.stringify({ codigo: codigo.trim() }),
      }) as { codigosRecuperacao?: string[] };
      setCodigo(''); setSegredo('');
      if (result.codigosRecuperacao) {
        setRecuperacao(result.codigosRecuperacao);
        setPerfil({ ...perfil, precisaMfa: false, configurarMfa: false });
      } else router.replace('/equipe');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Código inválido.'); }
    finally { setOcupado(false); }
  }
  async function trocarSenha() {
    if (!token) return;
    setErro(''); setOcupado(true);
    try {
      await requisicaoInterna('/auth/senha', token, { method: 'POST', body: JSON.stringify({ senhaAtual, novaSenha }) });
      setSenhaAtual(''); setNovaSenha('');
      await apagarToken();
      router.replace('/login');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível alterar a senha.'); }
    finally { setOcupado(false); }
  }
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.brand}>CINEQUEBRADA</Text><Text style={styles.title}>Segurança da conta</Text>
    {!!erro && <Text accessibilityRole="alert" style={styles.error}>{erro}</Text>}
    {!perfil ? <ActivityIndicator color="#e8bd39" /> : recuperacao.length ? <>
      <Text style={styles.label}>Guarde estes códigos em um local seguro. Cada código pode ser usado uma única vez se você perder o autenticador. Eles serão mostrados apenas agora.</Text>
      <Text selectable style={styles.secret}>{recuperacao.join('\n')}</Text>
      <TouchableOpacity style={styles.button} onPress={() => { setRecuperacao([]); router.replace('/equipe'); }}><Text>Guardei os códigos. Continuar</Text></TouchableOpacity>
    </> : perfil.precisaMfa ? <>
      <Text style={styles.label}>{perfil.configurarMfa ? 'No seu aplicativo autenticador, adicione uma conta com a chave abaixo. Depois informe o código de seis dígitos.' : 'Informe o código do aplicativo autenticador ou um código de recuperação.'}</Text>
      {!!segredo && <Text selectable style={styles.secret}>{segredo}</Text>}
      <TextInput style={styles.input} value={codigo} onChangeText={setCodigo} autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="Código de verificação" placeholderTextColor="#aaa" />
      <TouchableOpacity style={styles.button} disabled={ocupado || (perfil.configurarMfa && !segredo)} onPress={confirmar}><Text>{ocupado ? 'Verificando…' : 'Confirmar'}</Text></TouchableOpacity>
    </> : <>
      <Text style={styles.label}>Alterar a senha encerra as sessões em todos os dispositivos. Use pelo menos 12 caracteres (até 72 bytes).</Text>
      <TextInput style={styles.input} value={senhaAtual} onChangeText={setSenhaAtual} secureTextEntry autoComplete="current-password" placeholder="Senha atual" placeholderTextColor="#aaa" />
      <TextInput style={styles.input} value={novaSenha} onChangeText={setNovaSenha} secureTextEntry autoComplete="new-password" placeholder="Nova senha" placeholderTextColor="#aaa" />
      <TouchableOpacity style={styles.button} disabled={ocupado} onPress={trocarSenha}><Text>{ocupado ? 'Salvando…' : 'Alterar senha e sair'}</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/equipe')}><Text style={styles.back}>Voltar à equipe</Text></TouchableOpacity>
    </>}
    <TouchableOpacity disabled={ocupado} onPress={async () => { try { await apagarToken(); router.replace('/login'); } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível sair.'); } }}><Text style={styles.back}>Sair</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101010' }, content: { padding: 24, maxWidth: 650, width: '100%', alignSelf: 'center' }, brand: { color: '#e8bd39', fontWeight: '800' }, title: { color: '#fff', fontSize: 26, marginVertical: 20 }, label: { color: '#ddd', marginBottom: 18, lineHeight: 23 }, secret: { color: '#e8bd39', fontSize: 18, marginVertical: 16 }, input: { color: '#fff', borderColor: '#666', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 }, button: { backgroundColor: '#e8bd39', padding: 15, borderRadius: 8, alignItems: 'center' }, back: { color: '#ddd', padding: 18, textAlign: 'center' }, error: { color: '#ff8c8c', marginBottom: 16 } });
