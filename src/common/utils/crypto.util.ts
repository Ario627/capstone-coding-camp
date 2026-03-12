import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALG = 'aes-256-gcm' as const

export function encryptData(plainText: string, secret: string): string {
    const salt =  randomBytes(16);
    const key = scryptSync(secret, salt, 32);
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALG, key, iv);
    let enc = cipher.update(plainText, 'utf8', 'hex');
    enc += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${enc}`;
}

export function decryptData(encText: string, secret: string): string {
  const parts = encText.split(':');

  if(parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const [saltH, ivH, tagH, encH] = parts;

  const isValidHex = (str: string | undefined): str is string => str !== undefined && /^[0-9a-fA-F]+$/.test(str);
  
  if(!isValidHex(saltH) || !isValidHex(ivH) || !isValidHex(tagH) || !isValidHex(encH)) {
    throw new Error('Invalid encrypted data format');
  }

  const salt = Buffer.from(saltH, 'hex');
  const iv = Buffer.from(ivH, 'hex');
  const tag = Buffer.from(tagH, 'hex');
  const key = scryptSync(secret, salt, 32);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  let dec = decipher.update(encH, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}