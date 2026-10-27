// src/pages/Admin.tsx
// Bàn quản trị: tạo / xóa phòng, bắt đầu – dừng lượt thi (từng phòng hoặc tất cả), bảng xếp hạng trực tiếp,
// lưới ảnh thu nhỏ mọi phòng (1 lần/giây) và xem to một phòng (5 snapshot/giây, nội suy mượt).
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { signInAnonymously, signInWithEmailAndPassword, signOut } from "firebase/auth";
import badgeStar from "../assets/badge-star.svg";
import { FocusView, RoomThumb } from "../components/AdminRoomView";
import { getLevel, LEVEL_IDS } from "../game/level";
import { auth } from "../lib/firebase";
import { GAME_SERVER_URL } from "../lib/gameServer";
import { useDbValue, useRoomList, useUser } from "../lib/hooks";
import { createRoom, deleteRoom, setRoomsPhase } from "../lib/rooms";
import type { RankedRoom, RoomMeta, SlotInfo } from "../lib/types";
import { connectAdmin, type AdminAction, type AdminConnection, type AdminStatus } from "../net/adminSocket";
import { SnapshotBuffer } from "../net/interpolate";
import "./admin.css";

type Room = RoomMeta & { id: string };

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const sec = (secs % 60).toFixed(1).padStart(4, "0");
  return m > 0 ? `${m}:${sec}` : `${sec}s`;
}

function levelShort(id: string): string {
  return getLevel(id).name.split(" · ")[0];
}

const STATUS_TEXT: Record<AdminStatus, string> = {
  connecting: "Đang nối game server…",
  ready: "● Đã nối game server",
  reconnecting: "Mất kết nối game server — đang nối lại…",
  error: "Game server từ chối",
};

/** Kết nối admin tới game server khi đã có quyền admin. */
function useAdminLive(enabled: boolean, onFocusSnap: (id: string, s: import("../game/protocol").Snapshot) => void) {
  const [rooms, setRooms] = useState<RankedRoom[]>([]);
  const [status, setStatus] = useState<{ s: AdminStatus; detail?: string }>({ s: "connecting" });
  const [conn, setConn] = useState<AdminConnection | null>(null);
  const focusRef = useRef(onFocusSnap);
  useEffect(() => {
    focusRef.current = onFocusSnap;
  });
  useEffect(() => {
    if (!enabled) return;
    const c = connectAdmin({
      url: GAME_SERVER_URL,
      getIdToken: async () => {
        const u = auth.currentUser;
        if (!u) throw new Error("chưa đăng nhập");
        return u.getIdToken();
      },
      onRooms: setRooms,
      onFocus: (id, s) => focusRef.current(id, s),
      onStatus: (s, detail) => setStatus({ s, detail }),
    });
    setConn(c);
    return () => {
      c.close();
      setConn(null);
    };
  }, [enabled]);
  return { rooms, status, conn };
}

