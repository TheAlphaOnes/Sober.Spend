import { NeoButton } from '@/components/ui/neo-button';
import { ContactPicker } from './contact-picker';
import { DutchSplitView } from './dutch-split-view';
import { EqualSplitView } from './equal-split-view';
import { ExactSplitView } from './exact-split-view';
import { GroupPickerChips } from './group-picker-chips';
import { GroupSetupSheet } from './group-setup-sheet';
import { PaidBySelector } from './paid-by-selector';
import { PercentSplitView } from './percent-split-view';
import { SplitPreview } from './split-preview';
import { SplitTypeTabs } from './split-type-tabs';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useSplitStore } from '@/stores/split-store';
import { calculateEqualShares } from '@/utils/split-engine';
import { sanitizeNumericInput } from '@/utils/format';
import type { Contact, PendingTransaction, SplitType } from '@/types';
import { SELF_CONTACT_ID } from '@/types';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface SplitSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  pendingTransaction?: PendingTransaction | null;
  onConfirm?: (splitExpenseId: number) => void;
}

type Mode = 'groups' | 'people';

export function SplitSetupSheet({ visible, onClose, pendingTransaction, onConfirm }: SplitSetupSheetProps) {
  const { contacts, groups, createSplitExpense, getGroupMembers } = useSplitStore();

  const [mode, setMode] = useState<Mode>('groups');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set([SELF_CONTACT_ID]));
  const [showGroupSetup, setShowGroupSetup] = useState(false);

  const [amount, setAmount] = useState(pendingTransaction?.amount.toString() || '');
  const [merchant, setMerchant] = useState(pendingTransaction?.merchant || '');
  const [category] = useState(pendingTransaction?.category || 'Other');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [paidById, setPaidById] = useState<number>(SELF_CONTACT_ID);

  // Split-specific state
  const [exactShares, setExactShares] = useState<Record<number, string>>({});
  const [percentShares, setPercentShares] = useState<Record<number, string>>({});
  const [orderAmounts, setOrderAmounts] = useState<Record<number, string>>({});
  const [sharedCharges, setSharedCharges] = useState('');

  // Reset state when sheet opens
  const handleOpen = () => {
    if (pendingTransaction) {
      setAmount(pendingTransaction.amount.toString());
      setMerchant(pendingTransaction.merchant);
    }
  };

  const involvedContacts: Contact[] = (() => {
    if (mode === 'groups' && selectedGroupId !== null) {
      return getGroupMembers(selectedGroupId);
    }
    return contacts.filter((c) => selectedContactIds.has(c.id) || c.isSelf);
  })();

  const totalAmount = parseFloat(amount) || 0;

  // Calculate shares based on split type
  const calculatedShares = (() => {
    if (involvedContacts.length === 0 || totalAmount <= 0) return [];

    if (splitType === 'equal') {
      const shares = calculateEqualShares(totalAmount, involvedContacts.length);
      return involvedContacts.map((c, i) => ({
        contactId: c.id,
        amount: shares[i] || 0,
      }));
    }

    if (splitType === 'exact') {
      return involvedContacts.map((c) => ({
        contactId: c.id,
        amount: parseFloat(exactShares[c.id] || '0') || 0,
      }));
    }

    if (splitType === 'percent') {
      return involvedContacts.map((c) => {
        const pct = parseFloat(percentShares[c.id] || '0') || 0;
        return {
          contactId: c.id,
          amount: Math.round((totalAmount * (pct / 100)) * 100) / 100,
        };
      });
    }

    // Dutch
    return involvedContacts.map((c) => {
      const order = parseFloat(orderAmounts[c.id] || '0') || 0;
      const charges = parseFloat(sharedCharges || '0') || 0;
      const subtotal = involvedContacts.reduce(
        (s, c) => s + (parseFloat(orderAmounts[c.id] || '0') || 0),
        0,
      );
      const proportion = subtotal > 0 ? order / subtotal : 1 / involvedContacts.length;
      return {
        contactId: c.id,
        amount: Math.round((order + charges * proportion) * 100) / 100,
        orderAmount: order,
      };
    });
  })();

  const yourShare = calculatedShares.find((s) => s.contactId === SELF_CONTACT_ID)?.amount || 0;
  const toCollect = calculatedShares
    .filter((s) => s.contactId !== SELF_CONTACT_ID)
    .reduce((sum, s) => sum + s.amount, 0);
  const paidByContact = involvedContacts.find((c) => c.id === paidById);
  const paidByName = paidByContact?.isSelf ? 'You' : paidByContact?.name || 'You';

  const toggleContact = (contactId: number) => {
    const next = new Set(selectedContactIds);
    if (next.has(contactId)) {
      if (contactId !== SELF_CONTACT_ID) next.delete(contactId);
    } else {
      next.add(contactId);
    }
    setSelectedContactIds(next);
  };

  const handleConfirm = () => {
    if (totalAmount <= 0 || involvedContacts.length < 2) return;

    // Validate exact/percent
    if (splitType === 'exact') {
      const sum = calculatedShares.reduce((s, sh) => s + sh.amount, 0);
      if (Math.abs(sum - totalAmount) > 0.01) return;
    }
    if (splitType === 'percent') {
      const sum = involvedContacts.reduce(
        (s, c) => s + (parseFloat(percentShares[c.id] || '0') || 0),
        0,
      );
      if (Math.abs(sum - 100) > 0.5) return;
    }

    const splitExpenseId = createSplitExpense({
      totalAmount,
      merchant: merchant.trim() || 'Unknown',
      category,
      paidByContactId: paidById,
      groupId: mode === 'groups' ? selectedGroupId : null,
      splitType,
      shares: calculatedShares.map((s) => {
        const orderAmount =
          'orderAmount' in s && typeof s.orderAmount === 'number'
            ? s.orderAmount
            : undefined;
        return {
          contactId: s.contactId,
          amount: s.amount,
          orderAmount,
        };
      }),
    });

    // Open UPI to pay merchant if user is paying
    if (paidById === SELF_CONTACT_ID && pendingTransaction?.pa) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(pendingTransaction.pa)}&pn=${encodeURIComponent(merchant)}&am=${totalAmount}`;
      Linking.openURL(upiUrl).catch(() => {});
    }

    onConfirm?.(splitExpenseId);
    handleClose();
  };

  const handleClose = () => {
    setAmount('');
    setMerchant('');
    setSelectedGroupId(null);
    setSelectedContactIds(new Set([SELF_CONTACT_ID]));
    setSplitType('equal');
    setPaidById(SELF_CONTACT_ID);
    setExactShares({});
    setPercentShares({});
    setOrderAmounts({});
    setSharedCharges('');
    onClose();
  };

  const canConfirm = totalAmount > 0 && involvedContacts.length >= 2;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose} onShow={handleOpen}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>SPLIT IT</Text>
              <Pressable onPress={handleClose} style={styles.closeBtn}>
                <X size={20} color={Colors.textSecondary} strokeWidth={2.5} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
              {/* Amount + Merchant */}
              <View style={styles.amountBox}>
                <Text style={styles.currency}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(v) => setAmount(sanitizeNumericInput(v))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <TextInput
                style={styles.merchantInput}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Merchant"
                placeholderTextColor={Colors.textMuted}
              />

              {/* Mode toggle */}
              <View style={styles.modeToggle}>
                {(['groups', 'people'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setMode(m)}
                    style={[styles.modeTab, mode === m && styles.modeTabActive]}>
                    <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
                      {m === 'groups' ? 'GROUPS' : 'PEOPLE'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Group/Contact selection */}
              {mode === 'groups' ? (
                <View style={styles.section}>
                  <GroupPickerChips
                    groups={groups}
                    selectedId={selectedGroupId}
                    onSelect={(id) => {
                      setSelectedGroupId(id);
                      const members = getGroupMembers(id);
                      setSelectedContactIds(new Set(members.map((m) => m.id)));
                    }}
                    onCreateNew={() => setShowGroupSetup(true)}
                  />
                  {selectedGroupId !== null && (
                    <View style={styles.memberList}>
                      {getGroupMembers(selectedGroupId).map((m) => (
                        <View key={m.id} style={styles.memberChip}>
                          <Text style={styles.memberChipText}>
                            {m.isSelf ? 'You' : m.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.section}>
                  <ContactPicker
                    contacts={contacts}
                    selectedIds={selectedContactIds}
                    onToggle={toggleContact}
                  />
                </View>
              )}

              {/* Split type tabs */}
              <Text style={styles.sectionLabel}>HOW TO SPLIT</Text>
              <SplitTypeTabs activeType={splitType} onChange={setSplitType} />

              {/* Split view */}
              <View style={styles.splitView}>
                {splitType === 'equal' && (
                  <EqualSplitView totalAmount={totalAmount} contacts={involvedContacts} />
                )}
                {splitType === 'exact' && (
                  <ExactSplitView
                    totalAmount={totalAmount}
                    contacts={involvedContacts}
                    shares={exactShares}
                    onChange={(id, val) =>
                      setExactShares((prev) => ({ ...prev, [id]: val }))
                    }
                  />
                )}
                {splitType === 'percent' && (
                  <PercentSplitView
                    totalAmount={totalAmount}
                    contacts={involvedContacts}
                    percents={percentShares}
                    onChange={(id, val) =>
                      setPercentShares((prev) => ({ ...prev, [id]: val }))
                    }
                  />
                )}
                {splitType === 'dutch' && (
                  <DutchSplitView
                    totalAmount={totalAmount}
                    contacts={involvedContacts}
                    orderAmounts={orderAmounts}
                    sharedCharges={sharedCharges}
                    onOrderChange={(id, val) =>
                      setOrderAmounts((prev) => ({ ...prev, [id]: val }))
                    }
                    onSharedChargesChange={setSharedCharges}
                  />
                )}
              </View>

              {/* Paid by */}
              <Text style={styles.sectionLabel}>WHO PAID?</Text>
              <PaidBySelector
                contacts={involvedContacts}
                selectedId={paidById}
                onChange={setPaidById}
              />

              {/* Preview */}
              <View style={styles.previewWrap}>
                <SplitPreview
                  totalAmount={totalAmount}
                  yourShare={yourShare}
                  toCollect={paidById === SELF_CONTACT_ID ? toCollect : 0}
                  paidByName={paidByName}
                />
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <NeoButton
                title="Confirm & Pay"
                variant="primary"
                size="lg"
                onPress={handleConfirm}
                disabled={!canConfirm}
              />
            </View>
          </View>
        </View>
      </Modal>

      <GroupSetupSheet
        visible={showGroupSetup}
        onClose={() => setShowGroupSetup(false)}
        onCreated={(groupId) => {
          setShowGroupSetup(false);
          setSelectedGroupId(groupId);
          setMode('groups');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: Borders.thick,
    borderBottomWidth: 0,
    borderColor: Colors.black,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  scroll: {
    maxHeight: 500,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.thick,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  currency: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.accent,
    marginRight: Spacing.sm,
  },
  amountInput: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  merchantInput: {
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.bg,
    borderRadius: Radii.pill,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    padding: 3,
    marginBottom: Spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radii.pill,
  },
  modeTabActive: {
    backgroundColor: Colors.accent,
  },
  modeTabText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  modeTabTextActive: {
    color: Colors.white,
  },
  section: {
    marginBottom: Spacing.md,
  },
  memberList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  memberChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    backgroundColor: Colors.bg,
  },
  memberChipText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  splitView: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  previewWrap: {
    marginTop: Spacing.sm,
  },
  actions: {
    marginTop: Spacing.lg,
  },
});
