ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS producer_id TEXT REFERENCES producers(id) ON DELETE RESTRICT;

WITH unambiguous_matches AS (
  SELECT user_account.id, MIN(producer.id) AS producer_id
  FROM app_users AS user_account
  INNER JOIN producers AS producer
    ON LOWER(user_account.email) = LOWER(producer.email)
    OR LOWER(user_account.email) = LOWER(COALESCE(producer.profile->>'correoElectronico', ''))
    OR LOWER(user_account.email) = LOWER(COALESCE(producer.profile->>'correoElectronicoProductor', ''))
  WHERE user_account.role = 'PRODUCER'
    AND user_account.producer_id IS NULL
  GROUP BY user_account.id
  HAVING COUNT(DISTINCT producer.id) = 1
)
UPDATE app_users AS user_account
SET producer_id = unambiguous_matches.producer_id
FROM unambiguous_matches
WHERE user_account.id = unambiguous_matches.id;

-- The original demo account predates producer associations and represents
-- the Berrymex fixture only when that RFC identifies exactly one producer.
WITH unambiguous_demo_match AS (
  SELECT MIN(id) AS producer_id
  FROM producers
  WHERE rfc = 'ABE120515KL8'
  HAVING COUNT(*) = 1
)
UPDATE app_users AS user_account
SET producer_id = unambiguous_demo_match.producer_id
FROM unambiguous_demo_match
WHERE user_account.role = 'PRODUCER'
  AND user_account.producer_id IS NULL
  AND LOWER(user_account.email) = 'producer@demo.local';

ALTER TABLE app_users
  ADD CONSTRAINT app_users_producer_association_required
  CHECK (role <> 'PRODUCER' OR producer_id IS NOT NULL) NOT VALID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app_users
    WHERE role = 'PRODUCER' AND producer_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Every existing PRODUCER account must be associated with a producer before this migration can be applied.';
  END IF;
END $$;

ALTER TABLE app_users
  VALIDATE CONSTRAINT app_users_producer_association_required;