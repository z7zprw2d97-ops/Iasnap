import 'dotenv/config';
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import helmet from "helmet";

import {
  utilisateur,
  utilisateurs,
  enregistrerMessage,
} from "./base.js";

import { comparerJeton, identifiantMessage } from "./securite.js";

const app = express();
app.use(helmet());
app.use(express.static("public"));

app.get("/healthz", (req, res) => res.status(200).send("ok"));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Map of connected and authenticated clients: id -> ws
const clients = new Map();

function broadcastAgents() {
  try {
    const list = utilisateurs(); // [{id, cle_publique}, ...]
    const payload = JSON.stringify({ type: "agents", agents: list });

    for (const ws of wss.clients) {
      if (ws.readyState === ws.OPEN && ws.authenticated) {
        try {
          ws.send(payload);
        } catch (err) {
          console.warn("Error sending agents to client:", err);
        }
      }
    }
  } catch (err) {
    console.error("Failed to broadcast agents:", err);
  }
}

wss.on("connection", (ws, req) => {
  ws.authenticated = false;
  ws.clientId = null;

  ws.on("message", (data) => {
    let msg = null;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      console.warn("Invalid JSON from client, ignoring");
      return;
    }

    if (!msg || typeof msg.type !== "string") return;

    try {
      switch (msg.type) {
        case "authentifier": {
          const id = String(msg.id || "").trim();
          const jeton = String(msg.jeton || "");

          if (!id || !jeton) {
            ws.send(JSON.stringify({ type: "erreur", message: "id and token required" }));
            ws.close();
            return;
          }

          const user = utilisateur(id);
          if (!user) {
            ws.send(JSON.stringify({ type: "erreur", message: "unknown user" }));
            ws.close();
            return;
          }

          if (!comparerJeton(jeton, user.jeton_hash)) {
            ws.send(JSON.stringify({ type: "erreur", message: "invalid token" }));
            ws.close();
            return;
          }

          // Auth success
          ws.authenticated = true;
          ws.clientId = id;
          clients.set(id, ws);

          // Send authenticated message with agents list
          const agentsList = utilisateurs();
          ws.send(JSON.stringify({ type: "authentifie", agents: agentsList }));

          // Broadcast updated agents to others
          broadcastAgents();

          console.info(`Client authenticated: ${id}`);
          break;
        }

        case "message_chiffre": {
          if (!ws.authenticated) {
            ws.send(JSON.stringify({ type: "erreur", message: "unauthenticated" }));
            return;
          }

          const destinataire = String(msg.destinataire || "").trim();
          const paquetChiffre = String(msg.paquetChiffre || "");

          if (!destinataire || !paquetChiffre) {
            ws.send(JSON.stringify({ type: "erreur", message: "destinataire and paquetChiffre required" }));
            return;
          }

          // Persist the message
          try {
            const idMsg = identifiantMessage();
            enregistrerMessage(idMsg, ws.clientId, destinataire, paquetChiffre);
          } catch (err) {
            console.error("Failed to save message:", err);
          }

          // Forward to recipient if connected
          const target = clients.get(destinataire);
          if (target && target.readyState === target.OPEN) {
            try {
              target.send(JSON.stringify({ type: "message_chiffre", expediteur: ws.clientId, paquetChiffre }));
            } catch (err) {
              console.warn("Failed to forward message to recipient:", err);
            }
          }

          break;
        }

        default:
          // unknown message type
          break;
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  ws.on("close", () => {
    if (ws.clientId) {
      clients.delete(ws.clientId);
      broadcastAgents();
      console.info(`Client disconnected: ${ws.clientId}`);
    }
  });

  ws.on("error", (err) => {
    console.warn("WebSocket error:", err);
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
