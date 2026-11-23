import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { API_URL } from './api';

const TOKEN_KEY = 'cinequebrada.auth.token';
const WEB_SESSION = 'cookie-session';
let csrfToken: string | null = null;
export type UsuarioInterno = { id: number; nome: string; email: string; papel: 'administrador' | 'educador'; educadorId?: number };
export type PerfilSessao = { usuario: UsuarioInterno; csrfToken: string };
function removerTokenLegado() {
  // Only removes credentials left by earlier versions; never stores web credentials.
  if (Platform.OS === 'web') globalThis.localStorage?.removeItem(TOKEN_KEY);
}
export async function guardarToken(token?: string) {
  if (Platform.OS !== 'web' && token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  removerTokenLegado();
}
export async function lerToken() {
  if (Platform.OS !== 'web') return SecureStore.getItemAsync(TOKEN_KEY);
  removerTokenLegado();
  let response: Response;
  try { response = await fetch(`${API_URL}/auth/me`, { credentials: 'include' }); }
  catch { return WEB_SESSION; }
  if (response.status === 401) { csrfToken = null; return null; }
  if (!response.ok) throw new Error('Não foi possível verificar a sessão. Tente novamente.');
  const perfil = await response.json() as PerfilSessao;
  csrfToken = perfil.csrfToken;
  return WEB_SESSION;
}
export async function entrar(email: string, senha: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', credentials: Platform.OS === 'web' ? 'include' : 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), senha, cliente: Platform.OS === 'web' ? 'web' : 'native' }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.mensagem || 'Não foi possível entrar.');
  csrfToken = data.csrfToken;
  await guardarToken(data.token);
  return data as PerfilSessao;
}
export async function apagarToken() {
  const token = Platform.OS === 'web' ? WEB_SESSION : await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    try { await requisicaoInterna('/auth/logout', token, { method: 'POST' }); }
    catch (error) {
      // A 401 already means the server session is unusable. Network failures must
      // remain visible instead of falsely reporting a successful logout.
      if (!(error instanceof ErroSessao && error.status === 401)) throw error;
    }
  }
  csrfToken = null;
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(TOKEN_KEY);
  removerTokenLegado();
}
export class ErroSessao extends Error {
  constructor(message: string, public status: number, public codigo?: string) { super(message); }
}
export async function requisicaoInterna(path: string, token: string, options: RequestInit = {}) {
  const web = Platform.OS === 'web';
  const method = (options.method || 'GET').toUpperCase();
  if (web && !['GET', 'HEAD', 'OPTIONS'].includes(method) && !csrfToken) {
    const current = await lerToken();
    if (!current) throw new ErroSessao('Sessão expirada. Entre novamente.', 401);
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options, credentials: web ? 'include' : 'omit',
    headers: { 'Content-Type': 'application/json', ...(!web ? { Authorization: `Bearer ${token}` } : {}),
      ...(web && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (data.csrfToken) csrfToken = data.csrfToken;
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/senha') {
      csrfToken = null;
      if (!web) await SecureStore.deleteItemAsync(TOKEN_KEY);
      removerTokenLegado();
      router.replace('/login');
    }
    const detalhes = Array.isArray(data.erros) ? data.erros.map((erro: { mensagem?: string }) => erro.mensagem).filter(Boolean).join('\n') : '';
    throw new ErroSessao(detalhes || data.mensagem || 'Não foi possível concluir a ação.', response.status, data.codigo);
  }
  return data;
}
