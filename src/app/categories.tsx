import { NeoBackButton } from '@/components/ui/neo-back-button';
import { NeoButton } from '@/components/ui/neo-button';
import { NeoCard } from '@/components/ui/neo-card';
import {
  Borders,
  Colors,
  Fonts,
  FontSizes,
  Radii,
  Spacing,
} from '@/constants/theme';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/categories';
import { useBudgetStore } from '@/stores/budget-store';
import type { Category } from '@/types';
import { sanitizeNumericInput } from '@/utils/format';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Book,
  Briefcase,
  Car,
  Circle,
  CircleEllipsis,
  Coffee,
  Dumbbell,
  Film,
  Gift,
  Heart,
  Home,
  Music,
  Plane,
  Plus,
  Pill,
  ShoppingBag,
  Smartphone,
  Trash2,
  Utensils,
  Zap,
  Fuel,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const iconMap: Record<string, typeof Utensils> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  film: Film,
  zap: Zap,
  'circle-ellipsis': CircleEllipsis,
  coffee: Coffee,
  plane: Plane,
  gift: Gift,
  heart: Heart,
  dumbbell: Dumbbell,
  book: Book,
  music: Music,
  smartphone: Smartphone,
  home: Home,
  briefcase: Briefcase,
  pill: Pill,
  fuel: Fuel,
};

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { categories, loadSettings, addCategory, deleteCategory, setCategoryLimit } =
    useBudgetStore();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0]);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const handleAdd = () => {
    if (!name.trim()) return;
    addCategory({
      name: name.trim(),
      budgetLimit: budget ? parseFloat(budget) : 0,
      color,
      icon,
      keywords: [],
      sortOrder: categories.length,
    });
    setName('');
    setBudget('');
    setColor(CATEGORY_COLORS[0]);
    setIcon(CATEGORY_ICONS[0]);
    setShowAdd(false);
  };

  const handleDelete = (cat: Category) => {
    deleteCategory(cat.id);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <NeoBackButton />
        <Text style={styles.title}>Categories</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Plus size={22} color={Colors.black} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {categories.map((cat) => {
          const LucideIcon = iconMap[cat.icon] || Circle;
          return (
            <NeoCard key={cat.id} color={cat.color} style={styles.categoryCard}>
              <View style={styles.catHeader}>
                <View style={styles.catIconRow}>
                  <LucideIcon size={20} color={Colors.black} strokeWidth={2.5} />
                  <Text style={styles.catName}>{cat.name}</Text>
                </View>
                <Pressable onPress={() => handleDelete(cat)} style={styles.deleteBtn}>
                  <Trash2 size={18} color={Colors.black} strokeWidth={2.5} />
                </Pressable>
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Budget</Text>
                <TextInput
                  style={styles.budgetInput}
                  defaultValue={cat.budgetLimit ? cat.budgetLimit.toString() : ''}
                  placeholder="0"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  keyboardType="numeric"
                  onBlur={(e) => {
                    const text = (e.nativeEvent as any).text;
                    const val = parseFloat(text);
                    if (!isNaN(val)) setCategoryLimit(cat.id, val);
                  }}
                />
              </View>
            </NeoCard>
          );
        })}

        {categories.length === 0 && (
          <Text style={styles.emptyText}>No categories. Tap + to add one.</Text>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Add Category Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <NeoCard color={Colors.surface} style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Category</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Coffee, Gym, Rent"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Monthly Budget (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={budget}
              onChangeText={(t) => setBudget(sanitizeNumericInput(t))}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {CATEGORY_COLORS.map((c, idx) => (
                <Pressable
                  key={`${c}-${idx}`}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotSelected,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.inputLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {CATEGORY_ICONS.map((iconName) => {
                const Icon = iconMap[iconName] || Circle;
                return (
                  <Pressable
                    key={iconName}
                    onPress={() => setIcon(iconName)}
                    style={[
                      styles.iconBtn,
                      { backgroundColor: icon === iconName ? Colors.accent : Colors.surfaceLight },
                    ]}>
                    <Icon size={18} color={Colors.white} strokeWidth={2.5} />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <NeoButton
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setShowAdd(false)}
              />
              <NeoButton
                title="Add"
                variant="primary"
                size="md"
                onPress={handleAdd}
                disabled={!name.trim()}
              />
            </View>
          </NeoCard>
        </View>
      </Modal>
    </View>
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
  backBtn: {
    padding: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    borderWidth: Borders.medium,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  categoryCard: {
    marginBottom: Spacing.md,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  catIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  catName: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
    color: Colors.black,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  budgetLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: 'rgba(0,0,0,0.6)',
  },
  budgetInput: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.black,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 80,
    textAlign: 'right',
  },
  emptyText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: Radii.lg,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  modalTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.white,
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
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
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: Colors.white,
    transform: [{ scale: 1.15 }],
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
});
