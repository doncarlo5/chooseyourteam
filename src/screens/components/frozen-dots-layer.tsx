import { AppText } from "@/src/components/app-text";
import { getTeamIdentity } from "@/src/domain/team-identity";
import type { FrozenDot } from "@/src/helpers/types/home-screen";
import { Canvas } from "@shopify/react-native-skia";
import { View } from "react-native";
import { TeamResultArtwork } from "./team-result-artwork";

const REVEAL_SIZE = 150;

export default function FrozenDotsLayer(props: { dots: FrozenDot[] }) {
  return (
    <View className="absolute inset-0" pointerEvents="none">
      {props.dots.map((dot) => {
        const identity = getTeamIdentity(dot.team);

        return (
          <View
            key={`${dot.x}-${dot.y}-${dot.team}`}
            style={{
              position: "absolute",
              left: dot.x - REVEAL_SIZE / 2,
              top: dot.y - REVEAL_SIZE / 2,
              width: REVEAL_SIZE,
              height: REVEAL_SIZE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Canvas
              pointerEvents="none"
              style={{
                position: "absolute",
                width: REVEAL_SIZE,
                height: REVEAL_SIZE,
              }}
            >
              <TeamResultArtwork size={REVEAL_SIZE} team={dot.team} />
            </Canvas>

            <AppText className="text-7xl font-extrabold font-mono text-white text-center mt-3">
              {identity.number}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
