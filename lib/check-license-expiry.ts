import { prisma } from './prisma';
import { notification_type } from '@prisma/client';

export async function checkAndNotifyLicenseExpiry() {
    try {
        const now = new Date();


        // Get ALL active drivers first
        const allDrivers = await prisma.driverprofile.findMany({
            where: {
                isActive: true,
            },
            include: {
                user_driverprofile_userIdTouser: true,
            },
        });

        console.log(`📊 Total active drivers: ${allDrivers.length}`);

        let notificationCount = 0;

        for (const driver of allDrivers) {
            const userName = driver.user_driverprofile_userIdTouser?.name || 'Unknown';
            
           

            // Check regular license expiry
            if (driver.licenseExpiry) {
                const expiryDate = new Date(driver.licenseExpiry);
                const timeDiff = expiryDate.getTime() - now.getTime();
                const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                
           
                
                if (daysUntilExpiry >= 0 && daysUntilExpiry <= 20) {
                    console.log(`   🚨 REGULAR LICENSE EXPIRES IN ${daysUntilExpiry} DAYS! Creating notification...`);
                    
                    // Get admin ID
                    const admins = await prisma.user.findMany({
                        where: { role: 'ADMIN', isActive: true },
                        select: { id: true }
                    });
                    const adminId = admins.length > 0 ? admins[0].id : driver.userId;

                    // Create driver notification
                    await prisma.notification.create({
                        data: {
                            type: notification_type.SYSTEM,
                            priority: daysUntilExpiry <= 3 ? 'HIGH' : (daysUntilExpiry <= 7 ? 'MEDIUM' : 'LOW'),
                            title: daysUntilExpiry === 0 ? 'License Expires Today!' : `License Expires in ${daysUntilExpiry} Days`,
                            message: `Your driver's license ${daysUntilExpiry === 0 ? 'expires today' : `will expire in ${daysUntilExpiry} days`}. Please renew it.`,
                            referenceType: 'driver',
                            referenceId: driver.id,
                            actionUrl: '/driver-portal/profile',
                            isForAdmin: false,
                            userId: null,
                            driverId: driver.id,
                            createdAt: now,
                            updatedAt: now,
                        }
                    });

                    // Create admin notification  
                    await prisma.notification.create({
                        data: {
                            type: notification_type.SYSTEM,
                            priority: daysUntilExpiry <= 3 ? 'HIGH' : (daysUntilExpiry <= 7 ? 'MEDIUM' : 'LOW'),
                            title: daysUntilExpiry === 0 ? 'License Expires Today!' : `License Expires in ${daysUntilExpiry} Days`,
                            message: `Driver ${userName}'s license ${daysUntilExpiry === 0 ? 'expires today' : `will expire in ${daysUntilExpiry} days`}.`,
                            referenceType: 'driver',
                            referenceId: driver.userId,
                            actionUrl: `/drivers/${driver.userId}`,
                            isForAdmin: true,
                            userId: adminId,
                            driverId: null,
                            createdAt: now,
                            updatedAt: now,
                        }
                    });

                    notificationCount += 2;
                    console.log(`   ✅ Created 2 notifications for regular license`);
                }
            } else {
                console.log(`   📝 No regular license expiry set`);
            }

            // Check driver number license expiry
            if (driver.driverNumber_licenseExpiry) {
                const expiryDate = new Date(driver.driverNumber_licenseExpiry);
                const timeDiff = expiryDate.getTime() - now.getTime();
                const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                
             
                
                if (daysUntilExpiry >= 0 && daysUntilExpiry <= 20) {
                    console.log(`   🚨 DRIVER NUMBER LICENSE EXPIRES IN ${daysUntilExpiry} DAYS! Creating notification...`);
                    
                    // Get admin ID
                    const admins = await prisma.user.findMany({
                        where: { role: 'ADMIN', isActive: true },
                        select: { id: true }
                    });
                    const adminId = admins.length > 0 ? admins[0].id : driver.userId;

                    // Create driver notification
                    await prisma.notification.create({
                        data: {
                            type: notification_type.SYSTEM,
                            priority: daysUntilExpiry <= 3 ? 'HIGH' : (daysUntilExpiry <= 7 ? 'MEDIUM' : 'LOW'),
                            title: daysUntilExpiry === 0 ? 'Driver Number License Expires Today!' : `Driver Number License Expires in ${daysUntilExpiry} Days`,
                            message: `Your driver number license ${daysUntilExpiry === 0 ? 'expires today' : `will expire in ${daysUntilExpiry} days`}. Please renew it.`,
                            referenceType: 'driver',
                            referenceId: driver.id,
                            actionUrl: '/driver-portal/profile',
                            isForAdmin: false,
                            userId: null,
                            driverId: driver.id,
                            createdAt: now,
                            updatedAt: now,
                        }
                    });

                    // Create admin notification  
                    await prisma.notification.create({
                        data: {
                            type: notification_type.SYSTEM,
                            priority: daysUntilExpiry <= 3 ? 'HIGH' : (daysUntilExpiry <= 7 ? 'MEDIUM' : 'LOW'),
                            title: daysUntilExpiry === 0 ? 'Driver Number License Expires Today!' : `Driver Number License Expires in ${daysUntilExpiry} Days`,
                            message: `Driver ${userName}'s driver number license ${daysUntilExpiry === 0 ? 'expires today' : `will expire in ${daysUntilExpiry} days`}.`,
                            referenceType: 'driver',
                            referenceId: driver.userId,
                            actionUrl: `/drivers/${driver.userId}`,
                            isForAdmin: true,
                            userId: adminId,
                            driverId: null,
                            createdAt: now,
                            updatedAt: now,
                        }
                    });

                    notificationCount += 2;
                    console.log(`   ✅ Created 2 notifications for driver number license`);
                }
            } else {
                console.log(`   📝 No driver number license expiry set`);
            }
        }

        console.log(`\n🎯 FINAL RESULT: Created ${notificationCount} total notifications`);
        return notificationCount;
    } catch (error) {
        console.error('❌ FUCKING ERROR:', error);
        return 0;
    }
}

// SUPER SIMPLE TEST FUNCTION
export async function testSingleDriver(driverId: number) {
    console.log('🔍 TESTING SINGLE DRIVER...');
    
    const now = new Date();
    console.log(`📅 NOW: ${now.toISOString()}`);
    
    const driver = await prisma.driverprofile.findUnique({
        where: { id: driverId },
        include: {
            user_driverprofile_userIdTouser: true,
        },
    });
    
    if (!driver) {
        console.log('❌ Driver not found');
        return;
    }
    
    console.log(`\n👤 Driver: ${driver.user_driverprofile_userIdTouser?.name || 'Unknown'}`);
    
    if (driver.licenseExpiry) {
        const expiry = new Date(driver.licenseExpiry);
        const diff = expiry.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
     
    }
    
    if (driver.driverNumber_licenseExpiry) {
        const expiry = new Date(driver.driverNumber_licenseExpiry);
        const diff = expiry.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
      
    }
}

// MAIN FUNCTION
export async function checkLicenses() {
    console.log('🚀 STARTING LICENSE CHECK...');
    const result = await checkAndNotifyLicenseExpiry();
    console.log(`✅ DONE: ${result} notifications created`);
    return result;
}