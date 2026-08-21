-- Name + phone on profiles (signup, editable later). Split is online.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN profiles.phone IS '10-digit phone for UPI / matching friends';
