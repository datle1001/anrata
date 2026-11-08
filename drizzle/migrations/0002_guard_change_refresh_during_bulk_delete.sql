CREATE OR REPLACE FUNCTION public.refresh_uploaded_changes() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE scope text;
BEGIN
 scope := CASE WHEN TG_OP='DELETE' THEN OLD.owner_scope ELSE NEW.owner_scope END;
 PERFORM pg_advisory_xact_lock(hashtextextended(scope,0));
 UPDATE public.uploaded_filings f SET changes=public.compute_uploaded_changes(f) WHERE f.owner_scope=scope AND EXISTS (SELECT 1 FROM public.uploaded_publications p WHERE p.id=f.publication_id AND p.owner_scope=scope);
 RETURN NULL;
END; $$;