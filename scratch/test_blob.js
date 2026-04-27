const { put } = require('@vercel/blob');

const token = 'vercel_blob_rw_lXyaIK4FQ80D09N9_Uoazy0AVxJBQltNzjlqX8Wse1QeJyS';

async function test() {
  try {
    const { url } = await put('articles/blob.txt', 'Hello World (New Token)!', { 
      access: 'public',
      token: token
    });
    console.log('Upload successful! URL:', url);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}

test();
