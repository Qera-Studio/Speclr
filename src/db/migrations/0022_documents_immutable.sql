-- An issued document cannot change or disappear, enforced by the database
-- itself rather than only by the app (founder's decision, 19 October 2026).
-- The app already refuses; this is the floor under it, so a bug, a race or a
-- stray script cannot do what CGST s.36 forbids for 72 months.
--
-- One exception, for deletion only and never for updates: a transaction that
-- sets speclr.purge_finalized. The dev server sets it to clear its own sample
-- finalizes (fake six-digit serials) and the integration tests set it in
-- teardown. Nothing in production does.
CREATE OR REPLACE FUNCTION refuse_finalized_change() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'finalized' THEN
    IF TG_OP = 'DELETE' AND current_setting('speclr.purge_finalized', true) = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Document % is finalized and immutable', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER documents_immutable
  BEFORE UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION refuse_finalized_change();
