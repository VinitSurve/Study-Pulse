-- ============================================================
-- EXTENSION AUTHENTICATION SCHEMA
-- Phase 12.2: Secure PWA ↔ Extension Pairing
-- ============================================================

CREATE TABLE extension_pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '10 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure a user only has one active pairing code at a time
CREATE UNIQUE INDEX idx_single_active_code ON extension_pairing_codes(user_id);

CREATE TABLE extension_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  device_name TEXT,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '90 days',
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ext_keys_user_id ON extension_api_keys(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE extension_pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_api_keys ENABLE ROW LEVEL SECURITY;

-- Pairing Codes
CREATE POLICY "Users create their own pairing codes"
  ON extension_pairing_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read their own pairing codes"
  ON extension_pairing_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update their own pairing codes"
  ON extension_pairing_codes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own pairing codes"
  ON extension_pairing_codes FOR DELETE
  USING (auth.uid() = user_id);

-- API Keys
CREATE POLICY "Users read their own api keys"
  ON extension_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update their own api keys"
  ON extension_api_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own api keys"
  ON extension_api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- ATOMIC EXCHANGE FUNCTION
-- Consumes a code atomically and issues the key hash.
-- ============================================================
CREATE OR REPLACE FUNCTION consume_pairing_code(p_code VARCHAR, p_key_hash TEXT, p_device_name TEXT)
RETURNS TABLE (
  success BOOLEAN,
  v_user_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- We use row-level locking (FOR UPDATE SKIP LOCKED) to ensure only one concurrent transaction reads this row.
  SELECT * INTO v_record FROM extension_pairing_codes WHERE code = p_code FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Invalid code';
    RETURN;
  END IF;

  IF v_record.expires_at < now() THEN
    -- Expired, clean it up
    DELETE FROM extension_pairing_codes WHERE id = v_record.id;
    RETURN QUERY SELECT false, NULL::UUID, 'Code expired';
    RETURN;
  END IF;

  -- Success! We delete the code so it cannot be used again.
  DELETE FROM extension_pairing_codes WHERE id = v_record.id;
  
  -- Insert the API key on behalf of the user
  INSERT INTO extension_api_keys (user_id, key_hash, device_name)
  VALUES (v_record.user_id, p_key_hash, p_device_name);

  RETURN QUERY SELECT true, v_record.user_id, 'Success';
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VALIDATION FUNCTION
-- Validates an API key hash and returns the user ID.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_extension_key(p_key_hash TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id 
  FROM extension_api_keys 
  WHERE key_hash = p_key_hash 
    AND expires_at > now() 
    AND revoked_at IS NULL;
    
  IF FOUND THEN
    -- Update last_used_at without updating the whole row to avoid trigger cascades if any
    UPDATE extension_api_keys SET last_used_at = now() WHERE key_hash = p_key_hash;
    RETURN v_user_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
