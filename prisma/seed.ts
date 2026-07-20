import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 12);

  const superadmin = await prisma.user.findUnique({
    where: { email: "superadmin@example.com" },
  });
  if (!superadmin) {
    const user = await prisma.user.create({
      data: {
        fullName: "Super Admin",
        email: "superadmin@example.com",
        password: hashedPassword,
        role: Role.SUPERADMIN,
        isActive: true,
      },
    });
    console.log("Super admin created:", { id: user.id, email: user.email, role: user.role });
  } else {
    console.log("Super admin already exists, skipping.");
  }

  const existingOwner = await prisma.user.findUnique({
    where: { email: "owner@example.com" },
  });
  if (!existingOwner) {
    const user = await prisma.user.create({
      data: {
        fullName: "Admin Owner",
        email: "owner@example.com",
        password: hashedPassword,
        role: Role.OWNER,
        isActive: true,
      },
    });
    console.log("Owner created:", { id: user.id, email: user.email, role: user.role });
  } else {
    console.log("Owner already exists, skipping.");
  }

  const marketingUsers = [
    { email: "marketing@example.com", fullName: "Marketing User" },
    { email: "marketing1@example.com", fullName: "Marketing User 1" },
    { email: "marketing2@example.com", fullName: "Marketing User 2" },
    { email: "marketing3@example.com", fullName: "Marketing User 3" },
    { email: "marketing4@example.com", fullName: "Marketing User 4" },
    { email: "marketing5@example.com", fullName: "Marketing User 5" },
  ];

  for (const mu of marketingUsers) {
    const existing = await prisma.user.findUnique({ where: { email: mu.email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: {
          fullName: mu.fullName,
          email: mu.email,
          password: hashedPassword,
          role: Role.MARKETING,
          isActive: true,
        },
      });
      console.log(`Marketing user created: ${user.email} (${user.role})`);
    } else {
      console.log(`${mu.email} already exists, skipping.`);
    }
  }

  const existingProfile = await prisma.businessProfile.findFirst();
  if (!existingProfile) {
    await prisma.businessProfile.create({
      data: {
        name: "Your Company Name",
        address: "Your Company Address",
        phone: "",
        email: "",
        stateCode: "27",
        gstNo: "",
        fssaiNo: "",
        bankName: "",
        bankAccountNo: "",
        bankBranch: "",
        bankIFSC: "",
      },
    });
    console.log("Default business profile created.");
  } else {
    console.log("Business profile already exists, skipping seed.");
  }
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
