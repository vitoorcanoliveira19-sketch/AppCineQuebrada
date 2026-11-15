import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FitDanceScreen() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Página de FitDance 💃</Text>
        <Text style={styles.text}>
          Aulas dinâmicas e informações sobre a modalidade FitDance.
        </Text>

        <TouchableOpacity style={styles.cadastroButton} onPress={() => router.push({ pathname: '/CadastroScreen', params: { atividade: 'FitDance' } })}>
          <Text style={styles.cadastroButtonText}>QUERO ME CADASTRAR!</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
// Estilos... (Use os estilos definidos acima para manter a consistência)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#000' },
    container: { flex: 1, padding: 20, alignItems: 'center', backgroundColor: '#111' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', marginBottom: 20 },
    text: { fontSize: 16, color: '#FFF', textAlign: 'center', marginBottom: 30 },
    cadastroButton: { backgroundColor: '#FFD700', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, alignItems: 'center', marginTop: 40, width: '80%', },
    cadastroButtonText: { color: '#000', fontWeight: 'bold', fontSize: 18, },
    backButton: { backgroundColor: '#333', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, marginTop: 15, width: '50%', alignItems: 'center', },
    backButtonText: { color: '#FFF', fontWeight: 'bold' }
});
