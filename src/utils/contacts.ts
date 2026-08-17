import * as Contacts from 'expo-contacts';
import { colorFromPhone, normalizePhone } from './split-engine';

/**
 * Import contacts from the device's contact list.
 * Returns normalized contacts ready for insertion into the DB.
 *
 * Only imports contacts that have a phone number. Each contact gets
 * a deterministic avatar color from their phone number hash.
 */
export async function importPhoneContacts(): Promise<
  Array<{
    phone: string;
    name: string;
    avatarColor: string;
  }>
> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    return [];
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    pageSize: 1000,
    pageOffset: 0,
  });

  const result: Array<{
    phone: string;
    name: string;
    avatarColor: string;
  }> = [];

  const seenPhones = new Set<string>();

  for (const contact of data) {
    if (!contact.name || !contact.phoneNumbers || contact.phoneNumbers.length === 0) {
      continue;
    }

    for (const phoneNumber of contact.phoneNumbers) {
      if (!phoneNumber.number) continue;
      const normalized = normalizePhone(phoneNumber.number);
      if (seenPhones.has(normalized)) continue;
      seenPhones.add(normalized);

      result.push({
        phone: normalized,
        name: contact.name,
        avatarColor: colorFromPhone(normalized),
      });
    }
  }

  // Sort by name for consistent display
  result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}

/**
 * Search contacts by name or phone number.
 */
export function searchContacts(
  contacts: Array<{ phone: string; name: string }>,
  query: string,
): Array<{ phone: string; name: string }> {
  const lower = query.toLowerCase().trim();
  if (!lower) return contacts;
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      c.phone.replace(/\D/g, '').includes(lower.replace(/\D/g, '')),
  );
}
