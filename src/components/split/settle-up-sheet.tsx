import { NeoButton } from '@/components/ui/neo-button';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { generateSettlementLink } from '@/utils/split-engine';
import { formatCurrency } from '@/utils/format';
import type { Contact } from '@/types';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Banknote, X } from 'lucide-react-native';

interface SettleUpSheetProps {
  visible: boolean;
  onClose: () => void;
  contact: Contact | null;
  balance: number;
  onSettled: (method: 'upi' | 'cash') => void;
}

export function SettleUpSheet({ visible, onClose, contact, balance, onSettled }: SettleUpSheetProps) {
  const [showVpaPicker, setShowVpaPicker] = useState(false);
  if (!contact) return null;

  const isOwed = balance > 0;
  const amount = Math.abs(balance);
  const action = isOwed ? 'Request' : 'Pay';

  const handleUpi = () => {
    if (!contact) return;
    const link = generateSettlementLink(contact, amount, 'Sober.Spend settlement');
    Linking.openURL(link).catch(() => {
      setShowVpaPicker(true);
    });
  };

  const handleCash = () => {
    onSettled('cash');
    onClose();
  };

  const handleSettled = () => {
    onSettled('upi');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{action.toUpperCase()}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={Colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>
              {isOwed ? `${contact.name} owes you` : `You owe ${contact.name}`}
            </Text>
            <Text style={styles.balanceAmount}>{formatCurrency(amount)}</Text>
          </View>

          <View style={styles.actions}>
            <NeoButton
              title={`${action} via UPI`}
              variant="primary"
              size="lg"
              onPress={handleUpi}
            />
            <Pressable style={styles.cashBtn} onPress={handleCash}>
              <Banknote size={16} color={Colors.textSecondary} strokeWidth={2.5} />
              <Text style={styles.cashText}>Mark as cash</Text>
            </Pressable>
          </View>

          <Pressable style={styles.settledBtn} onPress={handleSettled}>
            <Text style={styles.settledText}>Already settled? Mark it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  balanceBox: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  balanceLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  balanceAmount: {
    fontFamily: Fonts.display,
    fontSize: 40,
    color: Colors.white,
  },
  actions: {
    gap: Spacing.md,
  },
  cashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    borderRadius: Radii.md,
  },
  cashText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  settledBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  settledText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
});
