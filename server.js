// server.js
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/get_cf_clearance', async (req, res) => {
  const targetSite = req.query.site;
  if (!targetSite) {
    return res.status(400).json({ error: 'Please provide site parameter like ?site=example.com' });
  }

  const url = targetSite.startsWith('http') ? targetSite : `https://${targetSite}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();

    // Set user agent (optional but recommended)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    // Go to the target site and wait until network idle
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Get cookies and find cf_clearance
    const cookies = await page.cookies();
    const cfCookie = cookies.find(c => c.name === 'cf_clearance');

    if (!cfCookie) {
      return res.status(500).json({ error: 'cf_clearance cookie not found. Maybe no Cloudflare challenge or failed to bypass.' });
    }

    // Return the cf_clearance cookie value and details
    res.json({
      cf_clearance: cfCookie.value,
      domain: cfCookie.domain,
      expires: cfCookie.expires,
      httpOnly: cfCookie.httpOnly,
      secure: cfCookie.secure,
      sameSite: cfCookie.sameSite,
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
