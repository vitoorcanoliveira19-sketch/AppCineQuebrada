# Instruções para agentes

Este projeto usa Expo SDK 58, Expo Router e backend Express/MySQL. Preserve as proteções descritas em SECURITY-UPGRADE.md.

## Disponibilização por QR no Expo Go

Quando a tarefa envolver QR Code, Expo Go, LAN ou teste em celular real, leia e siga [EXPO-GO-AGENT.md](EXPO-GO-AGENT.md).

- Valide separadamente o acesso do celular ao Metro e à API. O túnel do Expo não publica a API.
- Use os comandos expo:check, expo:lan ou expo:tunnel. Não entregue localhost, 127.0.0.1 ou 10.0.2.2 como endereço do computador para um aparelho físico.
- Mantenha SDK 58 e abra o link no Expo Go; não troque silenciosamente por build de desenvolvimento ou por versão diferente de SDK.
- Não declare homologação física com base em Android Studio, navegador, QR gerado ou teste automatizado. Informe aparelho, rede e operações realmente verificadas; sem acesso ao celular, marque essa etapa como pendente.
- Não desative autenticação, MFA, limites ou verificação TLS para fazer uma demonstração funcionar. Não publique MySQL nem segredos EXPO_PUBLIC.
- Os arquivos temporários do QR ficam em .expo/expo-go e não entram no Git. Mantenha os processos necessários ativos durante a demonstração; registre quando encerrar.

## Verificação de mudanças

Na raiz: npm test, npm run typecheck, npm run lint e npx expo install --check. Para mudanças em código compartilhado/nativo, exporte web/Android/iOS com uma EXPO_PUBLIC_API_URL HTTPS de teste.

Para alterações no backend, rode a suíte com um banco local descartável pelas variáveis TEST_DB_*. Nunca use banco real nos testes. O CI usa MySQL 8.0.
