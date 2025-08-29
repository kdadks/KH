import { jsPDF } from 'jspdf';

/**
 * Convert image to base64 data URL with optimization for PDF while preserving quality
 */
const imageToBase64 = (imagePath: string, quality: number = 0.85, maxWidth: number = 300): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Calculate scaled dimensions to maintain quality while reducing file size
      let { width, height } = img;
      if (width > maxWidth) {
        const scale = maxWidth / width;
        width = maxWidth;
        height = height * scale;
      }
      
      // Set canvas size to scaled dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Enable smooth scaling for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // For logos, we want to preserve transparency and avoid background colors
      // Check if image has transparency
      const hasTransparency = imagePath.toLowerCase().includes('logo');
      
      if (hasTransparency) {
        // For logos with transparency, use PNG to preserve transparency
        ctx.drawImage(img, 0, 0, width, height);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } else {
        // For other images, fill with white background and use JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataURL = canvas.toDataURL('image/jpeg', quality);
        resolve(dataURL);
      }
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };
    
    img.src = imagePath;
  });
};

/**
 * Add company logos to PDF header
 */
export const addCompanyLogos = async (doc: jsPDF, x: number = 14, y: number = 10) => {
  let invoiceLogoLoaded = false;
  
  try {
    // Try to load and add Invoice Logo.png with reasonable dimensions for PDF header
    try {
      const invoiceLogoBase64 = await imageToBase64('/Invoice Logo.png', 0.9, 300); // High quality
      
      // Set reasonable dimensions for PDF header: 50x50 pixels (much smaller than 200x200)
      const logoWidth = 50;
      const logoHeight = 50;
      
      // Add logo at top left position with appropriate 50x50px dimensions
      doc.addImage(invoiceLogoBase64, 'PNG', x, y, logoWidth, logoHeight);
      invoiceLogoLoaded = true;    } catch (invoiceLogoError) {
      console.warn('❌ Could not load Invoice Logo.png:', invoiceLogoError);
    }
    
    // Only add text fallback if Invoice Logo failed to load
    if (!invoiceLogoLoaded) {      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('KH Therapy', x, y + 22);
    }
    
  } catch (error) {
    console.error('❌ Error adding company logo:', error);
    // Fallback to text only if there's a general error
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('KH Therapy', x, y + 22);
  }
};

/**
 * Add IAPT logo to PDF footer with original dimensions and thank you text
 */
export const addIAPTLogo = async (doc: jsPDF, y: number = 250) => {
  let logoLoaded = false;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const bottomMargin = 15;
  
  try {
    // Try to load IAPT logo with high quality
    const logoBase64 = await imageToBase64('/IAPT Logo.png', 0.9, 150); // Higher quality and size
    
    // Get actual image dimensions for proper sizing
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to get image dimensions'));
      img.src = '/IAPT Logo.png';
    });
    
    // Calculate scaling factor to maintain aspect ratio with size limits
    const maxWidth = 50; // Reasonable max width
    const maxHeight = 25; // Reasonable max height
    
    let logoWidth = img.width;
    let logoHeight = img.height;
    
    // Only scale down if image is too large, preserve original dimensions otherwise
    if (logoWidth > maxWidth || logoHeight > maxHeight) {
      const scaleX = maxWidth / logoWidth;
      const scaleY = maxHeight / logoHeight;
      const scale = Math.min(scaleX, scaleY);
      
      logoWidth = logoWidth * scale;
      logoHeight = logoHeight * scale;
    }
    
    // Calculate positioning to ensure both logo and text fit
    const textHeight = 12; // Height for thank you text + margin
    const spacing = 8; // Space between logo and text
    const totalFooterHeight = logoHeight + spacing + textHeight;
    
    // If Y position is explicitly provided (not default), respect it, otherwise use safe positioning
    let finalLogoY;
    if (y !== 250) {
      // Explicit positioning provided - respect it with minimal safety margin
      const minSafetyMargin = 5; // Just 5px to prevent going off page
      finalLogoY = Math.min(y, pageHeight - logoHeight - minSafetyMargin);
    } else {
      // Default positioning - use safe calculation
      const maxLogoY = pageHeight - bottomMargin - totalFooterHeight;
      finalLogoY = Math.min(y, maxLogoY);
    }
    
    // Center the logo horizontally
    const centeredX = (pageWidth - logoWidth) / 2;
    
    // Add the logo with PNG format to preserve transparency
    doc.addImage(logoBase64, 'PNG', centeredX, finalLogoY, logoWidth, logoHeight);
    logoLoaded = true;    
    // Always add "Thank you for your business" text below the logo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); // Ensure black color
    const thankYouText = 'Thank you for your business';
    const textWidth = doc.getTextWidth(thankYouText);
    const textX = (pageWidth - textWidth) / 2;
    const textY = finalLogoY + logoHeight + spacing;
    
    // More flexible text positioning for explicit Y positions
    const textBoundary = y !== 250 ? pageHeight - 5 : pageHeight - bottomMargin;
    
    // Add the text if it fits within bounds
    if (textY < textBoundary) {
      doc.text(thankYouText, textX, textY);    } else {
      console.warn('⚠️ Thank you text would exceed page bounds, skipping');
    }
    
  } catch (error) {
    console.warn('❌ Could not load IAPT Logo.png, using text fallback:', error);
    
    // Only show fallback if logo didn't load
    if (!logoLoaded) {      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Center the text fallback
      const fallbackText = 'IAPT Registered';
      const textWidth = doc.getTextWidth(fallbackText);
      const centeredX = (pageWidth - textWidth) / 2;
      doc.text(fallbackText, centeredX, y + 5);
      
      // Add thank you text even with fallback
      doc.setFontSize(10);
      const thankYouText = 'Thank you for your business';
      const thankYouTextWidth = doc.getTextWidth(thankYouText);
      const thankYouX = (pageWidth - thankYouTextWidth) / 2;
      doc.text(thankYouText, thankYouX, y + 20);    }
  }
};

/**
 * Calculate proper footer positioning to avoid content overlap
 */
export const calculateFooterPosition = (
  contentEndY: number, 
  pageHeight: number,
  footerHeight: number = 50
): number => {
  const minFooterY = contentEndY + 20;
  const maxFooterY = pageHeight - footerHeight;
  return Math.max(minFooterY, maxFooterY);
};

/**
 * Get PDF file size in KB and log warning if too large
 */
export const checkPDFSize = (doc: jsPDF) => {
  try {
    const pdfOutput = doc.output('blob');
    const sizeKB = Math.round(pdfOutput.size / 1024);
    const sizeMB = Math.round(sizeKB / 1024 * 100) / 100;
    
    if (sizeKB > 1024) {
      // PDF file size exceeds 1MB - consider optimization if needed
    }
    
    return { sizeKB, sizeMB };
  } catch (error) {
    console.error('Error checking PDF size:', error);
    return { sizeKB: 0, sizeMB: 0 };
  }
};

