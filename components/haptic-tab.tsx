import { PlatformPressable } from 'expo-router/react-navigation';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';

type HapticTabProps = Omit<ComponentProps<typeof PlatformPressable>, 'pressColor'> & {
  pressColor?: unknown;
};

export function HapticTab({ onPressIn, pressColor, ...rest }: HapticTabProps) {
  return (
    <PlatformPressable
      {...rest}
      pressColor={typeof pressColor === 'string' ? pressColor : undefined}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
    />
  );
}
