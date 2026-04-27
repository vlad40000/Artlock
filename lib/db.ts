import { neon, Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL || 'postgres://placeholder:placeholder@placeholder/placeholder';

const client = neon(url);
const pool = new Pool({ connectionString: url });

/**
 * Direct Neon SQL client with transaction support.
 */
export const sql = Object.assign(client, {
  async transaction<T>(callback: (tx: (strings: TemplateStringsArray, ...values: any[]) => Promise<any>) => Promise<T>): Promise<T> {
    const conn = await pool.connect();
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
