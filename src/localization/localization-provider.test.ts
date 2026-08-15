import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const appState = vi.hoisted(() => ({
  currentState: "background",
  listener: undefined as ((state: string) => void) | undefined,
  remove: vi.fn(),
}));
const platform = vi.hoisted(() => ({ OS: "android" }));
const locale = vi.hoisted(() => ({ current: "fr" }));
const activateLocale = vi.hoisted(() => vi.fn());
const i18n = vi.hoisted(() => ({ locale: "en" }));

vi.mock("react-native", () => ({
  AppState: {
    get currentState() {
      return appState.currentState;
    },
    addEventListener: vi.fn(
      (_event: string, listener: (state: string) => void) => {
        appState.listener = listener;
        return { remove: appState.remove };
      },
    ),
  },
  Platform: platform,
}));
vi.mock("./device-locale", () => ({
  getAppLocale: () => locale.current,
}));
vi.mock("./i18n", () => ({ activateLocale, i18n }));

let subscribeToLocaleChanges: typeof import("./localization-provider").subscribeToLocaleChanges;

beforeAll(async () => {
  ({ subscribeToLocaleChanges } = await import("./localization-provider"));
});

describe("subscribeToLocaleChanges", () => {
  beforeEach(() => {
    appState.currentState = "background";
    appState.listener = undefined;
    appState.remove.mockClear();
    platform.OS = "android";
    locale.current = "fr";
    i18n.locale = "en";
    activateLocale.mockClear();
  });

  it("activates a changed Android locale when the app returns to foreground", () => {
    const unsubscribe = subscribeToLocaleChanges();

    appState.listener?.("active");

    expect(activateLocale).toHaveBeenCalledOnce();
    expect(activateLocale).toHaveBeenCalledWith("fr");
    unsubscribe?.();
    expect(appState.remove).toHaveBeenCalledOnce();
  });

  it("does not subscribe outside Android", () => {
    platform.OS = "ios";

    expect(subscribeToLocaleChanges()).toBeUndefined();
    expect(appState.listener).toBeUndefined();
  });

  it("does not replace a manual locale when Android returns to foreground", () => {
    const unsubscribe = subscribeToLocaleChanges(() => "fr");

    appState.listener?.("active");

    expect(activateLocale).not.toHaveBeenCalled();
    unsubscribe?.();
  });
});
