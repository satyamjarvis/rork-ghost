import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
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
  useEffect(() => {
    SplashScreen.hideAsync();
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
