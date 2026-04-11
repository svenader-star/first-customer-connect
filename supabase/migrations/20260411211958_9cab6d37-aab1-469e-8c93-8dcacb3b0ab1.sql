
-- Spaces table
CREATE TABLE public.spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'New Space',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read spaces" ON public.spaces FOR SELECT USING (true);
CREATE POLICY "Public insert spaces" ON public.spaces FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update spaces" ON public.spaces FOR UPDATE USING (true);
CREATE POLICY "Public delete spaces" ON public.spaces FOR DELETE USING (true);

-- Space setup table (one per space)
CREATE TABLE public.space_setup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE UNIQUE,
  icp_description TEXT NOT NULL DEFAULT '',
  example_company_1 TEXT NOT NULL DEFAULT '',
  example_company_2 TEXT NOT NULL DEFAULT '',
  example_company_3 TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  geography TEXT NOT NULL DEFAULT 'germany'
);

ALTER TABLE public.space_setup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read space_setup" ON public.space_setup FOR SELECT USING (true);
CREATE POLICY "Public insert space_setup" ON public.space_setup FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update space_setup" ON public.space_setup FOR UPDATE USING (true);
CREATE POLICY "Public delete space_setup" ON public.space_setup FOR DELETE USING (true);

-- Leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  company TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  person TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  linkedin TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  email_sent BOOLEAN NOT NULL DEFAULT false,
  linkedin_sent BOOLEAN NOT NULL DEFAULT false,
  followup_sent BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Public insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update leads" ON public.leads FOR UPDATE USING (true);
CREATE POLICY "Public delete leads" ON public.leads FOR DELETE USING (true);

-- Outreach templates table
CREATE TABLE public.outreach_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('email', 'linkedin')),
  template_number INTEGER NOT NULL,
  subject_line TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read outreach_templates" ON public.outreach_templates FOR SELECT USING (true);
CREATE POLICY "Public insert outreach_templates" ON public.outreach_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update outreach_templates" ON public.outreach_templates FOR UPDATE USING (true);
CREATE POLICY "Public delete outreach_templates" ON public.outreach_templates FOR DELETE USING (true);
