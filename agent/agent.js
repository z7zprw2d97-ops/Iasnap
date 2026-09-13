import WebSocket from "ws";
import sodium from "libsodium-wrappers";

await sodium.ready;

const SERVEUR =
    process.env.MESSAGERIE_URL ||
    "ws://localhost:3000";

const ID =
    process.env.AGENT_ID;

const JETON =
    process.env.AGENT_TOKEN;

if (!ID || !JETON) {

    throw new Error(
        "AGENT_ID et AGENT_TOKEN sont obligatoires"
    );
}


const cles =
    sodium.crypto_box_keypair();


const agents = new Map();


function b64(donnees) {

    return sodium.to_base64(
        donnees,
        sodium.base64_variants.ORIGINAL
    );
}


function depuisB64(texte) {

    return sodium.from_base64(
        texte,
        sodium.base64_variants.ORIGINAL
    );
}


const ws =
    new WebSocket(
        SERVEUR
    );


ws.on("open", () => {

    console.log(
        "Connexion à la messagerie..."
    );


    ws.send(
        JSON.stringify({

            type:
                "authentifier",

            id: ID,

            jeton: JETON

        })
    );
});


ws.on("message", donnees => {

    const message =
        JSON.parse(
            donnees.toString()
        );


    if (
        message.type ===
        "authentifie"
    ) {

        mettreAJourAgents(
            message.agents
        );

        console.log(
            "Agent authentifié."
        );

        return;
    }


    if (
        message.type ===
        "agents"
    ) {

        mettreAJourAgents(
            message.agents
        );

        return;
    }


    if (
        message.type ===
        "message_chiffre"
    ) {

        recevoir(
            message
        );
    }
});


function mettreAJourAgents(liste) {

    agents.clear();

    for (const agent of liste) {

        agents.set(
            agent.id,
            agent.cle_publique
        );
    }
}


function recevoir(message) {

    try {

        const paquet =
            JSON.parse(
                Buffer.from(
                    message.paquetChiffre,
                    "base64"
                ).toString()
            );


        const clair =
            sodium.crypto_box_open_easy(

                depuisB64(
                    paquet.message
                ),

                depuisB64(
                    paquet.nonce
                ),

                depuisB64(
                    paquet.clePubliqueExpediteur
                ),

                cles.privateKey

            );


        const texte =
            sodium.to_string(
                clair
            );


        console.log(
            `[${message.expediteur}] ${texte}`
        );


        /*
         * Ici tu peux transmettre "texte"
         * à ton moteur IA puis appeler envoyer()
         * avec sa réponse.
         */

    } catch {

        console.error(
            "Message impossible à déchiffrer."
        );
    }
}


function envoyer(
    destinataire,
    texte
) {

    const cle =
        agents.get(
            destinataire
        );


    if (!cle) {

        throw new Error(
            "Destinataire inconnu"
        );
    }


    const nonce =
        sodium.randombytes_buf(
            sodium.crypto_box_NONCEBYTES
        );


    const chiffre =
        sodium.crypto_box_easy(

            sodium.from_string(
                texte
            ),

            nonce,

            depuisB64(cle),

            cles.privateKey

        );


    const paquet = {

        nonce:
            b64(nonce),

        message:
            b64(chiffre),

        clePubliqueExpediteur:
            b64(
                cles.publicKey
            )
    };


    ws.send(
        JSON.stringify({

            type:
                "message_chiffre",

            destinataire,

            paquetChiffre:
                Buffer.from(
                    JSON.stringify(
                        paquet
                    )
                ).toString("base64")

        })
    );
}
