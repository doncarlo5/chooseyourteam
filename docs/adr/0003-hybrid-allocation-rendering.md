# Use hybrid rendering for the allocation scene

The allocation screen keeps controls, instructions, navigation, and accessible result labels as React Native UI, while one Skia Canvas renders every live and revealed Player artwork. Continuous touch and animation state remains in Reanimated shared values on the UI thread; JavaScript and the game reducer receive only semantic touch-count, reveal, and round events. This avoids the web WebGL-context limit and per-frame bridge traffic without sacrificing native accessibility or turning Skia into a general UI layer.
