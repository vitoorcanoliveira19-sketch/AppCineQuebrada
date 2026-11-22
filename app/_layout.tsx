import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="seguranca" options={{ title: 'Segurança da conta' }} />
        <Stack.Screen name="contas" options={{ title: 'Contas da equipe' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="login" options={{ title: 'Acesso da equipe' }} />
        <Stack.Screen name="equipe" options={{ title: 'Área da equipe' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
