import { Platform } from 'react-native';

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { resolveApiUrl } from '../shared/api-url';

export const API_URL = resolveApiUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  apiPort: process.env.EXPO_PUBLIC_API_PORT || 3001,
  hostUri: Constants.expoConfig?.hostUri,
  platform: Platform.OS,
  physicalDevice: Device.isDevice,
  development: __DEV__,
  webHostname: typeof window !== 'undefined' ? window.location?.hostname : undefined,
});

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
