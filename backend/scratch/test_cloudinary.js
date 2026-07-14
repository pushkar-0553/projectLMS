require('dotenv').config();
const cloudinary = require('../config/cloudinary');

async function testCloudinary() {
  console.log('Testing Cloudinary Integration...');
  console.log('- Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('- API Key:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not Set');
  console.log('- API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not Set');

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('\n❌ Missing Cloudinary environment variables in .env');
    console.log('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET first.');
    process.exit(1);
  }

  try {
    console.log('\nUploading test raw buffer to Cloudinary...');
    const testBuffer = Buffer.from('Hello Cloudinary! Resume Hub integration test.');
    
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: 'resume-hub/test-uploads',
        public_id: 'test-file.txt',
        resource_type: 'raw'
      }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });

      const { Readable } = require('stream');
      const readableStream = new Readable();
      readableStream._read = () => {};
      readableStream.push(testBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });

    console.log('✅ Upload successful!');
    console.log('- Secure URL:', uploadResult.secure_url);
    console.log('- Public ID:', uploadResult.public_id);

    console.log('\nDeleting test file from Cloudinary...');
    const deleteResult = await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: 'raw' });
    console.log('✅ Delete successful! Result:', deleteResult);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Cloudinary Test Failed with error:');
    console.error(err);
    process.exit(1);
  }
}

testCloudinary();
