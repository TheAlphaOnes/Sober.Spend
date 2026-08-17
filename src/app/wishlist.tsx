import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { NeoCard } from '@/components/ui/neo-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';
import { useBudgetStore } from '@/stores/budget-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import type { WishlistItem } from '@/types';
import { formatCurrency, sanitizeNumericInput } from '@/utils/format';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  Check,
  CircleEllipsis,
  ExternalLink,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { savingsBalance, monthlySavingsTarget, monthlySavingsDeposited } = useBudgetStore();
  const { items, buckets, loadWishlist, addItem, buyItem, removeItem } =
    useWishlistStore();

  const [showAddModal, setShowAddModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadWishlist();
    }, [loadWishlist]),
  );

  const activeItems = items.filter((i) => i.status !== 'bought');
  const boughtItems = items.filter((i) => i.status === 'bought');
  // Monthly progress = deposits this month vs monthly target (resets monthly)
  const savingsPercent =
    monthlySavingsTarget > 0
      ? Math.min(100, Math.round((monthlySavingsDeposited / monthlySavingsTarget) * 100))
      : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>Wishlist</Text>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Plus size={20} color={Colors.white} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Savings pool card */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <NeoCard color={Colors.surface} offset="sm">
            <View style={styles.savingsHeader}>
              <View style={styles.savingsIconRow}>
                <Wallet size={18} color={Colors.accent} strokeWidth={2.5} />
                <Text style={styles.savingsLabel}>SAVINGS POOL</Text>
              </View>
              <Text style={styles.savingsBalance}>{formatCurrency(savingsBalance)}</Text>
            </View>
            {monthlySavingsTarget > 0 && (
              <>
                <View style={styles.savingsBarWrap}>
                  <ProgressBar
                    percent={savingsPercent}
                    height={8}
                    color={Colors.accent}
                    backgroundColor={Colors.bg}
                    showBorder={false}
                  />
                </View>
                <Text style={styles.savingsTarget}>
                  {formatCurrency(monthlySavingsDeposited)} / {formatCurrency(monthlySavingsTarget)} this month
                </Text>
              </>
            )}
          </NeoCard>
        </Animated.View>

        {/* Active wishlist items */}
        {activeItems.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>FUNDING</Text>
            {activeItems.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 45).duration(300)}>
                <WishlistItemCard
                  item={item}
                  savingsBalance={savingsBalance}
                  onBuy={() => buyItem(item.id)}
                  onRemove={() => removeItem(item.id)}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {/* Bought items */}
        {boughtItems.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>BOUGHT</Text>
            {boughtItems.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 30).duration(250)}>
                <WishlistItemCard
                  item={item}
                  savingsBalance={savingsBalance}
                  onBuy={() => {}}
                  onRemove={() => removeItem(item.id)}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <ShoppingBag size={48} color={Colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No wishlist yet</Text>
            <Text style={styles.emptyDesc}>
              Add things you want to buy. Fund them from your savings or buy directly.
            </Text>
            <NeoButton
              title="Add Item"
              variant="primary"
              size="md"
              onPress={() => setShowAddModal(true)}
              icon={<Plus size={16} color={Colors.white} strokeWidth={2.5} />}
            />
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Add item modal */}
      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(data) => {
          addItem(data);
          setShowAddModal(false);
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Wishlist item card
// ---------------------------------------------------------------------------

function WishlistItemCard({
  item,
  savingsBalance,
  onBuy,
  onRemove,
}: {
  item: WishlistItem;
  savingsBalance: number;
  onBuy: () => void;
  onRemove: () => void;
}) {
  const isBought = item.status === 'bought';
  const canAfford = savingsBalance >= item.price;
  const affordabilityPercent =
    item.price > 0 ? Math.min(100, Math.round((savingsBalance / item.price) * 100)) : 0;

  const openLink = async () => {
    if (!item.url) return;
    try {
      await WebBrowser.openBrowserAsync(item.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch {
      Linking.openURL(item.url);
    }
  };

  return (
    <NeoCard color={Colors.surface} style={styles.itemCard}>
      {/* Top row: name + price */}
      <View style={styles.itemHeader}>
        <View style={styles.itemNameRow}>
          {item.url && (
            <Pressable onPress={openLink} hitSlop={8}>
              <ExternalLink size={14} color={Colors.accent} strokeWidth={2.5} />
            </Pressable>
          )}
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        </View>
        <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
      </View>

      {/* Bought badge */}
      {isBought && (
        <View style={styles.boughtBadge}>
          <Check size={14} color={Colors.black} strokeWidth={3} />
          <Text style={styles.boughtText}>BOUGHT</Text>
        </View>
      )}

      {/* Affordability bar — auto-calculated from savings */}
      {!isBought && (
        <View style={styles.itemProgressWrap}>
          <ProgressBar
            percent={affordabilityPercent}
            height={10}
            color={canAfford ? Colors.safe : Colors.accent}
            backgroundColor={Colors.bg}
            showBorder={false}
          />
          <View style={styles.itemProgressLabels}>
            <Text style={styles.itemFunded}>
              {canAfford
                ? 'Ready to buy'
                : `${formatCurrency(Math.max(0, item.price - savingsBalance))} short`}
            </Text>
            <Text style={styles.itemRemaining}>
              {formatCurrency(savingsBalance)} / {formatCurrency(item.price)}
            </Text>
          </View>
        </View>
      )}

      {/* Action buttons */}
      {!isBought && (
        <View style={styles.itemActions}>
          <Pressable
            style={[styles.buyBtn, canAfford && styles.buyBtnReady]}
            onPress={onBuy}>
            {canAfford ? (
              <Check size={14} color={Colors.black} strokeWidth={3} />
            ) : (
              <ShoppingBag size={14} color={Colors.white} strokeWidth={2.5} />
            )}
            <Text style={[styles.buyBtnText, canAfford && styles.buyBtnTextReady]}>
              {canAfford ? 'Buy Now' : 'Buy Direct'}
            </Text>
          </Pressable>
          <Pressable style={styles.removeBtn} onPress={onRemove}>
            <Trash2 size={14} color={Colors.exceeded} strokeWidth={2.5} />
          </Pressable>
        </View>
      )}
    </NeoCard>
  );
}

// ---------------------------------------------------------------------------
// Add item modal
// ---------------------------------------------------------------------------

function AddItemModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; price: number; url?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !price.trim()) return;
    onAdd({
      name: name.trim(),
      price: parseFloat(price),
      url: url.trim() || undefined,
    });
    setName('');
    setPrice('');
    setUrl('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to Wishlist</Text>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>

          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>WHAT DO YOU WANT?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New headphones, shoes..."
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>PRICE</Text>
            <View style={styles.modalPriceBox}>
              <Text style={styles.modalCurrency}>₹</Text>
              <TextInput
                style={styles.modalPriceInput}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={price}
                onChangeText={(t) => setPrice(sanitizeNumericInput(t))}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>PRODUCT LINK (OPTIONAL)</Text>
            <View style={styles.modalUrlBox}>
              <ExternalLink size={14} color={Colors.textMuted} strokeWidth={2} />
              <TextInput
                style={styles.modalUrlInput}
                placeholder="Paste Amazon, Flipkart link..."
                placeholderTextColor={Colors.textMuted}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <NeoButton
              title="Add to Wishlist"
              variant="primary"
              size="lg"
              onPress={handleAdd}
              disabled={!name.trim() || !price.trim()}
              icon={<Sparkles size={16} color={Colors.white} strokeWidth={2.5} />}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  // Savings pool card
  savingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  savingsIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  savingsLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  savingsBalance: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
  },
  savingsBarWrap: {
    marginBottom: Spacing.xs,
  },
  savingsTarget: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  // Sections
  sectionWrap: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  // Item card
  itemCard: {
    marginBottom: Spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  itemName: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
    flex: 1,
  },
  itemPrice: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.accent,
  },
  itemProgressWrap: {
    marginBottom: Spacing.sm,
  },
  itemProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemFunded: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  itemRemaining: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  // Bought badge
  boughtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.safe,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  boughtText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.black,
    letterSpacing: 1,
  },
  // Actions
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
    borderWidth: Borders.thin,
    borderColor: Colors.border,
    flex: 1,
    justifyContent: 'center',
  },
  buyBtnReady: {
    backgroundColor: Colors.safe,
    borderColor: Colors.black,
  },
  buyBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  buyBtnTextReady: {
    color: Colors.black,
  },
  removeBtn: {
    padding: Spacing.sm,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  emptyDesc: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 250,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: Borders.thick,
    borderBottomWidth: 0,
    borderColor: Colors.black,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  modalCloseBtn: {
    padding: Spacing.xs,
  },
  modalCloseText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  modalInputGroup: {
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  modalInput: {
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  modalPriceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modalCurrency: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.accent,
    marginRight: Spacing.sm,
  },
  modalPriceInput: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    paddingVertical: Spacing.sm,
  },
  modalUrlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  modalUrlInput: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.white,
    paddingVertical: 0,
  },
  modalActions: {
    marginTop: Spacing.md,
  },
});
