import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

export type LocationSample = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export function useDriverLocation() {
  const [permission, setPermission] =
    useState<Location.PermissionStatus | null>(null);
  const [sample, setSample] = useState<LocationSample | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<LocationSample | null> => {
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status);
      if (status !== Location.PermissionStatus.GRANTED) {
        setError("Location permission not granted.");
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next: LocationSample = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setSample(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location error");
      return null;
    }
  }, []);

  useEffect(() => {
    void Location.getForegroundPermissionsAsync().then((r) =>
      setPermission(r.status)
    );
  }, []);

  return { permission, sample, error, refresh };
}
