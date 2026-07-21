import { createClient } from '@libsql/client';

let client = null;

export function getDb() {
    if (!client) {
        const url = process.env.TURSO_DATABASE_URL;
        const authToken = process.env.TURSO_AUTH_TOKEN;
        if (!url) throw new Error('TURSO_DATABASE_URL not set');
        client = createClient({ url, authToken: authToken || undefined });
    }
    return client;
}

export async function sql(query, ...args) {
    const db = getDb();
    const result = await db.execute({ sql: query, args });
    return result.rows;
}

export async function sqlRun(query, ...args) {
    const db = getDb();
    const result = await db.execute({ sql: query, args });
    return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
}
