from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parents[1]
with sync_playwright() as play:
    browser=play.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--allow-file-access-from-files','--no-sandbox'])
    page=browser.new_page(viewport={'width':412,'height':850}, device_scale_factor=2, has_touch=True)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    html=(p/'web/index.html').read_text()
    html=html.replace('<link rel="stylesheet" href="style.css"/>','<style>'+(p/'web/style.css').read_text()+'</style>')
    for f in ('engine.js','analog.js','dig.js','app.js'):
        html=html.replace('<script src="'+f+'"></script>','<script>'+(p/'web'/f).read_text()+'</script>')
    page.set_content(html,wait_until='load')
    page.wait_for_timeout(800)
    print('initial',page.locator('#statNodes').inner_text(),'errors:',errors)
    assert page.locator('#statNodes').inner_text()=='7 componentes'
    assert page.locator('#toolCategory option').count()>=10
    page.locator('#toolCategory').select_option('passive')
    page.locator('#toolSearch').fill('Resistencia')
    page.locator('.tool[data-type="RESISTOR"]').click()
    page.wait_for_timeout(200)
    print('after R',page.locator('#statNodes').inner_text(),page.locator('#analogStatus').inner_text())
    n=page.locator('.node-group').last
    page.locator("#editBtn").click()
    page.wait_for_timeout(200)
    print('props open?',page.locator('#propsDialog').evaluate('(x)=>x.open'),page.locator('#propsFields').inner_text())
    assert page.locator('#propsDialog').evaluate('(x)=>x.open')
    page.locator('[data-property="resistance"]').fill('2200')
    page.locator('.props-save').click()
    page.wait_for_timeout(100)
    assert '2.200' in page.locator('.component-properties').last.text_content() or '2,200' in page.locator('.component-properties').last.text_content()
    # Standalone about:blank browser has no persistent storage; JSON roundtrip tested in Node.
    assert page.locator('#statNodes').inner_text()=='8 componentes'
    page.locator('#toolCategory').select_option('supply');page.locator('#toolSearch').fill('Fuente DC')
    page.locator('.tool[data-type="VDC"]').click()
    # Simulate real press-and-hold on the selected source body.
    box=page.locator('.node-group').last.bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
    page.mouse.down();page.wait_for_timeout(700)
    assert page.locator('#propsDialog').evaluate('(x)=>x.open'), 'Long press did not open modal'
    page.mouse.up()
    assert page.locator('[data-property="voltage"]').input_value()=='5'
    page.locator('[data-property="voltage"]').fill('12')
    page.locator('.props-save').click()
    page.screenshot(path=str(p/'tests/v05_mobile.png'), full_page=True)
    print('done',page.locator('#statNodes').inner_text(),errors)
    assert not errors, errors
    browser.close()
