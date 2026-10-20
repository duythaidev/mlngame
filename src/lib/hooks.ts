// src/lib/hooks.ts
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { onValue, ref } from "firebase/database";
import { auth, db, ensureSignedIn } from "./firebase";
import type { RoomMeta } from "./types";

export function useUser(): User | null {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    void ensureSignedIn();
    return onAuthStateChanged(auth, setUser);
  }, []);
  return user;
}

export function useDbValue<T>(path: string | null): { value: T | null; ready: boolean } {
  const uid = useUser()?.uid ?? null;
  const active = uid ? path : null;
  const [state, setState] = useState<{ key: string | null; value: T | null }>({ key: null, value: null });

  useEffect(() => {
    if (!active) return;
    const key = `${uid}|${active}`;
    return onValue(
      ref(db, active),
      (snap) => setState({ key, value: snap.val() as T | null }),
      (err) => console.error("RTDB listener lỗi:", active, err.message),
    );
  }, [active, uid]);

  const ready = active !== null && state.key === `${uid}|${active}`;
  return { value: ready ? state.value : null, ready };
}

export function useRoomList(): Array<RoomMeta & { id: string }> {
  const { value } = useDbValue<Record<string, RoomMeta>>("roomList");
  return Object.entries(value ?? {}).map(([id, m]) => ({ ...m, id }));
}
