// src/lib/rooms.ts
import { get, onDisconnect, push, ref, remove, set, update } from "firebase/database";
import { db } from "./firebase";
import type { Profile, SlotInfo } from "./types";
import { EMPTY_INPUT } from "../game/protocol";

export async function createRoom(name: string, max: number, level = "1"): Promise<string> {
  const id = push(ref(db, "roomList")).key;
  if (!id) throw new Error("Không sinh được id phòng");
  const allowed = Object.fromEntries(Array.from({ length: max }, (_, i) => [`s${i}`, true]));
  await update(ref(db), {
    [`rooms/${id}/allowed`]: allowed,
    [`roomList/${id}`]: { name, max, phase: "lobby", level },
  });
  return id;
}

export async function deleteRoom(id: string): Promise<void> {
  await update(ref(db), { [`rooms/${id}`]: null, [`roomList/${id}`]: null });
}

export async function joinRoom(
  roomId: string,
  uid: string,
  profile: Profile,
): Promise<{ slot: string; leave: () => Promise<void> }> {
  const allowed = (await get(ref(db, `rooms/${roomId}/allowed`))).val() as Record<string, boolean> | null;
  if (!allowed) throw new Error("Phòng không tồn tại");

  const data: SlotInfo = { uid, name: profile.name.trim().slice(0, 20) };
  if (profile.avatar) data.avatar = profile.avatar; // RTDB không nhận giá trị undefined

  for (const slot of Object.keys(allowed).sort()) {
    const slotRef = ref(db, `rooms/${roomId}/slots/${slot}`);
    try {
      await set(slotRef, data);
    } catch {
      continue; // PERMISSION_DENIED = ô đã có người khác
    }

    const playerRef = ref(db, `roomList/${roomId}/players/${uid}`);
    const inputRef = ref(db, `rooms/${roomId}/inputs/${slot}`);
    const dropSlot = onDisconnect(slotRef);
    const dropPlayer = onDisconnect(playerRef);
    await dropSlot.remove();
    await dropPlayer.remove();
    await set(playerRef, data.name);
    await set(inputRef, EMPTY_INPUT); // xóa input cũ còn sót của người trước

    return {
      slot,
      leave: async () => {
        await Promise.all([dropSlot.cancel(), dropPlayer.cancel()]);
        await remove(inputRef);
        await remove(playerRef);
        await remove(slotRef);
      },
    };
  }
  throw new Error("Phòng đã đầy");
}
