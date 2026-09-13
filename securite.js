import crypto from "crypto";

const secret =
    process.env.AUTH_SECRET ||
    "DEVELOPPEMENT_SECRET_A_CHANGER";

export function genererJeton() {

    return crypto.randomBytes(32).toString("hex");
}

export function hashJeton(jeton) {

    return crypto
        .createHmac("sha256", secret)
        .update(jeton)
        .digest("hex");
}

export function comparerJeton(jeton, hash) {

    const nouveauHash =
        hashJeton(jeton);

    const a =
        Buffer.from(nouveauHash, "hex");

    const b =
        Buffer.from(hash, "hex");

    if (a.length !== b.length) {
        return false;
    }

    return crypto.timingSafeEqual(a, b);
}

export function identifiantMessage() {

    return crypto.randomUUID();
}
