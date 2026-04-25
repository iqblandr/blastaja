const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();

// Database Setup
const db = new sqlite3.Database('./users.db');
db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)");

app.use(bodyParser.json());
app.use(express.static('.'));
app.use(session({
    secret: 'andre-secret-key',
    resave: false,
    saveUninitialized: true
}));

const EMAIL_A = process.env.EMAIL_A;
const PASS_A = process.env.PASS_A;

// -- AUTH ROUTES --
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hash], (err) => {
        if(err) return res.json({success: false, message: 'Username sudah ada!'});
        res.json({success: true});
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if(user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            res.json({success: true});
        } else {
            res.json({success: false, message: 'Login Gagal!'});
        }
    });
});

// -- PUPPETEER LOGIC (AKSES PINJEMWA) --
async function loginAndGetPage() {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
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

app.post('/get-code', async (req, res) => {
    if(!req.session.userId) return res.json({success: false});
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
    } catch (e) { res.json({ success: false }); }
    finally { await browser.close(); }
});

app.post('/get-stats', async (req, res) => {
    if(!req.session.userId) return res.json({success: false});
    const { browser, page } = await loginAndGetPage();
    try {
        await page.goto('https://pinjemwa.com/user');
        const totalPesan = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('div'));
            const target = items.find(el => el.innerText.includes('Pesan Sukses'));
            return target ? parseInt(target.innerText.replace(/\D/g, '')) : 0;
        });
        res.json({ success: true, total_pesan: totalPesan });
    } catch (e) { res.json({ success: false }); }
    finally { await browser.close(); }
});

app.listen(process.env.PORT || 80, () => console.log('Server Live di Port 80'));
        if(user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            res.json({success: true});
        } else {
            res.json({success: false, message: 'Login Gagal!'});
        }
    });
});

// -- PUPPETEER LOGIC (AKSES PINJEMWA) --
async function loginAndGetPage() {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
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

app.post('/get-code', async (req, res) => {
    if(!req.session.userId) return res.json({success: false});
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
    } catch (e) { res.json({ success: false }); }
    finally { await browser.close(); }
});

app.post('/get-stats', async (req, res) => {
    if(!req.session.userId) return res.json({success: false});
    const { browser, page } = await loginAndGetPage();
    try {
        await page.goto('https://pinjemwa.com/user');
        const totalPesan = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('div'));
            const target = items.find(el => el.innerText.includes('Pesan Sukses'));
            return target ? parseInt(target.innerText.replace(/\D/g, '')) : 0;
        });
        res.json({ success: true, total_pesan: totalPesan });
    } catch (e) { res.json({ success: false }); }
    finally { await browser.close(); }
});

app.listen(process.env.PORT || 80, () => console.log('Server Live di Port 80'));
});

app.listen(process.env.PORT || 3000);
