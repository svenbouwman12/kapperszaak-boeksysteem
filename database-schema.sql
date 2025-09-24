-- Wachtlijst tabel voor het kapperszaak boeksysteem
-- Deze tabel slaat wachtlijst aanmeldingen op

CREATE TABLE IF NOT EXISTS wachtlijst (
    id SERIAL PRIMARY KEY,
    klantnaam VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefoon VARCHAR(20),
    kapper_id INTEGER NOT NULL REFERENCES kappers(id),
    dienst_id INTEGER NOT NULL REFERENCES diensten(id),
    datumtijd TIMESTAMP WITH TIME ZONE NOT NULL,
    tijd VARCHAR(10) NOT NULL, -- Bijvoorbeeld "14:00"
    status VARCHAR(20) DEFAULT 'wachtend', -- 'wachtend', 'geboekt', 'geannuleerd'
    aangemeld_op TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    geboekt_op TIMESTAMP WITH TIME ZONE,
    opmerkingen TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_wachtlijst_kapper_datum ON wachtlijst(kapper_id, datumtijd);
CREATE INDEX IF NOT EXISTS idx_wachtlijst_status ON wachtlijst(status);
CREATE INDEX IF NOT EXISTS idx_wachtlijst_email ON wachtlijst(email);

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wachtlijst_updated_at 
    BEFORE UPDATE ON wachtlijst 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
