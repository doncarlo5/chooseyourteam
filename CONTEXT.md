# Domain Context

## Team allocation

- **Team**: a group receiving players.
- **Team Identity**: the fixed number, color, and shape representing a team.
- **Player**: one participating touch.
- **Round**: up to five players assigned together.
- **Session**: one allocation run, reset by team/count changes or Back.
- **Fair Allocation**: team sizes differ by at most one per round and overall.
- **Declared Player Count**: the exact 6–10-player total used for two rounds.
- **Inséparable**: a hidden, session-only setup mode that forces the second and
  third players onto the same team when the pairing preserves Fair Allocation.

Team identity is canonical for the lifetime of the app:

1. Team 1: `#415679`, spike
2. Team 2: `#FB7185`, wave
3. Team 3: `#512663`, hexagon
4. Team 4: `#E11D48`, diamond
5. Team 5: `#9D659F`, squircle

Single-round sessions are flexible. Selecting 2–5 teams establishes the
minimum held-touch count, and the allocation may grow to the 12-touch slot
limit. Multi-round sessions use an exact declared count of 6–10 players,
split into a five-player first round and a second round containing the
remainder.

Long-pressing the setup heading toggles Inséparable before a team count is
selected. The mode applies to the current session only and is cleared by Back.
When every selected team must receive exactly one player, such as five players
across five teams, Inséparable is ignored and the normal fair assignment is
used.
