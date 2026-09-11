-- Typed import columns.  The profile json remains for backwards compatibility,
-- but imported values are stored in columns so they can be indexed and queried.
ALTER TABLE producers ADD COLUMN IF NOT EXISTS cultivo TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS distrito TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS nombre_area_cultivo TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS productor TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS id_cofibe_cg TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS numero_productor TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS razon_social TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS representante_legal TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS direccion_fiscal TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS colonia TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS codigo_postal TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS nombre_contacto TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS telefono_contacto TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS numero_celular TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS correo_electronico TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS correo_electronico_productor TEXT;

UPDATE producers SET
  cultivo = COALESCE(cultivo, profile->>'cultivo'),
  distrito = COALESCE(distrito, profile->>'distrito'),
  nombre_area_cultivo = COALESCE(nombre_area_cultivo, profile->>'nombreAreaCultivo'),
  productor = COALESCE(productor, profile->>'productor'),
  id_cofibe_cg = COALESCE(id_cofibe_cg, profile->>'idCofibeCg'),
  numero_productor = COALESCE(numero_productor, profile->>'numeroProductor'),
  razon_social = COALESCE(razon_social, profile->>'razonSocial'),
  representante_legal = COALESCE(representante_legal, profile->>'representanteLegal'),
  direccion_fiscal = COALESCE(direccion_fiscal, profile->>'direccionFiscal'),
  colonia = COALESCE(colonia, profile->>'colonia'), municipio = COALESCE(municipio, profile->>'municipio'),
  estado = COALESCE(estado, profile->>'estado'), codigo_postal = COALESCE(codigo_postal, profile->>'codigoPostal'),
  nombre_contacto = COALESCE(nombre_contacto, profile->>'nombreContacto'),
  telefono_contacto = COALESCE(telefono_contacto, profile->>'telefonoContacto'),
  numero_celular = COALESCE(numero_celular, profile->>'numeroCelular'),
  correo_electronico = COALESCE(correo_electronico, profile->>'correoElectronico'),
  correo_electronico_productor = COALESCE(correo_electronico_productor, profile->>'correoElectronicoProductor');

-- Normalize before adding constraints.  The partial indexes also protect old
-- rows whose RFC was historically blank.
UPDATE producers SET rfc = upper(btrim(rfc)) WHERE rfc IS NOT NULL;
UPDATE legal_entities SET rfc = upper(btrim(rfc)) WHERE rfc IS NOT NULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM producers WHERE rfc IS NOT NULL AND btrim(rfc) <> '' GROUP BY upper(btrim(rfc)) HAVING COUNT(*) > 1)
    OR EXISTS (SELECT 1 FROM legal_entities WHERE rfc IS NOT NULL AND btrim(rfc) <> '' GROUP BY producer_id, upper(btrim(rfc)) HAVING COUNT(*) > 1)
    OR EXISTS (SELECT 1 FROM producers WHERE numero_productor IS NOT NULL AND btrim(numero_productor) <> '' GROUP BY btrim(numero_productor) HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Migration 006 aborted: duplicate normalized RFC or Grower # values exist; resolve them before migrating';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS producers_rfc_normalized_uq ON producers (upper(btrim(rfc)))
  WHERE btrim(rfc) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS legal_entities_producer_rfc_uq
  ON legal_entities (producer_id, upper(btrim(rfc)));
CREATE UNIQUE INDEX IF NOT EXISTS producers_grower_number_uq ON producers (btrim(numero_productor))
  WHERE numero_productor IS NOT NULL AND btrim(numero_productor) <> '';
ALTER TABLE legal_entities ALTER COLUMN poderes_vigentes_at DROP NOT NULL;