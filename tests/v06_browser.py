from pathlib import Path
import json
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parents[1]
with sync_playwright() as play:
  browser=play.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--allow-file-access-from-files','--no-sandbox'])
  page=browser.new_page(viewport={'width':412,'height':850},device_scale_factor=2,has_touch=True)
  errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  html=(p/'web/index.html').read_text().replace('<link rel="stylesheet" href="style.css"/>','<style>'+(p/'web/style.css').read_text()+'</style>')
  for f in ('engine.js','analog.js','dig.js','app.js'):
      html=html.replace('<script src="'+f+'"></script>','<script>'+(p/'web'/f).read_text()+'</script>')
  page.set_content(html,wait_until='load')
  assert 'ALPHA 0.6' in page.locator('body').text_content()
  parts=[{'id':'v','type':'VDC','x':200,'y':140,'label':'Fuente 5 V','state':0,'props':{'voltage':5}},
    {'id':'r','type':'RESISTOR','x':410,'y':140,'label':'R 1k','state':0,'props':{'resistance':1000}},
    {'id':'c','type':'CAP','x':620,'y':140,'label':'C 100u','state':0,'props':{'capacitance':100}}]
  cables=[{'from':'v','to':'r','input':0},{'from':'r','to':'c','input':0},{'from':'c','to':'v','input':0}]
  project=json.dumps({'format':'digital-flow-v1','nodes':parts,'wires':cables})
  page.evaluate('(x)=>window.importProjectFromAndroid(x)',project)
  page.wait_for_timeout(400)
  assert page.locator('#statNodes').inner_text()=='3 componentes'
  assert 'transitorios RC/RL' in page.locator('#analogStatus').text_content()
  page.locator('#scopeSelect').select_option('c')
  page.wait_for_timeout(700)
  assert 'V' in page.locator('#scopeState').text_content()
  assert page.locator('.component-reading').count()==3
  assert not errors, errors
  page.screenshot(path=str(p/'tests/v06_mobile.png'),full_page=True)
  # Parameter edit using stable programmatic selection.
  page.locator('#editBtn').click()
  # The selected component is reset when importing. Long press the capacitor body.
  comp=page.locator('.node-group[data-node="c"]')
  center=comp.locator('.component-shell').first.bounding_box() if comp.locator('.component-shell').count() else comp.bounding_box()
  if center:
    page.mouse.move(center['x']+center['width']/2,center['y']+center['height']/2);page.mouse.down();page.wait_for_timeout(700);page.mouse.up()
  assert page.locator('#propsDialog').evaluate('(el)=>el.open')
  assert page.locator('[data-property="capacitance"]').input_value()=='100'
  page.locator('[data-property="capacitance"]').fill('220')
  page.locator('.props-save').click()
  assert '220' in page.locator('.node-group[data-node="c"] .component-properties').text_content()
  assert not errors, errors
  print('OK Android layout, analog oscilloscope, RC physical readings, long press, property save')
  browser.close()
