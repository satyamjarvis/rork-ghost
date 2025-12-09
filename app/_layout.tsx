import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GameContext } from "@/contexts/GameContext";
import { PlayerContext } from "@/contexts/PlayerContext";
import { AuthContext } from "@/contexts/AuthContext";
import { MultiplayerContext } from "@/contexts/MultiplayerContext";
import { IAPContext } from "@/contexts/IAPContext";
import { AudioContext as AudioContextProvider } from "@/contexts/AudioContext";
import { trpc, trpcClient } from "@/lib/trpc";
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const CUSTOM_FONT_URL = 'https://pub-a6f520df47a6404b9b9b55141695828f.r2.dev/Idealist%20Hacker%20Mono.otf';

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="game" options={{ headerShown: false }} />
      <Stack.Screen name="round-result" options={{ headerShown: false }} />
      <Stack.Screen name="game-over" options={{ headerShown: false }} />
      <Stack.Screen name="store" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="username-setup" options={{ headerShown: false }} />
      <Stack.Screen name="multiplayer" options={{ headerShown: false }} />
      <Stack.Screen name="multiplayer-game" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'IdealistHacker': { uri: CUSTOM_FONT_URL },
        });
        console.log('[Font] Custom font loaded successfully');
        setFontsLoaded(true);
      } catch (error) {
        console.log('[Font] Error loading custom font:', error);
        setFontsLoaded(true);
      } finally {
        SplashScreen.hideAsync();
      }
    }
    loadFonts();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AudioContextProvider>
          <AuthContext>
            <MultiplayerContext>
              <PlayerContext>
                <IAPContext>
                  <GameContext>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <RootLayoutNav />
                    </GestureHandlerRootView>
                  </GameContext>
                </IAPContext>
              </PlayerContext>
            </MultiplayerContext>
          </AuthContext>
        </AudioContextProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
