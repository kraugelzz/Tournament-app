import { useCallback, useEffect, useState } from "react";
import { verifyPin } from "../lib/pin";

export function useRefereeMode(tid: string, pinHash: string | undefined) {
  const key = `ref:${tid}`;
  const [isReferee, setIsReferee] = useState(false);

  useEffect(() => {
    setIsReferee(sessionStorage.getItem(key) === "1");
  }, [key]);

  const enter = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!pinHash) return false;
      const ok = await verifyPin(pin, pinHash);
      if (ok) {
        sessionStorage.setItem(key, "1");
        setIsReferee(true);
      }
      return ok;
    },
    [key, pinHash]
  );

  const exit = useCallback(() => {
    sessionStorage.removeItem(key);
    setIsReferee(false);
  }, [key]);

  return { isReferee, pinHash, enter, exit };
}
