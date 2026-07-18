import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existingOwner = await prisma.user.findUnique({
    where: { email: "owner@example.com" },
  });

  if (!existingOwner) {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const owner = await prisma.user.create({
      data: {
        fullName: "Admin Owner",
        email: "owner@example.com",
        password: hashedPassword,
        role: Role.OWNER,
        isActive: true,
      },
    });

    console.log("Default owner user created:", {
      id: owner.id,
      email: owner.email,
      fullName: owner.fullName,
      role: owner.role,
    });
  } else {
    console.log("Owner user already exists, skipping seed.");
  }

  const marketingUser = await prisma.user.findUnique({
    where: { email: "marketing@example.com" },
  });

  if (!marketingUser) {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const user = await prisma.user.create({
      data: {
        fullName: "Marketing User",
        email: "marketing@example.com",
        password: hashedPassword,
        role: Role.MARKETING,
        isActive: true,
      },
    });

    console.log("Default marketing user created:", {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
  } else {
    console.log("Marketing user already exists, skipping seed.");
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
