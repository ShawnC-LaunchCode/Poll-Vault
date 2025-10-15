import { db } from "../db";
import { eq, and, desc, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";

// Type alias for database transactions
export type DbTransaction = PgTransaction<
  NodePgQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

/**
 * Base repository providing common CRUD operations
 * All domain-specific repositories should extend this class
 */
export abstract class BaseRepository<TTable extends PgTable, TSelect, TInsert> {
  constructor(protected readonly table: TTable) {}

  /**
   * Get database connection (or transaction if provided)
   */
  protected getDb(tx?: DbTransaction) {
    return tx || db;
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string, tx?: DbTransaction): Promise<TSelect | undefined> {
    const database = this.getDb(tx);
    const idColumn = (this.table as any).id;

    const [record] = await database
      .select()
      .from(this.table)
      .where(eq(idColumn, id));

    return record as TSelect | undefined;
  }

  /**
   * Find all records (optionally filtered)
   */
  async findAll(where?: SQL, orderBy?: SQL, tx?: DbTransaction): Promise<TSelect[]> {
    const database = this.getDb(tx);

    let query = database.select().from(this.table);

    if (where) {
      query = query.where(where) as any;
    }

    if (orderBy) {
      query = query.orderBy(orderBy) as any;
    }

    return query as Promise<TSelect[]>;
  }

  /**
   * Create a new record
   */
  async create(data: TInsert, tx?: DbTransaction): Promise<TSelect> {
    const database = this.getDb(tx);

    const [record] = await database
      .insert(this.table)
      .values(data as any)
      .returning();

    return record as TSelect;
  }

  /**
   * Update a record by ID
   */
  async update(
    id: string,
    updates: Partial<TInsert>,
    tx?: DbTransaction
  ): Promise<TSelect> {
    const database = this.getDb(tx);
    const idColumn = (this.table as any).id;

    const [record] = await database
      .update(this.table)
      .set(updates as any)
      .where(eq(idColumn, id))
      .returning();

    return record as TSelect;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string, tx?: DbTransaction): Promise<void> {
    const database = this.getDb(tx);
    const idColumn = (this.table as any).id;

    await database
      .delete(this.table)
      .where(eq(idColumn, id));
  }

  /**
   * Delete multiple records matching a condition
   */
  async deleteWhere(where: SQL, tx?: DbTransaction): Promise<void> {
    const database = this.getDb(tx);

    await database
      .delete(this.table)
      .where(where);
  }

  /**
   * Count records (optionally filtered)
   */
  async count(where?: SQL, tx?: DbTransaction): Promise<number> {
    const database = this.getDb(tx);

    let query = database.select({ count: db.select().from(this.table) as any }).from(this.table);

    if (where) {
      query = query.where(where) as any;
    }

    const [result] = await query;
    return Number(result?.count || 0);
  }

  /**
   * Execute a transaction with multiple operations
   */
  async transaction<T>(
    callback: (tx: DbTransaction) => Promise<T>
  ): Promise<T> {
    return await db.transaction(callback);
  }
}
