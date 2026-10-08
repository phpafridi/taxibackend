import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import sharp from 'sharp';

// Define Simple Insurance Data interface
export interface SimpleInsuranceData {
  id: number;

  // Vehicle details
  vehicleMake: string;
  vehicleModel: string;
  registration: string;

  // Driver details
  driverName: string;
  driverLicenseNumber: string;
  driverAddress: string;

  // Dates
  hireStartDate: string;
  hireEndDate: string;

  // Signature
  signatureData?: string | null;
  signedByName?: string | null;

  insuranceNumber?: string;
  // Issue date
  issueDate?: string;
}

export async function createInsurancePDF(
  data: SimpleInsuranceData,
  outputPath: string
): Promise<string> {
  try {

    const filledPdfPath = await fillInsurancePDF(data);
    await addInsuranceSecurityFeatures(filledPdfPath, outputPath, data);
    fs.unlinkSync(filledPdfPath);


    return outputPath;

  } catch (error) {
    throw error;
  }
}

export async function createInsuranceReadOnlyPDF(
  data: SimpleInsuranceData,
  outputPath: string
): Promise<string> {
  try {
    
    const filledPdfPath = await fillInsurancePDF(data);
    const pdfDoc = await PDFDocument.load(fs.readFileSync(filledPdfPath));

    // Embed font BEFORE the forEach loop
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add security features
    await addInsuranceSecurityFeatures(filledPdfPath, outputPath, data);

    // Add red border and watermark for read-only
    const pages = pdfDoc.getPages();

    // FIXED: Removed async/await from forEach loop
    pages.forEach((page, index) => {
      const { width, height } = page.getSize();

      // Add red border
      page.drawRectangle({
        x: 10,
        y: 10,
        width: width - 20,
        height: height - 20,
        borderWidth: 2,
        borderColor: rgb(0.8, 0, 0),
        borderOpacity: 0.5,
      });

      // Add "READ ONLY - DO NOT EDIT" watermark
      // Using the already embedded font
      page.drawText('READ ONLY - DO NOT EDIT', {
        x: width / 2 - 100,
        y: 30,
        size: 10,
        font: font,
        color: rgb(0.8, 0, 0),
      });
    });

    const finalBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, finalBytes);
    fs.unlinkSync(filledPdfPath);

    return outputPath;

  } catch (error) {
    console.error('Error creating read-only insurance PDF:', error);
    throw error;
  }
}

