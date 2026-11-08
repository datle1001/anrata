CREATE TABLE public.terrestrial_publications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, owner_scope text NOT NULL, issue integer NOT NULL, sha256 text NOT NULL, filename text NOT NULL, raw text NOT NULL, artifact jsonb NOT NULL, uploaded_at timestamptz NOT NULL DEFAULT clock_timestamp(), transferred boolean NOT NULL DEFAULT false, UNIQUE(owner_scope,sha256), UNIQUE(owner_scope,issue)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.terrestrial_publications TO authenticated;
GRANT ALL ON public.terrestrial_publications TO service_role;
ALTER TABLE public.terrestrial_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_terrestrial_publications ON public.terrestrial_publications FOR ALL TO authenticated USING(user_id=auth.uid() AND owner_scope=auth.uid()::text) WITH CHECK(user_id=auth.uid() AND owner_scope=auth.uid()::text);
CREATE TABLE public.terrestrial_uploaded_notices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), publication_id uuid NOT NULL REFERENCES public.terrestrial_publications(id) ON DELETE CASCADE, user_id uuid, owner_scope text NOT NULL, issue integer NOT NULL, notice_id text NOT NULL, administration text NOT NULL, assignment_id text NOT NULL, raw jsonb NOT NULL, changes jsonb, state text NOT NULL DEFAULT 'unreviewed', viewed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(publication_id,notice_id)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.terrestrial_uploaded_notices TO authenticated;
GRANT ALL ON public.terrestrial_uploaded_notices TO service_role;
ALTER TABLE public.terrestrial_uploaded_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_terrestrial_notices ON public.terrestrial_uploaded_notices FOR ALL TO authenticated USING(user_id=auth.uid() AND owner_scope=auth.uid()::text) WITH CHECK(user_id=auth.uid() AND owner_scope=auth.uid()::text);
CREATE INDEX terrestrial_notice_lookup ON public.terrestrial_uploaded_notices(owner_scope,administration,notice_id);
CREATE OR REPLACE FUNCTION public.sync_terrestrial_uploaded_notices() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
 FOR r IN SELECT value FROM jsonb_array_elements(NEW.artifact->'records') LOOP
 INSERT INTO public.terrestrial_uploaded_notices(publication_id,user_id,owner_scope,issue,notice_id,administration,assignment_id,raw) VALUES(NEW.id,NEW.user_id,NEW.owner_scope,NEW.issue,r#>>'{notice,raw,terrakey}',r#>>'{notice,raw,adm}',r#>>'{notice,raw,assgn_id}',r)
 ON CONFLICT(publication_id,notice_id) DO UPDATE SET raw=excluded.raw;
 END LOOP;
 RETURN NULL;
END; $$;
CREATE TRIGGER sync_terrestrial_notices AFTER INSERT OR UPDATE OF artifact ON public.terrestrial_publications FOR EACH ROW EXECUTE FUNCTION public.sync_terrestrial_uploaded_notices();
CREATE OR REPLACE FUNCTION public.refresh_terrestrial_uploaded_changes() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE scope text; target public.terrestrial_uploaded_notices; baseline public.terrestrial_uploaded_notices; target_at timestamptz; latest_at timestamptz; candidates integer; exact_match boolean; diff jsonb; result jsonb; source_hash text;
BEGIN
 scope:=CASE WHEN TG_OP='DELETE' THEN OLD.owner_scope ELSE NEW.owner_scope END;
 PERFORM pg_advisory_xact_lock(hashtextextended(scope,0));
 FOR target IN SELECT n.* FROM public.terrestrial_uploaded_notices n JOIN public.terrestrial_publications p ON p.id=n.publication_id WHERE n.owner_scope=scope LOOP
 SELECT uploaded_at INTO target_at FROM public.terrestrial_publications WHERE id=target.publication_id;
 result:=jsonb_build_object('version',1,'status','no-baseline','baseline',null,'fields','[]'::jsonb,'matchBasis','No prior uploaded candidate','scope','Upload-sequence comparison of all supplied evidence. Not an ITU modification, withdrawal, propagation or clearance verdict.');
 SELECT EXISTS(SELECT 1 FROM public.terrestrial_uploaded_notices n JOIN public.terrestrial_publications p ON p.id=n.publication_id WHERE n.owner_scope=scope AND p.uploaded_at<target_at AND upper(trim(n.administration))=upper(trim(target.administration)) AND n.notice_id=target.notice_id) INTO exact_match;
 SELECT max(p.uploaded_at) INTO latest_at FROM public.terrestrial_uploaded_notices n JOIN public.terrestrial_publications p ON p.id=n.publication_id WHERE n.owner_scope=scope AND p.uploaded_at<target_at AND upper(trim(n.administration))=upper(trim(target.administration)) AND CASE WHEN exact_match THEN n.notice_id=target.notice_id ELSE target.assignment_id<>'' AND n.assignment_id=target.assignment_id END;
 IF latest_at IS NOT NULL THEN
 SELECT count(*) INTO candidates FROM public.terrestrial_uploaded_notices n JOIN public.terrestrial_publications p ON p.id=n.publication_id WHERE n.owner_scope=scope AND p.uploaded_at=latest_at AND upper(trim(n.administration))=upper(trim(target.administration)) AND CASE WHEN exact_match THEN n.notice_id=target.notice_id ELSE target.assignment_id<>'' AND n.assignment_id=target.assignment_id END;
 IF candidates=1 THEN
 SELECT n.* INTO baseline FROM public.terrestrial_uploaded_notices n JOIN public.terrestrial_publications p ON p.id=n.publication_id WHERE n.owner_scope=scope AND p.uploaded_at=latest_at AND upper(trim(n.administration))=upper(trim(target.administration)) AND CASE WHEN exact_match THEN n.notice_id=target.notice_id ELSE target.assignment_id<>'' AND n.assignment_id=target.assignment_id END;
 SELECT sha256 INTO source_hash FROM public.terrestrial_publications WHERE id=baseline.publication_id;
 diff:=public.upload_diff_fields(baseline.raw,target.raw);
 result:=result||jsonb_build_object('status',CASE WHEN jsonb_array_length(diff)>0 THEN 'changed' ELSE 'unchanged' END,'matchBasis',CASE WHEN exact_match THEN 'Same terrakey and administration' ELSE 'Unique assignment ID and administration' END,'baseline',jsonb_build_object('issue',baseline.issue,'filingId',baseline.notice_id,'sha256',source_hash),'fields',diff);
 ELSE result:=result||jsonb_build_object('status','ambiguous','matchBasis','Multiple prior candidates; expert confirmation required'); END IF;
 END IF;
 UPDATE public.terrestrial_uploaded_notices SET changes=result WHERE id=target.id;
 END LOOP;
 RETURN NULL;
END; $$;
CREATE TRIGGER zz_refresh_terrestrial_changes AFTER INSERT OR UPDATE OF artifact OR DELETE ON public.terrestrial_publications FOR EACH ROW EXECUTE FUNCTION public.refresh_terrestrial_uploaded_changes();
CREATE OR REPLACE FUNCTION public.compute_uploaded_changes(target public.uploaded_filings) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE baseline public.uploaded_filings; target_at timestamptz; latest_at timestamptz; exact_match boolean; candidates integer; fields jsonb; source_hash text;
 result jsonb:=jsonb_build_object('version',1,'status','no-baseline','baseline',null,'fields','[]'::jsonb,'matchBasis','No prior uploaded candidate','scope','Upload-sequence comparison, not publication chronology. All supplied data except root notice ID. Candidate identity only; no recalculation, interference or clearance verdict.');
BEGIN
 SELECT uploaded_at INTO target_at FROM public.uploaded_publications WHERE id=target.publication_id;
 SELECT EXISTS(SELECT 1 FROM public.uploaded_filings f JOIN public.uploaded_publications p ON p.id=f.publication_id WHERE f.owner_scope=target.owner_scope AND p.uploaded_at<target_at AND upper(trim(f.administration))=upper(trim(target.administration)) AND f.filing_id=target.filing_id) INTO exact_match;
 SELECT max(p.uploaded_at) INTO latest_at FROM public.uploaded_filings f JOIN public.uploaded_publications p ON p.id=f.publication_id WHERE f.owner_scope=target.owner_scope AND p.uploaded_at<target_at AND upper(trim(f.administration))=upper(trim(target.administration)) AND CASE WHEN exact_match THEN f.filing_id=target.filing_id ELSE upper(regexp_replace(trim(f.network_name),'\s+',' ','g'))=upper(regexp_replace(trim(target.network_name),'\s+',' ','g')) END;
 IF latest_at IS NULL THEN RETURN result; END IF;
 SELECT count(*) INTO candidates FROM public.uploaded_filings f JOIN public.uploaded_publications p ON p.id=f.publication_id WHERE f.owner_scope=target.owner_scope AND p.uploaded_at=latest_at AND upper(trim(f.administration))=upper(trim(target.administration)) AND CASE WHEN exact_match THEN f.filing_id=target.filing_id ELSE upper(regexp_replace(trim(f.network_name),'\s+',' ','g'))=upper(regexp_replace(trim(target.network_name),'\s+',' ','g')) END;
 IF candidates<>1 THEN RETURN result||jsonb_build_object('status','ambiguous','matchBasis','Multiple prior candidates; expert confirmation required'); END IF;
 SELECT f.* INTO baseline FROM public.uploaded_filings f JOIN public.uploaded_publications p ON p.id=f.publication_id WHERE f.owner_scope=target.owner_scope AND p.uploaded_at=latest_at AND upper(trim(f.administration))=upper(trim(target.administration)) AND CASE WHEN exact_match THEN f.filing_id=target.filing_id ELSE upper(regexp_replace(trim(f.network_name),'\s+',' ','g'))=upper(regexp_replace(trim(target.network_name),'\s+',' ','g')) END;
 SELECT sha256 INTO source_hash FROM public.uploaded_publications WHERE id=baseline.publication_id;
 fields:=public.upload_diff_fields(baseline.raw,target.raw);
 RETURN result||jsonb_build_object('status',CASE WHEN jsonb_array_length(fields)>0 THEN 'changed' ELSE 'unchanged' END,'matchBasis',CASE WHEN exact_match THEN 'Same filing ID and administration; prior upload' ELSE 'Unique network name and administration; prior upload' END,'baseline',jsonb_build_object('issue',baseline.issue,'filingId',baseline.filing_id,'sha256',source_hash),'fields',fields);
END; $$;
CREATE OR REPLACE FUNCTION public.cleanup_uploaded_review_state() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 DELETE FROM public.filing_reviews WHERE user_id=OLD.user_id AND filing_id IN (SELECT 'SIM:'||OLD.issue||':'||(f->>'id') FROM jsonb_array_elements(OLD.publication->'filings') f);
 RETURN OLD;
END; $$;
CREATE TRIGGER clean_uploaded_review_state BEFORE DELETE ON public.uploaded_publications FOR EACH ROW EXECUTE FUNCTION public.cleanup_uploaded_review_state();
REVOKE ALL ON FUNCTION public.sync_terrestrial_uploaded_notices(),public.refresh_terrestrial_uploaded_changes(),public.cleanup_uploaded_review_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_terrestrial_uploaded_notices(),public.refresh_terrestrial_uploaded_changes(),public.cleanup_uploaded_review_state() TO authenticated,service_role;
COMMENT ON TABLE public.terrestrial_publications IS 'Validated offline terrestrial review artifacts and original text in the same Cloud database as Space; no runtime propagation calculation.';