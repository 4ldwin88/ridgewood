-- Gate 2A regression-test infrastructure.
-- pgTAP is used only to verify database/security contracts; it does not alter application behavior.
create extension if not exists pgtap with schema extensions;
