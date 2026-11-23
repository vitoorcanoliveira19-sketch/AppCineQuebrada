import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { apagarToken, lerToken, requisicaoInterna } from '@/services/auth';
import { voltarComFallback } from '@/utils/navigation';

export default function SegurancaScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const saved = await lerToken();
        if (!saved) { router.replace('/login'); return; }
        await requisicaoInterna('/auth/me', saved);
        setToken(saved);
      } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar.'); }
    })();
  }, [router]);

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
    {!token ? <ActivityIndicator color="#e8bd39" /> : <>
      <Text style={styles.label}>Alterar a senha encerra as sessões em todos os dispositivos. Use pelo menos 12 caracteres (até 72 bytes).</Text>
      <TextInput style={styles.input} value={senhaAtual} onChangeText={setSenhaAtual} secureTextEntry autoComplete="current-password" placeholder="Senha atual" placeholderTextColor="#aaa" />
      <TextInput style={styles.input} value={novaSenha} onChangeText={setNovaSenha} secureTextEntry autoComplete="new-password" placeholder="Nova senha" placeholderTextColor="#aaa" />
      <TouchableOpacity style={styles.button} disabled={ocupado} onPress={trocarSenha}><Text>{ocupado ? 'Alterando…' : 'Alterar senha'}</Text></TouchableOpacity>
    </>}
    <TouchableOpacity onPress={() => voltarComFallback(router, '/equipe')}><Text style={styles.back}>Voltar à área da equipe</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101010' }, content: { padding: 24 }, brand: { color: '#e8bd39', fontWeight: '800', letterSpacing: 2 }, title: { color: '#fff', fontSize: 25, fontWeight: '700', marginVertical: 20 }, label: { color: '#ddd', marginBottom: 12 }, input: { color: '#fff', borderWidth: 1, borderColor: '#555', borderRadius: 8, padding: 12, marginBottom: 16 }, button: { backgroundColor: '#e8bd39', padding: 14, borderRadius: 8, alignItems: 'center' }, error: { color: '#ff8c8c', marginBottom: 16 }, back: { color: '#ddd', padding: 16, textAlign: 'center' } });
