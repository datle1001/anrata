ALTER TABLE public.uploaded_publications ADD COLUMN IF NOT EXISTS filing_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE public.uploaded_filings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 publication_id uuid NOT NULL REFERENCES public.uploaded_publications(id) ON DELETE CASCADE,
 user_id uuid,
 owner_scope text NOT NULL,
 issue integer NOT NULL,
 filing_id text NOT NULL,
 network_name text NOT NULL,
 administration text NOT NULL,
 freq_lower_mhz double precision NOT NULL,
 freq_upper_mhz double precision NOT NULL,
 pfd_status text NOT NULL DEFAULT 'not-calculable',
 worst_margin_db double precision,
 review_trigger text NOT NULL,
 affected_stations jsonb NOT NULL DEFAULT '[]'::jsonb,
 pfd_screening jsonb,
 raw jsonb NOT NULL,
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (publication_id, filing_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploaded_filings TO authenticated;
GRANT ALL ON public.uploaded_filings TO service_role;
ALTER TABLE public.uploaded_filings ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_uploaded_filings ON public.uploaded_filings FOR ALL TO authenticated USING (user_id = auth.uid() AND owner_scope = auth.uid()::text) WITH CHECK (user_id = auth.uid() AND owner_scope = auth.uid()::text);
CREATE INDEX uploaded_filings_scope_issue ON public.uploaded_filings(owner_scope, issue, filing_id);
CREATE INDEX uploaded_filings_scope_administration ON public.uploaded_filings(owner_scope, administration, pfd_status);
CREATE OR REPLACE FUNCTION public.sync_uploaded_filings() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
 DELETE FROM public.uploaded_filings WHERE publication_id = NEW.id;
 INSERT INTO public.uploaded_filings (publication_id,user_id,owner_scope,issue,filing_id,network_name,administration,freq_lower_mhz,freq_upper_mhz,pfd_status,worst_margin_db,review_trigger,affected_stations,pfd_screening,raw,evidence)
 SELECT NEW.id,NEW.user_id,NEW.owner_scope,NEW.issue,f->>'id',f->>'name',f->>'administration',(f->>'lowerMHz')::double precision,(f->>'upperMHz')::double precision,COALESCE(f->'pfdScreening'->>'status','not-calculable'),(f->'pfdScreening'->>'worstMarginDb')::double precision,f->>'reviewTrigger',COALESCE(NEW.filing_evidence->(f->>'id')->'affectedFinnishFrequencies','[]'::jsonb),f->'pfdScreening',f,COALESCE(NEW.filing_evidence->(f->>'id'),'{}'::jsonb)
 FROM jsonb_array_elements(NEW.publication->'filings') AS f;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_uploaded_filings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_uploaded_filings() TO authenticated, service_role;
CREATE TRIGGER sync_uploaded_filings_after_save AFTER INSERT OR UPDATE OF publication, filing_evidence ON public.uploaded_publications FOR EACH ROW EXECUTE FUNCTION public.sync_uploaded_filings();
INSERT INTO public.uploaded_filings (publication_id,user_id,owner_scope,issue,filing_id,network_name,administration,freq_lower_mhz,freq_upper_mhz,pfd_status,worst_margin_db,review_trigger,pfd_screening,raw)
SELECT p.id,p.user_id,p.owner_scope,p.issue,f->>'id',f->>'name',f->>'administration',(f->>'lowerMHz')::double precision,(f->>'upperMHz')::double precision,COALESCE(f->'pfdScreening'->>'status','not-calculable'),(f->'pfdScreening'->>'worstMarginDb')::double precision,f->>'reviewTrigger',f->'pfdScreening',f FROM public.uploaded_publications p CROSS JOIN LATERAL jsonb_array_elements(p.publication->'filings') f;
COMMENT ON TABLE public.uploaded_filings IS 'Owner-scoped index of validated uploaded synthetic Space evidence. PFD copied unchanged; affected stations are frequency-only candidates, never interference verdicts. Empty historical evidence means unavailable, not cleared.';