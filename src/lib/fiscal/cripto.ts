// Cifragem do material sensível (certificado A1 + senha) antes de gravar no banco.
// AES-256-GCM com chave-mestra de 32 bytes que vive SÓ em env do servidor
// (CERT_ENCRYPTION_KEY, base64). Sem a chave, o conteúdo no banco é inútil.
// Formato do payload (base64): [ iv(12) | tag(16) | ciphertext ].
//
// USO EXCLUSIVO NO SERVIDOR (Server Actions / Route Handlers runtime=nodejs).

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;
const TAMANHO_TAG = 16;
const TAMANHO_CHAVE = 32;

function obterChave(): Buffer {
  const base64 = process.env.CERT_ENCRYPTION_KEY;
  if (!base64) {
    throw new Error("CERT_ENCRYPTION_KEY não configurada no servidor.");
  }
  const chave = Buffer.from(base64, "base64");
  if (chave.length !== TAMANHO_CHAVE) {
    throw new Error(
      `CERT_ENCRYPTION_KEY deve ser ${TAMANHO_CHAVE} bytes em base64 (gere com: openssl rand -base64 32).`,
    );
  }
  return chave;
}

export function cifrar(claro: Buffer): string {
  const iv = randomBytes(TAMANHO_IV);
  const cipher = createCipheriv(ALGORITMO, obterChave(), iv);
  const ciphertext = Buffer.concat([cipher.update(claro), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decifrar(payloadBase64: string): Buffer {
  const buffer = Buffer.from(payloadBase64, "base64");
  const iv = buffer.subarray(0, TAMANHO_IV);
  const tag = buffer.subarray(TAMANHO_IV, TAMANHO_IV + TAMANHO_TAG);
  const ciphertext = buffer.subarray(TAMANHO_IV + TAMANHO_TAG);
  const decipher = createDecipheriv(ALGORITMO, obterChave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function cifrarTexto(texto: string): string {
  return cifrar(Buffer.from(texto, "utf8"));
}

export function decifrarTexto(payloadBase64: string): string {
  return decifrar(payloadBase64).toString("utf8");
}
