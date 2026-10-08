import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from 'next-auth';

const AgreementStatus = {
    DRAFT: 'DRAFT',
    PENDING_SIGNATURE: 'PENDING_SIGNATURE',
    SIGNED: 'SIGNED',
    EXPIRED: 'EXPIRED',
    TERMINATED: 'TERMINATED',
    CANCELLED: 'CANCELLED'
} as const;

const AgreementType = {
    HIRE_AGREEMENT: 'HIRE_AGREEMENT',
    INSURANCE_CERTIFICATE: 'INSURANCE_CERTIFICATE'
} as const;

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        // Get user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Validate required fields
        if (!data.driverId) {
            return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
        }
        if (!data.type) {
            return NextResponse.json({ error: 'Agreement type is required' }, { status: 400 });
        }

        // Create agreement
        const agreement = await prisma.agreement.create({
            data: {
                type: data.type as keyof typeof AgreementType,
                driverId: data.driverId,
                carId: data.carId || null,
                insuranceId: data.insuranceId || null,
                title: data.title || 'Untitled Agreement',
                content: data.content || '',
                terms: data.terms || null,
                weeklyRate: data.weeklyRate ? parseFloat(data.weeklyRate) : null,
                depositAmount: data.depositAmount ? parseFloat(data.depositAmount) : null,
                depositPaid: data.depositPaid || false,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                signedByName: data.signedByName || null,
                signatureData: data.signatureData || null,
                signedByUserId: user.id,
                status: (data.status as keyof typeof AgreementStatus) || AgreementStatus.PENDING_SIGNATURE,
                isActive: true,
                createdBy: user.id,
                updatedAt: new Date(),
                ...(data.status === AgreementStatus.SIGNED && { signedAt: new Date() }),
            },
            include: {
                driverprofile: {
                    include: {
                        user_driverprofile_userIdTouser: {
                            select: { name: true, email: true, phone: true },
                        },
                    },
                },
                car: true,
                insurance: true,
            },
        });

        // Update driver profile if signed
        if (data.status === AgreementStatus.SIGNED) {
            await prisma.driverprofile.update({
                where: { id: data.driverId },
                data: {
                    agreementSigned: true,
                    agreementSignedAt: new Date(),
                    ...(data.weeklyRate && { weeklyAmount: parseFloat(data.weeklyRate) }),
                    ...(data.depositAmount && { depositPaid: parseFloat(data.depositAmount) }),
                },
            });
        }


        return NextResponse.json({
            success: true,
            agreement,
            message: 'Agreement created successfully',
        });
    } catch (error: any) {
        console.error('Error creating agreement:', error);
        return NextResponse.json(
            {
                error: 'Failed to create agreement',
                details: error.message,
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
