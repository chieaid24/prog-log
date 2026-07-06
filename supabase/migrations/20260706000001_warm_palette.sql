-- Remap stored Project colors from the retired dark-theme "space" palette to
-- the warm-paper palette (lib/palette.ts), nearest hue wins. Colors are plain
-- hex values on projects.color; anything not in the old palette (user-picked
-- customs) is left untouched. Safe to re-run: once remapped, the old hexes no
-- longer match.

update public.projects
set color = case lower(color)
  when '#f87171' then '#bd6254' -- red giant      -> clay
  when '#fb923c' then '#ca7d44' -- mars orange    -> terracotta
  when '#fbbf24' then '#be9946' -- solar amber    -> ochre
  when '#a3e635' then '#87904e' -- comet lime     -> olive
  when '#34d399' then '#339797' -- aurora green   -> teal
  when '#67e8f9' then '#4796c0' -- ion cyan       -> sky
  when '#38bdf8' then '#6d7ac2' -- sky signal     -> periwinkle
  when '#7c8cf8' then '#906eb5' -- indigo drift   -> violet
  when '#c084fc' then '#af6ca0' -- nebula violet  -> orchid
  when '#f472b6' then '#bf5b76' -- plasma pink    -> raspberry
  else color
end
where lower(color) in (
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399',
  '#67e8f9', '#38bdf8', '#7c8cf8', '#c084fc', '#f472b6'
);
