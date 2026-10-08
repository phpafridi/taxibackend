import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import bcrypt from "bcryptjs";
import { user_role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { message: "unauthorized" },
        { status: 401 }
      )
    }
    
    const body = await req.json();
    const {
      name,
      avatar,
      email,
      phone,
      isActive = true,
      weeklyAmount = 0,
      licenseNumber,
      licenseExpiry,
      address,
      postcode,
      emergencyContact,
      emergencyPhone,
      driverNumber_licenseNumber,
      driverNumber_licenseExpiry, // Add this field
      dateOfBirth,
      driverIsActive = true,
    } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { message: "Name and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUserByEmail = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    if (existingUserByEmail) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 400 }
      );
    }

    // Check if phone already exists (if provided)
    // Use findFirst since phone might not be unique
    if (phone && phone.trim() !== "") {
      const existingUserByPhone = await prisma.user.findFirst({ 
        where: { 
          phone: phone.trim(),
          // Optionally exclude soft-deleted users if you have soft delete
          deletedAt: null
        } 
      });
      
      if (existingUserByPhone) {
        return NextResponse.json(
          { message: "Phone number already exists" },
          { status: 400 }
        );
      }
    }

    // Default password (consider sending email invitation instead)
    const hashedPassword = await bcrypt.hash("123456", 10);
    const now = new Date();

    // Use transaction to ensure both records are created atomically
    const result = await prisma.$transaction(async (tx) => {
      // First create the user
      const user = await tx.user.create({
        data: {
          name,
          avatar: avatar || null,
          email,
          phone: phone || null,
          password: hashedPassword,
          role: user_role.DRIVER,
          isActive,
          updatedAt: now,
        },
      });

      // Then create the driver profile
      const driverProfile = await tx.driverprofile.create({
        data: {
          userId: user.id,
          weeklyAmount: parseFloat(weeklyAmount),
          licenseNumber: licenseNumber || null,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
          address: address || null,
          postcode: postcode || null,
          emergencyContact: emergencyContact || null,
          emergencyPhone: emergencyPhone || null,
          isActive: driverIsActive,
          updatedAt: now,
          driverNumber_licenseNumber,
          driverNumber_licenseExpiry: driverNumber_licenseExpiry ? new Date(driverNumber_licenseExpiry) : null, // Add this field
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          // Set default values for other required fields
          isVerified: true,
          agreementSigned: false,
        },
      });

      // Optional: Create audit log entry if needed
      // Check your auditlog model fields before uncommenting
      /*
      await tx.auditlog.create({
        data: {
          userId: user.id,
          action: "DRIVER_CREATED",
          // Add other required fields based on your auditlog model
          createdAt: now,
          updatedAt: now,
        },
      });
      */

      return { user, driverProfile };
    });

    // Return success response without password
    const { password: _, ...userWithoutPassword } = result.user;
    
    return NextResponse.json(
      { 
        message: "Driver created successfully",
        user: userWithoutPassword,
        driverProfile: result.driverProfile
      }, 
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error("Add driver error:", error);
    
    let errorMessage = "Failed to create driver";
    let statusCode = 500;
    
    if (error.code === 'P2002') {
      errorMessage = "A unique constraint failed. This email or phone might already be in use.";
      statusCode = 400;
    } else if (error.message.includes("foreign key constraint")) {
      errorMessage = "Referential integrity constraint failed.";
      statusCode = 400;
    } else if (error.name === 'PrismaClientValidationError') {
      errorMessage = "Invalid data provided. Please check all fields.";
      statusCode = 400;
    }
    
    return NextResponse.json(
      { message: errorMessage, error: error.message },
      { status: statusCode }
    );
  }
}