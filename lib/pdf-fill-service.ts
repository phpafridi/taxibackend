// lib/secure-pdf-service.ts
import { PDFDocument, rgb, StandardFonts, degrees, PDFImage } from "pdf-lib";
import fs from "fs";
import path from "path";
import sharp from 'sharp';

// Define AgreementData interface
export interface AgreementData {
  id: number;
  title: string;
  type: string;
  status: string;

  // Driver details
  driver: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    postcode?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    dateOfBirth?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  } | null;

  // Vehicle details
  car: {
    make: string;
    model: string;
    registration: string;
    bodyType?: string;
    year?: string;
    color?: string;
  } | null;

  // Financial
  weeklyRate?: number;
  depositAmount?: number;
  depositPaid: boolean;

  // Dates
  startDate?: string | null;
  endDate?: string | null;
  dateIn?: string | null;
  signedAt?: string | null;
  signedByName?: string | null;

  // Signature
  signatureData?: string | null;

  // Content
  content?: string;
  terms?: string;

  damageOutMajorDamage: boolean | null;
  damageOutDent: boolean | null;
  damageOutScratch: boolean | null;
  damageOutMissing: boolean | null;
  damageOutChip: boolean | null;
  damageOutNotes: string | null;

  // Damage checkboxes for Check-In
  damageInMajorDamage: boolean | null;
  damageInDent: boolean | null;
  damageInScratch: boolean | null;
  damageInMissing: boolean | null;
  damageInChip: boolean | null;
  damageInNotes: string | null;

  // Created by user info
  createdBy?: {
    name: string;
    email: string;
  } | null;
}

export async function createSecurePDF(
  agreement: AgreementData,
  outputPath: string
): Promise<string> {
  try {
    const filledPdfPath = await createFilledPDF(agreement);
    await addSecurityFeatures(filledPdfPath, outputPath, agreement);
    fs.unlinkSync(filledPdfPath);
    return outputPath;
  } catch (error) {
    throw error;
  }
}

