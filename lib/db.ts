import { neon, Pool } from '@neondatabase/serverless';

type SqlTemplate = (strings: TemplateStringsArray, ...values: any[]) => Promise<any>;

let client: SqlTemplate | null = null;
let pool: Pool | null = null;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('[env] DATABASE_URL is required for database access.');
  }
  return url;
}

function getClient() {
  if (!client) {
    client = neon(getDatabaseUrl()) as unknown as SqlTemplate;
  }

  return client;
}

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: getDatabaseUrl() });
  }

  return pool;
}

/**
 * Direct Neon SQL client with transaction support.
 */
export const sql = Object.assign(
  (strings: TemplateStringsArray, ...values: any[]) => getClient()(strings, ...values),
  {
  async transaction<T>(callback: (tx: (strings: TemplateStringsArray, ...values: any[]) => Promise<any>) => Promise<T>): Promise<T> {
    const conn = await getPool().connect();
    try {
      await conn.query('BEGIN');
      const tx = async (strings: TemplateStringsArray, ...values: any[]) => {
        // Convert template literal to positional parameters ($1, $2, etc.)
        let query = strings[0];
        for (let i = 1; i < strings.length; i++) {
          query += `$${i}${strings[i]}`;
        }
        const result = await conn.query(query, values);
        return result.rows;
      };
      const result = await callback(tx);
      await conn.query('COMMIT');
      return result;
    } catch (error) {
      await conn.query('ROLLBACK');
      throw error;
    } finally {
      conn.release();
    }
  }
});
