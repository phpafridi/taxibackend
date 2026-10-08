import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({
        success: false,
        error: 'Invalid agreement ID'
      }, { status: 400 });
    }

    const agreementId = parseInt(id);

    if (isNaN(agreementId) || agreementId <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid agreement ID format'
      }, { status: 400 });
    }

    // Get the agreement with relations - ADD signatureData AND CHECK-IN FIELDS
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: agreementId,
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        content: true,
        terms: true,
        weeklyRate: true,
        depositAmount: true,
        depositPaid: true,
        startDate: true,
        endDate: true,
        // ADD CHECK-IN FIELDS HERE:
        dateIn: true,
        damageInMajorDamage: true,
        damageInDent: true,
        damageInScratch: true,
        damageInMissing: true,
        damageInChip: true,
        damageInNotes: true,
        // END OF CHECK-IN FIELDS
        signedAt: true,
        signedByName: true,
        signatureData: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        createdBy: true,
        driverId: true,
        carId: true,
        insuranceId: true,
        driverprofile: true,
        car: true,
        insurance: true,
      }
    });

    if (!agreement) {
      return NextResponse.json({
        success: false,
        error: 'Agreement not found'
      }, { status: 404 });
    }

    // Get user data for driver and creator
    let driverUser = null;
    let createdByUser = null;

    if (agreement.driverprofile?.userId) {
      driverUser = await prisma.user.findUnique({
        where: { id: agreement.driverprofile.userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        }
      });
    }

    if (agreement.createdBy) {
      createdByUser = await prisma.user.findUnique({
        where: { id: agreement.createdBy },
        select: {
          id: true,
          name: true,
          email: true,
        }
      });
    }

    // Format the response with signatureData AND CHECK-IN FIELDS
    const formattedAgreement = {
      id: agreement.id,
      title: agreement.title,
      type: agreement.type,
      status: agreement.status,
      content: agreement.content,
      terms: agreement.terms,
      weeklyRate: agreement.weeklyRate,
      depositAmount: agreement.depositAmount,
      depositPaid: agreement.depositPaid,
      startDate: agreement.startDate?.toISOString() || null,
      endDate: agreement.endDate?.toISOString() || null,
      // ADD CHECK-IN FIELDS TO RESPONSE:
      dateIn: agreement.dateIn?.toISOString() || null,
      damageInMajorDamage: agreement.damageInMajorDamage,
      damageInDent: agreement.damageInDent,
      damageInScratch: agreement.damageInScratch,
      damageInMissing: agreement.damageInMissing,
      damageInChip: agreement.damageInChip,
      damageInNotes: agreement.damageInNotes,
      // END OF CHECK-IN FIELDS
      signedAt: agreement.signedAt?.toISOString() || null,
      signedByName: agreement.signedByName,
      signatureData: agreement.signatureData,
      createdAt: agreement.createdAt.toISOString(),
      updatedAt: agreement.updatedAt.toISOString(),
      isActive: agreement.isActive,

      // Driver info
      driver: agreement.driverprofile ? {
        id: agreement.driverprofile.id,
        name: driverUser?.name || 'Unknown Driver',
        email: driverUser?.email || '',
        phone: driverUser?.phone || null,
      } : null,

      // Car info
      car: agreement.car ? {
        id: agreement.car.id,
        make: agreement.car.make,
        model: agreement.car.model,
        registration: agreement.car.registration,
      } : null,

      // Insurance info
      insurance: agreement.insurance ? {
        id: agreement.insurance.id,
        policyNumber: agreement.insurance.policyNo,
        provider: agreement.insurance.provider,
      } : null,

      // Created by user
      createdByUser: createdByUser ? {
        name: createdByUser.name,
        email: createdByUser.email,
      } : {
        name: 'System',
        email: '',
      },
    };

    return NextResponse.json({
      success: true,
      agreement: formattedAgreement
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server error: ' + error.message
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agreementId = parseInt(id); // This is your existing variable

    if (isNaN(agreementId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid agreement ID'
      }, { status: 400 });
    }

    const body = await request.json();

    // Check if this is a check-in update (has check-in fields)
    const hasCheckInFields = 
      body.dateIn !== undefined ||
      body.damageInMajorDamage !== undefined ||
      body.damageInDent !== undefined ||
      body.damageInScratch !== undefined ||
      body.damageInMissing !== undefined ||
      body.damageInChip !== undefined ||
      body.damageInNotes !== undefined;

    if (hasCheckInFields) {
      // For check-in updates, only update the allowed check-in fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Only update allowed check-in fields
      if (body.dateIn !== undefined) {
        updateData.dateIn = body.dateIn ? new Date(body.dateIn) : null;
      }

      if (body.damageInMajorDamage !== undefined) {
        updateData.damageInMajorDamage = body.damageInMajorDamage;
      }
      if (body.damageInDent !== undefined) {
        updateData.damageInDent = body.damageInDent;
      }
      if (body.damageInScratch !== undefined) {
        updateData.damageInScratch = body.damageInScratch;
      }
      if (body.damageInMissing !== undefined) {
        updateData.damageInMissing = body.damageInMissing;
      }
      if (body.damageInChip !== undefined) {
        updateData.damageInChip = body.damageInChip;
      }
      if (body.damageInNotes !== undefined) {
        updateData.damageInNotes = body.damageInNotes;
      }

      // Update only the check-in fields
      const updatedAgreement = await prisma.agreement.update({
        where: { id: agreementId }, // Using agreementId here
        data: updateData
      });

      return NextResponse.json({
        success: true,
        message: 'Agreement check-in details updated successfully',
        agreement: updatedAgreement
      });
    } else {
      // Original update logic for other fields
      const updatedAgreement = await prisma.agreement.update({
        where: { id: agreementId }, // Using agreementId here
        data: {
          title: body.title,
          type: body.type,
          content: body.content,
          terms: body.terms,
          weeklyRate: body.weeklyRate,
          depositAmount: body.depositAmount,
          depositPaid: body.depositPaid,
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          status: body.status,
          signedAt: body.signedAt ? new Date(body.signedAt) : null,
          signedByName: body.signedByName,
          signatureData: body.signatureData,
          driverId: body.driverId,
          carId: body.carId,
          insuranceId: body.insuranceId,
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Agreement updated successfully',
        agreement: updatedAgreement
      });
    }

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error: ' + error.message
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agreementId = parseInt(id);

    if (isNaN(agreementId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid agreement ID'
      }, { status: 400 });
    }

    // Check if agreement exists
    const existingAgreement = await prisma.agreement.findFirst({
      where: {
        id: agreementId,
        isActive: true
      }
    });

    if (!existingAgreement) {
      return NextResponse.json({
        success: false,
        error: 'Agreement not found'
      }, { status: 404 });
    }

    // Check if agreement can be deleted
    if (existingAgreement.status === 'SIGNED') {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete signed agreements'
      }, { status: 400 });
    }

    await prisma.agreement.delete({
      where: { id: agreementId },
    });

    if (existingAgreement.type === "HIRE_AGREEMENT") {      
      await prisma.car.update({
        where: { id: existingAgreement.carId || 0 },
        data: {
          driverProfileId: null,
          status: 'AVAILABLE',
          HIRE: false,
        },
      });

      let userId = null;
      
      if (existingAgreement.driverId) {
        const driverProfile = await prisma.driverprofile.findUnique({
          where: { id: existingAgreement.driverId },
          select: { userId: true }
        });
        
        if (driverProfile) {
          userId = driverProfile.userId;
          
          // Update user HIRE flag to false
          await prisma.user.update({
            where: { id: userId },
            data: {
              HIRE: false,
            },
          });
        }
      }
    } else {
      await prisma.car.update({
        where: { id: existingAgreement.carId || 0 },
        data: {
          driverProfileId: null,
          status: 'AVAILABLE',
          INSURANCE_C: false,
        },
      });

      let userId = null;
      
      if (existingAgreement.driverId) {
        const driverProfile = await prisma.driverprofile.findUnique({
          where: { id: existingAgreement.driverId },
          select: { userId: true }
        });
        
        if (driverProfile) {
          userId = driverProfile.userId;
          
          // Update user INSURANCE_C flag to false
          await prisma.user.update({
            where: { id: userId },
            data: {
              INSURANCE_C: false,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Agreement deleted successfully'
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error: ' + error.message
      },
      { status: 500 }
    );
  }
}