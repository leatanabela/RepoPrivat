-- ============================================
-- Institution Info: Single Source of Truth
-- Programul, salariu, sărbători, concedii etc.
-- ============================================

CREATE TABLE IF NOT EXISTS institution_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'program_lucru',     -- Orarul instituției
    'salariu',           -- Ziua salariului
    'sarbatoare',        -- Sărbători legale, minivacanțe
    'concediu',          -- Reguli concedii
    'altele'             -- Alte informații generale
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date_from DATE,        -- Pentru sărbători/perioade specifice
  date_to DATE,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pentru filtrare rapidă pe tip
CREATE INDEX IF NOT EXISTS idx_institution_info_type ON institution_info(type);

-- Index pentru căutare full-text în titlu+content
CREATE INDEX IF NOT EXISTS idx_institution_info_search ON institution_info
  USING GIN (to_tsvector('simple', title || ' ' || content));

-- Trigger pentru updated_at
CREATE OR REPLACE FUNCTION update_institution_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_institution_info_updated_at ON institution_info;
CREATE TRIGGER trigger_institution_info_updated_at
BEFORE UPDATE ON institution_info
FOR EACH ROW EXECUTE FUNCTION update_institution_info_updated_at();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE institution_info ENABLE ROW LEVEL SECURITY;

-- Toți utilizatorii autentificați pot citi
DROP POLICY IF EXISTS "Authenticated can read institution_info" ON institution_info;
CREATE POLICY "Authenticated can read institution_info"
  ON institution_info FOR SELECT
  TO authenticated
  USING (true);

-- Doar adminii pot insera/edita/șterge
DROP POLICY IF EXISTS "Admins can insert institution_info" ON institution_info;
CREATE POLICY "Admins can insert institution_info"
  ON institution_info FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update institution_info" ON institution_info;
CREATE POLICY "Admins can update institution_info"
  ON institution_info FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete institution_info" ON institution_info;
CREATE POLICY "Admins can delete institution_info"
  ON institution_info FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );
