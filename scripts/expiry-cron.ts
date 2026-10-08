// /scripts/expiry-cron.ts
import { checkAndUpdateExpiredAgreements } from '../lib/check-agreement-expiry';
import { checkAndNotifyLicenseExpiry } from '../lib/check-license-expiry';
import { checkAndUpdateExpiredInsurances } from '../lib/check-insurance-expiry'; // Add this import

async function main() {
  try {
    console.log('🚀 Starting expiry checks cron job...');
    console.log('Time:', new Date().toISOString());
    
    // Run agreement expiry check
    const agreementResult = await checkAndUpdateExpiredAgreements();
    console.log(`✅ Agreements updated: ${agreementResult}`);
    
    // Run license expiry check
    const licenseResult = await checkAndNotifyLicenseExpiry();
    console.log(`✅ License notifications created: ${licenseResult}`);
    
    // ADD THIS: Run insurance expiry check
    const insuranceResult = await checkAndUpdateExpiredInsurances();
    console.log(`✅ Insurance check completed: 
      Notifications created: ${insuranceResult.notificationsCreated}
      Insurances marked expired: ${insuranceResult.insurancesExpired}
    `);
    
    console.log('🎯 Cron job completed successfully');
    
    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    process.exit(1);
  }
}

// Run the job
main();