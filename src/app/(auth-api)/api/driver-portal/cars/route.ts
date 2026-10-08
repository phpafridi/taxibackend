// app/api/driver-portal/cars/route.ts
import { prisma } from "../../../../../../lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth-config';


// GET THE SINGLE/CURRENT CAR ASSIGNED TO THE DRIVER
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get driver profile
    const driverProfile = await prisma.driverprofile.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });

    if (!driverProfile) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Driver profile not found. Please contact admin to create your driver profile.',
          errorCode: 'DRIVER_PROFILE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Get the FIRST car assigned to this driver (since drivers typically have one car)
    const car = await prisma.car.findFirst({
      where: {
        driverProfileId: driverProfile.id,
        deletedAt: null
      },
      select: {
        id: true,
        registration: true,
        make: true,
        model: true,
        year: true,
        color: true,
        status: true,
        isActive: true,
        purchasePrice: true,
        currentValue: true,
        purchaseDate: true,
        createdAt: true,
        updatedAt: true,
        avatar: true
      }
    });

    if (!car) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No car assigned to you. Please contact admin to assign a car.',
          errorCode: 'NO_CAR_ASSIGNED'
        },
        { status: 404 }
      );
    }

    // Get related data in parallel
    const [agreements, documents, weeklyPayments, insurances, maintenanceRequests] = await Promise.all([
      // Get agreements
      prisma.agreement.findMany({
        where: {
          carId: car.id,
          driverId: driverProfile.id,
          isActive: true
        },
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          signedAt: true,
          weeklyRate: true,
          depositAmount: true,
          depositPaid: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // Get documents
      prisma.document.findMany({
        where: {
          carId: car.id,
          driverId: driverProfile.id
        },
        select: {
          id: true,
          type: true,
          name: true,
          fileName: true,
          fileUrl: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      // Get weekly payments
      prisma.weeklypayment.findMany({
        where: {
          carId: car.id,
          driverId: driverProfile.id
        },
        select: {
          id: true,
          amount: true,
          weekStart: true,
          weekEnd: true,
          dueDate: true,
          status: true,
          paidAt: true,
          createdAt: true,
        },
        orderBy: { weekStart: 'desc' },
        take: 10
      }),
      
      // Get insurances
      prisma.insurance.findMany({
        where: {
          carId: car.id,
          isActive: true
        },
        select: {
          id: true,
          provider: true,
          policyNo: true,
          certificateNo: true,
          startDate: true,
          endDate: true,
          yearlyCost: true,
          monthlyCharge: true,
          excessAmount: true,
          coverageType: true,
        },
        orderBy: { endDate: 'desc' }
      }),
      
      // Get maintenance requests - ADDED MILEAGE FIELD
      prisma.maintenancerequest.findMany({
        where: {
          carId: car.id,
          driverId: driverProfile.id
        },
        select: {
          id: true,
          title: true,
          description: true,
          mileage: true, // ADDED THIS LINE
          amount: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate statistics
    const totalPayments = weeklyPayments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);

    const pendingPayments = weeklyPayments
      .filter(p => p.status === 'PENDING' || p.status === 'OVERDUE')
      .length;

    const activeAgreements = agreements
      .filter(a => a.status === 'SIGNED')
      .length;

    const pendingMaintenance = maintenanceRequests
      .filter(m => m.status === 'PENDING' || m.status === 'APPROVED')
      .length;

    // Return complete response
    return NextResponse.json({
      success: true,
      data: {
        ...car,
        statistics: {
          totalAgreements: agreements.length,
          activeAgreements,
          totalInsurance: insurances.length,
          totalPayments,
          pendingPayments,
          totalMaintenance: maintenanceRequests.length,
          pendingMaintenance,
          totalDocuments: documents.length
        },
        agreements: agreements.map(agreement => ({
          ...agreement,
          weeklyRate: agreement.weeklyRate?.toNumber(),
          depositAmount: agreement.depositAmount?.toNumber()
        })),
        documents: documents.map(doc => ({
          ...doc,
          fileUrl: doc.fileUrl || '#'
        })),
        weeklyPayments: weeklyPayments.map(payment => ({
          ...payment,
          amount: payment.amount.toNumber()
        })),
        insurance: insurances.length > 0 ? insurances[0] : null,
        maintenanceRequests: maintenanceRequests.map(req => ({
          ...req,
          amount: req.amount.toNumber(),
          mileage: req.mileage // ADDED THIS LINE
        }))
      }
    });

  } catch (error: any) {
    console.error('API Error:', error.message);
    console.error('Stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}