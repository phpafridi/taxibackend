import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config";
import { user_role } from "@prisma/client";

// Password validation function
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'admin123', 
    'password123', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common, please choose a stronger one");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { 
          success: false,
          message: "Unauthorized. Please log in again." 
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { 
          success: false,
          message: "All password fields are required" 
        },
        { status: 400 }
      );
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { 
          success: false,
          message: "New passwords do not match" 
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { 
          success: false,
          message: "Password validation failed",
          errors: passwordValidation.errors
        },
        { status: 400 }
      );
    }

    // Find the authenticated user
    const user = await prisma.user.findUnique({
      where: { 
        email: session.user.email,
        isActive: true
      },
      include: {
        driverprofile_driverprofile_userIdTouser: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          message: "User not found or inactive" 
        },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { 
          success: false,
          message: "Current password is incorrect" 
        },
        { status: 400 }
      );
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    
    if (isSamePassword) {
      return NextResponse.json(
        { 
          success: false,
          message: "New password cannot be the same as current password" 
        },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12); // Increased rounds for better security
    const now = new Date();

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Update user password
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          updatedAt: now,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      // Create audit log entry
      await tx.auditlog.create({
        data: {
          userId: user.id,
          driverId: user.driverprofile_driverprofile_userIdTouser?.id || null,
          action: "PASSWORD_CHANGED",
          entity: "USER",
          entityId: user.id,
          oldValues: JSON.stringify({ 
            passwordUpdatedAt: user.updatedAt.toISOString() 
          }),
          newValues: JSON.stringify({ 
            passwordUpdatedAt: now.toISOString() 
          }),
          changes: "User changed their password",
          ipAddress: req.headers.get("x-forwarded-for") || 
                    req.headers.get("x-real-ip") || 
                    req.headers.get("remote-addr") || 
                    "Unknown",
          userAgent: req.headers.get("user-agent") || "Unknown",
          createdAt: now,
        }
      });

      // Create notification for password change (for drivers only)
      
      return updatedUser;
    });

    return NextResponse.json(
      { 
        success: true,
        message: "Password updated successfully",
        data: {
          user: result,
          timestamp: now.toISOString(),
          securityNote: "For security reasons, you may want to sign out of other devices."
        }
      }, 
      { status: 200 }
    );
    
  } catch (error: any) {
    console.error("Update password error:", error);
    
    // Determine appropriate error message
    let errorMessage = "Failed to update password. Please try again.";
    let statusCode = 500;
    
    if (error.code === 'P2025') {
      errorMessage = "User not found";
      statusCode = 404;
    } else if (error.code === 'P2002') {
      errorMessage = "A database constraint was violated";
      statusCode = 400;
    } else if (error.name === 'PrismaClientValidationError') {
      errorMessage = "Invalid data provided";
      statusCode = 400;
    } else if (error.message?.includes("bcrypt")) {
      errorMessage = "Password processing error";
      statusCode = 400;
    }
    
    // Don't expose internal errors in production
    const detailedError = process.env.NODE_ENV === 'development' 
      ? error.message 
      : undefined;
    
    return NextResponse.json(
      { 
        success: false,
        message: errorMessage,
        error: detailedError
      },
      { status: statusCode }
    );
  }
}

// Optional: GET endpoint to check password requirements
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { 
          success: false,
          message: "Unauthorized" 
        },
        { status: 401 }
      );
    }

    // Return password requirements
    return NextResponse.json({
      success: true,
      data: {
        requirements: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          cannotBeSameAsCurrent: true
        },
        example: "P@ssw0rd123",
        commonErrors: [
          "Passwords less than 8 characters",
          "Passwords without uppercase letters",
          "Passwords without lowercase letters",
          "Passwords without numbers",
          "Passwords without special characters",
          "Common passwords like 'password123'"
        ]
      }
    });
    
  } catch (error: any) {
    console.error("Get password requirements error:", error);
    
    return NextResponse.json(
      { 
        success: false,
        message: "Failed to retrieve password requirements"
      },
      { status: 500 }
    );
  }
}