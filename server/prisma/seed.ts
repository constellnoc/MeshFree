import "dotenv/config";

import bcrypt from "bcryptjs";

import prisma from "../src/lib/prisma";

const ADMIN_USERNAME = "admin";

async function main() {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!adminPassword) {
    throw new Error("ADMIN_SEED_PASSWORD is required to seed the admin account.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.admin.upsert({
    where: { username: ADMIN_USERNAME },
    update: { passwordHash },
    create: {
      username: ADMIN_USERNAME,
      passwordHash,
    },
  });

  console.log(`Seeded admin account: ${ADMIN_USERNAME}`);
}

main()
  .catch((error) => {
    console.error("Admin seed failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
