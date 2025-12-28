import { DataSource, EntityManager } from 'typeorm';

/**
 * Runs the provided task in a managed transaction using a fresh query runner.
 */
export async function runInTransaction<T>(
  dataSource: DataSource,
  task: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const result = await task(queryRunner.manager);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
