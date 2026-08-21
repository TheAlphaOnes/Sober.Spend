import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  QrCode,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useBudgetStore } from '@/stores/budget-store';
import { useExpenseStore } from '@/stores/expense-store';
import type { CategoryId } from '@/types';
import { useSplitStore } from '@/stores/split-store';
import { parseUPIString, upiToPendingTransaction } from '@/utils/upi-parser';
import { sanitizeNumericInput } from '@/utils/format';
import { getIcon } from '@/utils/icons';
import { parseSplitQR } from '@/utils/split-qr';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const splitMode = mode === 'split';
  const setPending = useExpenseStore((s) => s.setPendingTransaction);
  const categories = useBudgetStore((s) => s.categories);
  const { scanIntent, setScanIntent, setPendingPerson, addMember } = useSplitStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryName, setCategoryName] = useState<CategoryId | ''>('');

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
    }, []),
  );

  const handleScanned = (data: string) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const split = parseSplitQR(data);
    if (split?.type === 'join') {
      setScanIntent(null);
      router.replace(`/split/join?t=${encodeURIComponent(split.token)}`);
      return;
    }
    if (split?.type === 'me') {
      const person = { name: split.name, phone: split.phone, userId: split.userId };
      const intent = scanIntent;
      setScanIntent(null);
      if (intent?.kind === 'group') {
        addMember(intent.groupId, person.name, person.phone, person.userId);
        router.back();
        return;
      }
      setPendingPerson(person);
      if (intent?.kind === 'expense') {
        router.back();
        return;
      }
      router.replace('/split/expense');
      return;
    }

    const upiData = parseUPIString(data);
    if (upiData) {
      const pending = upiToPendingTransaction(upiData, categories);
      setPending(pending);
      router.push('/decision');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setScanned(false);
      if (!splitMode) setShowManual(true);
    }
  };

  const handleSimulate = () => {
    handleScanned(
      'upi://pay?pa=store@bank&pn=BigBazaar&mc=5411&am=1250.00&tn=Groceries',
    );
  };

  const handleManualProceed = () => {
    if (!merchant.trim() || !amount.trim() || !categoryName) return;
    setPending({
      merchant: merchant.trim(),
      amount: parseFloat(amount),
      category: categoryName,
      note: note.trim() || undefined,
    });
    router.push('/decision');
  };

  // --- Camera view ---
  if (!showManual && permission?.granted) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => handleScanned(data)}
        />

        {/* Top bar — close button */}
        <View style={[styles.cameraOverlayTop, { paddingTop: insets.top + Spacing.md }]}>
          <NeoBackButton size={20} variant="overlay" />
        </View>

        {/* Scan target frame — centered */}
        <View style={styles.scanTargetWrapper} pointerEvents="none">
          <View style={styles.scanTarget} />
          <Text style={styles.scanHint}>
            {splitMode ? 'Scan their QR' : 'Put the QR here, we got you'}
          </Text>
        </View>

        {/* Bottom controls */}
        <View style={[styles.cameraOverlayBottom, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Pressable style={styles.manualBtn} onPress={() => setShowManual(true)}>
            <Text style={styles.manualBtnText}>Type it yourself</Text>
          </Pressable>
          <Pressable style={styles.simulateBtn} onPress={handleSimulate}>
            <QrCode size={16} color={Colors.black} strokeWidth={2.5} />
            <Text style={styles.simulateBtnText}>Fake a scan</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- Manual entry form ---
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>New Drop</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Merchant */}
        <Animated.View entering={FadeIn.duration(200)}>
          <Text style={styles.inputLabel}>MERCHANT</Text>
          <TextInput
            style={styles.input}
            placeholder="Where'd the money go?"
            placeholderTextColor={Colors.textMuted}
            value={merchant}
            onChangeText={setMerchant}
          />
        </Animated.View>

        {/* Amount — big and prominent */}
        <Animated.View entering={FadeIn.delay(80).duration(200)}>
          <Text style={styles.inputLabel}>AMOUNT</Text>
          <View style={styles.amountBox}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={amount}
              onChangeText={(t) => setAmount(sanitizeNumericInput(t))}
              keyboardType="numeric"
            />
          </View>
        </Animated.View>

        {/* Category chips */}
        <Animated.View entering={FadeIn.delay(120).duration(200)}>
          <Text style={styles.inputLabel}>CATEGORY</Text>
          <View style={styles.chipGrid}>
            {categories.map((cat) => {
              const isSelected = categoryName === cat.name;
              const LucideIcon = getIcon(cat.icon);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategoryName(cat.name);
                  }}
                  style={[
                    styles.chip,
                    { borderColor: isSelected ? cat.color : Colors.border },
                    isSelected && { backgroundColor: cat.color },
                  ]}>
                  <LucideIcon
                    size={14}
                    color={isSelected ? Colors.black : Colors.textSecondary}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? Colors.black : Colors.textSecondary },
                    ]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Note */}
        <Animated.View entering={FadeIn.delay(150).duration(220)}>
          <Text style={styles.inputLabel}>NOTE (IF YOU CARE)</Text>
          <TextInput
            style={styles.input}
            placeholder="Why'd you spend this?"
            placeholderTextColor={Colors.textMuted}
            value={note}
            onChangeText={setNote}
          />
        </Animated.View>

        {/* Submit */}
        <Animated.View
          entering={FadeIn.delay(300).duration(250)}
          style={styles.submitRow}>
          <NeoButton
            title="Let's See the Damage"
            variant="primary"
            size="lg"
            onPress={handleManualProceed}
            disabled={!merchant.trim() || !amount.trim() || !categoryName}
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // --- Container ---
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },

  // --- Camera overlay ---
  cameraOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: Borders.thin,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTargetWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTarget: {
    width: 240,
    height: 240,
    borderWidth: Borders.thick,
    borderColor: Colors.accent,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  scanHint: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.5)',
    marginTop: Spacing.md,
  },
  cameraOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.md,
    zIndex: 10,
  },
  manualBtn: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.pill,
    borderWidth: Borders.thin,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  manualBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.pill,
    borderWidth: Borders.medium,
    borderColor: Colors.black,
  },
  simulateBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },

  // --- Manual form ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  inputLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
    marginTop: Spacing.lg,
  },
  input: {
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  // --- Amount box — prominent, neo-brutalist ---
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.thick,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  currencySymbol: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.accent,
    marginRight: Spacing.sm,
  },
  amountInput: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    borderWidth: 0,
    backgroundColor: 'transparent',
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  // --- Category chips ---
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: Borders.medium,
    borderRadius: Radii.pill,
  },
  chipText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
  },
  submitRow: {
    marginTop: Spacing.xxl,
  },
});
