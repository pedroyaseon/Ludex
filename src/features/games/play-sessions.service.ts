import type { Game, PlaySession } from "@/types/domain";
import { databaseService } from "@/features/database/database.service";

export interface ActivePlaySession extends PlaySession {
  processId?: number;
}

export const playSessionsService = {
  async listForGame(gameId: string): Promise<PlaySession[]> {
    return (await databaseService.listSessions(false))
      .filter((session) => session.gameId === gameId)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  },

  async getActiveForGame(gameId: string): Promise<ActivePlaySession | undefined> {
    return (await databaseService.listSessions(true)).find((session) => session.gameId === gameId);
  },

  async start(game: Game, emulatorId: string, processId?: number): Promise<ActivePlaySession> {
    const activeSessions = (await databaseService.listSessions(true)).filter(
      (session) => session.gameId !== game.id,
    );
    const session: ActivePlaySession = {
      id: `session-${crypto.randomUUID()}`,
      gameId: game.id,
      emulatorId,
      startedAt: new Date().toISOString(),
      processId,
    };

    await databaseService.replaceSessions([session, ...activeSessions], true);

    return session;
  },

  async finish(gameId: string): Promise<PlaySession | undefined> {
    const activeSessions = await databaseService.listSessions(true);
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

    const sessions = await databaseService.listSessions(false);
    await databaseService.replaceSessions([finishedSession, ...sessions].slice(0, 250), false);
    await databaseService.replaceSessions(
      activeSessions.filter((session) => session.gameId !== gameId),
      true,
    );

    return finishedSession;
  },
};