async function createFilledPDF(agreement: AgreementData): Promise<string> {
  // Load template
  const templatePath = path.join(process.cwd(), "public", "templates", "HIRE_AGREEMENT.pdf");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper to format dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return { day: '', month: '', year: '', full: '' };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { day: '', month: '', year: '', full: '' };

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString();
      const full = `${day}/${month}/${year}`;

      return { day, month, year, full };
    } catch {
      return { day: '', month: '', year: '', full: '' };
    }
  };

  // Format dates
  const startDate = formatDate(agreement.startDate);
  const endDate = formatDate(agreement.endDate);
  const dateIn = formatDate(agreement.dateIn);

  // ============================================
  // FILL PDF WITH DATA
  // ============================================

  // Full Name
  if (agreement.driver?.name) {
    firstPage.drawText(agreement.driver.name, {
      x: 140,
      y: 695,
      size: 10,
      font: font,
    });
  }

  // Address
  if (agreement.driver?.address) {
    firstPage.drawText(agreement.driver.address, {
      x: 86,
      y: 664,
      size: 9,
      font: font,
    });
  }

  // License Number
  if (agreement.driver?.licenseNumber) {
    firstPage.drawText(agreement.driver.licenseNumber, {
      x: 430,
      y: 665,
      size: 10,
      font: font,
    });
  }

  // Postcode
  if (agreement.driver?.postcode) {
    firstPage.drawText(agreement.driver.postcode, {
      x: 110,
      y: 622,
      size: 10,
      font: font,
    });
  }

  // License Expiry
  if (agreement.driver?.licenseExpiry) {
    firstPage.drawText(agreement.driver.licenseExpiry, {
      x: 375,
      y: 634,
      size: 10,
      font: font,
    });
  }

  // Date of Birth
  if (agreement.driver?.dateOfBirth) {
    firstPage.drawText(agreement.driver.dateOfBirth, {
      x: 490,
      y: 693,
      size: 10,
      font: font,
    });
  }

  // Vehicle Make
  if (agreement.car?.make) {
    firstPage.drawText(agreement.car.make, {
      x: 110,
      y: 551,
      size: 10,
      font: font,
    });
  }

  // Registration
  if (agreement.car?.registration) {
    firstPage.drawText(agreement.car.registration, {
      x: 110,
      y: 523,
      size: 10,
      font: font,
    });
  }

  // Vehicle Model
  if (agreement.car?.model) {
    firstPage.drawText(agreement.car.model, {
      x: 374,
      y: 552,
      size: 10,
      font: font,
    });
  }

  if (agreement.car?.bodyType) {
    firstPage.drawText(agreement.car.bodyType, {
      x: 382,
      y: 523,
      size: 10,
      font: font,
    });
  }

  // Weekly Rate
  if (agreement.weeklyRate) {
    firstPage.drawText(`£${agreement.weeklyRate.toFixed(2)}`, {
      x: 110,
      y: 495,
      size: 10,
      font: font,
    });
  }

  // Deposit
  if (agreement.depositAmount) {
    firstPage.drawText(`£${agreement.depositAmount.toFixed(2)}`, {
      x: 350,
      y: 495,
      size: 10,
      font: font,
    });
  }

  // ============================================
  // DAMAGE CHECKBOXES USING CHECKMARK IMAGE
  // ============================================

  // Load checkmark image from public/check-mark.png
  let checkMarkImage: PDFImage | null = null;
  try {
    const checkmarkImagePath = path.join(process.cwd(), "public", "check-mark.png");

    if (!fs.existsSync(checkmarkImagePath)) {
      console.error('Checkmark image not found at:', checkmarkImagePath);
    } else {
      const imageBytes = fs.readFileSync(checkmarkImagePath);

      // Check if it's PNG or JPG
      const isPNG = checkmarkImagePath.toLowerCase().endsWith('.png');
      const isJPG = checkmarkImagePath.toLowerCase().endsWith('.jpg') ||
        checkmarkImagePath.toLowerCase().endsWith('.jpeg');

      if (isPNG) {
        checkMarkImage = await pdfDoc.embedPng(imageBytes);
      } else if (isJPG) {
        checkMarkImage = await pdfDoc.embedJpg(imageBytes);
      }
    }
  } catch (error) {
    console.error('Failed to load checkmark image:', error);
  }

  // Helper function to draw checkmark (image or text fallback)
  const drawCheckmark = (x: number, y: number) => {
    if (checkMarkImage) {
      // Draw image checkmark
      firstPage.drawImage(checkMarkImage, {
        x: x,
        y: y,
        width: 12,
        height: 12,
      });
    } else {
      // Fallback to text checkmark
      firstPage.drawText('✓', {
        x: x + 2,
        y: y + 2,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }
  };

  // Damage Out checkboxes (LEFT SIDE)
  // Adjust Y coordinate to 372 for better positioning
  if (agreement.damageOutMajorDamage === true) {
    drawCheckmark(103, 372);  // Major Damage
  }

  if (agreement.damageOutDent === true) {
    drawCheckmark(142, 372);  // Dent
  }

  if (agreement.damageOutScratch === true) {
    drawCheckmark(190, 372);  // Scratch
  }

  if (agreement.damageOutMissing === true) {
    drawCheckmark(239, 372);  // Missing
  }

  if (agreement.damageOutChip === true) {
    drawCheckmark(276, 372);  // Chip
  }

  // Damage Out Notes (short version)
  if (agreement.damageOutNotes) {
    const shortNotes = agreement.damageOutNotes.substring(0, 60);
    firstPage.drawText(shortNotes, {
      x: 86,
      y: 415,
      size: 8,
      font: font,
    });
  }

  // Damage In checkboxes (RIGHT SIDE)
  if (agreement.damageInMajorDamage === true) {
    drawCheckmark(365, 372);  // Major Damage
  }

  if (agreement.damageInDent === true) {
    drawCheckmark(404, 372);  // Dent
  }

  if (agreement.damageInScratch === true) {
    drawCheckmark(452, 372);  // Scratch
  }

  if (agreement.damageInMissing === true) {
    drawCheckmark(501, 372);  // Missing
  }

  if (agreement.damageInChip === true) {
    drawCheckmark(538, 372);  // Chip
  }

  // Damage In Notes (short version)
  if (agreement.damageInNotes) {
    const shortNotes = agreement.damageInNotes.substring(0, 60);
    firstPage.drawText(shortNotes, {
      x: 360,
      y: 415,
      size: 8,
      font: font,
    });
  }

  // Start Date
  if (startDate.day) {
    firstPage.drawText(startDate.day, { x: 94, y: 300, size: 10, font: font });
    firstPage.drawText(startDate.month, { x: 116, y: 300, size: 10, font: font });
    firstPage.drawText(startDate.year, { x: 140, y: 300, size: 10, font: font });
  }

  // End Date
  if (endDate.day) {
    firstPage.drawText(endDate.day, { x: 405, y: 300, size: 10, font: font });
    firstPage.drawText(endDate.month, { x: 427, y: 300, size: 10, font: font });
    firstPage.drawText(endDate.year, { x: 450, y: 300, size: 10, font: font });
  }

  if (dateIn.day) {
    firstPage.drawText(dateIn.day, { x: 242, y: 300, size: 10, font: font });
    firstPage.drawText(dateIn.month, { x: 265, y: 300, size: 10, font: font });
    firstPage.drawText(dateIn.year, { x: 288, y: 300, size: 10, font: font });
  }

  // ============================================
  // SIGNATURE SECTION - BOTH SIGNATURES
  // ============================================

  // FIRST SIGNATURE (LEFT SIDE)
  // Signature Name - Left
  if (agreement.signedByName) {
    firstPage.drawText(agreement.signedByName, {
      x: 99,
      y: 102,
      size: 10,
      font: font,
    });
  } else if (agreement.driver?.name) {
    firstPage.drawText(agreement.driver.name, {
      x: 99,
      y: 102,
      size: 10,
      font: font,
    });
  }

  // Date for first signature
  if (startDate.day) {
    firstPage.drawText(startDate.day, { x: 213, y: 75, size: 10, font: font });
    firstPage.drawText(startDate.month, { x: 238, y: 75, size: 10, font: font });
    firstPage.drawText(startDate.year, { x: 260, y: 75, size: 10, font: font });
  }

  // SECOND SIGNATURE (RIGHT SIDE)
  // Signature Name - Right
  if (agreement.signedByName) {
    firstPage.drawText(agreement.signedByName, {
      x: 369,
      y: 102,
      size: 10,
      font: font,
    });
  } else if (agreement.driver?.name) {
    firstPage.drawText(agreement.driver.name, {
      x: 369,
      y: 102,
      size: 10,
      font: font,
    });
  }

  // Date for second signature
  if (startDate.day) {
    firstPage.drawText(startDate.day, { x: 473, y: 75, size: 10, font: font });
    firstPage.drawText(startDate.month, { x: 498, y: 75, size: 10, font: font });
    firstPage.drawText(startDate.year, { x: 520, y: 75, size: 10, font: font });
  }

  if (dateIn.day) {
    firstPage.drawText(dateIn.day, { x: 213, y: 45, size: 10, font: font });
    firstPage.drawText(dateIn.month, { x: 238, y: 45, size: 10, font: font });
    firstPage.drawText(dateIn.year, { x: 260, y: 45, size: 10, font: font });
  }

  if (dateIn.day) {
    firstPage.drawText(dateIn.day, { x: 473, y: 45, size: 10, font: font });
    firstPage.drawText(dateIn.month, { x: 498, y: 45, size: 10, font: font });
    firstPage.drawText(dateIn.year, { x: 520, y: 45, size: 10, font: font });
  }

  // Process and embed BOTH signatures - RESTORED YOUR ORIGINAL TRANSPARENCY CODE

  

  if (agreement.signatureData) {
    try {
      // Extract base64 data.
      // Some older records stored the mobile signature pad's raw SVG data-uri
      // (data:image/svg+xml,<urlencoded xml>) instead of a base64 raster image.
      // sharp() can rasterize SVG markup directly, so detect that case and feed
      // it the decoded SVG text instead of trying to base64-decode it.
      let imageBytes: Buffer;
      if (agreement.signatureData.startsWith('data:image/svg+xml')) {
        const encoded = agreement.signatureData.replace(/^data:image\/svg\+xml,?/, '');
        const svgXml = decodeURIComponent(encoded);
        imageBytes = Buffer.from(svgXml);
      } else {
        const base64Data = agreement.signatureData.replace(/^data:image\/\w+;base64,/, '');
        imageBytes = Buffer.from(base64Data, 'base64');
      }

      // Save original for debugging
      const debugDir = path.join(process.cwd(), "debug_signatures");
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      fs.writeFileSync(path.join(debugDir, `original_${agreement.id}.png`), imageBytes);

      // Get image metadata
      const metadata = await sharp(imageBytes).metadata();

      // Process the image to extract dark pixels (the signature) - YOUR ORIGINAL CODE
      const processed = await sharp(imageBytes)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = processed;
      const { width, height } = info;

      // Create a new buffer for the transparent version
      const transparentData = Buffer.alloc(width * height * 4);

      // Process each pixel
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * info.channels;
          const transparentIdx = (y * width + x) * 4;

          // Get pixel values
          let r = data[idx];
          let g = data[idx + 1];
          let b = data[idx + 2];
          let a = info.channels === 4 ? data[idx + 3] : 255;

          // Calculate brightness
          const brightness = (r + g + b) / 3;

          // If pixel is dark (likely part of signature), keep it
          if (brightness < 100) {
            transparentData[transparentIdx] = 0;
            transparentData[transparentIdx + 1] = 0;
            transparentData[transparentIdx + 2] = 0;
            transparentData[transparentIdx + 3] = 255 - brightness;
          } else {
            // This is background - make it fully transparent
            transparentData[transparentIdx] = 0;
            transparentData[transparentIdx + 1] = 0;
            transparentData[transparentIdx + 2] = 0;
            transparentData[transparentIdx + 3] = 0;
          }
        }
      }

      // Create the transparent PNG
      const transparentImage = await sharp(transparentData, {
        raw: {
          width: width,
          height: height,
          channels: 4
        }
      })
        .png()
        .toBuffer();

      // Save processed version for debugging
      fs.writeFileSync(path.join(debugDir, `transparent_${agreement.id}.png`), transparentImage);
      // Embed the transparent image
      const image = await pdfDoc.embedPng(transparentImage);

      // FIRST SIGNATURE POSITION (LEFT SIDE)
      firstPage.drawImage(image, {
        x: 67,
        y: 60,
        width: 120,
        height: 40,
      });

      // SECOND SIGNATURE POSITION (RIGHT SIDE)
      firstPage.drawImage(image, {
        x: 330,  // Different X position for right side
        y: 60,   // Same Y position
        width: 120,
        height: 40,
      });

      // ADD TWO MORE SIGNATURES SLIGHTLY BELOW
      // THIRD SIGNATURE POSITION (LEFT SIDE - BELOW)
      if (agreement.dateIn) {
        
        firstPage.drawImage(image, {
          x: 67,
          y:30,  // 40 pixels below the first signature
          width: 120,
          height: 40,
        });
        
        // FOURTH SIGNATURE POSITION (RIGHT SIDE - BELOW)
        firstPage.drawImage(image, {
          x: 330,
          y: 30,  // 40 pixels below the second signature
          width: 120,
          height: 40,
        });
      }

    } catch (signatureError) {
      console.error('Error creating transparent signature:', signatureError);

      // Fallback: Try a simpler approach
      try {
        let imageBytes: Buffer;
        if (agreement.signatureData.startsWith('data:image/svg+xml')) {
          const encoded = agreement.signatureData.replace(/^data:image\/svg\+xml,?/, '');
          const svgXml = decodeURIComponent(encoded);
          imageBytes = Buffer.from(svgXml);
        } else {
          const base64Data = agreement.signatureData.replace(/^data:image\/\w+;base64,/, '');
          imageBytes = Buffer.from(base64Data, 'base64');
        }

        // Simple white background removal
        const fallbackImage = await sharp(imageBytes)
          .ensureAlpha()
          .extractChannel('red')
          .negate()
          .png()
          .toBuffer();

        const image = await pdfDoc.embedPng(fallbackImage);

        // First signature position (left side)
        firstPage.drawImage(image, {
          x: 81,
          y: 53,
          width: 120,
          height: 40,
        });

        // Second signature position (right side)
        firstPage.drawImage(image, {
          x: 351,
          y: 53,
          width: 120,
          height: 40,
        });

        // ADD TWO MORE SIGNATURES SLIGHTLY BELOW
        // Third signature position (left side - below)
        
        firstPage.drawImage(image, {
          x: 81,
          y: 13,  // 40 pixels below the first signature
          width: 120,
          height: 40,
        });

        // Fourth signature position (right side - below)
        firstPage.drawImage(image, {
          x: 351,
          y: 13,  // 40 pixels below the second signature
          width: 120,
          height: 40,
        });

      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);

        // Last resort: Draw text signatures
        firstPage.drawText('X ____________________', {
          x: 81,
          y: 71,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });

        firstPage.drawText('X ____________________', {
          x: 351,
          y: 71,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });

        // ADD TWO MORE TEXT SIGNATURES SLIGHTLY BELOW
        firstPage.drawText('X ____________________', {
          x: 81,
          y: 31,  // 40 pixels below the first text signature
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });

        firstPage.drawText('X ____________________', {
          x: 351,
          y: 31,  // 40 pixels below the second text signature
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  // ============================================
  // SECURITY FEATURES
  // ============================================

  // Add security page
  const securityPage = pdfDoc.addPage();
  const { width, height } = securityPage.getSize();

  securityPage.drawText('SECURITY PAGE', {
    x: 50,
    y: height - 100,
    size: 24,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  securityPage.drawText('This is a certified copy of the original agreement.', {
    x: 50,
    y: height - 150,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });

  securityPage.drawText('Any alterations to this document are illegal and invalid.', {
    x: 50,
    y: height - 180,
    size: 12,
    font: font,
    color: rgb(0.8, 0, 0),
  });

  // Save the filled PDF
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempPath = path.join(tempDir, `temp_${agreement.id}_${Date.now()}.pdf`);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(tempPath, pdfBytes);

  return tempPath;
}

async function addSecurityFeatures(
  inputPath: string,
  outputPath: string,
  agreement: AgreementData
): Promise<void> {
  try {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Add metadata
    pdfDoc.setTitle(`SECURED - Hire Agreement - ${agreement.driver?.name || 'Unknown'}`);
    pdfDoc.setAuthor('RS Private Hire Ltd');
    pdfDoc.setSubject('Legal Hire Agreement - Secured Copy');
    pdfDoc.setKeywords(['secured', 'non-editable', 'hire', 'agreement', 'contract']);
    pdfDoc.setProducer('RS Private Hire Secure PDF Generator');
    pdfDoc.setCreator('RS Private Hire Agreement System');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    const securedBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, securedBytes);

  } catch (error) {
    console.error('Error adding security features:', error);
    fs.copyFileSync(inputPath, outputPath);
  }
}

export async function createReadOnlyPDF(
  agreement: AgreementData,
  outputPath: string
): Promise<string> {
  try {
    const filledPath = await createFilledPDF(agreement);
    const pdfDoc = await PDFDocument.load(fs.readFileSync(filledPath));

    try {
      const form = pdfDoc.getForm();
      if (form.getFields().length > 0) {
        form.flatten();
      }
    } catch (e) {
      // No form fields to flatten
    }

    const pages = pdfDoc.getPages();
    pages.forEach((page, index) => {
      const { width, height } = page.getSize();

      page.drawRectangle({
        x: 10,
        y: 10,
        width: width - 20,
        height: height - 20,
        borderWidth: 1,
        borderColor: rgb(0.8, 0, 0),
        borderOpacity: 0.5,
      });
    });

    const finalBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, finalBytes);
    fs.unlinkSync(filledPath);

    return outputPath;

  } catch (error) {
    console.error('Error creating read-only PDF:', error);
    throw error;
  }
}