export default function Admin() {
  const user = useUser();
  const isAdmin = useDbValue<boolean>(user ? `admins/${user.uid}` : null);
  const allowed = !!user && !user.isAnonymous && isAdmin.value === true;
  const roomList = useRoomList();
  const roomsData = useDbValue<Record<string, { slots?: Record<string, SlotInfo> }>>(allowed ? "rooms" : null);

  const [focusId, setFocusId] = useState<string | null>(null);
  const [buffer, setBuffer] = useState(() => new SnapshotBuffer(250));
  const live = useAdminLive(allowed, (id, s) => {
    if (id === focusId) buffer.push(s, performance.now());
  });

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [max, setMax] = useState(4);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [gotoLevel, setGotoLevel] = useState<Record<string, string>>({});

  const byId = useMemo(() => new Map(live.rooms.map((r) => [r.id, r])), [live.rooms]);
  const ranked = useMemo(
    () => live.rooms.filter((r) => r.rank > 0 && roomList.some((x) => x.id === r.id)),
    [live.rooms, roomList],
  );

  function focus(id: string | null) {
    setBuffer(new SnapshotBuffer(250));
    setFocusId(id);
    live.conn?.focus(id);
  }

  /** Gửi lệnh tới game server; false = lỗi (đã hiện thông báo). */
  async function command(action: AdminAction, rooms: Room[], levelId?: string): Promise<boolean> {
    if (!live.conn) {
      setError("Chưa nối được game server");
      return false;
    }
    const res = await live.conn.command(action, rooms.map((r) => ({ id: r.id, name: r.name })), levelId);
    setError(res.ok ? "" : `Game server báo lỗi: ${res.error}`);
    return res.ok;
  }

  /** Bắt đầu lượt: server reset thời gian / số lần thua rồi mới mở màn chơi cho người chơi. */
  async function start(rooms: Room[]) {
    if (!(await command("start", rooms))) return;
    await setRoomsPhase(rooms.map((r) => r.id), "playing").catch((e: Error) => setError(e.message));
  }

  async function stop(rooms: Room[]) {
    await setRoomsPhase(rooms.map((r) => r.id), "lobby").catch((e: Error) => setError(e.message));
  }

  async function remove(room: Room) {
    if (!window.confirm(`Xóa phòng "${room.name}"? Người trong phòng sẽ bị đưa ra ngoài.`)) return;
    if (focusId === room.id) focus(null);
    await command("remove", [room]);
    await deleteRoom(room.id).catch((e: Error) => setError(e.message));
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function logout() {
    await signOut(auth);
    await signInAnonymously(auth); // quay lại user ẩn danh
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await createRoom(name.trim() || `Tổ thi đua ${roomList.length + 1}`, max);
      setName("");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function copyRoomLink(roomId: string) {
    void navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`).then(() => {
      setCopiedId(roomId);
      setTimeout(() => setCopiedId(null), 2505);
    });
  }

  if (!user) return <div className="page">Đang kiểm tra tài khoản…</div>;

  if (user.isAnonymous) {
    return (
      <div className="page">
        <h1>
          <img src={badgeStar} alt="Star" style={{ width: 26, height: 26 }} />
          Bàn Quản Trị (Admin)
        </h1>
        <div className="card highlight" style={{ maxWidth: 440 }}>
          <h3 style={{ margin: "0 0 8px", color: "var(--red-dark)" }}>Đăng Nhập Quản Trị Viên</h3>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            Vui lòng đăng nhập bằng tài khoản quản trị để tạo và giám sát các phòng thi đua.
          </p>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="email" placeholder="Email quản trị" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Mật khẩu" value={pw} onChange={(e) => setPw(e.target.value)} required />
            <button className="btn gold" type="submit" style={{ marginTop: 4 }}>
              Đăng Nhập Admin
            </button>
          </form>
          {error && <p className="err">{error}</p>}
          <div style={{ marginTop: 16 }}>
            <Link to="/" className="btn ghost sm">← Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin.ready) return <div className="page">Đang kiểm tra quyền hạn…</div>;

  if (isAdmin.value !== true) {
    return (
      <div className="page">
        <h1>Bàn Quản Trị</h1>
        <div className="card">
          <p className="err">Tài khoản này chưa được cấp quyền quản trị (UID: {user.uid}).</p>
          <p className="muted">
            Vui lòng vào Firebase Realtime Database, thêm bản ghi <code>admins/{user.uid}</code> = <code>true</code>.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn ghost sm" onClick={logout}>Đăng xuất</button>
            <Link to="/" className="btn ghost sm">← Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  const slotsOf = (id: string) => roomsData.value?.[id]?.slots ?? {};
  const focusRoom = focusId ? roomList.find((r) => r.id === focusId) : undefined;
  const focusLive = focusId ? byId.get(focusId) : undefined;

  return (
    <div className="page page-admin">
      <div className="admin-head">
        <h1 style={{ margin: 0 }}>
          <img src={badgeStar} alt="Star" style={{ width: 28, height: 28 }} />
          Bàn Quản Trị Thi Đua
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`tag ${live.status.s === "ready" ? "playing" : "waiting"}`}>
            {STATUS_TEXT[live.status.s]}
            {live.status.detail ? ` (${live.status.detail})` : ""}
          </span>
          <Link to="/" className="btn ghost sm">← Trang Chủ</Link>
          <button className="btn ghost sm" onClick={logout}>Đăng Xuất</button>
        </div>
      </div>

      {/* Tạo phòng + điều khiển chung */}
      <div className="card highlight">
        <h3 style={{ margin: "0 0 12px", color: "var(--red-dark)" }}>★ Mở Phòng Thi Đua Mới</h3>
        <form className="row" onSubmit={create}>
          <input
            type="text"
            placeholder="Tên phòng (ví dụ: Đội 1 - Sao Vàng)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}>
            Tối đa:
            <input
              type="number"
              min={2}
              max={8}
              value={max}
              onChange={(e) => setMax(Math.min(8, Math.max(2, Number(e.target.value) || 2)))}
              style={{ width: 64 }}
            />
            người
          </label>
          <button className="btn gold" type="submit">+ Tạo Phòng</button>
        </form>
        <div className="admin-actions">
          <button className="btn gold" disabled={roomList.length === 0} onClick={() => void start(roomList)}>
            ▶ Bắt Đầu Tất Cả ({roomList.length} phòng)
          </button>
          <button className="btn ghost" disabled={roomList.length === 0} onClick={() => void stop(roomList)}>
            ■ Dừng Tất Cả (về sảnh chờ)
          </button>
          <span className="muted" style={{ fontSize: 12 }}>
            Bắt đầu = mọi phòng về Level 1, xóa thời gian và số lần thua của lượt trước, cùng tính giờ.
          </span>
        </div>
        {error && <p className="err">{error}</p>}
      </div>

      {/* Bảng xếp hạng */}
      <h2 style={{ marginTop: 24 }}>★ Bảng Xếp Hạng Trực Tiếp</h2>
      <div className="card admin-rank">
        {ranked.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Chưa phòng nào bắt đầu lượt thi.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Phòng</th>
                <th>Level xong</th>
                <th>Đang ở</th>
                <th>Tổng thời gian</th>
                <th>Thua</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.id} className={r.rank <= 3 ? `top${r.rank}` : ""}>
                  <td className="admin-rank-no">{r.rank}</td>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{r.players.join(", ") || "(trống)"}</div>
                  </td>
                  <td>{r.completed.length}/{LEVEL_IDS.length}</td>
                  <td>{r.finished ? "🏁 Về đích" : `${levelShort(r.levelId)} · phần ${r.part + 1}/${r.partCount}`}</td>
                  <td>{fmtTime(r.totalSeconds)}</td>
                  <td>{r.deaths}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lưới phòng */}
      <h2 style={{ marginTop: 24 }}>★ Các Phòng ({roomList.length})</h2>
      {roomList.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <p className="muted">Chưa có phòng nào. Hãy tạo phòng thi đua đầu tiên ở trên.</p>
        </div>
      ) : (
        <div className="admin-grid">
          {roomList.map((r) => {
            const s = byId.get(r.id);
            const names = Object.values(r.players ?? {});
            return (
              <div className="card admin-room" key={r.id}>
                <div className="admin-room-head">
                  <strong>{r.name}</strong>
                  {s && s.rank > 0 && <span className="tag host">#{s.rank}</span>}
                  <span className="tag">{names.length}/{r.max} người</span>
                  <span className={`tag ${r.phase === "playing" ? "playing" : "waiting"}`}>
                    {r.phase === "playing" ? "● Đang chơi" : "○ Sảnh chờ"}
                  </span>
                </div>

                <button type="button" className="admin-thumb-btn" onClick={() => focus(r.id)} title="Xem to">
                  <RoomThumb snap={s?.snap ?? null} slots={slotsOf(r.id)} />
                </button>

                <div className="admin-room-stats">
                  {s?.startedAt ? (
                    <>
                      <span>{s.finished ? "🏁 Về đích" : `${levelShort(s.levelId)} · phần ${s.part + 1}/${s.partCount}`}</span>
                      <span>⏱ {fmtTime(s.totalSeconds)}</span>
                      <span>💥 {s.deaths} lần thua</span>
                    </>
                  ) : (
                    <span className="muted">Chưa bắt đầu lượt</span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{names.length ? names.join(", ") : "(chưa có người vào)"}</div>

                <div className="admin-room-btns">
                  <button className="btn gold sm" onClick={() => void start([r])}>▶ Bắt đầu</button>
                  <button className="btn ghost sm" onClick={() => void stop([r])}>■ Dừng</button>
                  <button className="btn ghost sm" onClick={() => focus(r.id)}>🔍 Xem to</button>
                  <select
                    value={gotoLevel[r.id] ?? ""}
                    onChange={(e) => {
                      setGotoLevel({ ...gotoLevel, [r.id]: "" });
                      if (e.target.value) void command("goto", [r], e.target.value);
                    }}
                    title="Cho phòng nhảy tới level (giữ kết quả đã có)"
                  >
                    <option value="">Tới level…</option>
                    {LEVEL_IDS.map((lv) => (
                      <option key={lv} value={lv}>{levelShort(lv)}</option>
                    ))}
                  </select>
                  <button className="btn ghost sm" onClick={() => copyRoomLink(r.id)}>
                    {copiedId === r.id ? "✓ Đã chép" : "🔗 Link"}
                  </button>
                  <button className="btn ghost sm" style={{ color: "var(--red-dark)" }} onClick={() => void remove(r)}>
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Xem to một phòng */}
      {focusId && (
        <div className="admin-focus" onClick={() => focus(null)}>
          <div className="admin-focus-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-room-head">
              <strong>{focusRoom?.name ?? focusId}</strong>
              {focusLive?.startedAt ? (
                <span className="muted">
                  {focusLive.finished ? "🏁 Về đích" : `${levelShort(focusLive.levelId)} · phần ${focusLive.part + 1}/${focusLive.partCount}`} · ⏱{" "}
                  {fmtTime(focusLive.totalSeconds)} · 💥 {focusLive.deaths}
                </span>
              ) : null}
              <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => focus(null)}>✕ Đóng</button>
            </div>
            <FocusView buffer={buffer} slots={slotsOf(focusId)} />
          </div>
        </div>
      )}
    </div>
  );
}
