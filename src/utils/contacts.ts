import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import { colorFromPhone, normalizePhone } from './split-engine';

/**
 * Import contacts from the device's contact list.
 * Returns normalized contacts ready for insertion into the DB.
 *
 * Only imports contacts that have a phone number. Each contact gets
 * a deterministic avatar color from their phone number hash.
 *
 * Uses the new class-based expo-contacts API (SDK 57+).
 */
export async function importPhoneContacts(): Promise<
  Array<{
    phone: string;
    name: string;
    avatarColor: string;
  }>
> {
  const { status } = await requestPermissionsAsync();
  if (status !== 'granted') {
    return [];
  }

  const details = await Contact.getAllDetails(
    [ContactField.FULL_NAME, ContactField.PHONES],
    { limit: 1000 },
  );

  const result: Array<{
    phone: string;
    name: string;
    avatarColor: string;
  }> = [];

  const seenPhones = new Set<string>();

  for (const contact of details) {
    const name = contact.fullName;
    if (!name || !contact.phones || contact.phones.length === 0) {
      continue;
    }

    for (const phone of contact.phones) {
      if (!phone.number) continue;
      const normalized = normalizePhone(phone.number);
      if (seenPhones.has(normalized)) continue;
      seenPhones.add(normalized);

      result.push({
        phone: normalized,
        name,
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
