ALTER TABLE public.uploaded_filings ADD COLUMN changes jsonb;
CREATE OR REPLACE FUNCTION public.upload_diff_fields(a jsonb, b jsonb, path text DEFAULT '', a_present boolean DEFAULT true, b_present boolean DEFAULT true) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE result jsonb := '[]'; k text; part jsonb; i integer; keyed boolean;
BEGIN
 IF a_present = b_present AND a IS NOT DISTINCT FROM b THEN RETURN result; END IF;
 IF a_present AND b_present AND jsonb_typeof(a) = 'object' AND jsonb_typeof(b) = 'object' THEN
  FOR k IN SELECT key FROM (SELECT jsonb_object_keys(a) key UNION SELECT jsonb_object_keys(b) key) keys ORDER BY key LOOP
   IF path = '' AND k = 'id' THEN CONTINUE; END IF;
   result := result || public.upload_diff_fields(a->k,b->k,CASE WHEN path='' THEN k ELSE path||'.'||k END,a ? k,b ? k);
  END LOOP;
 ELSIF a_present AND b_present AND jsonb_typeof(a) = 'array' AND jsonb_typeof(b) = 'array' THEN
  keyed := path = 'pfdScreening.groups' AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(a||b) x WHERE NOT (x ? 'groupId')) AND (SELECT count(*)=count(DISTINCT x->>'groupId') FROM jsonb_array_elements(a) x) AND (SELECT count(*)=count(DISTINCT x->>'groupId') FROM jsonb_array_elements(b) x);
  IF keyed THEN
   FOR k IN SELECT key FROM (SELECT x->>'groupId' key FROM jsonb_array_elements(a) x UNION SELECT x->>'groupId' FROM jsonb_array_elements(b) x) keys ORDER BY key LOOP
    result := result || public.upload_diff_fields((SELECT x FROM jsonb_array_elements(a) x WHERE x->>'groupId'=k),(SELECT x FROM jsonb_array_elements(b) x WHERE x->>'groupId'=k),path||'[group='||k||']',EXISTS(SELECT 1 FROM jsonb_array_elements(a) x WHERE x->>'groupId'=k),EXISTS(SELECT 1 FROM jsonb_array_elements(b) x WHERE x->>'groupId'=k));
   END LOOP;
  ELSE
   FOR i IN 0..greatest(jsonb_array_length(a),jsonb_array_length(b))-1 LOOP
    result := result || public.upload_diff_fields(a->i,b->i,path||'['||i||']',i<jsonb_array_length(a),i<jsonb_array_length(b));
   END LOOP;
  END IF;
 ELSE
  result := jsonb_build_array(jsonb_build_object('path',path,'before',a,'after',b,'beforePresent',a_present,'afterPresent',b_present));
 END IF;
 RETURN result;
END; $$;
CREATE OR REPLACE FUNCTION public.compute_uploaded_changes(target public.uploaded_filings) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE baseline public.uploaded_filings; latest integer; exact_match boolean; candidates integer; fields jsonb; source_hash text;
 result jsonb := jsonb_build_object('version',1,'status','no-baseline','baseline',null,'fields','[]'::jsonb,'matchBasis','No earlier uploaded candidate','scope','Stored field comparison only; synthetic uploads. Same ID and administration or unique normalized network name and administration is a candidate identity, not verified ITU modification. Notice ID is provenance, excluded from field diff. No PFD recalculation, interference or clearance verdict.');
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.uploaded_filings f WHERE f.owner_scope=target.owner_scope AND f.issue<target.issue AND upper(trim(f.administration))=upper(trim(target.administration)) AND f.filing_id=target.filing_id) INTO exact_match;
 SELECT max(f.issue) INTO latest FROM public.uploaded_filings f WHERE f.owner_scope=target.owner_scope AND f.issue<target.issue AND upper(trim(f.administration))=upper(trim(target.administration)) AND (CASE WHEN exact_match THEN f.filing_id=target.filing_id ELSE upper(regexp_replace(trim(f.network_name),'\s+',' ','g'))=upper(regexp_replace(trim(target.network_name),'\s+',' ','g')) END);
 IF latest IS NULL THEN RETURN result; END IF;
 SELECT count(*) INTO candidates FROM public.uploaded_filings f WHERE f.owner_scope=target.owner_scope AND f.issue=latest AND upper(trim(f.administration))=upper(trim(target.administration)) AND (CASE WHEN exact_match THEN f.filing_id=target.filing_id ELSE upper(regexp_replace(trim(f.network_name),'\s+',' ','g'))=upper(regexp_replace(trim(target.network_name),'\s+',' ','g')) END);
 result := result || jsonb_build_object('matchBasis',CASE WHEN exact_match THEN 'Same filing ID and administration' ELSE 'Unique normalized network name and administration' END);
 IF candidates<>1 THEN RETURN result || jsonb_build_object('status','ambiguous','matchBasis','Multiple earlier candidate filings; expert identity confirmation required'); END IF;
 SELECT f.* INTO baseline FROM public.uploaded_filings f WHERE f.owner_scope=target.owner_scope AND f.issue=latest AND upper(trim(f.administration))=upper(trim(target.administration)) AND (CASE WHEN exact_match THEN f.filing_id=target.filing_id ELSE upper(regexp_replace(trim(f.network_name),'\s+',' ','g'))=upper(regexp_replace(trim(target.network_name),'\s+',' ','g')) END);
 SELECT sha256 INTO source_hash FROM public.uploaded_publications WHERE id=baseline.publication_id AND owner_scope=target.owner_scope;
 fields := public.upload_diff_fields(baseline.raw,target.raw);
 RETURN result || jsonb_build_object('status',CASE WHEN jsonb_array_length(fields)>0 THEN 'changed' ELSE 'unchanged' END,'baseline',jsonb_build_object('issue',baseline.issue,'filingId',baseline.filing_id,'sha256',source_hash),'fields',fields);
END; $$;
CREATE OR REPLACE FUNCTION public.refresh_uploaded_changes() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE scope text;
BEGIN
 scope := CASE WHEN TG_OP='DELETE' THEN OLD.owner_scope ELSE NEW.owner_scope END;
 PERFORM pg_advisory_xact_lock(hashtextextended(scope,0));
 UPDATE public.uploaded_filings f SET changes=public.compute_uploaded_changes(f) WHERE f.owner_scope=scope;
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.upload_diff_fields(jsonb,jsonb,text,boolean,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_uploaded_changes(public.uploaded_filings) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_uploaded_changes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upload_diff_fields(jsonb,jsonb,text,boolean,boolean), public.compute_uploaded_changes(public.uploaded_filings), public.refresh_uploaded_changes() TO authenticated, service_role;
CREATE TRIGGER zz_refresh_uploaded_changes AFTER INSERT OR UPDATE OF publication,filing_evidence OR DELETE ON public.uploaded_publications FOR EACH ROW EXECUTE FUNCTION public.refresh_uploaded_changes();
UPDATE public.uploaded_filings f SET changes=public.compute_uploaded_changes(f) WHERE f.changes IS NULL;
COMMENT ON COLUMN public.uploaded_filings.changes IS 'Versioned stored field differences against earlier owner-scoped uploaded candidate. Candidate identity only; no recalculation or regulatory findings. Rebuilt after publication save/deletion.';