import { protectedProcedure } from '@/backend/trpc/create-context';
import { recordGameResult } from '@/backend/db/user-stats';
import { z } from 'zod';

export default protectedProcedure
  .input(
    z.object({
      won: z.boolean(),
      roundsWon: z.number(),
      roundsLost: z.number(),
    })
  )
  .mutation(({ ctx, input }) => {
    const stats = recordGameResult(
      ctx.userId,
      input.won,
      input.roundsWon,
      input.roundsLost
    );
    return stats;
  });
