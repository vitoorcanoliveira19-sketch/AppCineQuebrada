import type { Href } from 'expo-router';

type Navegacao = { canGoBack(): boolean; back(): void; replace(destino: Href): void };

export function voltarComFallback(
  router: Navegacao,
  destino: Href = '/',
) {
  if (router.canGoBack()) router.back();
  else router.replace(destino);
}
