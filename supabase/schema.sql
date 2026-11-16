-- ============================================================
-- Workout Tracker – Supabase Schema
-- Run this in the Supabase SQL Editor (once, on a new project)
-- ============================================================

-- Exercises library
create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  muscle_group text not null,
  category     text not null,
  created_at   timestamptz default now()
);

-- Workout sessions
create table if not exists workouts (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  notes       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  created_at  timestamptz default now()
);

-- Exercises performed within a workout
create table if not exists workout_exercises (
  id            uuid primary key default gen_random_uuid(),
  workout_id    uuid not null references workouts(id) on delete cascade,
  exercise_id   uuid references exercises(id),
  exercise_name text not null,
  order_index   integer default 0,
  notes         text,
  created_at    timestamptz default now()
);

-- Individual sets
create table if not exists sets (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  exercise_id         uuid references exercises(id),
  set_number          integer not null,
  set_type            text default 'normal',   -- normal | warmup | dropset | failure
  weight              numeric,
  weight_unit         text default 'lbs',
  reps                integer,
  duration_seconds    integer,                 -- for timed exercises (plank, etc.)
  distance_miles      numeric,                 -- for cardio
  completed           boolean default false,
  created_at          timestamptz default now()
);

-- Workout templates
create table if not exists templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

create table if not exists template_exercises (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references templates(id) on delete cascade,
  exercise_id   uuid references exercises(id),
  exercise_name text not null,
  order_index   integer default 0
);

-- Indexes
create index if not exists idx_workouts_started_at        on workouts(started_at desc);
create index if not exists idx_we_workout_id              on workout_exercises(workout_id);
create index if not exists idx_sets_workout_exercise_id   on sets(workout_exercise_id);
create index if not exists idx_sets_exercise_id           on sets(exercise_id);

-- Disable RLS (personal single-user app — no auth needed)
alter table exercises         disable row level security;
alter table workouts          disable row level security;
alter table workout_exercises disable row level security;
alter table sets              disable row level security;
alter table templates         disable row level security;
alter table template_exercises disable row level security;

-- Grant full access to the anon key
grant usage  on schema public to anon;
grant all    on all tables    in schema public to anon;
grant all    on all sequences in schema public to anon;
