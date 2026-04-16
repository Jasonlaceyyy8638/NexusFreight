import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";
import {
  check,
  PERMISSIONS,
  request,
  RESULTS,
  type Permission,
} from "react-native-permissions";

export type LocationSample = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function locationPermission(): Permission {
  return Platform.OS === "ios"
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
}

export function useDriverLocation() {
  const [permission, setPermission] = useState<string | null>(null);
  const [sample, setSample] = useState<LocationSample | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<LocationSample | null> => {
    setError(null);
    try {
      const perm = locationPermission();
      let r = await check(perm);
      if (r !== RESULTS.GRANTED) {
        r = await request(perm);
      }
      setPermission(r);
      if (r !== RESULTS.GRANTED) {
        setError("Location permission not granted.");
        return null;
      }

      return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          (pos) => {
            const next: LocationSample = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
            };
            setSample(next);
            resolve(next);
          },
          (err) => {
            setError(err.message);
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
            forceRequestLocation: true,
            showLocationDialog: true,
          }
        );
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location error");
      return null;
    }
  }, []);

  useEffect(() => {
    void check(locationPermission()).then((r) => setPermission(r));
  }, []);

  return { permission, sample, error, refresh };
}
