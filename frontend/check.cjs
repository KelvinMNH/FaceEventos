const { chromium } = require('playwright');

(async () => {
    console.log('[Playwright] Iniciando...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if(msg.type() === 'error') {
            console.log('\x1b[31m[Browser Error]\x1b[0m', msg.text());
        } else if (msg.type() === 'warning') {
            console.log('\x1b[33m[Browser Warning]\x1b[0m', msg.text());
        } else {
            console.log('[Browser Log]', msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log('\x1b[31m[Uncaught Exception]\x1b[0m', error.message);
    });

    console.log('[Playwright] Acessando http://localhost:5173/');
    try {
        await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 30000 });
        console.log('[Playwright] DOM carregado. Aguardando 4 segundos para logs assíncronos...');
        await page.waitForTimeout(4000);
        
        const title = await page.title();
        console.log(`[Playwright] Título: ${title}`);
        
        const bodyText = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
        console.log('[Playwright] Body excerpt:');
        console.log(bodyText);

    } catch (e) {
        console.error('[Playwright Exception Failed to Load]', e);
    }
    
    await browser.close();
})();
