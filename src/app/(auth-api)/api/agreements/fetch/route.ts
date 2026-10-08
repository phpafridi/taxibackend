import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get driver profile based on logged-in user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        // Use the correct relation field name from your schema
        driverprofile_driverprofile_userIdTouser: {
          include: {
            // The relation in driverprofile model is called 'agreement' (singular)
            agreement: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!user?.driverprofile_driverprofile_userIdTouser) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      agreements: user.driverprofile_driverprofile_userIdTouser.agreement
    });
  } catch (error) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agreements' },
      { status: 500 }
    );
  }
}