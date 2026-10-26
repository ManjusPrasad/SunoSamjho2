-- ==============================================================================
-- SunoSamjho Live - Seed Data for Local Development
-- ==============================================================================

-- 1. Insert Demo Profile
INSERT INTO public.profiles (id, full_name, email, preferred_language)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Demo Developer', 'dev@sunosamjho.ai', 'hi-IN')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Demo Developer Project
INSERT INTO public.developer_projects (id, owner_profile_id, name, description, tier, monthly_quota_seconds, used_seconds)
VALUES 
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Default Development Project', 'Sandbox for real-time speech testing', 'standard', 36000, 120)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Demo API Key (Hash of "ss_live_demo_test_key_12345")
-- SHA-256("ss_live_demo_test_key_12345") = 9f6b4e29b16ba65b6ec67e58e0a81d4e78a2e58499eeef5fa1e6f103b41e8f26 (example)
INSERT INTO public.api_keys (id, project_id, name, key_prefix, key_hash, scopes, is_active, requests_count)
VALUES 
    ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010', 'Dev Local Key', 'ss_live_demo_test', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', '["transcribe", "translate", "speak", "conversations"]', true, 5)
ON CONFLICT (id) DO NOTHING;
