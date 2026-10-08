// lib/check-insurance-expiry.ts
import { prisma } from './prisma';

export async function checkAndUpdateExpiredInsurances() {
  try {
    const now = new Date();
    
   

    // Calculate dates for notifications - these should be future dates
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(now.getDate() + 20); // 20 days from now
    
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7); // 7 days from now
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3); // 3 days from now

    

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

    // Get first admin ID or use a default
    const adminId = admins.length > 0 ? admins[0].id : null;

    // 1. Create notifications for insurances expiring soon (0-15 days)
    const activeInsurances = await prisma.insurance.findMany({
      where: {
        isActive: true,
        isExpired: false,
        endDate: {
          gte: now, // Not expired yet (endDate >= now)
          lte: fifteenDaysFromNow, // Expiring within 15 days
        },
      },
      include: {
        car: {
          select: {
            id: true,
            registration: true,
          }
        },
        driverprofile: {
          select: {
            id: true,
            userId: true,
          }
        },
      },
      orderBy: {
        endDate: 'asc',
      },
    });

    

    // Process each insurance policy
    for (const insurance of activeInsurances) {
      const endDate = new Date(insurance.endDate);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
  
      // Create notifications based on days until expiry
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 20) {
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

        

        // Check if notification already exists today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingNotification = await prisma.notification.findFirst({
          where: {
            referenceId: insurance.id,
            referenceType: 'insurance',
            type: 'INSURANCE_EXPIRY',
            createdAt: {
              gte: today,
            },
          },
        });

        if (!existingNotification) {
          // Create notification for admin
          await prisma.notification.create({
            data: {
              type: 'INSURANCE_EXPIRY',
              priority: priority,
              title: `Insurance Expiring Soon (${notificationLevel})`,
              message: `Insurance policy "${insurance.provider}" for car ${insurance.car.registration} expires in ${daysUntilExpiry} days.`,
              referenceType: 'insurance',
              referenceId: insurance.id,
              actionUrl: `/cars/${insurance.carId}`,
              isForAdmin: true,
              createdAt: now,
              updatedAt: now,
              userId: adminId,
              driverId: null,
            },
          });

          // Create notification for driver if exists
          if (insurance.driverprofile) {
            await prisma.notification.create({
              data: {
                type: 'INSURANCE_EXPIRY',
                priority: priority,
                title: 'Your Insurance is Expiring Soon',
                message: `Your insurance policy "${insurance.provider}" expires in ${daysUntilExpiry} days. Please contact admin for renewal.`,
                referenceType: 'insurance',
                referenceId: insurance.id,
                actionUrl: '/driver-portal/insurance',
                isForAdmin: false,
                createdAt: now,
                updatedAt: now,
                userId: null,
                driverId: insurance.driverprofile.id,
              },
            });
          }

          notificationCount++;
          
        } else {
          console.log(`   ⚠️ Notification already exists today`);
        }
      } else {
        console.log(`   ❌ No notification needed (${daysUntilExpiry} days)`);
      }
    }

    // 2. Update expired insurances (endDate has passed)
    const expiredInsurances = await prisma.insurance.findMany({
      where: {
        endDate: {
          lt: now, // endDate < now (expired)
        },
        isActive: true, // Only active insurances
        isExpired: false, // Not already marked as expired
      },
      include: {
        car: {
          select: {
            id: true,
            registration: true,
          }
        },
        driverprofile: {
          select: {
            id: true,
            userId: true,
          }
        },
      },
    });

    

    if (expiredInsurances.length > 0) {
      // Update all expired insurances in bulk
      const updateResult = await prisma.insurance.updateMany({
        where: {
          id: {
            in: expiredInsurances.map(ins => ins.id),
          },
        },
        data: {
          isExpired: true,
          updatedAt: now,
        },
      });

      expiryCount = updateResult.count;

      

      // Create notifications for each expired insurance
      for (const insurance of expiredInsurances) {
        
        
        // Check if notification already exists today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingNotification = await prisma.notification.findFirst({
          where: {
            referenceId: insurance.id,
            referenceType: 'insurance',
            type: 'INSURANCE_EXPIRY',
            createdAt: {
              gte: today,
            },
          },
        });

        if (!existingNotification) {
          // Create notification for admin
          await prisma.notification.create({
            data: {
              type: 'INSURANCE_EXPIRY',
              priority: 'HIGH',
              title: 'Insurance Policy Expired',
              message: `Insurance policy "${insurance.provider}" for car ${insurance.car.registration} has expired.`,
              referenceType: 'insurance',
              referenceId: insurance.id,
              actionUrl: `/cars/${insurance.carId}`,
              isForAdmin: true,
              createdAt: now,
              updatedAt: now,
              userId: adminId,
              driverId: null,
            },
          });

          // Create notification for driver if exists
          if (insurance.driverprofile) {
            await prisma.notification.create({
              data: {
                type: 'INSURANCE_EXPIRY',
                priority: 'HIGH',
                title: 'Your Insurance Has Expired',
                message: `Your insurance policy "${insurance.provider}" has expired. Please contact admin immediately.`,
                referenceType: 'insurance',
                referenceId: insurance.id,
                actionUrl: '/driver-portal/insurance',
                isForAdmin: false,
                createdAt: now,
                updatedAt: now,
                userId: null,
                driverId: insurance.driverprofile.id,
              },
            });
          }

          console.log(`   ✅ Created expiry notifications`);
        } else {
          console.log(`   ⚠️ Expiry notification already exists today`);
        }
      }
    }



    return {
      notificationsCreated: notificationCount,
      insurancesExpired: expiryCount,
    };
  } catch (error) {
    console.error('❌ Error checking and updating insurance expiry:', error);
    throw error;
  }
}

// Test function for debugging
export async function testInsuranceExpiry(insuranceId?: number) {
  const now = new Date();

  
  if (insuranceId) {
    const insurance = await prisma.insurance.findUnique({
      where: { id: insuranceId },
      include: {
        car: true,
        driverprofile: true,
      },
    });
    
    if (!insurance) {
      console.log('❌ Insurance not found');
      return;
    }
    

    
    const endDate = new Date(insurance.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    

  }
}