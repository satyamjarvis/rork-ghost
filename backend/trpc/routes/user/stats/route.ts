import { protectedProcedure } from '@/backend/trpc/create-context';
import { getUserStats } from '@/backend/db/user-stats';

export default protectedProcedure.query(({ ctx }) => {
  const stats = getUserStats(ctx.userId);
  return stats;
});
