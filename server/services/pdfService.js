const PDFDocument = require('pdfkit');
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Fetches an image from a URL and returns it as a buffer.
 * @param {string} url The URL of the image to fetch.
 * @returns {Promise<Buffer|null>} A buffer of the image data or null if fetching fails.
 */
async function fetchImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch image for PDF: ${url}`, { error: error.message });
    return null;
  }
}

/**
 * Generates a trip itinerary PDF from a trip object.
 * @param {object} trip The trip data object from the database.
 * @returns {Promise<Buffer>} A promise that resolves with the PDF data as a buffer.
 */
function generateTripPdf(trip) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);

    // --- PDF Content ---

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(`Your Trip to ${trip.destination}`, { align: 'center' });
    doc.moveDown(2);

    // Cover Image
    if (trip.coverImage) {
      const imageBuffer = await fetchImage(trip.coverImage);
      if (imageBuffer) {
        doc.image(imageBuffer, {
          fit: [500, 200],
          align: 'center',
          valign: 'center'
        });
        doc.moveDown(2);
      }
    }

    // Trip Details Section
    doc.fontSize(16).font('Helvetica-Bold').text('Trip Overview');
    doc.moveDown();
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Dates: ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`)
      .text(`Travelers: ${trip.travelers}`)
      .text(`Estimated Budget: ₹${trip.budget.total.toLocaleString('en-IN')}`);
    doc.moveDown(2);

    // Itinerary Section
    doc.fontSize(16).font('Helvetica-Bold').text('Your Itinerary');
    doc.moveDown();

    trip.itinerary.forEach(day => {
      doc.fontSize(14).font('Helvetica-Bold').text(`Day ${day.day}: ${day.title}`);
      doc.fontSize(11).font('Helvetica').list(day.activities, { bulletRadius: 2 });
      doc.moveDown();
    });

    // Tips Section
    if (trip.tips && trip.tips.length > 0) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Travel Tips');
        doc.moveDown();
        doc.fontSize(11).font('Helvetica').list(trip.tips, { bulletRadius: 2 });
        doc.moveDown(2);
    }
    
    // Must-Eats Section
    if (trip.mustEats && trip.mustEats.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('Must-Try Foods');
        doc.moveDown();
        doc.fontSize(11).font('Helvetica').list(trip.mustEats, { bulletRadius: 2 });
    }

    // Finalize the PDF and end the stream
    doc.end();
  });
}

module.exports = { generateTripPdf };
