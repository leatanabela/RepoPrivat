-- ============================================================
-- AI HelpDesk for Public Institutions - Database Schema
-- PostgreSQL + Supabase + pgvector
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name) VALUES ('admin'), ('employee');

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    department_id UUID REFERENCES departments(id),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TICKET CATEGORIES
-- ============================================================
CREATE TABLE ticket_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TYPE ticket_status AS ENUM (
    'new', 'assigned', 'in_progress', 'waiting_user', 'resolved', 'closed'
);

CREATE TYPE ticket_priority AS ENUM (
    'low', 'medium', 'high', 'urgent'
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    status ticket_status DEFAULT 'new',
    priority ticket_priority DEFAULT 'medium',
    user_id UUID NOT NULL REFERENCES profiles(id),
    department_id UUID REFERENCES departments(id),
    assigned_to UUID REFERENCES profiles(id),
    category_id UUID REFERENCES ticket_categories(id),
    ai_suggested_department UUID REFERENCES departments(id),
    ai_suggested_category UUID REFERENCES ticket_categories(id),
    ai_suggested_priority ticket_priority,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TICKET MESSAGES (thread/conversation)
-- ============================================================
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TICKET ATTACHMENTS
-- ============================================================
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES ticket_messages(id) ON DELETE SET NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS (Knowledge Base)
-- ============================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    department_id UUID REFERENCES departments(id),
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    is_processed BOOLEAN DEFAULT FALSE,
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENT CHUNKS (for RAG embeddings)
-- ============================================================
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1024),
    chunk_index INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- CHAT HISTORY (AI Assistant conversations)
-- ============================================================
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    title VARCHAR(300),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_role ON profiles(role_id);
CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_department ON tickets(department_id);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX idx_documents_department ON documents(department_id);
CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = user_id AND r.name = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by authenticated users"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (is_admin(auth.uid()) OR auth.uid() = id);

CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()));

-- Tickets: employees see own tickets, admins see all
CREATE POLICY "Employees see own tickets"
    ON tickets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Authenticated users can create tickets"
    ON tickets FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any ticket"
    ON tickets FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can update own tickets"
    ON tickets FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Ticket messages: visible to ticket owner and admins
CREATE POLICY "Ticket messages visible to participants"
    ON ticket_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND (t.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Participants can create messages"
    ON ticket_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND (t.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

-- Documents: readable by all authenticated users
CREATE POLICY "Documents viewable by authenticated users"
    ON documents FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage documents"
    ON documents FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()));

-- Document chunks: readable by all authenticated users
CREATE POLICY "Document chunks viewable by authenticated users"
    ON document_chunks FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage document chunks"
    ON document_chunks FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()));

-- Chat sessions: users see only their own
CREATE POLICY "Users see own chat sessions"
    ON chat_sessions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own chat sessions"
    ON chat_sessions FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chat sessions"
    ON chat_sessions FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Chat messages: users see messages in their sessions
CREATE POLICY "Users see own chat messages"
    ON chat_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            WHERE cs.id = session_id AND cs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create chat messages in own sessions"
    ON chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            WHERE cs.id = session_id AND cs.user_id = auth.uid()
        )
    );

-- Ticket attachments
CREATE POLICY "Ticket attachments visible to participants"
    ON ticket_attachments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND (t.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Participants can upload attachments"
    ON ticket_attachments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploaded_by);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to search documents by embedding similarity
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1024),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    chunk_index INTEGER,
    similarity FLOAT,
    document_title VARCHAR,
    document_file_url TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.chunk_index,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        d.title AS document_title,
        d.file_url AS document_file_url
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO departments (name, description) VALUES
    ('IT', 'Information Technology Department'),
    ('HR', 'Human Resources Department'),
    ('Legal', 'Legal and Compliance Department'),
    ('Finance', 'Finance and Accounting Department'),
    ('Public Relations', 'Public Relations and Communications');

-- Insert ticket categories
INSERT INTO ticket_categories (name, department_id) VALUES
    ('Hardware Issue', (SELECT id FROM departments WHERE name = 'IT')),
    ('Software Issue', (SELECT id FROM departments WHERE name = 'IT')),
    ('Network Issue', (SELECT id FROM departments WHERE name = 'IT')),
    ('Account Access', (SELECT id FROM departments WHERE name = 'IT')),
    ('Leave Request', (SELECT id FROM departments WHERE name = 'HR')),
    ('Payroll Issue', (SELECT id FROM departments WHERE name = 'HR')),
    ('Contract Question', (SELECT id FROM departments WHERE name = 'Legal')),
    ('Budget Request', (SELECT id FROM departments WHERE name = 'Finance')),
    ('Reimbursement', (SELECT id FROM departments WHERE name = 'Finance')),
    ('Media Inquiry', (SELECT id FROM departments WHERE name = 'Public Relations'));

-- ============================================================
-- STORAGE BUCKETS (run via Supabase dashboard or API)
-- ============================================================
-- Create buckets: 'documents', 'ticket-attachments', 'avatars'
-- These need to be created via the Supabase dashboard or API
