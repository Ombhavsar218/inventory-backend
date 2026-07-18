import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getBusinessProfile(req: Request, res: Response): Promise<void> {
  try {
    const userRole = (req as any).userRole;
    if (userRole !== "OWNER") {
      res.status(403).json({ success: false, message: "Only owners can access business profile" });
      return;
    }

    let profile = await prisma.businessProfile.findFirst();
    if (!profile) {
      profile = await prisma.businessProfile.create({
        data: {
          name: "Your Company Name",
          address: "Your Company Address",
        },
      });
    }

    res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error("Get business profile error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch business profile" });
  }
}

export async function updateBusinessProfile(req: Request, res: Response): Promise<void> {
  try {
    const userRole = (req as any).userRole;
    if (userRole !== "OWNER") {
      res.status(403).json({ success: false, message: "Only owners can update business profile" });
      return;
    }

    const { name, address, phone, email, stateCode, gstNo, fssaiNo, bankName, bankAccountNo, bankBranch, bankIFSC } = req.body;

    let profile = await prisma.businessProfile.findFirst();

    if (!profile) {
      profile = await prisma.businessProfile.create({
        data: {
          name: name || "Your Company Name",
          address: address || "Your Company Address",
          phone: phone || null,
          email: email || null,
          stateCode: stateCode || null,
          gstNo: gstNo || null,
          fssaiNo: fssaiNo || null,
          bankName: bankName || null,
          bankAccountNo: bankAccountNo || null,
          bankBranch: bankBranch || null,
          bankIFSC: bankIFSC || null,
        },
      });
    } else {
      profile = await prisma.businessProfile.update({
        where: { id: profile.id },
        data: {
          name: name ?? profile.name,
          address: address ?? profile.address,
          phone: phone ?? profile.phone,
          email: email ?? profile.email,
          stateCode: stateCode ?? profile.stateCode,
          gstNo: gstNo ?? profile.gstNo,
          fssaiNo: fssaiNo ?? profile.fssaiNo,
          bankName: bankName ?? profile.bankName,
          bankAccountNo: bankAccountNo ?? profile.bankAccountNo,
          bankBranch: bankBranch ?? profile.bankBranch,
          bankIFSC: bankIFSC ?? profile.bankIFSC,
        },
      });
    }

    res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error("Update business profile error:", error);
    res.status(500).json({ success: false, message: "Failed to update business profile" });
  }
}
