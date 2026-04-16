import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Session } from "@supabase/supabase-js";
import { NexusFreightLogo } from "../components/NexusFreightLogo";
import { LocationSyncScreen } from "../screens/LocationSyncScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

const screenOpts = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

type Props = { session: Session };

export function LocationStackScreen({ session }: Props) {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen
        name="LocationMain"
        options={{
          headerTitle: () => <NexusFreightLogo width={240} />,
        }}
      >
        {() => <LocationSyncScreen session={session} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
