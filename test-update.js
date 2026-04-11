const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tokens = JSON.parse(data);
    
    // Now call patch
    const patchOpt = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/v1/owner/settings/shop?shopId=mock',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`
      }
    };
    
    const patchReq = http.request(patchOpt, res2 => {
      console.log('STATUS:', res2.statusCode);
      res2.on('data', d => process.stdout.write(d));
    });
    patchReq.end(JSON.stringify({ name: "Updated Name" }));
  });
});

req.write(JSON.stringify({ email: "owner@example.com", password: "password123" }));
// Use a test owner if we know one, else we'll just check if the code runs
req.end();
