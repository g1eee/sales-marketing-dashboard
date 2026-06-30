-- Record which file(s) produced each upload (history metadata, chunk 2).
alter table report_periods
  add column source_files text[] not null default '{}';
