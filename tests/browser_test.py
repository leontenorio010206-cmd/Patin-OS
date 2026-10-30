"""Run with: python tests/browser_test.py (requires chromium and Python Playwright)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parents[1]
xml=(p/'tests/fixtures/Xor1-from-Digital.dig').read_text()
with sync_playwright() as play:
    browser=play.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--allow-file-access-from-files'])
    page=browser.new_page(viewport={'width':1280,'height':800})
    exceptions=[]
    page.on('pageerror',lambda e:exceptions.append(str(e)))
    html=(p/'web/index.html').read_text()
    html=html.replace('<link rel="stylesheet" href="style.css"/>', '<style>'+(p/'web/style.css').read_text()+'</style>')
    for name in ('engine.js','analog.js','dig.js','app.js'):
        html=html.replace('<script src="'+name+'"></script>', '<script>'+(p/'web'/name).read_text()+'</script>')
    page.set_content(html,wait_until='load')
    page.wait_for_selector('.node-group')
    assert page.title().startswith('Patiñ Os'),page.title()
    raw=page.evaluate('(xml) => window.PatinosDig.parseDig(xml)',xml)
    print('Parsed Digital sample:',len(raw['nodes']),'nodes and',len(raw['wires']),'links')
    print('Links:',[(a['from'],a['to'],a['input']) for a in raw['wires']])
    assert len(raw['nodes'])==6,raw
    assert len(raw['wires'])==7,raw['wires']
    for a in (0,1):
        for b in (0,1):
            proj=dict(raw)
            for n in proj['nodes']:
                if n['label']=='A':n['state']=a
                if n['label']=='B':n['state']=b
            val=page.evaluate('p=>{const r=window.DigitalEngine.simulate(p.nodes,p.wires,0);return r.outs.get(p.nodes.find(n=>n.label==="Y").id)}',proj)
            assert val==a^b,(a,b,val)
    page.evaluate('(xml)=>window.importProjectFromAndroid(xml)',xml)
    assert page.locator('#statNodes').inner_text()=='6 componentes'
    assert page.locator('#statWires').inner_text()=='7 conexiones'
    assert 'Importación limitada' in page.locator('#importStatus').inner_text()
    bad=xml.replace('<elementName>Or</elementName>','<elementName>FlipFlop</elementName>')
    page.evaluate('(xml)=>window.importProjectFromAndroid(xml)',bad)
    assert 'FlipFlop' in page.locator('#importStatus').inner_text()
    assert page.locator('#statNodes').inner_text()=='6 componentes', 'Failed import erased previous circuit'
    # DTD attack is rejected.
    hostile='<!DOCTYPE foo [<!ENTITY xx SYSTEM "file:///etc/passwd">]>'+xml
    err=page.evaluate('(xml)=>{try{window.PatinosDig.parseDig(xml);return "NO ERROR"}catch(e){return e.message}}',hostile)
    assert 'DTD' in err,err
    page.screenshot(path=str(p/'tests/patinos-v0.2-browser.png'),full_page=True)
    assert not exceptions,exceptions
    print('OK: import, truth table, rejection, page errors, screenshot')
    browser.close()
