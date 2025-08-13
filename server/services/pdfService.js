const PDFDocument = require('pdfkit');
const axios = require('axios');
const dns = require('dns').promises; 
const ipaddr = require('ipaddr.js'); // Use a library for robust IP address handling
const logger = require('../utils/logger');


function isPublicIp(ip) {
  if (!ip) return false;
  try {
    const addr = ipaddr.parse(ip);
    return addr.range() !== 'unspecified' && addr.range() !== 'private' && addr.range() !== 'loopback' && addr.range() !== 'reserved';
  } catch (e) {
    return false;
  }
}

async function fetchImage(url) {
  if (!url) return null;

  try {
    const { hostname } = new URL(url);

    const { address } = await dns.lookup(hostname);

    if (!isPublicIp(address)) {
      logger.warn(`SSRF attempt blocked for non-public IP ${address} from URL: ${url}`);
      return null;
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 5000 
    });
    return response.data;

  } catch (error) {
    logger.error(`Failed to fetch or validate image for PDF: ${url}`, { error: error.message });
    return null;
  }
}

function generateTripPdf(trip) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // --- PDF Content ---

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text(`Your Trip to ${trip.destination}`, { align: 'center' });
        doc.moveDown(2);

        if (trip.coverImage) {
            const imageBuffer = await fetchImage(trip.coverImage);
            if (imageBuffer) {
                doc.image(imageBuffer, { fit: [500, 200], align: 'center', valign: 'center' });
                doc.moveDown(2);
            }
        }

      doc.fontSize(16).font('Helvetica-Bold').text('Trip Overview');
      doc.moveDown();
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Dates: ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`)
        .text(`Travelers: ${trip.travelers}`)
        .text(`Estimated Budget: ${trip.budget?.currency || '₹'} ${trip.budget.total.toLocaleString('en-IN')}`);
      doc.moveDown(2);

      doc.fontSize(16).font('Helvetica-Bold').text('Your Itinerary');
      doc.moveDown();

      trip.itinerary.forEach(day => {
        doc.fontSize(14).font('Helvetica-Bold').text(`Day ${day.day}: ${day.title}`);
        doc.fontSize(11).font('Helvetica').list(day.activities, { bulletRadius: 2 });
        doc.moveDown();
      });

      if (trip.tips && trip.tips.length > 0) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Travel Tips');
        doc.moveDown();
        doc.fontSize(11).font('Helvetica').list(trip.tips, { bulletRadius: 2 });
        doc.moveDown(2);
      }

      if (trip.mustEats && trip.mustEats.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('Must-Try Foods');
        doc.moveDown();
        doc.fontSize(11).font('Helvetica').list(trip.mustEats, { bulletRadius: 2 });
      }

        doc.end();
      } catch (error) {
          logger.error('Failed to generate PDF document', { error: error.message, stack: error.stack });
          reject(error); 
      }
    });
  }

module.exports = { generateTripPdf };

