import fs from 'fs';

async function test() {
  const cloudName = 'dih0ch67r';
  const uploadPreset = 'ml_default';
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const formData = new FormData();
  // Create a dummy text file blob
  const blob = new Blob(['hello world'], { type: 'text/plain' });
  formData.append('file', blob, 'test.txt');
  formData.append('upload_preset', uploadPreset);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
