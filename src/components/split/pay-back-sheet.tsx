import { Banknote, Landmark } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeoButton } from '@/components/ui/neo-button';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import type { PayMethod, SplitMember } from '@/types';
import { formatCurrency, sanitizeNumericInput } from '@/utils/format';
import { moneyInput, roundMoney } from '@/utils/split-engine';

export function PayBackSheet({
  visible,
  onClose,
  them,
  remaining,
  onPay,
}: {
  visible: boolean;
  onClose: () => void;
  them: SplitMember;
  remaining: { amount: number; youOwe: boolean };
  onPay: (amount: number, method: PayMethod, fromSelf: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const cap = remaining.amount;
  const half = cap > 0 ? roundMoney(cap / 2) : 0;
  const [custom, setCustom] = useState('');
  const [pick, setPick] = useState<'full' | 'half' | 'custom'>('full');

  const amount = useMemo(() => {
    if (pick === 'full') return cap;
    if (pick === 'half') return half;
    const n = parseFloat(custom);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, cap);
  }, [pick, custom, cap, half]);

  const letter = (them.displayName.trim()[0] || '?').toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            {cap < 0.01 ? (
              <>
                <Text style={styles.kicker}>SETTLED</Text>
                <Text style={styles.name}>{them.displayName}</Text>
                <NeoButton title="Close" variant="outline" size="lg" onPress={onClose} />
              </>
            ) : (
              <>
                <View style={styles.who}>
                  <View style={styles.face}>
                    <Text style={styles.letter}>{letter}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {them.displayName}
                    </Text>
                    <Text style={styles.kicker}>
                      {remaining.youOwe ? 'YOU OWE' : 'OWES YOU'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.hero}>{formatCurrency(amount || cap)}</Text>
                <Text style={styles.capHint}>of {formatCurrency(cap)}</Text>

                <View style={styles.pills}>
                  <Pressable
                    onPress={() => setPick('full')}
                    style={[styles.pill, pick === 'full' && styles.pillOn]}
                    accessibilityRole="button"
                    accessibilityLabel="Full amount">
                    <Text style={[styles.pillTop, pick === 'full' && styles.pillTopOn]}>Full</Text>
                    <Text style={[styles.pillAmt, pick === 'full' && styles.pillAmtOn]}>
                      {formatCurrency(cap)}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPick('half')}
                    style={[styles.pill, pick === 'half' && styles.pillOn]}
                    accessibilityRole="button"
                    accessibilityLabel="Half amount">
                    <Text style={[styles.pillTop, pick === 'half' && styles.pillTopOn]}>Half</Text>
                    <Text style={[styles.pillAmt, pick === 'half' && styles.pillAmtOn]}>
                      {formatCurrency(half)}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>CUSTOM</Text>
                <View style={[styles.amountBox, pick === 'custom' && styles.amountBoxOn]}>
                  <Text style={styles.currency}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={pick === 'custom' ? custom : moneyInput(amount)}
                    onFocus={() => {
                      setPick('custom');
                      setCustom(amount > 0 ? moneyInput(amount) : '');
                    }}
                    onChangeText={(t) => {
                      setPick('custom');
                      setCustom(sanitizeNumericInput(t));
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    accessibilityLabel="Custom amount"
                  />
                </View>

                <View style={styles.actions}>
                  {remaining.youOwe ? (
                    <NeoButton
                      title="Pay UPI"
                      variant="primary"
                      size="lg"
                      disabled={amount <= 0 || !them.phone}
                      onPress={() => onPay(amount, 'upi', true)}
                      icon={<Landmark size={18} color={Colors.white} strokeWidth={2.5} />}
                    />
                  ) : (
                    <NeoButton
                      title="They paid UPI"
                      variant="primary"
                      size="lg"
                      disabled={amount <= 0}
                      onPress={() => onPay(amount, 'upi', false)}
                      icon={<Landmark size={18} color={Colors.white} strokeWidth={2.5} />}
                    />
                  )}
                  <NeoButton
                    title={remaining.youOwe ? 'Mark cash' : 'Got cash'}
                    variant="outline"
                    size="lg"
                    disabled={amount <= 0}
                    onPress={() => onPay(amount, 'cash', remaining.youOwe)}
                    icon={<Banknote size={18} color={Colors.white} strokeWidth={2.5} />}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.60)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  face: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.pink,
    borderWidth: Borders.thin,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontFamily: Fonts.display, fontSize: FontSizes.xl, color: Colors.black },
  name: { fontFamily: Fonts.display, fontSize: FontSizes.lg, color: Colors.white },
  kicker: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
  hero: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.hero,
    color: Colors.white,
  },
  capHint: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: -8 },
  pills: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    flex: 1,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 64,
    justifyContent: 'center',
  },
  pillOn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  pillTop: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  pillTopOn: { color: Colors.white },
  pillAmt: { fontFamily: Fonts.display, fontSize: FontSizes.lg, color: Colors.white, marginTop: 2 },
  pillAmtOn: { color: Colors.white },
  fieldLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.thick,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
  },
  amountBoxOn: { borderColor: Colors.accent },
  currency: { fontFamily: Fonts.display, fontSize: FontSizes.xxl, color: Colors.accent, marginRight: Spacing.sm },
  amountInput: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    paddingVertical: Spacing.sm,
  },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
