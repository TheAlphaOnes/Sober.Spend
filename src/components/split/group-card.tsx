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
      <NeoCard color={Colors.surface} offset="sm" style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: group.color }]}>
            <Icon size={18} color={Colors.black} strokeWidth={2.5} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
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
  info: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.md,
    color: Colors.white,
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