async function fillInsurancePDF(data: SimpleInsuranceData): Promise<string> {
  // Load template
  const templatePath = path.join(process.cwd(), "public", "templates", "TRADEX_FORM.pdf");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Insurance template not found: ${templatePath}`);
  }

  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const secondPage = pages[1] || firstPage;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper to format dates into separate day/month/year
  const formatDateParts = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { day: '', month: '', year: '' };

      return {
        day: date.getDate().toString(),
        month: (date.getMonth() + 1).toString(),
        year: date.getFullYear().toString()
      };
    } catch {
      return { day: '', month: '', year: '' };
    }
  };

  // Format dates
  const hireStartDate = formatDateParts(data.hireStartDate);
  const hireEndDate = formatDateParts(data.hireEndDate);

  // Use provided issue date or current date
  const issueDate = data.issueDate ? formatDateParts(data.issueDate) : formatDateParts(new Date().toISOString());

  // ============================================
  // FILL PAGE 1 - ALL FIELDS
  // ============================================

  // Issue Date (top right corner) - agreement created date
  firstPage.drawText(issueDate.day, {
    x: 475,
    y: 732,
    size: 10,
    font: font,
  });

  firstPage.drawText(issueDate.month, {
    x: 494,
    y: 732,
    size: 10,
    font: font,
  });

  firstPage.drawText(issueDate.year, {
    x: 514,
    y: 732,
    size: 10,
    font: font,
  });

  // Hire Start Date
  firstPage.drawText(hireStartDate.day, {
    x: 392,
    y: 515,
    size: 10,
    font: font,
  });

  firstPage.drawText(hireStartDate.month, {
    x: 417,
    y: 515,
    size: 10,
    font: font,
  });

  firstPage.drawText(hireStartDate.year, {
    x: 438,
    y: 515,
    size: 10,
    font: font,
  });

  // Hire End Date
  firstPage.drawText(hireEndDate.day, {
    x: 392,
    y: 486,
    size: 10,
    font: font,
  });

  firstPage.drawText(hireEndDate.month, {
    x: 417,
    y: 486,
    size: 10,
    font: font,
  });

  firstPage.drawText(hireEndDate.year, {
    x: 438,
    y: 486,
    size: 10,
    font: font,
  });

  // 1. Vehicle Make & Model
  const vehicleText = `${data.vehicleMake} ${data.vehicleModel}`.trim();
  firstPage.drawText(vehicleText, {
    x: 427, // Adjust based on your template - X position for Vehicle field
    y: 570, // Adjust based on your template - Y position for Vehicle field
    size: 10,
    font: font,
  });

  firstPage.drawText(data.registration, {
    x: 150, // Adjust based on your template - X position for Vehicle field
    y: 570, // Adjust based on your template - Y position for Vehicle field
    size: 10,
    font: font,
  });

  // 2. Driver Name
  firstPage.drawText(data.driverName, {
    x: 150, // Adjust based on your template - X position for Driver Name field
    y: 543, // Adjust based on your template - Y position for Driver Name field
    size: 10,
    font: font,
  });

  // 3. Driving License Number
  firstPage.drawText(data.driverLicenseNumber, {
    x: 430, // Adjust based on your template - X position for License Number field
    y: 543, // Adjust based on your template - Y position for License Number field
    size: 10,
    font: font,
  });

  // 4. Address
  firstPage.drawText(data.driverAddress, {
    x: 98, // Adjust based on your template - X position for Address field
    y: 515, // Adjust based on your template - Y position for Address field
    size: 9, // Slightly smaller for address text
    font: font,
    maxWidth: 250, // Limit width to prevent overflow
  });

  // Print Name
  if (data.signedByName) {
    firstPage.drawText(data.signedByName, {
      x: 134, // Adjust based on your template - X position for Driver Name field
      y: 417, // Adjust based on your template - Y position for Driver Name field
      size: 10,
      font: font,
    });
  }

  // ============================================
  // FILL PAGE 2 - ALL SAME FIELDS (DUPLICATE DATA)
  // ============================================

  // Only fill Page 2 if it exists in the template
  if (secondPage && secondPage !== firstPage) {
    // Issue Date on Page 2 (top right corner) - agreement created date
    secondPage.drawText(issueDate.day, {
      x: 473,
      y: 733,
      size: 10,
      font: font,
    });

    secondPage.drawText(issueDate.month, {
      x: 493,
      y: 733,
      size: 10,
      font: font,
    });

    secondPage.drawText(issueDate.year, {
      x: 514,
      y: 733,
      size: 10,
      font: font,
    });

    // Hire Start Date on Page 2
    secondPage.drawText(hireStartDate.day, {
      x: 392,
      y: 459,
      size: 10,
      font: font,
    });

    secondPage.drawText(hireStartDate.month, {
      x: 416,
      y: 459,
      size: 10,
      font: font,
    });

    secondPage.drawText(hireStartDate.year, {
      x: 438,
      y: 459,
      size: 10,
      font: font,
    });

    // Hire End Date on Page 2
    secondPage.drawText(hireEndDate.day, {
      x: 392,
      y: 431,
      size: 10,
      font: font,
    });

    secondPage.drawText(hireEndDate.month, {
      x: 416,
      y: 431,
      size: 10,
      font: font,
    });

    secondPage.drawText(hireEndDate.year, {
      x: 439,
      y: 431,
      size: 10,
      font: font,
    });

    // 1. Vehicle Make & Model on Page 2
    secondPage.drawText(vehicleText, {
      x: 427,
      y: 517,
      size: 10,
      font: font,
    });

    if (data.insuranceNumber) {
      secondPage.drawText(data.insuranceNumber, {
        x: 257,
        y: 615,
        size: 10,
        font: font,
      });
    }

    secondPage.drawText(data.registration, {
      x: 150,
      y: 517,
      size: 10,
      font: font,
    });

    // // 2. Driver Name on Page 2
    secondPage.drawText(data.driverName, {
      x: 150,
      y: 488,
      size: 10,
      font: font,
    });

    // // 3. Driving License Number on Page 2
    secondPage.drawText(data.driverLicenseNumber, {
      x: 430,
      y: 490,
      size: 10,
      font: font,
    });

    // // 4. Address on Page 2
    secondPage.drawText(data.driverAddress, {
      x: 99,
      y: 460,
      size: 9,
      font: font,
      maxWidth: 250,
    });

    // // Print Name on Page 2
    if (data.signedByName) {
      secondPage.drawText(data.signedByName, {
        x: 140,
        y: 362,
        size: 10,
        font: font,
      });
    }
  }

  // ============================================
  // SIGNATURE SECTION - TWO SIGNATURES ON TWO PAGES
  // ============================================

if (data.signatureData) {
    try {
      
      // Extract base64 data
      const base64Data = data.signatureData.replace(/^data:image\/\w+;base64,/, '');
      const imageBytes = Buffer.from(base64Data, 'base64');
      
      // Save original for debugging
      const debugDir = path.join(process.cwd(), "debug_signatures");
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      fs.writeFileSync(path.join(debugDir, `insurance_original_${data.id}.png`), imageBytes);
      
      // Get image metadata
      const metadata = await sharp(imageBytes).metadata();
      
      // Process the image to extract dark pixels (the signature)
      const processed = await sharp(imageBytes)
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const { data: pixelData, info } = processed;
      const { width, height } = info;
      
      
      // Create a new buffer for the transparent version
      const transparentData = Buffer.alloc(width * height * 4);
      
      // Process each pixel
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * info.channels;
          const transparentIdx = (y * width + x) * 4;
          
          // Get pixel values
          let r = pixelData[idx];
          let g = pixelData[idx + 1];
          let b = pixelData[idx + 2];
          let a = info.channels === 4 ? pixelData[idx + 3] : 255;
          
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
      fs.writeFileSync(path.join(debugDir, `insurance_transparent_${data.id}.png`), transparentImage);
     
      // Embed the transparent image
      const image = await pdfDoc.embedPng(transparentImage);
      
      // FIRST SIGNATURE POSITION (Page 1)
      firstPage.drawImage(image, {
        x: 110,
        y: 376,
        width: 130,
        height: 45,
      });
      
      // SECOND SIGNATURE POSITION (Page 2)
      if (secondPage && secondPage !== firstPage) {
        // Embed on Page 2
        secondPage.drawImage(image, {
          x: 104,
          y: 321, // Same Y position as Page 1
          width: 130,
          height: 45,
        });
      } else {
        // If no second page exists, add the signature to Page 1 at a different position
        firstPage.drawImage(image, {
          x: 404,
          y: 358,
          width: 130,
          height: 45,
        });
      }

      
    } catch (signatureError) {
      
      
      
      
      // Fallback: Try a simpler approach
      try {
        const base64Data = data.signatureData!.replace(/^data:image\/\w+;base64,/, '');
        const imageBytes = Buffer.from(base64Data, 'base64');
        
        // Simple white background removal
        const fallbackImage = await sharp(imageBytes)
          .ensureAlpha()
          .extractChannel('red')
          .negate()
          .png()
          .toBuffer();
        
        const image = await pdfDoc.embedPng(fallbackImage);
        
        // Embed FIRST fallback signature (Page 1)
        firstPage.drawImage(image, {
          x: 104,
          y: 358,
          width: 130,
          height: 45,
        });
        
        // Embed SECOND fallback signature (Page 2)
        if (secondPage && secondPage !== firstPage) {
          secondPage.drawImage(image, {
            x: 104,
            y: 358,
            width: 130,
            height: 45,
          });
        } else {
          firstPage.drawImage(image, {
            x: 404,
            y: 358,
            width: 130,
            height: 45,
          });
        }
        
        
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        
        // Last resort: Draw text signatures
        // First signature (Page 1)
        firstPage.drawText('X ____________________', {
          x: 104,
          y: 385,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        // Second signature (Page 2)
        if (secondPage && secondPage !== firstPage) {
          secondPage.drawText('X ____________________', {
            x: 104,
            y: 385,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
          });
        } else {
          firstPage.drawText('X ____________________', {
            x: 404,
            y: 385,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
          });
        }
        
       
      }
    }
  }
  

  // Save the filled PDF
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempPath = path.join(tempDir, `insurance_temp_${data.id}_${Date.now()}.pdf`);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(tempPath, pdfBytes);

  return tempPath;
}

async function addInsuranceSecurityFeatures(
  inputPath: string,
  outputPath: string,
  data: SimpleInsuranceData
): Promise<void> {
  try {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Add metadata
    pdfDoc.setTitle(`Insurance Certificate - ${data.driverName}`);
    pdfDoc.setAuthor('RS Car Rentals Ltd');
    pdfDoc.setSubject('Insurance Certificate for Private Hire');
    pdfDoc.setKeywords(['insurance', 'certificate', 'private hire', 'uber', 'authorization']);
    pdfDoc.setProducer('RS Car Rentals Insurance System');
    pdfDoc.setCreator('RS Car Rentals Ltd');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    // Add footer to all pages
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // FIXED: Using for...of instead of forEach with async/await
    for (const page of pages) {
      const { width, height } = page.getSize();

      // Add footer text
      page.drawText(`Certificate ID: ${data.id} - RS Car Rentals Ltd - 07984650186`, {
        x: 50,
        y: 30,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });

      page.drawText(`Generated: ${new Date().toLocaleDateString()} - Valid with Original Signature`, {
        x: width - 300,
        y: 30,
        size: 8,
        font: font,
        color: rgb(0.8, 0, 0),
      });
    }

    const securedBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, securedBytes);

    
  } catch (error) {
    
    fs.copyFileSync(inputPath, outputPath);
    
  }
}