import { Redirect } from "expo-router";
import TouchAllocationVisualFixture from "./touch-allocation-visual-fixture";

export default function TouchAllocationVisualRoute() {
  if (process.env.EXPO_PUBLIC_VISUAL_TEST_MODE !== "1") {
    return <Redirect href="/" />;
  }

  return <TouchAllocationVisualFixture />;
}
