from playwright.sync_api import sync_playwright
from pathlib import Path
import re
p=Path(__file__).resolve().parents[1]
with sync_playwright() as w:
    browser=w.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    page=browser.new_page(viewport={'width':412,'height':915},device_scale_factor=1,is_mobile=True,has_touch=True)
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    html=(p/'web/index.html').read_text().replace('<link rel="stylesheet" href="style.css"/>','<style>'+(p/'web/style.css').read_text()+'</style>')
    html=re.sub(r'<script src="[^"]+"></script>','',html)
    page.set_content(html,wait_until='domcontentloaded')
    for file in ['engine.js','analog.js','special.js','devices.js','spice.js','dig.js','leds.js','sound.js','app.js']:
        page.add_script_tag(content=(p/'web'/file).read_text())
    page.locator('#electronicsModeBtn').click()
    sample={
      'format':'digital-flow-v1',
      'nodes':[{'id':'src','type':'VDC','x':150,'y':250,'label':'Fuente DC','state':0,'props':{'voltage':5}},
               {'id':'buz','type':'BUZZER','x':450,'y':250,'label':'Buzzer activo','state':0,'props':{'resistance':200,'threshold':3,'toneHz':1700}}],
      'wires':[{'id':'w1','from':'src','fromPin':1,'to':'buz','toPin':0},
               {'id':'w2','from':'buz','fromPin':1,'to':'src','toPin':0}]
    }
    page.evaluate('(x)=>window.importProjectFromAndroid(JSON.stringify(x))',sample)
    page.wait_for_timeout(200)
    print("buz count",page.locator('#nodesLayer [data-node="buz"]').count(),"errors",errors,"status",page.locator("#toast").inner_text(),"nodes",page.locator("#statNodes").inner_text()); assert page.locator('#nodesLayer [data-node="buz"]').count()>=1
    page.locator('#audioBtn').click()
    page.wait_for_timeout(150)
    assert page.locator('#audioBtn').get_attribute('aria-pressed')=='true',page.locator('#toast').inner_text()
    assert page.locator('#audioPanel').is_visible()
    page.locator('#audioVolume').fill('12')
    assert page.locator('#audioVolumeValue').inner_text()=='12%'
    page.screenshot(path=str(p/'tests/v095_mobile_audio.png'),full_page=True)
    page.locator('#runBtn').click()
    assert page.locator('#runBtn').inner_text().find('▶')>=0
    page.locator('#audioBtn').click()
    assert page.locator('#audioBtn').get_attribute('aria-pressed')=='false'
    rect=page.locator('#audioBtn').bounding_box()
    assert rect and rect['x']>=0 and rect['x']+rect['width']<=412,rect
    assert not errors,errors
    print('Mobile UI sound toggle/volume/pause OK, screenshot',p/'tests/v095_mobile_audio.png')
    browser.close()
