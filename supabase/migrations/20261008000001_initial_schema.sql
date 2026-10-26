-- ==============================================================================
-- SunoSamjho Live - Production Database Schema & Row Level Security
-- Migration: 20261008000001_initial_schema.sql
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    preferred_language TEXT DEFAULT 'hi-IN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONVERSATION ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.conversation_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(12) NOT NULL UNIQUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended', 'expired')),
    source_language VARCHAR(10) NOT NULL DEFAULT 'hi-IN',
    target_language VARCHAR(10) NOT NULL DEFAULT 'kn-IN',
    save_transcripts BOOLEAN NOT NULL DEFAULT FALSE,
    max_participants INT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversation_rooms_code ON public.conversation_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_conversation_rooms_status ON public.conversation_rooms(status);
CREATE INDEX IF NOT EXISTS idx_conversation_rooms_expires ON public.conversation_rooms(expires_at);

-- 3. CONVERSATION PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.conversation_rooms(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id VARCHAR(64) NOT NULL,
    participant_label VARCHAR(50) NOT NULL,
    assigned_language VARCHAR(10) NOT NULL,
    is_host BOOLEAN NOT NULL DEFAULT FALSE,
    mic_muted BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'left')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(room_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_room ON public.conversation_participants(room_id);

-- 4. CONVERSATION MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.conversation_rooms(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.conversation_participants(id) ON DELETE SET NULL,
    speaker_label VARCHAR(50) NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    explanation_text TEXT,
    audio_duration_ms INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON public.conversation_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.conversation_messages(created_at);

-- 5. CONVERSATION TRANSCRIPTS TABLE (User Controllable History)
CREATE TABLE IF NOT EXISTS public.conversation_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.conversation_rooms(id) ON DELETE CASCADE,
    owner_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    transcript_json JSONB NOT NULL,
    total_messages INT DEFAULT 0,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_owner ON public.conversation_transcripts(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_created ON public.conversation_transcripts(created_at);

-- 6. DEVELOPER PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.developer_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tier VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'pro', 'enterprise')),
    monthly_quota_seconds INT NOT NULL DEFAULT 36000,
    used_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_projects_owner ON public.developer_projects(owner_profile_id);

-- 7. API KEYS TABLE (Security: Only stores SHA-256 hash, prefix, and metadata)
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.developer_projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL, -- e.g. "ss_live_a1b2..."
    key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of the complete secret
    scopes JSONB NOT NULL DEFAULT '["transcribe", "translate", "speak", "conversations"]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    requests_count BIGINT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_project ON public.api_keys(project_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Profiles can view own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Profiles can update own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = auth_user_id);

-- Conversation Rooms:
-- Public can select active room by room code (to join)
CREATE POLICY "Public room lookup by code"
    ON public.conversation_rooms FOR SELECT
    USING (status = 'active');

CREATE POLICY "Room owner full access"
    ON public.conversation_rooms FOR ALL
    USING (created_by IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- Conversation Participants:
CREATE POLICY "Participants can view their room peers"
    ON public.conversation_participants FOR SELECT
    USING (room_id IN (
        SELECT room_id FROM public.conversation_participants
        WHERE profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    ));

-- Conversation Messages:
CREATE POLICY "Room participants view messages"
    ON public.conversation_messages FOR SELECT
    USING (room_id IN (
        SELECT room_id FROM public.conversation_participants
        WHERE profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    ));

-- Transcripts:
CREATE POLICY "Transcripts owned by user"
    ON public.conversation_transcripts FOR ALL
    USING (owner_profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- Developer Projects:
CREATE POLICY "Dev projects owned by user"
    ON public.developer_projects FOR ALL
    USING (owner_profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- API Keys:
CREATE POLICY "Dev keys owned by project user"
    ON public.api_keys FOR ALL
    USING (project_id IN (
        SELECT id FROM public.developer_projects
        WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    ));
