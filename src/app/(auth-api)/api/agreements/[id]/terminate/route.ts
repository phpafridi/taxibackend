import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../../lib/auth-config';
import { agreement_status, agreement_type } from '@prisma/client';

// IMPORTANT: In Next.js 13+, params is a Promise
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 [TERMINATE API] Request received');
    
    // 1. Await the params (Next.js 13+ feature)
    const resolvedParams = await params;
    const idParam = resolvedParams.id;
    
    console.log('🔍 [TERMINATE API] Params after await:', resolvedParams);
    console.log('🔍 [TERMINATE API] ID from params:', idParam);
    console.log('🔍 [TERMINATE API] URL:', request.url);
    
    if (!idParam) {
      console.error('❌ [TERMINATE API] No ID in params');
      return NextResponse.json(
        { success: false, error: 'Agreement ID is missing from URL' },
        { status: 400 }
      );
    }
    
    const agreementId = parseInt(idParam);
    console.log('🔍 [TERMINATE API] Parsed ID:', agreementId);
    
    // Validate ID
    if (isNaN(agreementId) || agreementId <= 0) {
      console.error('❌ [TERMINATE API] Invalid ID - Input:', idParam, 'Parsed:', agreementId);
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid agreement ID: "${idParam}". Must be a positive number.` 
        },
        { status: 400 }
      );
    }

    // 2. Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      console.error('❌ [TERMINATE API] No session found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    console.log('🔍 [TERMINATE API] Session user:', {
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
      email: session.user.email,
    });

    // 3. Check if user is ADMIN
    if (session.user.role !== 'ADMIN') {
      console.error('❌ [TERMINATE API] User is not admin:', session.user.role);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Forbidden. Only administrators can terminate agreements.' 
        },
        { status: 403 }
      );
    }

    // 4. Check if agreement exists
    console.log('🔍 [TERMINATE API] Looking for agreement ID:', agreementId);
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: true
          }
        },
        car: true,
      },
    });

    if (!agreement) {
      console.error('❌ [TERMINATE API] Agreement not found for ID:', agreementId);
      return NextResponse.json(
        { success: false, error: `Agreement with ID ${agreementId} not found` },
        { status: 404 }
      );
    }

    console.log('🔍 [TERMINATE API] Agreement found:', {
      id: agreement.id,
      title: agreement.title,
      type: agreement.type,
      status: agreement.status,
      driverId: agreement.driverId,
      carId: agreement.carId,
    });

    // 5. Check if agreement can be terminated
    const allowedStatuses = [agreement_status.SIGNED, agreement_status.PENDING_SIGNATURE];
    if (!allowedStatuses.includes(agreement.status as any)) {
      console.error('❌ [TERMINATE API] Agreement cannot be terminated. Status:', agreement.status);
      return NextResponse.json(
        { 
          success: false, 
          error: `Agreement cannot be terminated. Current status: "${agreement.status}". Only SIGNED or PENDING_SIGNATURE agreements can be terminated.` 
        },
        { status: 400 }
      );
    }

    // 6. Update agreement status to TERMINATED
    const now = new Date();
    console.log('🔍 [TERMINATE API] Terminating agreement...');
    
    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        status: agreement_status.TERMINATED,
        terminatedAt: now,
        isActive: false,
        updatedAt: now,
      },
      include: {
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: true
          }
        },
        car: true,
      },
    });

    console.log('✅ [TERMINATE API] Agreement terminated:', updatedAgreement.id);

    // 7. Check for other active agreements to determine if we should release car/driver
    if (updatedAgreement.carId && updatedAgreement.driverId) {
      console.log('🔍 [TERMINATE API] Checking for other agreements...');
      
      if (updatedAgreement.type === agreement_type.HIRE_AGREEMENT) {
        const otherHireAgreements = await prisma.agreement.findMany({
          where: {
            id: { not: agreementId },
            type: agreement_type.HIRE_AGREEMENT,
            carId: updatedAgreement.carId,
            driverId: updatedAgreement.driverId,
            isActive: true,
            status: agreement_status.SIGNED,
          },
        });

        console.log('🔍 [TERMINATE API] Other hire agreements found:', otherHireAgreements.length);

        if (otherHireAgreements.length === 0) {
          console.log('✅ [TERMINATE API] No other hire agreements - releasing car/driver');
          
          await prisma.car.update({
            where: { id: updatedAgreement.carId },
            data: {
              HIRE: false,
              driverProfileId: null,
              status: 'AVAILABLE',
              updatedAt: now,
            },
          });
          
          if (updatedAgreement.driverprofile?.userId) {
            await prisma.user.update({
              where: { id: updatedAgreement.driverprofile.userId },
              data: {
                HIRE: false,
                updatedAt: now,
              },
            });
          }
        }
      } 
      else if (updatedAgreement.type === agreement_type.INSURANCE_CERTIFICATE) {
        const otherInsuranceAgreements = await prisma.agreement.findMany({
          where: {
            id: { not: agreementId },
            type: agreement_type.INSURANCE_CERTIFICATE,
            carId: updatedAgreement.carId,
            driverId: updatedAgreement.driverId,
            isActive: true,
            status: agreement_status.SIGNED,
          },
        });

        console.log('🔍 [TERMINATE API] Other insurance agreements found:', otherInsuranceAgreements.length);

        if (otherInsuranceAgreements.length === 0) {
          console.log('✅ [TERMINATE API] No other insurance agreements - removing flags');
          
          await prisma.car.update({
            where: { id: updatedAgreement.carId },
            data: {
              INSURANCE_C: false,
              updatedAt: now,
            },
          });
          
          if (updatedAgreement.driverprofile?.userId) {
            await prisma.user.update({
              where: { id: updatedAgreement.driverprofile.userId },
              data: {
                INSURANCE_C: false,
                updatedAt: now,
              },
            });
          }
        }
      }
    }

    // 8. Create notifications
    const admins = await prisma.user.findMany({
      where: { 
        role: 'ADMIN', 
        isActive: true 
      },
      select: { 
        id: true 
      }
    });

    const adminId = admins.length > 0 ? admins[0].id : null;
    const userName = updatedAgreement.driverprofile?.user_driverprofile_userIdTouser?.name || 'Unknown Driver';
    const carRegistration = updatedAgreement.car?.registration || 'Unknown Car';

    await prisma.notification.create({
      data: {
        type: 'SYSTEM',
        priority: 'HIGH',
        title: 'Agreement Terminated',
        message: `${updatedAgreement.type === 'HIRE_AGREEMENT' ? 'Hire Agreement' : 'Insurance Certificate'} "${updatedAgreement.title}" for ${userName} (Car: ${carRegistration}) has been terminated by ${session.user.name}.`,
        referenceType: 'agreement',
        referenceId: updatedAgreement.id,
        actionUrl: '/agreements',
        isForAdmin: true,
        createdAt: now,
        updatedAt: now,
        userId: adminId,
        driverId: updatedAgreement.driverId || null,
      },
    });

    if (updatedAgreement.driverId) {
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          priority: 'HIGH',
          title: 'Agreement Terminated',
          message: `${updatedAgreement.type === 'HIRE_AGREEMENT' ? 'Hire Agreement' : 'Insurance Certificate'} "${updatedAgreement.title}" has been terminated by administrator.`,
          referenceType: 'agreement',
          referenceId: updatedAgreement.id,
          actionUrl: '/driver-portal/agreements',
          isForAdmin: false,
          createdAt: now,
          updatedAt: now,
          userId: null,
          driverId: updatedAgreement.driverId,
        },
      });
    }

    // 9. Create audit log
    await prisma.auditlog.create({
      data: {
        userId: typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id,
        driverId: updatedAgreement.driverId || null,
        action: 'TERMINATE_AGREEMENT',
        entity: 'agreement',
        entityId: updatedAgreement.id,
        oldValues: JSON.stringify({
          status: agreement.status,
          isActive: agreement.isActive,
        }),
        newValues: JSON.stringify({
          status: updatedAgreement.status,
          isActive: updatedAgreement.isActive,
          terminatedAt: updatedAgreement.terminatedAt,
        }),
        changes: `Agreement terminated by admin ${session.user.name} (${session.user.email})`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        location: 'Terminate Agreement API',
        createdAt: now,
      },
    });

    console.log('✅ [TERMINATE API] Termination completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Agreement terminated successfully',
      agreement: updatedAgreement,
    });

  } catch (error: any) {
    console.error('❌ [TERMINATE API] Error:', error);
    console.error('❌ [TERMINATE API] Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to terminate agreement',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}