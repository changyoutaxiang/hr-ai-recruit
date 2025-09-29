const fetch = require('node-fetch');

async function testUserAPI() {
  try {
    const response = await fetch('http://localhost:5001/api/users/f7f8257a-1517-4d49-8085-cec88deba91b');
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    const text = await response.text();
    console.log('Response:', text.substring(0, 200));
  } catch (error) {
    console.error('Error:', error);
  }
}

testUserAPI();
