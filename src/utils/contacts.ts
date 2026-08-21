import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';

import { normalizePhone } from '@/utils/phone';

export async function pickContact(): Promise<{ name: string; phone?: string } | null> {
  const perm = await requestPermissionsAsync();
  if (!perm.granted) return null;

  const contact = await Contact.presentPicker();
  if (!contact) return null;

  const details = await contact.getDetails([ContactField.FULL_NAME, ContactField.GIVEN_NAME, ContactField.PHONES]);
  const name =
    details.fullName?.trim() ||
    details.givenName?.trim() ||
    'Friend';
  const raw = details.phones?.find((p) => p.number)?.number;
  const phone = raw ? normalizePhone(raw) : undefined;
  return { name, phone: phone || undefined };
}
