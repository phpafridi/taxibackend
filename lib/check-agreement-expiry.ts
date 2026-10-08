import { prisma } from './prisma';
import { agreement_status, agreement_type, notification_type } from '@prisma/client';

export async function checkAndUpdateExpiredAgreements() {
  try {
    const now = new Date();
    
    // Calculate dates for notifications
    const twentyDaysBefore = new Date();
    twentyDaysBefore.setDate(now.getDate() + 20);
    
    const sevenDaysBefore = new Date();
    sevenDaysBefore.setDate(now.getDate() + 7);
    
    const threeDaysBefore = new Date();
    threeDaysBefore.setDate(now.getDate() + 3);

    let notificationCount = 0;
    let expiryCount = 0;

    // Get admin users for notifications
    const admins = await prisma.user.findMany({
      where: { 
        role: 'ADMIN', 
        isActive: true 
      },
      select: { 
        id: true 
      }
    });

    // Get first admin ID or use agreement createdBy as fallback
    const adminId = admins.length > 0 ? admins[0].id : null;

    // 1. First check for agreements expiring soon (SIGNED agreements)
    const activeAgreements = await prisma.agreement.findMany({
      where: {
        endDate: {
          gt: now, // Not expired yet
        },
        status: agreement_status.SIGNED,
        isActive: true,
        
      },
      include: {
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: true
          }
        },
        car: {
          select: {
            id: true,
            registration: true,
          }
        },
      },
    });

    // Create expiry warnings for agreements expiring soon
    for (const agreement of activeAgreements) {
      if (agreement.endDate) {
        const daysUntilExpiry = Math.ceil((agreement.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Create notifications based on days until expiry
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 20) {
          let notificationLevel = '';
          let priority = 'MEDIUM';
          
          if (daysUntilExpiry <= 3) {
            notificationLevel = '3 days';
            priority = 'HIGH';
          } else if (daysUntilExpiry <= 7) {
            notificationLevel = '7 days';
            priority = 'MEDIUM';
          } else if (daysUntilExpiry <= 20) {
            notificationLevel = '20 days';
            priority = 'LOW';
          }

          const userName = agreement.driverprofile?.user_driverprofile_userIdTouser?.name || 'Unknown Driver';
          const carRegistration = agreement.car?.registration || 'Unknown Car';

          // Create notification for admin
          await prisma.notification.create({
            data: {
              type: notification_type.AGREEMENT_EXPIRING,
              priority: priority,
              title: `Agreement Expiring Soon (${notificationLevel})`,
              message: `${agreement.type === agreement_type.HIRE_AGREEMENT ? 'Hire Agreement' : 'Insurance Certificate'} "${agreement.title}" for car ${carRegistration} will expire in ${daysUntilExpiry} days.`,
              referenceType: 'agreement',
              referenceId: agreement.id,
              actionUrl: '/agreements',
              isForAdmin: true,
              createdAt: now,
              updatedAt: now,
              userId: adminId,
              driverId: null,
            },
          });

          // Create notification for driver if exists
          if (agreement.driverprofile && agreement.driverId) {
            await prisma.notification.create({
              data: {
                type: notification_type.AGREEMENT_EXPIRING,
                priority: priority,
                title: `Your Agreement is Expiring Soon (${notificationLevel})`,
                message: `${agreement.type === agreement_type.HIRE_AGREEMENT ? 'Hire Agreement' : 'Insurance Certificate'} "${agreement.title}" will expire in ${daysUntilExpiry} days. Please contact admin for renewal.`,
                referenceType: 'agreement',
                referenceId: agreement.id,
                actionUrl: '/driver-portal/agreements',
                isForAdmin: false,
                createdAt: now,
                updatedAt: now,
                userId: null,
                driverId: agreement.driverId,
              },
            });
          }

          notificationCount += 2;
        }
      }
    }

    // 2. Update agreements where endDate has passed (expired)
    const expiredAgreements = await prisma.agreement.findMany({
      where: {
        endDate: {
          lt: now, // endDate < now (expired)
        },
        status: {
          in: [agreement_status.SIGNED, agreement_status.PENDING_SIGNATURE],
          not: agreement_status.EXPIRED
        },
        isActive: true,
      },
      include: {
        car: true,
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: true
          }
        },
      },
    });

    if (expiredAgreements.length > 0) {
      // Update all expired agreements in bulk
      const updateResult = await prisma.agreement.updateMany({
        where: {
          id: {
            in: expiredAgreements.map(agreement => agreement.id),
          },
        },
        data: {
          status: agreement_status.EXPIRED,
          isActive: false,
          updatedAt: now,
        },
      });

      expiryCount = updateResult.count;

      // Process each expired agreement
      for (const agreement of expiredAgreements) {
        const userName = agreement.driverprofile?.user_driverprofile_userIdTouser?.name || 'Unknown Driver';
        const carRegistration = agreement.car?.registration || 'Unknown Car';
        
        // Create notifications for driver and admin
        if (agreement.driverprofile && agreement.driverId) {
          // Notification for driver
          await prisma.notification.create({
            data: {
              type: notification_type.AGREEMENT_EXPIRED,
              priority: 'HIGH',
              title: 'Your Agreement Has Expired',
              message: `${agreement.type === agreement_type.HIRE_AGREEMENT ? 'Hire Agreement' : 'Insurance Certificate'} "${agreement.title}" has expired on ${agreement.endDate?.toLocaleDateString()}. Please renew if needed.`,
              referenceType: 'agreement',
              referenceId: agreement.id,
              actionUrl: '/driver-portal/agreements',
              createdAt: now,
              updatedAt: now,
              isForAdmin: false,
              userId: null,
              driverId: agreement.driverId,
            },
          });

          // Notification for admin
          await prisma.notification.create({
            data: {
              type: notification_type.AGREEMENT_EXPIRED,
              priority: 'HIGH',
              title: 'Agreement Has Expired',
              message: `${agreement.type === agreement_type.HIRE_AGREEMENT ? 'Hire Agreement' : 'Insurance Certificate'} "${agreement.title}" for ${userName} (Car: ${carRegistration}) has expired.`,
              referenceType: 'agreement',
              referenceId: agreement.id,
              actionUrl: '/agreements',
              createdAt: now,
              updatedAt: now,
              isForAdmin: true,
              userId: adminId,
              driverId: agreement.driverId,
            },
          });
          
          notificationCount += 2;
        }
        
        // Update car and user status based on agreement type
        if (agreement.carId && agreement.driverId) {
          if (agreement.type === agreement_type.HIRE_AGREEMENT) {
            // Update car HIRE to false
            await prisma.car.update({
              where: { id: agreement.carId },
              data: {
                HIRE: false,
                driverProfileId: null,
                status: 'AVAILABLE',
                updatedAt: now,
              },
            });
            
            // Update user HIRE to false
            if (agreement.driverprofile?.userId) {
              await prisma.user.update({
                where: { id: agreement.driverprofile.userId },
                data: {
                  HIRE: false,
                },
              });
            }
          } 
          else if (agreement.type === agreement_type.INSURANCE_CERTIFICATE) {
            // Update car INSURANCE_C to false
            await prisma.car.update({
              where: { id: agreement.carId },
              data: {
                INSURANCE_C: false,
                updatedAt: now,
              },
            });
            
            // Update user INSURANCE_C to false
            if (agreement.driverprofile?.userId) {
              await prisma.user.update({
                where: { id: agreement.driverprofile.userId },
                data: {
                  INSURANCE_C: false,
                },
              });
            }
          }
        }
      }
    }

    
    return { notificationCount, expiryCount };
  } catch (error) {
    console.error('❌ Error updating expired agreements:', error);
    return { notificationCount: 0, expiryCount: 0 };
  }
}

// Simple function to just check agreements
export async function checkAgreements() {
  
  const result = await checkAndUpdateExpiredAgreements();
  
  return result;
}