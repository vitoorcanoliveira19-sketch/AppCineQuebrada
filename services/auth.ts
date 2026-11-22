import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './api';

const TOKEN_KEY = 'cinequebrada.auth.token';
export type UsuarioInterno = { id: number; nome: string; email: string; papel: 'administrador' | 'educador' };

export async function guardarToken(token: string) {
  if (Platform.OS !== 'web') await SecureStore.setItemAsync(TOKEN_KEY, token);
  else globalThis.localStorage?.setItem(TOKEN_KEY, token);
}
export async function lerToken() {
  return Platform.OS === 'web' ? (globalThis.localStorage?.getItem(TOKEN_KEY) ?? null) : SecureStore.getItemAsync(TOKEN_KEY);
}
export async function apagarToken() {
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(TOKEN_KEY);
  else globalThis.localStorage?.removeItem(TOKEN_KEY);
}
export async function requisicaoInterna(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detalhes = Array.isArray(data.erros) ? data.erros.map((erro: { mensagem?: string }) => erro.mensagem).filter(Boolean).join('\n') : '';
    throw new Error(detalhes || data.mensagem || 'Não foi possível concluir a ação.');
  }
  return data;
}
