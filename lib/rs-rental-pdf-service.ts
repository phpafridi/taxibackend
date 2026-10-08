// lib/rs-rental-pdf-service.ts
//
// Fills the "Rs Car Rental.pdf.pdf" template (R S CAR RENTALS LTD).
// Same structure/flow as lib/pdf-fill-service.ts (hire agreement) but the
// Customer's Details block differs (DOB + Expiry on the top row, plus a
// National Insurance Number box) and the vehicle/damage/date/signature rows
// sit a few px higher, so the coordinates below are tuned for THIS template.

import { PDFDocument, rgb, StandardFonts, PDFImage } from "pdf-lib";
import fs from "fs";
import path from "path";
import sharp from "sharp";

// Data shape used to fill the RS Car Rental PDF.
export interface RSRentalAgreementData {
  id: number;
  title: string;
  type: string;
  status: string;

  driver: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    postcode?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    dateOfBirth?: string;
    nationalInsuranceNumber?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  } | null;

  car: {
    make: string;
    model: string;
    registration: string;
    bodyType?: string;
    year?: string;
    color?: string;
  } | null;

  weeklyRate?: number;
  depositAmount?: number;
  depositPaid: boolean;

  startDate?: string | null;
  endDate?: string | null;
  dateIn?: string | null;
  signedAt?: string | null;
  signedByName?: string | null;

  signatureData?: string | null;

  content?: string;
  terms?: string;

  damageOutMajorDamage: boolean | null;
  damageOutDent: boolean | null;
  damageOutScratch: boolean | null;
  damageOutMissing: boolean | null;
  damageOutChip: boolean | null;
  damageOutNotes: string | null;

  damageInMajorDamage: boolean | null;
  damageInDent: boolean | null;
  damageInScratch: boolean | null;
  damageInMissing: boolean | null;
  damageInChip: boolean | null;
  damageInNotes: string | null;

  createdBy?: {
    name: string;
    email: string;
  } | null;
}

