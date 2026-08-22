import {
  createElement,
  useCallback,
  useEffect,
  type ComponentType,
} from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameThemeDefinition } from "./game-theme-types";
import { GameThemeProvider, useGameTheme } from "./game-theme-provider";
import type { GameThemeStorage } from "./game-theme-storage";

vi.mock("./game-theme-registry", () => {
  const Empty = (() => null) as ComponentType;
  const createTheme = (id: "desert-lagoon" | "coral-sky" | "neon-arena") =>
    ({
      id,
      displayName: id,
      Background: Empty,
      chrome: {},
    }) as unknown as GameThemeDefinition;
  const themes = {
    "desert-lagoon": createTheme("desert-lagoon"),
    "coral-sky": createTheme("coral-sky"),
    "neon-arena": createTheme("neon-arena"),
  };
  return {
    getGameTheme: (themeId: keyof typeof themes) => themes[themeId],
  };
});

type ThemeContext = ReturnType<typeof useGameTheme>;

let latestContext: ThemeContext | null = null;

function ContextProbe(props: { onValue: (value: ThemeContext) => void }) {
  const context = useGameTheme();
  const reportContext = useCallback(() => {
    props.onValue(context);
  }, [context, props]);

  useEffect(reportContext, [reportContext]);
  return null;
}

const captureContext = (context: ThemeContext) => {
  latestContext = context;
};

const getContext = () => {
  if (!latestContext) {
    throw new Error("Theme context has not rendered");
  }
  return latestContext;
};

afterEach(() => {
  latestContext = null;
  vi.restoreAllMocks();
});

describe("GameThemeProvider", () => {
  it("stays unready until storage hydration selects the registered theme", async () => {
    let resolveLoad: ((value: string | null) => void) | undefined;
    const storage: GameThemeStorage = {
      getItem: vi.fn(
        () =>
          new Promise<string | null>((resolve) => {
            resolveLoad = resolve;
          }),
      ),
      setItem: vi.fn(async () => undefined),
    };
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <GameThemeProvider storage={storage}>
          <ContextProbe onValue={captureContext} />
        </GameThemeProvider>,
      );
    });
    expect(getContext().isReady).toBe(false);
    expect(getContext().themeId).toBe("desert-lagoon");

    await act(async () => {
      resolveLoad?.("coral-sky");
      await Promise.resolve();
    });
    expect(getContext().isReady).toBe(true);
    expect(getContext().themeId).toBe("coral-sky");
    expect(getContext().theme.id).toBe("coral-sky");

    renderer!.unmount();
  });

  it("updates immediately and does not revert when persistence fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const storage: GameThemeStorage = {
      getItem: vi.fn(async () => "desert-lagoon"),
      setItem: vi.fn(async () => {
        throw new Error("write failed");
      }),
    };
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <GameThemeProvider storage={storage}>
          <ContextProbe onValue={captureContext} />
        </GameThemeProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      await getContext().setThemeId("coral-sky");
    });
    expect(getContext().themeId).toBe("coral-sky");
    expect(storage.setItem).toHaveBeenCalledWith(
      "chooseyourteam.game-theme.v1",
      "coral-sky",
    );

    renderer!.unmount();
  });

  it("rejects context access outside the provider", async () => {
    function InvalidConsumer() {
      useGameTheme();
      return createElement("div");
    }

    await expect(
      act(async () => {
        TestRenderer.create(<InvalidConsumer />);
      }),
    ).rejects.toThrow("useGameTheme must be used within GameThemeProvider");
  });
});
