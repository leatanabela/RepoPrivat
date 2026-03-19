-- ============================================================
-- AI HelpDesk for Public Institutions — Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";


-- ======================== ENUMS =============================

CREATE TYPE ticket_status AS ENUM (
    'nou', 'atribuit', 'in_lucru',
    'asteptare_utilizator', 'rezolvat', 'inchis'
);

CREATE TYPE ticket_priority AS ENUM (
    'scazuta', 'medie', 'ridicata', 'urgenta'
);


-- ====================== TABLES ==============================

-- Roles
CREATE TABLE roles (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name) VALUES ('admin'), ('employee');

-- Departments
CREATE TABLE departments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    full_name     VARCHAR(200) NOT NULL,
    role_id       UUID NOT NULL REFERENCES roles(id),
    department_id UUID REFERENCES departments(id),
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket categories
CREATE TABLE ticket_categories (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets
CREATE TABLE tickets (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                   VARCHAR(300) NOT NULL,
    description             TEXT NOT NULL,
    status                  ticket_status   DEFAULT 'nou',
    priority                ticket_priority DEFAULT 'scazuta',
    user_id                 UUID NOT NULL REFERENCES profiles(id),
    department_id           UUID REFERENCES departments(id),
    assigned_to             UUID REFERENCES profiles(id),
    category_id             UUID REFERENCES ticket_categories(id),
    ai_suggested_department UUID REFERENCES departments(id),
    ai_suggested_category   UUID REFERENCES ticket_categories(id),
    ai_suggested_priority   ticket_priority,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket messages (conversation thread)
CREATE TABLE ticket_messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES profiles(id),
    message     TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket attachments
CREATE TABLE ticket_attachments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    message_id  UUID REFERENCES ticket_messages(id) ON DELETE SET NULL,
    file_url    TEXT NOT NULL,
    file_name   VARCHAR(255) NOT NULL,
    file_size   INTEGER,
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (Knowledge Base)
CREATE TABLE documents (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title         VARCHAR(300) NOT NULL,
    description   TEXT,
    file_url      TEXT NOT NULL,
    file_name     VARCHAR(255) NOT NULL,
    file_type     VARCHAR(50),
    file_size     INTEGER,
    department_id UUID REFERENCES departments(id),
    uploaded_by   UUID NOT NULL REFERENCES profiles(id),
    is_processed  BOOLEAN DEFAULT FALSE,
    chunk_count   INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks (RAG embeddings)
CREATE TABLE document_chunks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    embedding   vector(1024),
    chunk_index INTEGER NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chat sessions
CREATE TABLE chat_sessions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES profiles(id),
    title      VARCHAR(300),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT NOT NULL,
    sources    JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ====================== INDEXES =============================

-- Vector similarity search
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Lookup indexes
CREATE INDEX idx_profiles_role       ON profiles(role_id);
CREATE INDEX idx_profiles_dept       ON profiles(department_id);
CREATE INDEX idx_tickets_user        ON tickets(user_id);
CREATE INDEX idx_tickets_dept        ON tickets(department_id);
CREATE INDEX idx_tickets_assigned    ON tickets(assigned_to);
CREATE INDEX idx_tickets_status      ON tickets(status);
CREATE INDEX idx_tickets_priority    ON tickets(priority);
CREATE INDEX idx_tickets_created     ON tickets(created_at DESC);
CREATE INDEX idx_msg_ticket          ON ticket_messages(ticket_id);
CREATE INDEX idx_docs_dept           ON documents(department_id);
CREATE INDEX idx_chunks_doc          ON document_chunks(document_id);
CREATE INDEX idx_chat_sess_user      ON chat_sessions(user_id);
CREATE INDEX idx_chat_msg_sess       ON chat_messages(session_id);


-- ============== ROW LEVEL SECURITY (RLS) ====================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = user_id AND r.name = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER;


-- -------------------- Profiles ------------------------------

CREATE POLICY "profiles_select_authenticated"
    ON profiles FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_insert_admin_or_self"
    ON profiles FOR INSERT TO authenticated
    WITH CHECK (is_admin(auth.uid()) OR auth.uid() = id);

CREATE POLICY "profiles_update_admin"
    ON profiles FOR UPDATE TO authenticated
    USING (is_admin(auth.uid()));

-- -------------------- Tickets -------------------------------

CREATE POLICY "tickets_select_own_or_admin"
    ON tickets FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "tickets_insert_own"
    ON tickets FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tickets_update_own"
    ON tickets FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "tickets_update_admin"
    ON tickets FOR UPDATE TO authenticated
    USING (is_admin(auth.uid()));

-- -------------------- Ticket messages -----------------------

CREATE POLICY "ticket_msg_select_participant"
    ON ticket_messages FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_id
          AND (t.user_id = auth.uid() OR is_admin(auth.uid()))
    ));

CREATE POLICY "ticket_msg_insert_participant"
    ON ticket_messages FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_id
          AND (t.user_id = auth.uid() OR is_admin(auth.uid()))
    ));

-- -------------------- Ticket attachments --------------------

CREATE POLICY "attachments_select_participant"
    ON ticket_attachments FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_id
          AND (t.user_id = auth.uid() OR is_admin(auth.uid()))
    ));

CREATE POLICY "attachments_insert_own"
    ON ticket_attachments FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = uploaded_by);

-- -------------------- Documents & chunks --------------------

CREATE POLICY "docs_select_authenticated"
    ON documents FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "docs_manage_admin"
    ON documents FOR ALL TO authenticated
    USING (is_admin(auth.uid()));

CREATE POLICY "chunks_select_authenticated"
    ON document_chunks FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "chunks_manage_admin"
    ON document_chunks FOR ALL TO authenticated
    USING (is_admin(auth.uid()));

-- -------------------- Chat ----------------------------------

CREATE POLICY "chat_sess_select_own"
    ON chat_sessions FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "chat_sess_insert_own"
    ON chat_sessions FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_sess_delete_own"
    ON chat_sessions FOR DELETE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "chat_msg_select_own"
    ON chat_messages FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM chat_sessions cs
        WHERE cs.id = session_id AND cs.user_id = auth.uid()
    ));

CREATE POLICY "chat_msg_insert_own"
    ON chat_messages FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM chat_sessions cs
        WHERE cs.id = session_id AND cs.user_id = auth.uid()
    ));


-- ====================== FUNCTIONS ===========================

-- Search documents by embedding similarity
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1024),
    match_threshold FLOAT DEFAULT 0.7,
    match_count     INT   DEFAULT 5
)
RETURNS TABLE (
    id               UUID,
    document_id      UUID,
    content          TEXT,
    chunk_index      INTEGER,
    similarity       FLOAT,
    document_title   VARCHAR,
    document_file_url TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.chunk_index,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        d.title,
        d.file_url
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();