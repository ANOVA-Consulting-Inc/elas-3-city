-- ELAS-3-CITY Initial Schema
-- Creates city_participations table and eoi_lookup_signer RPC function

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- City Participations table (replaces eoi_acknowledgements for ELAS-3-CITY)
CREATE TABLE IF NOT EXISTS public.city_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  org text,
  address text,
  project text,
  signature_name text,
  ref text,
  ip text,
  user_agent text,
  certificate_path text,
  registered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.city_participations TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.city_participations TO authenticated;
GRANT ALL ON public.city_participations TO service_role;

ALTER TABLE public.city_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a participation"
ON public.city_participations FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(name) BETWEEN 2 AND 200
  AND length(email) BETWEEN 5 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(coalesce(org, '')) BETWEEN 2 AND 240
  AND length(coalesce(address, '')) BETWEEN 5 AND 500
  AND length(coalesce(project, '')) BETWEEN 2 AND 240
  AND length(coalesce(signature_name, '')) BETWEEN 2 AND 200
  AND lower(signature_name) = lower(name)
);

CREATE POLICY "Admins can view participations"
ON public.city_participations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete participations"
ON public.city_participations FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS city_participations_created_at_idx ON public.city_participations (created_at DESC);

-- EOI lookup signer RPC function
CREATE OR REPLACE FUNCTION public.eoi_lookup_signer(p_email text)
RETURNS TABLE(found boolean, name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT TRUE AS found, a.name
  FROM public.city_participations a
  WHERE lower(a.email) = lower(trim(p_email))
  ORDER BY a.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE AS found, NULL::text AS name;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.eoi_lookup_signer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eoi_lookup_signer(text) TO anon, authenticated;

-- EOI recipients table for named recipient circulation
CREATE TABLE IF NOT EXISTS public.eoi_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  surname text,
  org text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  invited_by text,
  revoked_at timestamptz,
  name_needs_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.eoi_recipients TO anon, authenticated;
GRANT ALL ON public.eoi_recipients TO service_role;

ALTER TABLE public.eoi_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check if they are a recipient"
ON public.eoi_recipients FOR SELECT
TO anon, authenticated
USING (true);

-- EOI access attempts log
CREATE TABLE IF NOT EXISTS public.eoi_access_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  ip text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.eoi_access_attempts TO anon, authenticated;
GRANT ALL ON public.eoi_access_attempts TO service_role;

ALTER TABLE public.eoi_access_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log an access attempt"
ON public.eoi_access_attempts FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Storage bucket for participation certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('participation-certificates', 'participation-certificates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload participation certificates"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'participation-certificates');

CREATE POLICY "Admins can read participation certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'participation-certificates' AND public.has_role(auth.uid(), 'admin'::public.app_role));
