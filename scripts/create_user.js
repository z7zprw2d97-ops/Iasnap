#!/usr/bin/env node

import 'dotenv/config';
import { creerUtilisateur } from "../base.js";
import { genererJeton, hashJeton } from "../securite.js";

const [,, id, publicKey = 'PLACEHOLDER'] = process.argv;

if (!id) {
  console.error('Usage: node scripts/create_user.js <id> [publicKey]');
  process.exit(1);
}

const token = genererJeton();
const tokenHash = hashJeton(token);

creerUtilisateur(id, publicKey, tokenHash);

console.log(`User created: ${id}`);
console.log(`Token (store this safely): ${token}`);
