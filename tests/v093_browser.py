from playwright.sync_api import sync_playwright
from pathlib import Path
import re
p=Path(__file__).resolve().parents[1]
with sync_playwright() as w:
 browser=w.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':412,'height':915},device_scale_factor=1,is_mobile=True,has_touch=True)
 errors=[]
 page.on('pageerror',lambda err: errors.append(str(err)))
 html=(p/'web/index.html').read_text().replace('<link rel="stylesheet" href="style.css"/>', '<style>'+ (p/'web/style.css').read_text() +'</style>')
 html=re.sub(r'<script src="[^"]+"></script>','',html)
 page.set_content(html,wait_until='domcontentloaded')
 for f in ['engine.js','analog.js','special.js','devices.js','spice.js','dig.js','app.js']:page.add_script_tag(content=(p/'web'/f).read_text())
 page.wait_for_timeout(550)
 page.locator('#electronicsModeBtn').click();page.wait_for_timeout(500)
 page.locator('#toolSearch').fill('4017');page.locator('.tool[data-type="COUNTER_4017"]').click();page.wait_for_timeout(500)
 count=page.locator('[data-kind="analog-pin"]').count()
 assert count>=16,('count',count)
 page.screenshot(path=str(p/'tests/v093_chip_mobile.png'),full_page=True)
 print('chip 4017 pins',count,'page errors',errors)
 assert not errors,errors
 browser.close()
