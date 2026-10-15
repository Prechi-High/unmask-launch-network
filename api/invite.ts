function h(v:any){
  return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

export default async function handler(req:any,res:any){
  if(req.method!=='GET') return res.status(405).end();

  const ref=String(req.query?.ref||'').trim();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'unmask-launch-network.vercel.app');
  const proto=String(req.headers['x-forwarded-proto']||'https');
  const origin=proto+'://'+host;
  const target=origin+'/?ref='+encodeURIComponent(ref);
  const image=origin+'/resources/unmask-logo.png';
  const canonical=origin+'/api/invite?ref='+encodeURIComponent(ref);

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=60, s-maxage=300');
  return res.status(200).send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Join the Unmaskers • Unmask</title>
  <meta name="description" content="Join the Unmask community and help reveal what products are really like before people buy.">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Unmask">
  <meta property="og:title" content="Join the Unmaskers">
  <meta property="og:description" content="We’re building Unmask together — a community that reveals what products are really like before people buy.">
  <meta property="og:image" content="${h(image)}">
  <meta property="og:image:secure_url" content="${h(image)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:alt" content="Unmask — Know before you buy.">
  <meta property="og:url" content="${h(canonical)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Join the Unmaskers">
  <meta name="twitter:description" content="Join the Unmask community and help reveal what products are really like before people buy.">
  <meta name="twitter:image" content="${h(image)}">
  <meta http-equiv="refresh" content="1;url=${h(target)}">
  <style>
    body{margin:0;min-height:100vh;background:#fff;color:#231b1e;font-family:Arial,Helvetica,sans-serif;display:grid;place-items:center}
    main{max-width:420px;padding:30px;text-align:center}
    img{width:230px;max-width:80%;height:auto}
    h1{font-size:26px;margin:20px 0 8px}
    p{color:#6b6165;line-height:1.55}
    a{display:inline-block;margin-top:10px;background:#701A2E;color:#fff;text-decoration:none;padding:11px 17px;border-radius:999px;font-weight:800}
  </style>
</head>
<body>
  <main>
    <img src="${h(image)}" alt="Unmask">
    <h1>Join the Unmaskers</h1>
    <p>Opening your invitation to the Unmask community…</p>
    <a href="${h(target)}">Open Unmask</a>
  </main>
  <script>setTimeout(function(){location.replace(${JSON.stringify(target)})},350)</script>
</body>
</html>`);
}