async function createFilledPDF(agreement: RSRentalAgreementData): Promise<string> {
  // Load the RS Car Rental template. The shipped file is named
  // "Rs Car Rental.pdf.pdf" (spaces + double extension), which is easy to
  // break when copied/renamed, so we try a few sensible variants and use
  // whichever actually exists.
  const templatesDir = path.join(process.cwd(), "public", "templates");
  const candidates = [
    "Rs Car Rental.pdf.pdf",
    "Rs Car Rental.pdf",
    "Rs_Car_Rental_pdf.pdf",
    "Rs_Car_Rental.pdf",
    "RS_CAR_RENTAL.pdf",
    "rs car rental.pdf.pdf",
  ];

  let templatePath = "";
  for (const name of candidates) {
    const p = path.join(templatesDir, name);
    if (fs.existsSync(p)) {
      templatePath = p;
      break;
    }
  }

  // Last resort: pick any file in the templates folder that looks like the RS template.
  if (!templatePath && fs.existsSync(templatesDir)) {
    const match = fs
      .readdirSync(templatesDir)
      .find((f) => /rs.*car.*rental/i.test(f) && f.toLowerCase().endsWith(".pdf"));
    if (match) templatePath = path.join(templatesDir, match);
  }

  if (!templatePath) {
    throw new Error(
      `RS Car Rental template not found in ${templatesDir}. Expected one of: ${candidates.join(", ")}`
    );
  }

  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper to format dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return { day: "", month: "", year: "", full: "" };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { day: "", month: "", year: "", full: "" };

      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear().toString();
      const full = `${day}/${month}/${year}`;

      return { day, month, year, full };
    } catch {
      return { day: "", month: "", year: "", full: "" };
    }
  };

  const startDate = formatDate(agreement.startDate);
  const endDate = formatDate(agreement.endDate);
  const dateIn = formatDate(agreement.dateIn);

  // ============================================
  // CUSTOMER'S DETAILS
  // ============================================

  // Full Name
  if (agreement.driver?.name) {
    firstPage.drawText(agreement.driver.name, { x: 112, y: 701, size: 10, font });
  }

  // DOB and Licence Expiry: the template has pre-printed " /  / " separators,
  // so we drop day/month/year into their own slots instead of printing one
  // DD/MM/YYYY string (which would clash with the pre-printed slashes).
  const splitDmy = (value?: string) => {
    if (!value) return null;
    const parts = value.split("/").map((p) => p.trim());
    if (parts.length === 3 && parts[0]) {
      return { day: parts[0], month: parts[1], year: parts[2] };
    }
    const dt = new Date(value);
    if (!isNaN(dt.getTime())) {
      return {
        day: dt.getDate().toString().padStart(2, "0"),
        month: (dt.getMonth() + 1).toString().padStart(2, "0"),
        year: dt.getFullYear().toString(),
      };
    }
    return null;
  };

  // DOB
  const dobParts = splitDmy(agreement.driver?.dateOfBirth);
  if (dobParts) {
    firstPage.drawText(dobParts.day, { x: 330, y: 704, size: 9, font });
    firstPage.drawText(dobParts.month, { x: 352, y: 704, size: 9, font });
    firstPage.drawText(dobParts.year, { x: 374, y: 704, size: 9, font });
  }

  // Licence Expiry
  const expParts = splitDmy(agreement.driver?.licenseExpiry);
  if (expParts) {
    firstPage.drawText(expParts.day, { x: 472, y: 704, size: 9, font });
    firstPage.drawText(expParts.month, { x: 500, y: 704, size: 9, font });
    firstPage.drawText(expParts.year, { x: 523, y: 704, size: 9, font });
  }

  // Address
  if (agreement.driver?.address) {
    firstPage.drawText(agreement.driver.address.substring(0, 55), { x: 92, y: 672, size: 9, font });
  }

  // Driver's License Number
  if (agreement.driver?.licenseNumber) {
    firstPage.drawText(agreement.driver.licenseNumber, { x: 452, y: 671, size: 9, font });
  }

  // National Insurance Number
  if (agreement.driver?.nationalInsuranceNumber) {
    firstPage.drawText(agreement.driver.nationalInsuranceNumber, { x: 440, y: 637, size: 9, font });
  }

  // Postcode
  if (agreement.driver?.postcode) {
    firstPage.drawText(agreement.driver.postcode, { x: 110, y: 631, size: 10, font });
  }

  // ============================================
  // VEHICLE RATES & DETAILS
  // ============================================

  if (agreement.car?.make) {
    firstPage.drawText(agreement.car.make, { x: 110, y: 560, size: 10, font });
  }
  if (agreement.car?.model) {
    firstPage.drawText(agreement.car.model, { x: 375, y: 560, size: 10, font });
  }
  if (agreement.car?.registration) {
    firstPage.drawText(agreement.car.registration, { x: 110, y: 531, size: 10, font });
  }
  if (agreement.car?.bodyType) {
    firstPage.drawText(agreement.car.bodyType, { x: 382, y: 531, size: 10, font });
  }
  if (agreement.weeklyRate) {
    firstPage.drawText(`£${agreement.weeklyRate.toFixed(2)}`, { x: 110, y: 502, size: 10, font });
  }
  if (agreement.depositAmount) {
    firstPage.drawText(`£${agreement.depositAmount.toFixed(2)}`, { x: 350, y: 502, size: 10, font });
  }

  // ============================================
  // DAMAGE CHECKBOXES (checkmark image)
  // ============================================

  let checkMarkImage: PDFImage | null = null;
  try {
    const checkmarkImagePath = path.join(process.cwd(), "public", "check-mark.png");
    if (fs.existsSync(checkmarkImagePath)) {
      const imageBytes = fs.readFileSync(checkmarkImagePath);
      checkMarkImage = await pdfDoc.embedPng(imageBytes);
    }
  } catch (error) {
    console.error("Failed to load checkmark image:", error);
  }

  const drawCheckmark = (x: number, y: number) => {
    if (checkMarkImage) {
      firstPage.drawImage(checkMarkImage, { x, y, width: 12, height: 12 });
    } else {
      firstPage.drawText("✓", { x: x + 2, y: y + 2, size: 10, font: fontBold, color: rgb(0, 0, 0) });
    }
  };

  // Damage Out (left) — row sits at y=381 on this template
  if (agreement.damageOutMajorDamage === true) drawCheckmark(103, 381);
  if (agreement.damageOutDent === true) drawCheckmark(142, 381);
  if (agreement.damageOutScratch === true) drawCheckmark(190, 381);
  if (agreement.damageOutMissing === true) drawCheckmark(239, 381);
  if (agreement.damageOutChip === true) drawCheckmark(276, 381);

  if (agreement.damageOutNotes) {
    firstPage.drawText(agreement.damageOutNotes.substring(0, 60), { x: 86, y: 322, size: 8, font });
  }

  // Damage In (right)
  if (agreement.damageInMajorDamage === true) drawCheckmark(365, 381);
  if (agreement.damageInDent === true) drawCheckmark(404, 381);
  if (agreement.damageInScratch === true) drawCheckmark(452, 381);
  if (agreement.damageInMissing === true) drawCheckmark(501, 381);
  if (agreement.damageInChip === true) drawCheckmark(538, 381);

  if (agreement.damageInNotes) {
    firstPage.drawText(agreement.damageInNotes.substring(0, 60), { x: 360, y: 322, size: 8, font });
  }

  // ============================================
  // DATES — Date Out / Date In / Due Date In (row y=299)
  // ============================================

  if (startDate.day) {
    firstPage.drawText(startDate.day, { x: 94, y: 299, size: 10, font });
    firstPage.drawText(startDate.month, { x: 116, y: 299, size: 10, font });
    firstPage.drawText(startDate.year, { x: 140, y: 299, size: 10, font });
  }
  if (dateIn.day) {
    firstPage.drawText(dateIn.day, { x: 242, y: 299, size: 10, font });
    firstPage.drawText(dateIn.month, { x: 265, y: 299, size: 10, font });
    firstPage.drawText(dateIn.year, { x: 288, y: 299, size: 10, font });
  }
  if (endDate.day) {
    firstPage.drawText(endDate.day, { x: 405, y: 299, size: 10, font });
    firstPage.drawText(endDate.month, { x: 427, y: 299, size: 10, font });
    firstPage.drawText(endDate.year, { x: 450, y: 299, size: 10, font });
  }

  // ============================================
  // SIGNATURE SECTION (both sides)
  // ============================================

  const signerName = agreement.signedByName || agreement.driver?.name || "";

  // Print names
  if (signerName) {
    firstPage.drawText(signerName, { x: 99, y: 100, size: 10, font });
    firstPage.drawText(signerName, { x: 369, y: 100, size: 10, font });
  }

  // Date Out row (under signatures) — y=70
  if (startDate.day) {
    firstPage.drawText(startDate.day, { x: 213, y: 70, size: 9, font });
    firstPage.drawText(startDate.month, { x: 238, y: 70, size: 9, font });
    firstPage.drawText(startDate.year, { x: 260, y: 70, size: 9, font });

    firstPage.drawText(startDate.day, { x: 473, y: 70, size: 9, font });
    firstPage.drawText(startDate.month, { x: 498, y: 70, size: 9, font });
    firstPage.drawText(startDate.year, { x: 520, y: 70, size: 9, font });
  }

  // Date In row (under signatures) — y=41
  if (dateIn.day) {
    firstPage.drawText(dateIn.day, { x: 213, y: 41, size: 9, font });
    firstPage.drawText(dateIn.month, { x: 238, y: 41, size: 9, font });
    firstPage.drawText(dateIn.year, { x: 260, y: 41, size: 9, font });

    firstPage.drawText(dateIn.day, { x: 473, y: 41, size: 9, font });
    firstPage.drawText(dateIn.month, { x: 498, y: 41, size: 9, font });
    firstPage.drawText(dateIn.year, { x: 520, y: 41, size: 9, font });
  }

  // Embed signature image (same transparency processing as the hire service)
  if (agreement.signatureData) {
    try {
      const base64Data = agreement.signatureData.replace(/^data:image\/\w+;base64,/, "");
      const imageBytes = Buffer.from(base64Data, "base64");

      const processed = await sharp(imageBytes).raw().toBuffer({ resolveWithObject: true });
      const { data, info } = processed;
      const { width, height } = info;

      const transparentData = Buffer.alloc(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * info.channels;
          const tIdx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const brightness = (r + g + b) / 3;
          if (brightness < 100) {
            transparentData[tIdx] = 0;
            transparentData[tIdx + 1] = 0;
            transparentData[tIdx + 2] = 0;
            transparentData[tIdx + 3] = 255 - brightness;
          } else {
            transparentData[tIdx] = 0;
            transparentData[tIdx + 1] = 0;
            transparentData[tIdx + 2] = 0;
            transparentData[tIdx + 3] = 0;
          }
        }
      }

      const transparentImage = await sharp(transparentData, {
        raw: { width, height, channels: 4 },
      })
        .png()
        .toBuffer();

      const image = await pdfDoc.embedPng(transparentImage);

      // First signature (left) + second (right)
      firstPage.drawImage(image, { x: 67, y: 58, width: 120, height: 40 });
      firstPage.drawImage(image, { x: 330, y: 58, width: 120, height: 40 });

      // On check-in, add the lower pair of signatures
      if (agreement.dateIn) {
        firstPage.drawImage(image, { x: 67, y: 28, width: 120, height: 40 });
        firstPage.drawImage(image, { x: 330, y: 28, width: 120, height: 40 });
      }
    } catch (signatureError) {
      console.error("Error embedding RS rental signature:", signatureError);
      firstPage.drawText("X ____________________", { x: 81, y: 69, size: 12, font, color: rgb(0, 0, 0) });
      firstPage.drawText("X ____________________", { x: 351, y: 69, size: 12, font, color: rgb(0, 0, 0) });
    }
  }

  // ============================================
  // SECURITY PAGE
  // ============================================
  const securityPage = pdfDoc.addPage();
  const { height } = securityPage.getSize();

  securityPage.drawText("SECURITY PAGE", { x: 50, y: height - 100, size: 24, font: fontBold, color: rgb(0, 0, 0) });
  securityPage.drawText("This is a certified copy of the original RS Car Rental agreement.", {
    x: 50,
    y: height - 150,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  securityPage.drawText("Any alterations to this document are illegal and invalid.", {
    x: 50,
    y: height - 180,
    size: 12,
    font,
    color: rgb(0.8, 0, 0),
  });

  // Save filled PDF to temp
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tempPath = path.join(tempDir, `temp_rs_${agreement.id}_${Date.now()}.pdf`);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(tempPath, pdfBytes);

  return tempPath;
}

export async function createReadOnlyRSRentalPDF(
  agreement: RSRentalAgreementData,
  outputPath: string
): Promise<string> {
  const filledPath = await createFilledPDF(agreement);
  const pdfDoc = await PDFDocument.load(fs.readFileSync(filledPath));

  try {
    const form = pdfDoc.getForm();
    if (form.getFields().length > 0) form.flatten();
  } catch {
    // no form fields
  }

  // Metadata
  pdfDoc.setTitle(`SECURED - RS Car Rental Agreement - ${agreement.driver?.name || "Unknown"}`);
  pdfDoc.setAuthor("R S Car Rentals Ltd");
  pdfDoc.setSubject("Legal RS Car Rental Agreement - Secured Copy");
  pdfDoc.setKeywords(["secured", "non-editable", "rs", "car", "rental", "agreement", "contract"]);
  pdfDoc.setProducer("RS Secure PDF Generator");
  pdfDoc.setCreator("RS Agreement System");
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  const pages = pdfDoc.getPages();
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: height,
      borderWidth: 1,
      borderColor: rgb(0.8, 0, 0),
      borderOpacity: 0.5,
    });
  });

  const finalBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, finalBytes);
  fs.unlinkSync(filledPath);

  return outputPath;
}
