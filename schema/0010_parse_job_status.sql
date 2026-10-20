-- Keep why an asynchronous parse failed so the workbench can report it.
ALTER TABLE extraction_run
  ADD COLUMN error_message TEXT;

PRAGMA user_version = 10;
