const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const app = express();

app.use(bodyParser.json());
app.use(express.static('.'));

const EMAIL_A = process.env.EMAIL_A;
const PASS_A = process.env.PASS_A;

// Fungsi Helper Login
async function loginAndGetPage() {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser', // Path VPS Ubuntu
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    await page.goto('https://pinjemwa.com/login');
    await page.type('input[name="email"]', EMAIL_A);
    await page.type('input[name="password"]', PASS_A);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    return { browser, page };
}

// Route 1: Ambil Kode Pairing
app.post('/get-code', async (req, res) => {
    const { browser, page } = await loginAndGetPage();
    try {
        await page.goto('https://pinjemwa.com/user/devices');
        const btns = await page.$$('button');
        for (let b of btns) {
            let t = await page.evaluate(el => el.innerText, b);
            if (t.includes('Pairing Code')) { await b.click(); break; }
        }
        await page.waitForSelector('input[placeholder*="62812"]');
        await page.type('input[placeholder*="62812"]', req.body.number);
        
        const start = await page.$$('button');
        for (let b of start) {
            let t = await page.evaluate(el => el.innerText, b);
            if (t.includes('Mulai Pairing')) { await b.click(); break; }
        }
        await new Promise(r => setTimeout(r, 8000));
        const code = await page.evaluate(() => {
            const e = document.querySelector('.text-primary.font-bold');
            return e ? e.innerText : null;
        });
        res.json({ success: !!code, code });
    } catch (e) { res.json({ success: false, message: e.message }); }
    finally { await browser.close(); }
});

// Route 2: Ambil Statistik Pesan untuk Logika Rp 750
app.post('/get-stats', async (req, res) => {
    const { browser, page } = await loginAndGetPage();
    try {
        await page.goto('https://pinjemwa.com/user');
        // Mencari angka "Pesan Sukses" di dashboard
        const totalPesan = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('div'));
            const target = items.find(el => el.innerText.includes('Pesan Sukses'));
            // Ambil angka dari elemen setelah teks 'Pesan Sukses'
            return target ? parseInt(target.innerText.replace(/\D/g, '')) : 0;
        });
        res.json({ success: true, total_pesan: totalPesan });
    } catch (e) { res.json({ success: false }); }
    finally { await browser.close(); }
});

app.listen(process.env.PORT || 3000);
