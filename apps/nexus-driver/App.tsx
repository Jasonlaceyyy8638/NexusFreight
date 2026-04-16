import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "react-native";
import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useCurrentDriver } from "./src/hooks/useCurrentDriver";
import { MainNavigator } from "./src/navigation/MainNavigator";
import { getSupabase } from "./src/lib/supabase";
import { AuthScreen } from "./src/screens/AuthScreen";
import { LoadingScreen } from "./src/screens/LoadingScreen";
import { OnboardingPermissionsScreen } from "./src/screens/OnboardingPermissionsScreen";
import { UnlinkedDriverScreen } from "./src/screens/UnlinkedDriverScreen";
import { colors } from "./src/theme";

const onboardingStorageKey = (userId: string) =>
  `driver_permissions_onboarding_v1_${userId}`;

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  );
  const { driver, carrier, loading: driverLoading } = useCurrentDriver(
    session?.user?.id
  );

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    void client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !driver) {
      setOnboardingComplete(null);
      return;
    }
    let cancelled = false;
    void AsyncStorage.getItem(onboardingStorageKey(session.user.id)).then(
      (v) => {
        if (!cancelled) setOnboardingComplete(v === "1");
      }
    );
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, driver?.id]);

  let body: ReactNode;
  if (!session) {
    body = <AuthScreen />;
  } else if (driverLoading) {
    body = <LoadingScreen />;
  } else if (!driver) {
    body = <UnlinkedDriverScreen />;
  } else if (onboardingComplete === null) {
    body = <LoadingScreen />;
  } else if (!onboardingComplete) {
    body = (
      <OnboardingPermissionsScreen
        onComplete={async () => {
          await AsyncStorage.setItem(onboardingStorageKey(session.user.id), "1");
          setOnboardingComplete(true);
        }}
      />
    );
  } else {
    body = (
      <MainNavigator driver={driver} carrier={carrier} session={session} />
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar barStyle="light-content" />
        {body}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
