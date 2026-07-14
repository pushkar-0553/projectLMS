require('dotenv').config();
const cloudinary = require('../config/cloudinary');

async function testPdfImageUpload() {
  console.log('Testing PDF Upload as IMAGE to Cloudinary...');
  
  try {
    const mockPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Hello World PDF Image) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000282 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n377\n%%EOF');

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // When resource_type = image, the public ID must NOT end with .pdf in public_id parameter,
    // but the final delivery URL will have the extension .pdf appended!
    const publicId = `resume-${uniqueSuffix}`;

    console.log('Uploading with options:');
    console.log('- folder: resume-hub/student-resumes');
    console.log('- public_id:', publicId);
    console.log('- resource_type: image');

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: 'resume-hub/student-resumes',
        public_id: publicId,
        resource_type: 'image',
        format: 'pdf' // Enforce PDF format
      }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });

      const { Readable } = require('stream');
      const readableStream = new Readable();
      readableStream._read = () => {};
      readableStream.push(mockPdfBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });

    console.log('\n✅ Upload Successful!');
    console.log('- Secure URL:', uploadResult.secure_url);
    console.log('- Public ID:', uploadResult.public_id);
    console.log('- Full API response:', JSON.stringify(uploadResult, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('\n❌ PDF Image Upload Test Failed:');
    console.error(err);
    process.exit(1);
  }
}

testPdfImageUpload();
