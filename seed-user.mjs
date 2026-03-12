import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = "user1@mail.com";
const password = "password123";

const passwordHash = await argon2.hash(password);

await prisma.user.upsert({
  where: { email },
  update: { passwordHash },
  create: { email, passwordHash, role: "user" },
});

console.log("OK seeded:", email, "pass:", password);
await prisma.$disconnect();
