import { voltarComFallback } from '@/utils/navigation';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { entrar as autenticar, lerToken, requisicaoInterna } from '@/services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const token = await lerToken();
        if (!token) return;
        await requisicaoInterna('/auth/me', token);
        if (ativo) router.replace('/equipe');
      } catch { /* Token expirado: permanece na tela de login. */ }
    })();
    return () => { ativo = false; };
  }, [router]);

  async function entrar() {
    setErro(''); setCarregando(true);
    try {
      await autenticar(email, senha);
      setSenha('');
      router.replace('/equipe');
    } catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível conectar ao servidor.'); }
    finally { setCarregando(false); }
  }

  return <SafeAreaView style={styles.page}><View style={styles.card}>
    <Text style={styles.brand}>CINEQUEBRADA</Text><Text style={styles.title}>Acesso da equipe</Text>
    <Text style={styles.label}>Email</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
    <Text style={styles.label}>Senha</Text><TextInput style={styles.input} value={senha} onChangeText={setSenha} secureTextEntry autoComplete="current-password" onSubmitEditing={entrar} />
    {!!erro && <Text accessibilityRole="alert" style={styles.error}>{erro}</Text>}
    <TouchableOpacity style={styles.button} onPress={entrar} disabled={carregando}><Text style={styles.buttonText}>{carregando ? 'Entrando…' : 'Entrar'}</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => voltarComFallback(router, '/')}><Text style={styles.back}>Voltar</Text></TouchableOpacity>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101010', justifyContent: 'center', padding: 24 }, card: { backgroundColor: '#1c1c1c', borderRadius: 16, padding: 24 }, brand: { color: '#e8bd39', fontSize: 13, fontWeight: '800', letterSpacing: 2 }, title: { color: '#fff', fontSize: 25, fontWeight: '700', marginTop: 8, marginBottom: 24 }, label: { color: '#ddd', marginBottom: 6 }, input: { color: '#fff', borderWidth: 1, borderColor: '#555', borderRadius: 8, padding: 12, marginBottom: 16 }, button: { backgroundColor: '#e8bd39', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4 }, buttonText: { color: '#171717', fontWeight: '700' }, error: { color: '#ff8c8c', marginBottom: 12 }, back: { color: '#ccc', textAlign: 'center', padding: 14 } });
