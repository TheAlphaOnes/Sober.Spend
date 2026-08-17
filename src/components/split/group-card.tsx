import { NeoCard } from '@/components/ui/neo-card';
import { Borders, Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';
import type { Group } from '@/types';
import { Briefcase, Heart, Home, Plane, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const iconMap: Record<string, typeof Users> = {
  home: Home,
  plane: Plane,
  heart: Heart,
  users: Users,
  briefcase: Briefcase,
};

interface GroupCardProps {
  group: Group;
  memberCount: number;
  balance: number;
  onPress: () => void;
}

export function GroupCard({ group, memberCount, balance, onPress }: GroupCardProps) {
  const Icon = iconMap[group.icon] || Users;
  const isOwed = balance > 0;
  const isOwe = balance < 0;

  return (
    <Pressable onPress={onPress}>
      <NeoCard
        color={Colors.surface}
        offset="sm"
        style={[styles.card, !group.isActive && styles.cardInactive]}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: group.color }, !group.isActive && styles.iconBoxInactive]}>
            <Icon size={18} color={Colors.black} strokeWidth={2.5} />
          </View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, !group.isActive && styles.textInactive]} numberOfLines={1}>
                {group.name}
              </Text>
              {!group.isActive && <Text style={styles.inactiveBadge}>CLOSED</Text>}
            </View>
            <Text style={styles.members}>{memberCount} members</Text>
          </View>
          <View style={styles.balanceBox}>
            {balance === 0 ? (
              <Text style={styles.settled}>SETTLED</Text>
            ) : (
              <Text
                style={[
                  styles.balance,
                  { color: isOwed ? Colors.safe : Colors.exceeded },
                  !group.isActive && styles.textInactive,
                ]}>
                {isOwed ? '+' : '-'}{formatCurrency(Math.abs(balance))}
              </Text>
            )}
          </View>
        </View>
      </NeoCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  cardInactive: {
    opacity: 0.55,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: Borders.medium,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxInactive: {
    opacity: 0.5,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  textInactive: {
    color: Colors.textMuted,
  },
  inactiveBadge: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: Colors.exceeded,
    borderWidth: 1,
    borderColor: Colors.exceeded,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    letterSpacing: 1,
  },
  members: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  balanceBox: {
    alignItems: 'flex-end',
  },
  balance: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
  },
  settled: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
