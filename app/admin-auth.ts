import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const COOKIE_NAME = "aquafolhas_admin";
const SESSION_HOURS = 12;

type AdminEnvironment = {
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
};

function settings() {
  const values = env as unknown as AdminEnvironment;
  return {
    email: values.ADMIN_EMAIL?.trim().toLowerCase() || "",
    password: values.ADMIN_PASSWORD || "",
    secret: values.ADMIN_SESSION_SECRET || "",
  };
}

function encode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function signature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encode(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

async function verifyToken(token: string, secret: string) {
  const [version, expiresText, receivedSignature] = token.split(".");
  const expires = Number(expiresText);
  if (version !== "v1" || !Number.isInteger(expires) || expires <= Math.floor(Date.now() / 1000) || !receivedSignature) return false;
  const payload = `${version}.${expires}`;
  const expectedSignature = await signature(payload, secret);
  return equalBytes(new TextEncoder().encode(receivedSignature), new TextEncoder().encode(expectedSignature));
}

export async function isAdminRequest() {
  const config = settings();
  const user = await getChatGPTUser();
  if (user && config.email && user.email.trim().toLowerCase() === config.email) return true;
  if (config.secret.length < 32) return false;
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? verifyToken(token, config.secret) : false;
}

export async function authenticateAdminPassword(candidate: string) {
  const configured = settings().password;
  if (configured.length < 12 || candidate.length < 1) return false;
  return equalBytes(await sha256(candidate), await sha256(configured));
}

export async function adminSessionCookie() {
  const secret = settings().secret;
  if (secret.length < 32) throw new Error("Configure ADMIN_SESSION_SECRET com pelo menos 32 caracteres.");
  const expires = Math.floor(Date.now() / 1000) + SESSION_HOURS * 60 * 60;
  const payload = `v1.${expires}`;
  const token = `${payload}.${await signature(payload, secret)}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 60 * 60}`;
}

export function clearAdminSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
