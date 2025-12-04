import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import userStatsRoute from "./routes/user/stats/route";
import recordGameRoute from "./routes/user/record-game/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  user: createTRPCRouter({
    stats: userStatsRoute,
    recordGame: recordGameRoute,
  }),
});

export type AppRouter = typeof appRouter;
