import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, email, userId, currentEmail, avatar } = body; // ADDED 'avatar' here


    // Verify the user is updating their own profile
    if (session.user?.email !== currentEmail && session.user?.id !== userId) {
      return NextResponse.json(
        { success: false, message: "You can only update your own profile" },
        { status: 403 }
      );
    }

    // Check if email already exists (excluding current user)
    if (email && email !== currentEmail) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email,
          NOT: {
            email: currentEmail
          }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: "Email already exists" },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Add fields to update if they exist
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (avatar !== undefined) updateData.avatar = avatar; // FIXED: was 'Avatar' with capital A

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: {
        email: currentEmail,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
      }
    });

  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update profile",
        error: error.message 
      },
      { status: 500 }
    );
  }
}