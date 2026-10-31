from playwright.sync_api import sync_playwright
from pathlib import Path
import http.server, threading, os, json, time, re
BASE=Path(__file__).resolve().parents[1]
os.chdir(BASE/'web')
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=srv.serve_forever,daemon=True).start()
raw=(BASE/'web/index.html').read_text()
raw=re.sub(r'<link rel="stylesheet" href="([^"]+)"\s*/>', lambda m:'<style>'+ (BASE/'web'/m.group(1)).read_text()+'</style>', raw)
raw=re.sub(r'<script src="([^"]+)"></script>', lambda m:'<script>'+ (BASE/'web'/m.group(1)).read_text()+'</script>', raw)
viewports=[(320,568),(360,740),(390,844),(412,915),(600,960),(768,1024),(1024,768),(915,412),(667,375)]
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for w,h in viewports:
    page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=False)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(raw,wait_until='load')
    page.wait_for_timeout(180)
    data=page.evaluate('''() => {
    let s=sel=>{const e=document.querySelector(sel),r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,right:r.right,scroll:e.scrollHeight,client:e.clientHeight,display:cs.display}};
    return {vp:{w:innerWidth,h:innerHeight},pagew:document.documentElement.scrollWidth,root:s('.app'),top:s('.topbar'),brand:s('.brand'),tools:s('.header-tools'),tabs:s('.workspace-tabs'),ribbon:s('.ribbon'),sidebar:s('.sidebar'),workarea:s('.workarea'),canvas:s('.svg-box'),controls:s('.canvas-controls'),bottom:s('.bottom'),main:s('.main'),catalog:s('.tool-grid'),firsttool:s('.tool')};}''')
    assert data['pagew']<=w+1,(w,h,'horizontal scroll',data['pagew'])
    assert data['brand']['b']<=data['tools']['y']+1 or data['brand']['right']<=data['tools']['x']+1,(w,h,'overlap header',data['brand'],data['tools'])
    assert data['tabs']['b']<=data['ribbon']['y']+2,(w,h,'tabs ribbon collision')
    assert data['canvas']['h']>=235,(w,h,'canvas too small',data['canvas'])
    if h>w and w<=760:
      assert data['workarea']['b']<=data['sidebar']['y']+1,(w,h,'editor catalog overlap')
      assert data['catalog']['right']<=w+1,(w,h,'catalog exceeds window')
    elif h<w:
      assert data['sidebar']['right']<=data['workarea']['x']+1,(w,h,'landscape collision')
    assert not errors,(w,h,errors)
    if w==360 and h==740:
      page.screenshot(path='/mnt/data/patinos096-responsive/mobile-360.png',full_page=False)
      page.locator('.workarea').evaluate('(el)=>el.scrollTop=el.scrollHeight')
      page.wait_for_timeout(100)
      page.screenshot(path='/mnt/data/patinos096-responsive/mobile-scope.png',full_page=False)
    if w==915:
      page.screenshot(path='/mnt/data/patinos096-responsive/landscape-915.png',full_page=False)
    print(f'PASS {w}x{h}: header={data["top"]["h"]:.0f}px canvas={data["canvas"]["h"]:.0f}px sidebar={data["sidebar"]["h"]:.0f}px workarea-scroll={data["workarea"]["scroll"] > data["workarea"]["client"]}')
    page.close()
  browser.close()
srv.shutdown()
