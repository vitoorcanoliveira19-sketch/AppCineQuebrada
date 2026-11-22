import { Platform } from 'react-native';

// Para um celular físico na mesma rede, configure EXPO_PUBLIC_API_URL no .env do Expo
// com o endereço LAN do computador (por exemplo http://192.168.0.10:3001).
const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
if (!__DEV__ && (!configuredUrl || !configuredUrl.startsWith('https://'))) {
  throw new Error('Configure EXPO_PUBLIC_API_URL com a URL HTTPS da API para publicar o aplicativo.');
}
export const API_URL = configuredUrl || `http://${host}:3001`;

export async function enviarInscricao(dados: Record<string, string>) {
  try {
    const resposta = await fetch(`${API_URL}/participantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const resultado = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      const detalhes = Array.isArray(resultado.erros)
        ? resultado.erros.map((erro: { mensagem?: string }) => erro.mensagem).filter(Boolean).join('\n')
        : '';
      throw new Error(detalhes || resultado.mensagem || 'Não foi possível enviar a inscrição.');
    }
    return resultado;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && ['Network request failed', 'fetch failed', 'Failed to fetch'].includes(error.message))) {
      throw new Error('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente em alguns instantes.');
    }
    if (error instanceof Error) throw error;
    throw new Error('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente em alguns instantes.');
  }
}
