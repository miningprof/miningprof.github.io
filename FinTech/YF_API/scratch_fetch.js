const https = require('https');

https.get('https://arpan-amp.duckdns.org/api/v1/market-data/AAPL?period=1mo&interval=1d', {
  headers: {
    'X-API-Key': 'demo-key'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data.substring(0, 500));
  });
}).on('error', err => {
  console.log("Error: " + err.message);
});
