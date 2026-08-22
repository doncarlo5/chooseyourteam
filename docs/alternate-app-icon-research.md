# Alternate app icon research

Research date: 2026-08-22

Scope: whether this Expo SDK 57 app can let a user choose its installed Home Screen icon at runtime. Sources are limited to official Expo, Apple, Android, and Google Play documentation.

## Executive summary

Yes, the feature is technically possible on both iOS and Android, but Expo SDK 57 does **not** provide a first-party JavaScript API or package for it.

- iOS has a dedicated system API for user-selectable alternate icons.
- Android has no equivalent alternate-icon API. The standard implementation uses multiple launcher `activity-alias` components and switches which component is enabled.
- In an Expo project, either implementation needs native code plus build-time native configuration, normally packaged as an Expo Module and config plugin (or supplied by a third-party library).
- Every selectable icon must be included in the installed native binary. Adding icons or native support requires a new development/store build; an EAS Update cannot add them later.

## What Expo SDK 57 provides

Expo's SDK 57 app-config reference supports a primary icon and platform-specific icon configuration. On iOS, `ios.icon.light`, `dark`, and `tinted` are appearance variants selected by the operating system. Android similarly supports one normal/adaptive launcher icon, including an Android 13+ monochrome resource. These are build-time appearance variants, not icons the user can select in the app ([Expo SDK 57 app config](https://docs.expo.dev/versions/v57.0.0/config/app/)).

The SDK 57 API index contains no app-icon module, and `expo-application` only reads application metadata; it exposes no icon getter or setter. Therefore, the absence of a ready-made Expo API is an inference from Expo's complete SDK 57 reference rather than an explicit unsupported-feature statement ([Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/), [`expo-application`](https://docs.expo.dev/versions/v57.0.0/sdk/application/)).

Expo supports adding this missing capability through a native library or local Expo Module. A config plugin can apply the necessary native project configuration during prebuild, after which a new development build is required ([adding custom native code](https://docs.expo.dev/workflow/customizing/), [config plugins](https://docs.expo.dev/config-plugins/introduction/)). A community package could provide this module/plugin combination, but it would not be an Expo-supported SDK API and should be compatibility-tested separately.

## iOS

UIKit provides `UIApplication.setAlternateIconName`. The app passes the name of an icon declared under `CFBundleAlternateIcons`; passing `nil` restores the primary icon. The app should check `supportsAlternateIcons`, and it can read `alternateIconName` to determine the current selection ([Apple API](https://developer.apple.com/documentation/uikit/uiapplication/setalternateiconname(_:completionhandler:)), [Apple configuration guide](https://developer.apple.com/documentation/xcode/configuring-your-app-to-use-alternate-app-icons)).

Important limits:

- The selectable icon sets must be declared and compiled into the app. The API cannot install an arbitrary downloaded or gallery image.
- iOS automatically shows a system alert confirming an icon change.
- Apple recommends exposing the choice in the app's settings. Every alternate icon and its appearance variants is reviewed with the app and must remain recognizably related to the app ([Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)).
- Apple documents alternate-icon support for iOS/iPadOS and compatible apps; it is not available to apps built for visionOS ([Apple API](https://developer.apple.com/documentation/uikit/uiapplication/setalternateiconname(_:completionhandler:)).

The operating system owns the active icon state. The app can query `alternateIconName` after future launches, so AsyncStorage is not required as the source of truth for the icon itself. App storage can still retain the user's theme choice and map that preference to the corresponding native icon.

## Android

Android has no dedicated system API equivalent to iOS's `setAlternateIconName`. A native implementation can predeclare multiple `<activity-alias>` launcher entries, each with its own icon and a `MAIN`/`LAUNCHER` intent filter. It then uses `PackageManager.setComponentEnabledSetting` (or the atomic plural API on API 33+) to enable the chosen alias and disable the others ([`activity-alias`](https://developer.android.com/guide/topics/manifest/activity-alias-element), [`PackageManager`](https://developer.android.com/reference/android/content/pm/PackageManager)).

Consequences:

- All aliases and icon resources must be compiled into the app; runtime selection is limited to this fixed list.
- The active component state can be read with `getComponentEnabledSetting`.
- The feature must be clearly initiated or consented to by the user and easily reversible. Google Play explicitly treats icons and Home Screen presentation as device features covered by its deceptive-behavior policy ([Google Play policy](https://support.google.com/googleplay/android-developer/answer/17006354)).

Because this is an alias-based technique rather than a purpose-built Android icon API, it needs validation on the supported Android launchers and OS versions before release.

## Build and distribution constraints

This cannot be tested in Expo Go. Expo Go has a fixed native runtime, while a custom module, native configuration, and icon resources must be compiled into this app's own binary. Expo also describes native icon assets as immutable after installation ([Expo development-build FAQ](https://docs.expo.dev/develop/development-builds/faq/)).

The required workflow is:

1. Add the icon assets, native module/API, and config plugin configuration.
2. Run prebuild as appropriate for the project's native-generation workflow.
3. Produce a new iOS/Android development build for testing.
4. Submit a new store binary containing every alternative icon.

A JavaScript-only EAS Update may later change the settings UI or choose among alternatives already compiled into a compatible binary, but it cannot add the native module, manifest/Info.plist entries, or new icon resources. Expo requires rebuilding when the underlying native code changes ([using development builds](https://docs.expo.dev/develop/development-builds/use-development-builds/)).

## Relevance to Choose Your Team

The project uses Expo `~57.0.14`, already depends on `expo-dev-client`, and has development, preview, and production EAS build profiles. Its current `app.json` defines:

- iOS light/dark/tinted variants for the same app icon;
- one Android adaptive icon.

Those current variants are automatic system-appearance variants and do not implement a user-selected icon. SDK 57 is not a blocker, but implementing theme-matched selectable icons requires native integration and a fresh build on both platforms.

Recommended product behavior:

- Offer a clearly labeled icon selector in Settings, including “Default”.
- Bundle one icon family for each supported choice and keep all options recognizably tied to Choose Your Team.
- Keep the existing persisted game-theme preference, but query the native active icon when rendering the selector so native state remains authoritative.
- Change the icon only after an explicit user action, especially on Android.
- Verify real-device behavior in an iOS development build and across representative Android launchers before store submission.
