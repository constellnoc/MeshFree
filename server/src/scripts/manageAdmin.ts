import "dotenv/config";

import bcrypt from "bcryptjs";

import prisma from "../lib/prisma";

async function main() {
  const adminUsername = process.env.ADMIN_MANAGE_USERNAME?.trim();
  const adminPassword = process.env.ADMIN_MANAGE_PASSWORD;

  if (!adminUsername) {
    throw new Error("ADMIN_MANAGE_USERNAME is required to manage the admin account.");
  }

  if (!adminPassword) {
    throw new Error("ADMIN_MANAGE_PASSWORD is required to manage the admin account.");
  }

  const existingAdmin = await prisma.admin.findUnique({
    where: {
      username: adminUsername,
    },
    select: {
      id: true,
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  if (existingAdmin) {
    await prisma.admin.update({
      where: {
        username: adminUsername,
      },
      data: {
        passwordHash,
      },
    });

    console.log(`Updated admin password for: ${adminUsername}`);
    return;
  }

  await prisma.admin.create({
    data: {
      username: adminUsername,
      passwordHash,
    },
  });

  console.log(`Created admin account: ${adminUsername}`);
}

main()
  .catch((error) => {
    console.error("Admin management failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
