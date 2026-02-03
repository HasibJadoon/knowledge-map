PRAGMA foreign_keys = ON;

UPDATE ar_occ_token
SET ar_u_root = (
  SELECT ar_u_root
  FROM ar_u_tokens
  WHERE ar_u_token = ar_occ_token.ar_u_token
)
WHERE ar_u_root IS NULL;
