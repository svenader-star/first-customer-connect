ALTER TABLE public.leads
  ADD COLUMN email_draft_subject TEXT NOT NULL DEFAULT '',
  ADD COLUMN email_draft_body TEXT NOT NULL DEFAULT '',
  ADD COLUMN linkedin_draft_body TEXT NOT NULL DEFAULT '',
  ADD COLUMN followup_draft_subject TEXT NOT NULL DEFAULT '',
  ADD COLUMN followup_draft_body TEXT NOT NULL DEFAULT '';
