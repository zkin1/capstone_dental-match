module.exports = {
  async up(db) {
    await db.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
      ALTER TABLE users ADD CONSTRAINT users_status_check
        CHECK (status IN ('active', 'inactive', 'suspended', 'pending'));
      ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ultimo_matching_en TIMESTAMPTZ,
                            ADD COLUMN IF NOT EXISTS ultimo_motivo_matching TEXT;
    `);
  },
};
