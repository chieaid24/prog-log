-- Dev-only fixture data for manual validation (task 0020). NOT part of the
-- seed: tests assume an empty entries table. Apply to the local stack with
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f scripts/dev-data.sql
-- Everything goes through log_entry (ADR-0001: single shared write path).

do $$
declare
  v_user  constant uuid := '00000000-0000-0000-0000-000000000001';
  v_today constant date := (now() at time zone 'America/Toronto')::date;
  v_day   date;
  v_proj  record;
  v_roll  int;
  v_size  time_size;
begin
  -- ~6 months of pseudo-random history. md5 keys the roll to (day, project)
  -- so the fixture is deterministic for a given date range.
  for v_day in select generate_series(v_today - 182, v_today, interval '1 day')::date loop
    for v_proj in
      select id, name, row_number() over (order by name) as rn
      from projects where user_id = v_user
    loop
      v_roll := ('x' || substr(md5(v_day::text || v_proj.name), 1, 6))::bit(24)::int % 100;
      -- Skip weekends more often for Work; overall ~45% of (day, project)
      -- slots get an entry so the heatmap shows real texture.
      if v_roll < 45 then
        v_size := case
          when v_roll < 8  then 'large'
          when v_roll < 25 then 'medium'
          else 'small'
        end;
        perform log_entry(
          v_proj.id, v_size,
          case when v_roll = 7 then 'shipped a chunk of ' || v_proj.name else null end,
          case when v_roll % 3 = 0 then 'worked on ' || v_proj.name else null end,
          v_user, v_day
        );
      end if;
    end loop;
  end loop;

  -- A live streak: the last 6 days each have at least one entry, so the
  -- Momentum card shows a current streak during validation.
  for v_day in select generate_series(v_today - 5, v_today, interval '1 day')::date loop
    perform log_entry(
      (select id from projects where user_id = v_user and name = 'AI-M'),
      'medium', null, 'daily research block', v_user, v_day
    );
  end loop;

  -- Throwback anchors: milestones exactly 1 month, 1 year and 2 years back
  -- so the feed has something to surface on every cadence today.
  perform log_entry(
    (select id from projects where user_id = v_user and name = 'Turkish'),
    'medium', 'hit a 30-day study streak', null, v_user, (v_today - interval '1 month')::date
  );
  perform log_entry(
    (select id from projects where user_id = v_user and name = 'Website'),
    'large', 'launched the first prototype', null, v_user, (v_today - interval '1 year')::date
  );
  perform log_entry(
    (select id from projects where user_id = v_user and name = 'Work'),
    'large', 'started the job', null, v_user, (v_today - interval '2 years')::date
  );
end $$;
