import type { Game, PlaySession } from "@/types/domain";

export interface ActivePlaySession extends PlaySession {
  processId?: number;
}

const playSessionsStorageKey = "ludex.playSessions.v1";
const activePlaySessionStorageKey = "ludex.playSessions.active.v1";

const readSessions = (): PlaySession[] => {
  const rawValue = window.localStorage.getItem(playSessionsStorageKey);
  if (!rawValue) return [];

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? (parsedValue as PlaySession[]) : [];
  } catch {
    return [];
  }
};

const writeSessions = (sessions: PlaySession[]) => {
  window.localStorage.setItem(playSessionsStorageKey, JSON.stringify(sessions));
};

const readActiveSessions = (): ActivePlaySession[] => {
  const rawValue = window.localStorage.getItem(activePlaySessionStorageKey);
  if (!rawValue) return [];

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? (parsedValue as ActivePlaySession[]) : [];
  } catch {
    return [];
  }
};

const writeActiveSessions = (sessions: ActivePlaySession[]) => {
  window.localStorage.setItem(activePlaySessionStorageKey, JSON.stringify(sessions));
};

export const playSessionsService = {
  async listForGame(gameId: string): Promise<PlaySession[]> {
    return readSessions()
      .filter((session) => session.gameId === gameId)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  },

  async getActiveForGame(gameId: string): Promise<ActivePlaySession | undefined> {
    return readActiveSessions().find((session) => session.gameId === gameId);
  },

  async start(game: Game, emulatorId: string, processId?: number): Promise<ActivePlaySession> {
    const activeSessions = readActiveSessions().filter((session) => session.gameId !== game.id);
    const session: ActivePlaySession = {
      id: `session-${crypto.randomUUID()}`,
      gameId: game.id,
      emulatorId,
      startedAt: new Date().toISOString(),
      processId,
    };

    writeActiveSessions([session, ...activeSessions]);

    return session;
  },

  async finish(gameId: string): Promise<PlaySession | undefined> {
    const activeSessions = readActiveSessions();
    const activeSession = activeSessions.find((session) => session.gameId === gameId);
    if (!activeSession) return undefined;

    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      1,
      Math.round(
        (new Date(endedAt).getTime() - new Date(activeSession.startedAt).getTime()) / 1000,
      ),
    );
    const finishedSession: PlaySession = {
      ...activeSession,
      endedAt,
      durationSeconds,
    };

    writeActiveSessions(activeSessions.filter((session) => session.gameId !== gameId));
    writeSessions([finishedSession, ...readSessions()].slice(0, 250));

    return finishedSession;
  },
};
