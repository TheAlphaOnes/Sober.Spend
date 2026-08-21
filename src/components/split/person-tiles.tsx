import * as Haptics from 'expo-haptics';
import { Plus, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Borders, Colors, Fonts, FontSizes, Radii, Spacing } from '@/constants/theme';

const PALETTE = [Colors.pink, Colors.blue, Colors.mint, Colors.yellow, Colors.orange, Colors.purple];

export function tileColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export function firstName(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  if (t === 'You') return 'You';
  return t.split(/\s+/)[0];
}

export type PersonTileItem = {
  id: string;
  name: string;
  inSplit: boolean;
  paid: boolean;
  guest?: boolean;
};

export function PersonTiles({
  people,
  onToggle,
  onPaid,
  onRemove,
  onAdd,
}: {
  people: PersonTileItem[];
  onToggle: (id: string) => void;
  onPaid: (id: string) => void;
  onRemove?: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <View>
      <View style={styles.grid}>
        {people.map((p, i) => (
          <Animated.View key={p.id} entering={FadeIn.delay(Math.min(i, 8) * 40).duration(200)} style={styles.cell}>
            <PersonTile
              item={p}
              color={tileColor(i)}
              onToggle={() => {
                Haptics.selectionAsync();
                onToggle(p.id);
              }}
              onPaid={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onPaid(p.id);
              }}
              onRemove={p.guest && onRemove ? () => onRemove(p.id) : undefined}
            />
          </Animated.View>
        ))}
        <Animated.View entering={FadeIn.delay(Math.min(people.length, 8) * 40).duration(220)} style={styles.cell}>
          <Pressable
            onPress={onAdd}
            style={({ pressed }) => [styles.tile, styles.addTile, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Add people">
            <View style={styles.addMark}>
              <Plus size={22} color={Colors.accent} strokeWidth={2.5} />
            </View>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </Animated.View>
      </View>
      <Text style={styles.legend}>Tap to include. Hold for who paid.</Text>
    </View>
  );
}

function PersonTile({
  item,
  color,
  onToggle,
  onPaid,
  onRemove,
}: {
  item: PersonTileItem;
  color: string;
  onToggle: () => void;
  onPaid: () => void;
  onRemove?: () => void;
}) {
  const letter = (item.name.trim()[0] || '?').toUpperCase();
  const dim = !item.inSplit && !item.paid;

  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onPaid}
      delayLongPress={280}
      style={({ pressed }) => [
        styles.tile,
        item.paid && styles.tilePaid,
        dim && styles.tileOut,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${item.paid ? ', paid' : ''}${item.inSplit ? ', in' : ', out'}`}>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={styles.x}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name}`}>
          <X size={12} color={Colors.white} strokeWidth={2.5} />
        </Pressable>
      ) : null}
      <View style={[styles.face, { backgroundColor: color }]}>
        <Text style={styles.letter}>{letter}</Text>
      </View>
      <Text style={styles.fname} numberOfLines={1}>
        {firstName(item.name)}
      </Text>
      {item.paid ? (
        <View style={styles.paidTag}>
          <Text style={styles.paidText}>PAID</Text>
        </View>
      ) : (
        <View style={styles.paidSlot} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cell: {
    width: '31%',
    flexGrow: 1,
    maxWidth: '32%',
  },
  tile: {
    backgroundColor: Colors.surface,
    borderWidth: Borders.medium,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    minHeight: 118,
  },
  tilePaid: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(197, 71, 112, 0.14)',
  },
  tileOut: {
    opacity: 0.4,
  },
  pressed: { transform: [{ scale: 0.96 }] },
  face: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Borders.thin,
    borderColor: Colors.black,
    marginBottom: Spacing.sm,
  },
  letter: { fontFamily: Fonts.display, fontSize: FontSizes.xl, color: Colors.black },
  fname: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.sm,
    color: Colors.white,
    textAlign: 'center',
    width: '100%',
  },
  paidTag: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    borderWidth: Borders.thin,
    borderColor: Colors.black,
  },
  paidText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 1,
  },
  paidSlot: { height: 20, marginTop: Spacing.xs },
  x: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  addTile: {
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  addMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: Borders.medium,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  addText: { fontFamily: Fonts.display, fontSize: FontSizes.sm, color: Colors.accent },
  legend: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});
