import Ionicons from "react-native-vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Session } from "@supabase/supabase-js";
import type { CarrierBrief, DriverBrief } from "../hooks/useCurrentDriver";
import { useAutoPresenceSync } from "../hooks/useAutoPresenceSync";
import { LoadDetailScreen } from "../screens/LoadDetailScreen";
import { MyLoadsScreen } from "../screens/MyLoadsScreen";
import { NexusFreightLogo } from "../components/NexusFreightLogo";
import { getSupabase } from "../lib/supabase";
import { colors } from "../theme";
import { LocationStackScreen } from "./LocationStackScreen";
import { MoreStackScreen } from "./MoreStackScreen";
import type { LoadsStackParamList } from "./types";

const Tab = createBottomTabNavigator();
const LoadsStack = createNativeStackNavigator<LoadsStackParamList>();

const screenOpts = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function LoadsStackScreen({ driverId }: { driverId: string }) {
  return (
    <LoadsStack.Navigator screenOptions={screenOpts}>
      <LoadsStack.Screen
        name="LoadsList"
        options={{
          headerTitle: () => <NexusFreightLogo width={240} />,
        }}
      >
        {() => <MyLoadsScreen driverId={driverId} />}
      </LoadsStack.Screen>
      <LoadsStack.Screen
        name="LoadDetail"
        options={{
          headerTitle: () => <NexusFreightLogo width={240} />,
        }}
      >
        {(props) => <LoadDetailScreen {...props} driverId={driverId} />}
      </LoadsStack.Screen>
    </LoadsStack.Navigator>
  );
}

type Props = {
  driver: DriverBrief;
  carrier: CarrierBrief | null;
  session: Session;
};

export function MainNavigator({ driver, carrier, session }: Props) {
  useAutoPresenceSync({ driverId: driver.id, session });

  async function signOut() {
    const client = getSupabase();
    if (client) await client.auth.signOut();
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.dim,
      }}
    >
      <Tab.Screen
        name="LoadsTab"
        options={{
          title: "Loads",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <LoadsStackScreen driverId={driver.id} />}
      </Tab.Screen>
      <Tab.Screen
        name="LocationTab"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <LocationStackScreen session={session} />}
      </Tab.Screen>
      <Tab.Screen
        name="MoreTab"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      >
        {() => (
          <MoreStackScreen driver={driver} carrier={carrier} onSignOut={signOut} />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
