// src/net/gameState.ts

export interface GameState {
  lv: string;
  epoch: number;
  status: "play" | "lose" | "won";
  key: 0 | 1;
  loseBy?: string;
  at: number;
  levelStart: number;
}

export type GameEvent =
  | { type: "died"; slot: string; epoch: number }
  | { type: "gotKey"; epoch: number }
  | { type: "allInDoor"; epoch: number }
  | { type: "restart"; epoch: number }
  | { type: "nextLevel"; epoch: number; nextLv: string }
  | { type: "replay"; epoch: number; lv?: string }
  | { type: "rosterChanged"; epoch: number }
  | { type: "start"; lv: string };

export function reduceGame(
  state: GameState | null | undefined,
  event: GameEvent,
  nowServer: number
): GameState | undefined {
  if (event.type === "start") {
    return {
      lv: event.lv,
      epoch: (state?.epoch ?? 0) + 1,
      status: "play",
      key: 0,
      at: nowServer,
      levelStart: nowServer,
    };
  }

  if (!state) return undefined;

  switch (event.type) {
    case "died": {
      if (state.status !== "play" || state.epoch !== event.epoch) return undefined;
      return {
        ...state,
        status: "lose",
        loseBy: event.slot,
        at: nowServer,
      };
    }

    case "gotKey": {
      if (state.status !== "play" || state.key === 1 || state.epoch !== event.epoch) return undefined;
      return {
        ...state,
        key: 1,
      };
    }

    case "allInDoor": {
      if (state.status !== "play" || state.key !== 1 || state.epoch !== event.epoch) return undefined;
      return {
        ...state,
        status: "won",
        at: nowServer,
      };
    }

    case "restart": {
      if (state.status !== "lose" || nowServer - state.at < 1000) return undefined;
      const { loseBy: _, ...rest } = state;
      return {
        ...rest,
        status: "play",
        epoch: state.epoch + 1,
        key: 0,
        at: nowServer,
      };
    }

    case "nextLevel": {
      if (state.status !== "won" || nowServer - state.at < 3000) return undefined;
      return {
        ...state,
        lv: event.nextLv,
        epoch: state.epoch + 1,
        status: "play",
        key: 0,
        at: nowServer,
        levelStart: nowServer,
      };
    }

    case "replay": {
      if (state.status !== "won") return undefined;
      return {
        ...state,
        lv: event.lv ?? state.lv,
        epoch: state.epoch + 1,
        status: "play",
        key: 0,
        at: nowServer,
        levelStart: event.lv ? nowServer : state.levelStart,
      };
    }

    case "rosterChanged": {
      return {
        ...state,
        epoch: state.epoch + 1,
        status: "play",
        key: 0,
        at: nowServer,
      };
    }

    default:
      return undefined;
  }
}
