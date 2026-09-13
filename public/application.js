import sodium
    from "https://cdn.jsdelivr.net/npm/libsodium-wrappers@0.7.15/+esm";

await sodium.ready;


const identifiant =
    document.getElementById(
        "identifiant"
    );

const jeton =
    document.getElementById(
        "jeton"
    );

const connecter =
    document.getElementById(
        "connecter"
    );

const statut =
    document.getElementById(
        "statut"
    );

const destinataire =
    document.getElementById(
        "destinataire"
    );

const message =
    document.getElementById(
        "message"
    );

const envoyer =
    document.getElementById(
        "envoyer"
    );

const messages =
    document.getElementById(
        "messages"
    );


let websocket = null;

let mesCles = null;

let monIdentifiant = null;

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


function afficher(texte) {

    messages.textContent +=
        texte + "\n";

    messages.scrollTop =
        messages.scrollHeight;
}


/*
 * Chaque navigateur possède sa propre
 * paire de clés.
 */
function obtenirCles() {

    const sauvegarde =
        localStorage.getItem(
            "messagerie-cles"
        );


    if (sauvegarde) {

        const donnees =
            JSON.parse(
                sauvegarde
            );

        return {

            publicKey:
                depuisB64(
                    donnees.publicKey
                ),

            privateKey:
                depuisB64(
                    donnees.privateKey
                )
        };
    }


    const cles =
        sodium.crypto_box_keypair();


    localStorage.setItem(

        "messagerie-cles",

        JSON.stringify({

            publicKey:
                b64(
                    cles.publicKey
                ),

            privateKey:
                b64(
                    cles.privateKey
                )

        })
    );


    return cles;
}


function afficherAgents(liste) {

    agents.clear();

    destinataire.innerHTML = "";


    for (const agent of liste) {

        if (
            agent.id ===
            monIdentifiant
        ) {
            continue;
        }


        agents.set(
            agent.id,
            agent.cle_publique
        );


        const option =
            document.createElement(
                "option"
            );

        option.value =
            agent.id;

        option.textContent =
            agent.id;

        destinataire.appendChild(
            option
        );
    }


    if (
        destinataire.options.length === 0
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.textContent =
            "Aucun autre agent";

        destinataire.appendChild(
            option
        );
    }
}


connecter.onclick = () => {

    monIdentifiant =
        identifiant.value.trim();

    const monJeton =
        jeton.value.trim();


    if (
        !monIdentifiant ||
        !monJeton
    ) {

        alert(
            "Identifiant et jeton requis."
        );

        return;
    }


    mesCles =
        obtenirCles();


    const protocole =
        location.protocol === "https:"
            ? "wss"
            : "ws";


    websocket =
        new WebSocket(
            `${protocole}://${location.host}`
        );


    websocket.onopen = () => {

        statut.textContent =
            "🟢 Connexion en cours...";


        websocket.send(
            JSON.stringify({

                type:
                    "authentifier",

                id:
                    monIdentifiant,

                jeton:
                    monJeton

            })
        );
    };


    websocket.onclose = () => {

        statut.textContent =
            "🔴 Déconnecté";
    };


    websocket.onerror = () => {

        statut.textContent =
            "⚠️ Erreur de connexion";
    };


    websocket.onmessage =
        evenement => {

            const donnees =
                JSON.parse(
                    evenement.data
                );


            if (
                donnees.type ===
                "authentifie"
            ) {

                statut.textContent =
                    "🟢 Connecté";

                afficherAgents(
                    donnees.agents
                );

                return;
            }


            if (
                donnees.type ===
                "agents"
            ) {

                afficherAgents(
                    donnees.agents
                );

                return;
            }


            if (
                donnees.type ===
                "message_chiffre"
            ) {

                dechiffrer(
                    donnees
                );
            }
        };
};


function dechiffrer(donnees) {

    try {

        const paquet =
            JSON.parse(
                atob(
                    donnees.paquetChiffre
                )
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

                mesCles.privateKey

            );


        afficher(
            `${donnees.expediteur} → Moi : ${sodium.to_string(clair)}`
        );

    } catch {

        afficher(
            `${donnees.expediteur} → Moi : [message invalide]`
        );
    }
}


envoyer.onclick = () => {

    if (
        !websocket ||
        websocket.readyState !==
        WebSocket.OPEN
    ) {

        alert(
            "Connecte-toi d'abord."
        );

        return;
    }


    const idDestinataire =
        destinataire.value;

    const cle =
        agents.get(
            idDestinataire
        );


    if (!cle) {

        alert(
            "Destinataire indisponible."
        );

        return;
    }


    const texte =
        message.value.trim();


    if (!texte) {
        return;
    }


    /*
     * Chaque message utilise un nonce
     * cryptographique différent.
     */
    const nonce =
        sodium.randombytes_buf(
            sodium.crypto_box_NONCEBYTES
        );


    /*
     * Chiffrement authentifié.
     *
     * Le serveur ne peut pas lire
     * "texte".
     */
    const chiffre =
        sodium.crypto_box_easy(

            sodium.from_string(
                texte
            ),

            nonce,

            depuisB64(cle),

            mesCles.privateKey

        );


    const paquet = {

        nonce:
            b64(nonce),

        message:
            b64(chiffre),

        clePubliqueExpediteur:
            b64(
                mesCles.publicKey
            )
    };


    websocket.send(
        JSON.stringify({

            type:
                "message_chiffre",

            destinataire:
                idDestinataire,

            paquetChiffre:
                btoa(
                    JSON.stringify(
                        paquet
                    )
                )

        })
    );


    afficher(
        `Moi → ${idDestinataire} : ${texte}`
    );


    message.value = "";
};
