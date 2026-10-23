import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardEvent,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  /** Pinned below the scroll area; rides on top of the keyboard (e.g. a Save button). */
  footer?: React.ReactNode;
  /** Style for the outer wrapper (the ScrollView's own `style` is applied to the scroll area). */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * ScrollView that keeps the focused input visible above the keyboard.
 * - The wrapper shrinks the viewport (and lifts `footer`) while the keyboard is open.
 * - On iOS the scroll view also scrolls the focused field into view.
 * - Taps on buttons work while the keyboard is up, and dragging the content dismisses it.
 */
export default function KeyboardAwareScrollView({
  footer,
  containerStyle,
  children,
  ...scrollProps
}: KeyboardAwareScrollViewProps) {
  const containerRef = useRef<View>(null);
  const keyboardTop = useRef<number | null>(null);
  const [inset, setInset] = useState(0);

  // How far the keyboard overlaps the bottom of this view, measured in window coordinates so it
  // stays correct regardless of headers, modal presentation or safe areas above the view.
  const updateInset = useCallback(() => {
    if (keyboardTop.current === null) {
      setInset(0);
      return;
    }
    containerRef.current?.measureInWindow((_x, y, _w, height) => {
      if (keyboardTop.current === null) return;
      setInset(Math.max(0, Math.round(y + height - keyboardTop.current)));
    });
  }, []);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      keyboardTop.current = e.endCoordinates.screenY;
      updateInset();
    };
    const onHide = () => {
      keyboardTop.current = null;
      setInset(0);
    };
    const subs =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', onShow),
            Keyboard.addListener('keyboardWillHide', onHide),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', onShow),
            Keyboard.addListener('keyboardDidHide', onHide),
          ];
    return () => subs.forEach((sub) => sub.remove());
  }, [updateInset]);

  return (
    <View
      ref={containerRef}
      collapsable={false}
      style={[styles.container, containerStyle, { paddingBottom: inset }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
        {...scrollProps}
        style={[styles.scroll, scrollProps.style]}
      >
        {children}
      </ScrollView>
      {footer ? <View>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
});
