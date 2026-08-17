import { Borders, Colors } from '@/constants/theme';
import type { Contact } from '@/types';
import { StyleSheet, Text, View } from 'react-native';

interface GroupAvatarStackProps {
  contacts: Contact[];
  max?: number;
}

export function GroupAvatarStack({ contacts, max = 4 }: GroupAvatarStackProps) {
  const shown = contacts.slice(0, max);
  const remaining = contacts.length - max;

  return (
    <View style={styles.container}>
      {shown.map((contact, i) => (
        <View
          key={contact.id}
          style={[
            styles.avatar,
            { backgroundColor: contact.avatarColor },
            i > 0 && { marginLeft: -8 },
          ]}>
          <Text style={styles.avatarText}>
            {contact.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      ))}
      {remaining > 0 && (
        <View style={[styles.avatar, styles.overflowAvatar, { marginLeft: -8 }]}>
          <Text style={styles.overflowText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: Borders.thin,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.black,
  },
  overflowAvatar: {
    backgroundColor: Colors.surfaceLight,
  },
  overflowText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '700',
  },
});
