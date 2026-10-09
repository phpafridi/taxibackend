// lib/agreement-template.ts — hire / RS rental agreement text for one-tap agreements.
// Mirrors the wording the app's own agreement form produces.

export interface HireTemplateValues {
  rs: boolean;
  driverName: string; licenseNumber?: string | null; licenseExpiry?: string | null;
  address?: string | null; postcode?: string | null; nationalInsuranceNumber?: string | null;
  make: string; model: string; registration: string; bodyType?: string | null;
  weeklyRate: number | null; deposit: number | null;
  startDate: string; endDate: string;
}

export function buildHireContent(v: HireTemplateValues): string {
  return `${v.rs ? "RS CAR RENTAL AGREEMENT" : "HIRE AGREEMENT"}
Non Regulated - 12 Months

RS PRIVATE HIRE LTD
07904388925
rsprivatehireltd@gmail.com

CUSTOMER DETAILS
Name: ${v.driverName}
Licence Number: ${v.licenseNumber ?? ""}
Licence Expiry: ${v.licenseExpiry ?? ""}
Address: ${v.address ?? ""}, ${v.postcode ?? ""}${v.rs ? `\nNational Insurance Number: ${v.nationalInsuranceNumber ?? ""}` : ""}

VEHICLE DETAILS
Make: ${v.make}
Model: ${v.model}
Registration: ${v.registration}
Body Type: ${v.bodyType ?? ""}

FINANCIAL
Weekly Rate: £${v.weeklyRate ?? ""}
Deposit: £${v.deposit ?? ""}

HIRE PERIOD
Start Date: ${v.startDate}
End Date: ${v.endDate}
Date In (Due Return): N/A

VEHICLE CONDITION
Check-Out Damage: None
Check-Out Notes: None
Check-In Damage: None
Check-In Notes: None

TERMS & CONDITIONS
I hereby warrant the truth of the above statements and I declare that I have not withheld any information.

I accept full responsibility and agree to pay on demand for:
• Any additional damage whatsoever
• Any policy excess applicable as demand up to £15,000.00
• Any fuel required
• Valeting charge as required

I have read and understand the terms & conditions.

Print Name: ${v.driverName}
Date: ${new Date().toLocaleDateString("en-GB")}
Signature: To be collected electronically when assigned to driver`;
}

export const HIRE_TERMS_SHORT =
  "I accept full responsibility and agree to pay on demand for: any additional damage whatsoever; any policy excess applicable as demand up to £15,000.00; any fuel required; valeting charge as required.";


export function buildInsuranceContent(v: {
  vehicleReg: string; makeModel: string; driverName: string; licenseNumber?: string | null; address?: string | null;
  startDate: string; endDate: string; policyNo: string; phone?: string; email?: string;
}): string {
  return `INSURANCE CERTIFICATE USE AGREEMENT

R S CAR RENTALS LTD
${v.phone || "07984650186"}
${v.email || "atanveer@hotmail.co.uk"}

To Whom it May Concern,

We confirm that the below vehicle can be used for the carriage of passengers for hire and reward by prior appointment (private hire) also food and parcel deliveries.

We authorise and give permission to the following individual to use the vehicle for ALL private hire appointments, including any trips taken through the Uber and Bolt platform also food and deliveries.

Vehicle Registration: ${v.vehicleReg}
Make & Model: ${v.makeModel}

Driver Name: ${v.driverName}
Driving Licence: ${v.licenseNumber || ""}
Address: ${v.address || ""}

Hire Period: ${v.startDate} to ${v.endDate}
Insurance Policy No: ${v.policyNo}

Certificate Type: Insurance Certificate / Use Agreement

Print Name: ${v.driverName}
Signature: To be completed when assigned

Regards,
R S Car Rentals Ltd`;
}
