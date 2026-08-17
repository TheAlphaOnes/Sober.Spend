import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import { colorFromPhone, normalizePhone } from './split-engine';

/**
 * Result of picking a contact from the native OS picker.
 */
export interface PickedContact {
  phone: string;
  name: string;
  avatarColor: string;
}

/**
 * Open the native OS contact picker and return the selected contact.
 *
 * The OS picker is heavily optimized for large contact lists with built-in
 * search, so this is preferred over importing and rendering all contacts
 * in a custom list.
 *
 * Returns null if the user cancels or the contact has no phone number.
 */
export async function pickPhoneContact(): Promise<PickedContact | null> {
  const { status } = await requestPermissionsAsync();
  if (status !== 'granted') return null;

  const contact = await Contact.presentPicker();
  if (!contact) return null;

  const details = await contact.getDetails([
    ContactField.FULL_NAME,
    ContactField.PHONES,
  ]);

  const name = details.fullName;
  if (!name || !details.phones || details.phones.length === 0) return null;

  const phone = normalizePhone(details.phones[0].number || '');
  if (!phone) return null;

  return {
    phone,
    name,
    avatarColor: colorFromPhone(phone),
  };
}

/**
 * Search contacts by name or phone number.
 */
export function searchContacts(
  contacts: { phone: string; name: string }[],
  query: string,
): { phone: string; name: string }[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return contacts;
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      c.phone.replace(/\D/g, '').includes(lower.replace(/\D/g, '')),
  );
}
