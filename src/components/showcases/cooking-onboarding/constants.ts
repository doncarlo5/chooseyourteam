import { Easing, FadeIn } from "react-native-reanimated";

export const popoverAnimation = {
  entering: FadeIn.duration(300).easing(Easing.out(Easing.ease)),
};
