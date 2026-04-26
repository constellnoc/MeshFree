import "dotenv/config";

import bcrypt from "bcryptjs";

import prisma from "../src/lib/prisma";

const localAdminDefaults = {
  username: "local",
  password: "123",
} as const;

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const adminUsername = process.env.ADMIN_SEED_USERNAME?.trim() ?? (!isProduction ? localAdminDefaults.username : undefined);
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? (!isProduction ? localAdminDefaults.password : undefined);

  if (!adminUsername) {
    throw new Error("ADMIN_SEED_USERNAME is required to seed the admin account.");
  }

  if (!adminPassword) {
    throw new Error("ADMIN_SEED_PASSWORD is required to seed the admin account.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: { passwordHash },
    create: {
      username: adminUsername,
      passwordHash,
    },
  });

  console.log(`Seeded admin account: ${adminUsername}`);
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
