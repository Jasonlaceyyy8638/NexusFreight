import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MoreScreen } from "../screens/MoreScreen";
import type { CarrierBrief, DriverBrief } from "../hooks/useCurrentDriver";
import { NexusFreightLogo } from "../components/NexusFreightLogo";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

const screenOpts = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

type Props = {
  driver: DriverBrief;
  carrier: CarrierBrief | null;
  onSignOut: () => void;
};

export function MoreStackScreen({ driver, carrier, onSignOut }: Props) {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen
        name="MoreMain"
        options={{
          headerTitle: () => <NexusFreightLogo width={240} />,
        }}
      >
        {() => <MoreScreen driver={driver} carrier={carrier} onSignOut={onSignOut} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
