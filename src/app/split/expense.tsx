import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AddChip, ChipWrap, PersonChip, chipColor } from '@/components/split/person-chips';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useSplitStore } from '@/stores/split-store';
import { pickContact } from '@/utils/contacts';
import { formatCurrency, sanitizeNumericInput } from '@/utils/format';
import { newId } from '@/utils/id';
import { normalizePhone } from '@/utils/phone';
import { moneyInput, roundMoney, spreadDutch, SPLIT_SELF } from '@/utils/split-engine';

type Guest = { key: string; name: string; phone?: string; userId?: string };

export default function AddExpenseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const categories = useBudgetStore((s) => s.categories);
  const {
    members,
    draft,
    pendingPerson,
    setPendingPerson,
    addExpense,
    loadSplit,
  } = useSplitStore();

  const groupMembers = useMemo(
    () => members.filter((m) => m.groupId === groupId && !m.leftAt),
    [members, groupId],
  );
  const self = groupMembers.find((m) => m.isSelf);

  const [amount, setAmount] = useState(draft?.amount ? String(draft.amount) : '');
  const [merchant, setMerchant] = useState(draft?.merchant ?? '');
  const [category, setCategory] = useState(draft?.category ?? '');
  const [catOpen, setCatOpen] = useState(false);
  const [paidById, setPaidById] = useState(self?.id ?? SPLIT_SELF);
  const [selected, setSelected] = useState<string[]>(() =>
    groupId ? groupMembers.map((m) => m.id) : [SPLIT_SELF],
  );
  const [guests, setGuests] = useState<Guest[]>([]);
  const [mode, setMode] = useState<'equal' | 'dutch'>('equal');
  const [dutch, setDutch] = useState<Record<string, string>>({});
  const [dutchLocked, setDutchLocked] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId || !self) return;
    setPaidById((id) => (id === SPLIT_SELF ? self.id : id));
    setSelected((ids) => {
      if (ids.length === 0 || (ids.length === 1 && ids[0] === SPLIT_SELF)) {
        return groupMembers.map((m) => m.id);
      }
      return ids;
    });
  }, [groupId, self, groupMembers]);

  useFocusEffect(
    useCallback(() => {
      loadSplit();
      const pending = useSplitStore.getState().pendingPerson;
      if (!pending) return;
      setGuests((prev) => {
        const phone = pending.phone ? normalizePhone(pending.phone) : undefined;
        if (phone && prev.some((g) => g.phone === phone)) return prev;
        if (prev.some((g) => g.name === pending.name && !phone)) return prev;
        return [...prev, { key: newId(), name: pending.name, phone, userId: pending.userId }];
      });
      if (groupId) {
        const existing = useSplitStore
          .getState()
          .members.filter((m) => m.groupId === groupId && !m.isSelf);
        const pendingPhone = pending.phone;
        const match = pendingPhone
          ? existing.find((m) => m.phone === normalizePhone(pendingPhone))
          : undefined;
        if (match) {
          setSelected((ids) => (ids.includes(match.id) ? ids : [...ids, match.id]));
        }
      }
      setPendingPerson(null);
    }, [groupId, loadSplit, setPendingPerson]),
  );

  const addGuest = (name: string, phone?: string) => {
    const nPhone = phone ? normalizePhone(phone) : undefined;
    if (nPhone) {
      const existing = groupMembers.find((m) => m.phone === nPhone);
      if (existing) {
        setSelected((ids) => (ids.includes(existing.id) ? ids : [...ids, existing.id]));
        return;
      }
      if (guests.some((g) => g.phone === nPhone)) return;
    }
    setGuests((prev) => [...prev, { key: newId(), name, phone: nPhone }]);
  };

  const total = parseFloat(amount) || 0;
  const dutchKeys = useMemo(
    () => [...selected, ...guests.map((g) => g.key)],
    [selected, guests],
  );

  const applyDutch = useCallback(
    (locked: Record<string, number>, editingKey?: string, editingRaw?: string) => {
      const spread = spreadDutch(total, dutchKeys, locked);
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(spread)) next[k] = moneyInput(v);
      if (editingKey !== undefined) next[editingKey] = editingRaw ?? '';
      setDutch(next);
    },
    [total, dutchKeys],
  );

  const lockedRef = useRef(dutchLocked);
  lockedRef.current = dutchLocked;
  useEffect(() => {
    if (mode !== 'dutch') return;
    applyDutch(lockedRef.current);
  }, [mode, total, dutchKeys, applyDutch]);

  const onDutchChange = (key: string, raw: string) => {
    const nextLocked = { ...dutchLocked };
    if (raw === '') delete nextLocked[key];
    else nextLocked[key] = parseFloat(raw) || 0;
    setDutchLocked(nextLocked);
    applyDutch(nextLocked, key, raw);
  };

  const dutchSum = dutchKeys.reduce((s, k) => s + (parseFloat(dutch[k]) || 0), 0);
  const leftover = roundMoney(total - dutchSum);
  const inCount = selected.length + guests.length;
  const payerIn =
    selected.includes(paidById) || (paidById === SPLIT_SELF && selected.includes(SPLIT_SELF));

  const peopleBase = useMemo(
    () =>
      groupMembers.length
        ? groupMembers
        : [{ id: SPLIT_SELF, displayName: 'You', isSelf: true as const }],
    [groupMembers],
  );
  const canSave =
    total > 0 &&
    inCount > 0 &&
    (groupId ? true : guests.length > 0) &&
    (mode !== 'dutch' || leftover >= 0);

  const handleSave = () => {
    if (!canSave) return;
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const dutchAmounts: Record<string, number> = {};
      const guestPayload = guests.map((g) => {
        const d = parseFloat(dutch[g.key]);
        return { name: g.name, phone: g.phone, userId: g.userId, dutch: Number.isFinite(d) ? d : 0 };
      });
      if (mode === 'dutch') {
        for (const id of selected) dutchAmounts[id] = parseFloat(dutch[id]) || 0;
      }
      const id = addExpense({
        groupId,
        amount: total,
        merchant,
        category: category || undefined,
        note: draft?.note,
        paidById: paidById === SPLIT_SELF ? undefined : paidById,
        inMemberIds: selected,
        guests: guestPayload,
        mode,
        dutchAmounts: mode === 'dutch' ? dutchAmounts : undefined,
        occurredAt: draft?.paidAt,
      });
      if (groupId) router.back();
      else router.replace(`/split/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save that split.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.wrap, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>Expense</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(180)}>
          <Text style={styles.label}>AMOUNT</Text>
          <View style={styles.amountBox}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={amount}
              onChangeText={(t) => setAmount(sanitizeNumericInput(t))}
              keyboardType="numeric"
              accessibilityLabel="Amount"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(50).duration(200)}>
          <Text style={styles.label}>MERCHANT</Text>
          <TextInput
            style={styles.input}
            placeholder="BigBazaar"
            placeholderTextColor={Colors.textMuted}
            value={merchant}
            onChangeText={setMerchant}
          />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(90).duration(180)}>
          <Text style={styles.label}>PAID BY</Text>
          <ChipWrap>
            {peopleBase.map((m, i) => (
              <PersonChip
                key={m.id}
                name={m.isSelf ? 'You' : m.displayName}
                color={chipColor(i)}
                selected={paidById === m.id}
                onPress={() => setPaidById(m.id)}
              />
            ))}
          </ChipWrap>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(130).duration(200)}>
          <Text style={styles.label}>WHO'S IN</Text>
          <ChipWrap>
            {peopleBase.map((m, i) => {
              const on = selected.includes(m.id);
              return (
                <PersonChip
                  key={m.id}
                  name={m.isSelf ? 'You' : m.displayName}
                  color={chipColor(i)}
                  selected={on}
                  onPress={() =>
                    setSelected((ids) => (on ? ids.filter((x) => x !== m.id) : [...ids, m.id]))
                  }
                />
              );
            })}
            {guests.map((g, i) => (
              <PersonChip
                key={g.key}
                name={g.name}
                color={chipColor(peopleBase.length + i)}
                selected
                onPress={() => setGuests((prev) => prev.filter((x) => x.key !== g.key))}
                onRemove={() => setGuests((prev) => prev.filter((x) => x.key !== g.key))}
              />
            ))}
            {!groupId ? (
              <AddChip
                onPress={async () => {
                  const picked = await pickContact();
                  if (picked) addGuest(picked.name, picked.phone);
                }}
              />
            ) : null}
          </ChipWrap>
          {!payerIn ? (
            <Text style={styles.hint}>Payer isn’t in. They’re covering the whole bill.</Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeIn.delay(170).duration(160)}>
          <View style={styles.tabs}>
            {(['equal', 'dutch'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  setMode(t);
                  if (t === 'dutch') {
                    setDutchLocked({});
                    applyDutch({});
                  }
                }}
                style={[styles.tab, mode === t && styles.tabOn]}>
                <Text style={[styles.tabText, mode === t && styles.tabTextOn]}>
                  {t === 'equal' ? 'Equal' : 'Dutch'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {mode === 'dutch' ? (
          <Animated.View entering={FadeIn.duration(180)} style={styles.dutch}>
            {(groupMembers.length ? groupMembers.filter((m) => selected.includes(m.id)) : []).map((m) => (
              <DutchRow
                key={m.id}
                label={m.isSelf ? 'You' : m.displayName}
                value={dutch[m.id] ?? ''}
                onChange={(v) => onDutchChange(m.id, v)}
              />
            ))}
            {!groupMembers.length && selected.includes(SPLIT_SELF) ? (
              <DutchRow
                label="You"
                value={dutch[SPLIT_SELF] ?? ''}
                onChange={(v) => onDutchChange(SPLIT_SELF, v)}
              />
            ) : null}
            {guests.map((g) => (
              <DutchRow
                key={g.key}
                label={g.name}
                value={dutch[g.key] ?? ''}
                onChange={(v) => onDutchChange(g.key, v)}
              />
            ))}
            <Text style={[styles.hint, leftover < 0 && { color: Colors.exceeded }]}>
              {leftover < 0
                ? 'Over the total. Can’t save.'
                : leftover > 0.009
                  ? `${formatCurrency(leftover)} leftover stays on whoever paid.`
                  : 'Adds up.'}
            </Text>
          </Animated.View>
        ) : inCount > 0 && total > 0 ? (
          <Text style={styles.hint}>
            {formatCurrency(roundMoney(total / inCount))} each.
          </Text>
        ) : null}

        <Pressable onPress={() => setCatOpen((v) => !v)}>
          <Text style={styles.label}>{catOpen ? 'CATEGORY' : 'CATEGORY (OPTIONAL)'}</Text>
        </Pressable>
        {catOpen ? (
          <View style={styles.chips}>
            {categories.map((c) => {
              const on = category === c.name;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategory(on ? '' : c.name)}
                  style={[styles.chip, on && { backgroundColor: c.color, borderColor: c.color }]}>
                  <Text style={[styles.chipText, on && { color: Colors.black }]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <Animated.View entering={FadeIn.delay(220).duration(200)} style={{ marginTop: Spacing.lg }}>
          <NeoButton title="Split it" variant="primary" size="lg" disabled={!canSave} onPress={handleSave} />
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DutchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.dutchRow}>
      <Text style={styles.dutchName}>{label}</Text>
      <View style={styles.dutchBox}>
        <Text style={styles.dutchCur}>₹</Text>
        <TextInput
          style={styles.dutchInput}
          value={value}
          onChangeText={(t) => onChange(sanitizeNumericInput(t))}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { fontFamily: Fonts.display, fontSize: FontSizes.xl, color: Colors.white },
  body: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  label: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
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
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.thick,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
  },
  currency: { fontFamily: Fonts.display, fontSize: FontSizes.xxl, color: Colors.accent, marginRight: Spacing.sm },
  amountInput: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    paddingVertical: Spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 40,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
  },
  chipOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.textSecondary },
  chipTextOn: { color: Colors.white },
  addChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  hint: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: Spacing.xs },
  tabs: { flexDirection: 'row', gap: Spacing.sm },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 40,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
  },
  tabOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.textMuted },
  tabTextOn: { color: Colors.white },
  dutch: { gap: Spacing.sm },
  dutchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dutchName: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.white, flex: 1 },
  dutchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    minWidth: 120,
  },
  dutchCur: { fontFamily: Fonts.display, fontSize: FontSizes.md, color: Colors.accent },
  dutchInput: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    paddingVertical: Spacing.xs,
    textAlign: 'right',
  },
  err: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.exceeded },
});
