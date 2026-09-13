import Database from "better-sqlite3";
import fs from "fs";

fs.mkdirSync("./data", { recursive: true });

const db = new Database("./data/messagerie.db");

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
        id TEXT PRIMARY KEY,
        cle_publique TEXT NOT NULL,
        jeton_hash TEXT NOT NULL,
        actif INTEGER NOT NULL DEFAULT 1,
        cree_le INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        expediteur TEXT NOT NULL,
        destinataire TEXT NOT NULL,
        paquet_chiffre TEXT NOT NULL,
        cree_le INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nonces (
        nonce TEXT PRIMARY KEY,
        expire_le INTEGER NOT NULL
    );
`);

export function creerUtilisateur(
    id,
    clePublique,
    jetonHash
) {
    const requete = db.prepare(`
        INSERT INTO utilisateurs
        (id, cle_publique, jeton_hash, cree_le)
        VALUES (?, ?, ?, ?)
    `);

    requete.run(
        id,
        clePublique,
        jetonHash,
        Date.now()
    );
}

export function utilisateur(id) {
    return db.prepare(`
        SELECT *
        FROM utilisateurs
        WHERE id = ?
        AND actif = 1
    `).get(id);
}

export function utilisateurs() {
    return db.prepare(`
        SELECT id, cle_publique
        FROM utilisateurs
        WHERE actif = 1
        ORDER BY id
    `).all();
}

export function desactiverUtilisateur(id) {
    db.prepare(`
        UPDATE utilisateurs
        SET actif = 0
        WHERE id = ?
    `).run(id);
}

export function enregistrerMessage(
    id,
    expediteur,
    destinataire,
    paquet
) {
    db.prepare(`
        INSERT INTO messages
        (id, expediteur, destinataire, paquet_chiffre, cree_le)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        id,
        expediteur,
        destinataire,
        paquet,
        Date.now()
    );
}

export function nonceUtilise(nonce) {

    const resultat = db.prepare(`
        SELECT nonce
        FROM nonces
        WHERE nonce = ?
        AND expire_le > ?
    `).get(nonce, Date.now());

    return Boolean(resultat);
}

export function enregistrerNonce(
    nonce,
    duree = 5 * 60 * 1000
) {
    db.prepare(`
        INSERT OR REPLACE INTO nonces
        (nonce, expire_le)
        VALUES (?, ?)
    `).run(
        nonce,
        Date.now() + duree
    );
}

export function nettoyerNonces() {

    db.prepare(`
        DELETE FROM nonces
        WHERE expire_le <= ?
    `).run(Date.now());
}
