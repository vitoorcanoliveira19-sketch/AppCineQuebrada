import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { apagarToken, lerToken, requisicaoInterna } from '../services/auth';

type Turma = { id: number; nome: string; atividade?: { nome: string } };
type Pessoa = { id: number; nome: string };
type Registro = { id: number; data: string; atividade: string; turma: string; participante: string; situacao: 'presente' | 'ausente' };
type Resultado = { registros: Registro[]; totais: { presencas: number; faltas: number } };

export default function HistoricoFrequenciaScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [tipo, setTipo] = useState<'turma' | 'participante'>('turma');
  const [filtro, setFiltro] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await lerToken();
      if (!saved) { router.replace('/login'); return; }
      try {
        const me = await requisicaoInterna('/auth/me', saved) as { usuario: { papel: string } };
        if (!['administrador', 'educador'].includes(me.usuario.papel)) { router.replace('/login'); return; }
        const [ts, ps] = await Promise.all([
          requisicaoInterna('/chamadas/turmas', saved) as Promise<{ dados: Turma[] }>,
          requisicaoInterna('/chamadas/participantes', saved) as Promise<{ dados: Pessoa[] }>,
        ]);
        setToken(saved); setTurmas(ts.dados); setPessoas(ps.dados);
      } catch (e) { await apagarToken(); router.replace('/login'); setErro(e instanceof Error ? e.message : 'Não foi possível carregar os filtros.'); }
      finally { setCarregando(false); }
    })();
  }, [router]);

  async function consultar() {
    if (!token) return;
    if (!filtro) { setErro(`Selecione ${tipo === 'turma' ? 'uma turma' : 'um participante'}.`); return; }
    setBuscando(true); setErro(''); setResultado(null);
    try {
      const query = new URLSearchParams({ [`${tipo}Id`]: filtro });
      if (de) query.set('de', de);
      if (ate) query.set('ate', ate);
      const resposta = await requisicaoInterna(`/chamadas/historico?${query}`, token) as { dados: Resultado };
      setResultado(resposta.dados);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar o histórico.'); }
    finally { setBuscando(false); }
  }

  if (carregando) return <SafeAreaView style={styles.page}><ActivityIndicator color="#e8bd39" /></SafeAreaView>;
  const opcoes = tipo === 'turma' ? turmas : pessoas;
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.brand}>CINEQUEBRADA · EQUIPE</Text><Text style={styles.title}>Histórico de frequência</Text>
    <View style={styles.form}>
      <Text style={styles.label}>Consultar por</Text><View style={styles.picker}><Picker selectedValue={tipo} onValueChange={v => { setTipo(v); setFiltro(''); setResultado(null); }} dropdownIconColor="#fff" style={styles.pickerText}><Picker.Item label="Turma" value="turma" /><Picker.Item label="Participante" value="participante" /></Picker></View>
      <Text style={styles.label}>{tipo === 'turma' ? 'Turma' : 'Participante'}</Text><View style={styles.picker}><Picker selectedValue={filtro} onValueChange={v => { setFiltro(String(v)); setResultado(null); }} dropdownIconColor="#fff" style={styles.pickerText}><Picker.Item label="Selecione" value="" />{opcoes.map(o => <Picker.Item key={o.id} label={o.nome} value={String(o.id)} />)}</Picker></View>
      <Text style={styles.label}>De (AAAA-MM-DD, opcional)</Text><TextInput value={de} onChangeText={setDe} placeholder="2026-01-01" placeholderTextColor="#888" style={styles.input} maxLength={10} />
      <Text style={styles.label}>Até (AAAA-MM-DD, opcional)</Text><TextInput value={ate} onChangeText={setAte} placeholder="2026-12-31" placeholderTextColor="#888" style={styles.input} maxLength={10} />
      <TouchableOpacity style={styles.primary} onPress={consultar} disabled={buscando}><Text style={styles.primaryText}>{buscando ? 'Carregando…' : 'Consultar histórico'}</Text></TouchableOpacity>
    </View>
    {!!erro && <Text accessibilityRole="alert" style={styles.error}>{erro}</Text>}
    {resultado && <View><Text style={styles.section}>Totais dos registros salvos · {resultado.totais.presencas} presenças · {resultado.totais.faltas} faltas</Text>
      {!resultado.registros.length && <Text style={styles.empty}>Nenhum registro de frequência encontrado para os filtros selecionados.</Text>}
      {resultado.registros.map(r => <View key={r.id} style={styles.card}><Text style={styles.name}>{new Date(`${r.data}T12:00:00`).toLocaleDateString('pt-BR')} · {r.participante}</Text><Text style={styles.detail}>{r.atividade} · {r.turma}</Text><Text style={[styles.status, r.situacao === 'ausente' && styles.absent]}>{r.situacao === 'presente' ? 'Presença' : 'Ausência'}</Text></View>)}
      <Text style={styles.note}>Os totais contam somente marcações já registradas. Aulas sem chamada salva não são incluídas nem consideradas faltas.</Text>
    </View>}
    <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>Voltar</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#101010' }, content: { padding: 20, paddingBottom: 40 }, brand: { color: '#e8bd39', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }, title: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 5, marginBottom: 18 }, form: { backgroundColor: '#1c1c1c', padding: 16, borderRadius: 12, marginBottom: 18 }, label: { color: '#ddd', marginBottom: 5 }, picker: { backgroundColor: '#292929', borderRadius: 8, marginBottom: 12 }, pickerText: { color: '#fff' }, input: { color: '#fff', backgroundColor: '#292929', borderRadius: 8, padding: 12, marginBottom: 12 }, primary: { backgroundColor: '#e8bd39', borderRadius: 7, padding: 12, alignItems: 'center', marginTop: 8 }, primaryText: { color: '#171717', fontWeight: '700' }, section: { color: '#fff', fontSize: 17, fontWeight: '700', marginVertical: 12 }, card: { backgroundColor: '#1c1c1c', padding: 15, borderRadius: 10, marginBottom: 10 }, name: { color: '#fff', fontWeight: '700', fontSize: 16 }, detail: { color: '#ccc', marginTop: 5 }, status: { color: '#94d3a2', marginTop: 7, textTransform: 'capitalize' }, absent: { color: '#ff8c8c' }, error: { color: '#ff8c8c', marginVertical: 8 }, empty: { color: '#aaa', marginVertical: 8 }, note: { color: '#aaa', fontSize: 12, marginTop: 10 }, back: { color: '#e8bd39', textAlign: 'center', padding: 18 } });
