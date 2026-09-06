import { createElement } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import Home from "./Home";

vi.mock("react-native", () => ({ View: "View", Platform: { OS: "ios" } }));
vi.mock("react-native-reanimated", () => ({
  useSharedValue: (value: unknown) => ({ value }),
}));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("heroui-native", () => ({
  cn: (...values: unknown[]) => values.join(" "),
}));
vi.mock("../game-themes/game-theme-provider", () => ({
  useGameTheme: () => ({ theme: { Background: () => null, chrome: {} } }),
}));
vi.mock("./utils/helper", () => ({
  H: { pairingModeOn: vi.fn(), pairingModeOff: vi.fn() },
}));
vi.mock("./components/app-info-button", () => ({ default: () => null }));
vi.mock("./components/app-review-button", () => ({ default: () => null }));
vi.mock("./components/app-share-button", () => ({ default: () => null }));
vi.mock("./components/allocation-setup", () => ({
  default: (props: object) => createElement("Setup", props),
}));
vi.mock("./components/allocation-back-button", () => ({
  default: (props: object) => createElement("Back", props),
}));
vi.mock("./components/touch-allocation-scene", () => ({
  default: (props: object) => createElement("Scene", props),
}));
vi.mock(
  "@/src/screens/state/allocation-session-state",
  async () => import("./state/allocation-session-state"),
);
vi.mock("./components/allocation-round-navigation", () => ({
  default: (props: {
    children: (navigation: object, layer: null) => unknown;
  }) =>
    props.children({ scrollX: { value: 0 }, isIdle: { value: true } }, null),
}));

it("returns through the normal exit to setup with six players and the selected teams", async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Home />);
  });
  const setup = () => renderer.root.findByType("Setup" as never);
  const scene = () => renderer.root.findByType("Scene" as never);
  await act(async () => setup().props.onIncrementTeams());
  await act(async () => setup().props.onStart());
  expect(scene().props.configuration.selectedTeams).toBe(3);
  await act(async () => scene().props.onSelectSixPlayers());
  expect(scene().props.exitRequested).toBe(true);
  expect(scene().props.configuration.acceptsNewTouches).toBe(false);
  expect(renderer.root.findAllByType("Setup" as never)).toHaveLength(0);
  await act(async () => scene().props.onExitReady());
  expect(setup().props.playerSelection).toEqual({ mode: "declared", count: 6 });
  expect(setup().props.selectedTeams).toBe(3);
  await act(async () => setup().props.onStart());
  expect(scene().props.isMultiRound).toBe(true);
  expect(scene().props.configuration.expectedTouchCount).toBe(5);
  await act(async () => renderer.unmount());
});
