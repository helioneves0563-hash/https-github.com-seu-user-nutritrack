import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`[ERRO]: ${msg.text()}`);
        else console.log(`[LOG]: ${msg.text()}`);
    });

    page.on('pageerror', exception => {
        console.log(`[FATAL]: ${exception}`);
    });

    try {
        await page.goto('http://localhost:5174/');
        await page.waitForTimeout(2000);

        // Tentar ir pra tela de registro de Paciente
        await page.click('text="Criar conta"');
        await page.waitForTimeout(500);

        // Clicar em "Paciente"
        await page.click('text="Paciente"');
        await page.waitForTimeout(500);
        await page.click('text="Continuar"');
        await page.waitForTimeout(500);

        const testEmail = `test_${Date.now()}@nutritrack.com`;
        // Preencher forms
        await page.fill('input[placeholder="Maria"]', 'Usuário');
        await page.fill('input[placeholder="Silva"]', 'Teste');
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="tel"]', '11999999999');
        await page.fill('input[placeholder="Mínimo 8 caracteres"]', '12345678');
        await page.click('input[id="terms"]');

        // Submit
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000); // Wait for success
        console.log("Registrado com sucesso: " + testEmail);

        // Click ir para login
        await page.click('text="Ir para o login"');
        await page.waitForTimeout(1000);

        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', '12345678');
        await page.click('button[type="submit"]');

        console.log("Aguardando carregamento da dashboard...");
        await page.waitForTimeout(4000);

        console.log("URL Atual: " + page.url());
        await page.screenshot({ path: 'debug_03_dashboard.png' });

        // Vamos testar navegação no bottom nav
        await page.click('text="Perfil"');
        await page.waitForTimeout(2000);
        console.log("URL Atual após clique Perfil: " + page.url());

        // Vamos testar home
        await page.click('text="Início"');
        await page.waitForTimeout(2000);
        console.log("URL Atual após clique Início: " + page.url());

    } catch (e) {
        console.log('Exception no worker: ', e);
    } finally {
        await browser.close();
    }
})();
