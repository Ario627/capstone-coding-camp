import { createHmac } from "node:crypto";

export function hashTransaction(p: {
    userId: string,
    amount: string;
    type: string;
    category: string;
    transactionDate: string;
    previousHash: string | null;
    secret: string;
}): string {
    const payload = [
        p.userId, p.amount, p.type, p.category, p.transactionDate, p.previousHash || 'GENESIS'
    ].join('|');

    return createHmac('sha256', p.secret).update(payload).digest('hex');
}

export function  verifyTransactionHash(taxHash: string, p: {
    userId: string,
    amount: string;
    type: string;
    category: string;
    transactionDate: string;
    previousHash: string | null;
    secret: string;
}): boolean {
    const expetcted  = hashTransaction(p);

    if(taxHash.length !== expetcted.length) return false;

    let r = 0;
    for(let i = 0; i < taxHash.length; i++) {
        r |= taxHash.charCodeAt(i) ^ expetcted.charCodeAt(i);
    }
    return r === 0;
}