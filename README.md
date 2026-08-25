# Choose Your Team

Choose Your Team is a fast, touch-based team picker for any in-person game or
quick matchup. Drop the phone on the table, everyone touches the screen, hold
for a few seconds, and the app reveals each player's team color and number.

## Why it is useful

- Decide who starts in 1v1 games (chess, darts, pool, foosball, table tennis).
- Split a group into fair teams for doubles, 3v3, or uneven party matchups.
- Settle "who goes first" before a tournament, bar game, or friendly challenge.
- Rerun it between rounds to reshuffle teams without arguments.

## App flows

### 1. Configure the game

- Use the home steppers to choose 2 to 5 teams.
- On Android, the number of Players is observed from the fingers on screen, up
  to the application's twelve-contact limit and the device's own capability.
- On iPhone, iPad, and web, `More players: 5+` is the entry point for selecting
  an exact total from 6 to 10. Starting directly from `5+` still creates an
  observed single Round of up to five Players.
- Tap Start when the setup is ready.

### 2. Place fingers

- Each player places one finger on the screen.
- Keep fingers steady while the countdown ring fills and feedback builds.

### 3. Reveal teams

- Each dot flips to a colored badge with a team number.
- If a finger lifts early, the countdown resets for a clean restart.

### 4. Multi-round for 6–10 players on iOS and web

- Round 1 handles the first five players and freezes the results.
- Swipe to Round 2 for the remaining players, then swipe back to review both
  rounds.

### 5. Reset and play again

- Tap back to return to team selection and reshuffle for the next game.

## Features

- Random team assignment with color and number labels.
- Multi-touch input with no names or setup.
- Countdown feedback with haptics, subtle sounds, and a nervous shake before
  reveal.
- Touch-safe controls: touches on the back button do not count as players.
- Built for quick decisions: who breaks, who serves, who starts, and who teams
  up.

## Release and TestFlight

The app uses two independent iOS version values:

- `expo.version` is the user-facing App Store version, such as `0.0.7`.
- `ios.buildNumber` is the developer-facing build number, such as `48`.

Keep `cli.appVersionSource` set to `remote` and
`build.production.autoIncrement` set to `true` in `eas.json`. With this setup,
`npx testflight` automatically increments the iOS build number for successive
TestFlight builds of the same release.

Update `expo.version` manually in `app.json` when starting a new App Store
release. Expo recommends making this user-facing version an explicit release
decision. EAS remote versioning intentionally does not support automatically
incrementing it.

If Apple reports that the version has already been submitted, increasing only
the build number is insufficient because that App Store version is already
closed. Increment `expo.version`, commit and push the change, then run
`npx testflight` again. Do not increment `expo.version` for every TestFlight
iteration while the current App Store version remains open.

References:

- [Expo app version management](https://docs.expo.dev/build-reference/app-versions/)
- [Expo `npx testflight` command](https://docs.expo.dev/build-reference/npx-testflight/)
