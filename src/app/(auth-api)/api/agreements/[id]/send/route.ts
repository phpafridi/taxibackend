// app/(auth-api)/api/agreements/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma'; // Use alias if configured

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // 
) {
  try {

    //Await params as Promise
    const { id } = await context.params;
    const agreementId = parseInt(id);


    if (isNaN(agreementId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid agreement ID' },
        { status: 400 }
      );
    }

    // Check if agreement exists
    const existingAgreement = await prisma.agreement.findUnique({
      where: { id: agreementId }
    });


    if (!existingAgreement) {
      return NextResponse.json(
        { success: false, error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Update agreement isActive to true
    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        status: "PENDING_SIGNATURE"
      }
    });



    const notificationData = {
      type: 'AGREEMENT_SIGNED' as const,
      priority: 'HIGH' as const,
      title: 'New Agreement',
      message: `Agreement "${existingAgreement.title}" has been pending for signed`,
      referenceType: 'agreement',
      referenceId: agreementId,
      actionUrl : '/driver-portal/agreements',
      createdAt: new Date(),
      updatedAt: new Date(),
      isForAdmin: false,
      userId: existingAgreement.createdBy,
      driverId: existingAgreement.driverId!, // Using ! to assert non-null
    };

    // Send notification
    await prisma.notification.create({
      data: notificationData,
    });

    try {
      if (existingAgreement.driverId) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const cookie = request.headers.get('cookie') || '';
        // Send to driver
        await fetch(`${baseUrl}/api/notification/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie' : cookie,
          },
          body: JSON.stringify({
            driverId: existingAgreement.driverId,
            notification: {
              title: 'New Agreement',
              body: `Agreement "${existingAgreement.title}" has been pending for signature`,
            },
            data: {
              type: 'AGREEMENT_SIGNED',
              agreementId: agreementId.toString(),
              url: '/driver-portal/agreements',
            }
          }),
        });
      }} catch (error) {
        console.error('Failed to send push notification:', error);       
      }


      return NextResponse.json({
        success: true,
        message: 'Agreement sent successfully',
        agreement: updatedAgreement
      });

    } catch (error: any) {
      console.error('API: Error sending agreement:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to send agreement'
        },
        { status: 500 }
      );
    }
  }

// Also update GET if you have one
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
  ) {
    const { id } = await context.params;
    return NextResponse.json({ message: `GET agreement ${id}` });
  }