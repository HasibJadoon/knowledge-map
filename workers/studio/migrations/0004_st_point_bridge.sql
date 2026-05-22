-- 0004_st_point_bridge.sql — per-card transition for talking-head episodes
-- A talking point may carry a "bridge": the question or thought that carries
-- the speaker into the next card. Used by the talking-head record / prompter
-- screen. NULL = no bridge written.

ALTER TABLE st_talking_points ADD COLUMN bridge TEXT;
