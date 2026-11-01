# 用法: python3 scripts/media/arxiv.py id1 id2 ...  取 HTML 版第一张 figure；记录 license
import sys,re,time,html
from common import *
M=load(); ok=0; ids=sys.argv[1:]; stat={}
import subprocess
for aid in ids:
    if 'arxiv:'+aid in M: continue
    lic=''; title=''; authors=''
    try:
        a=get(f'https://arxiv.org/abs/{aid}').decode('utf8','ignore')
        m=re.search(r'href="(https?://(?:creativecommons\.org|arxiv\.org/licenses)[^"]+)"',a); lic=m.group(1) if m else ''
        m=re.search(r'<meta name="citation_title" content="([^"]+)"',a); title=html.unescape(m.group(1)) if m else ''
        au=re.findall(r'<meta name="citation_author" content="([^"]+)"',a); authors=html.unescape(au[0]+(' 等' if len(au)>1 else '')) if au else ''
    except Exception as e: print('abs fail',aid,e)
    stat[aid]=lic
    try:
        base=f'https://arxiv.org/html/{aid}'
        r=subprocess.run(['curl','-sSfL','-A',UA,'-o','/tmp/ah.html','-w','%{url_effective}',base],capture_output=True,text=True,check=True); h=open('/tmp/ah.html',encoding='utf8',errors='ignore').read(); eff=r.stdout
        figs=re.findall(r'<figure[^>]*>(.*?)</figure>',h,flags=re.S)
        src=None
        for f in figs:
            m=re.search(r'<img[^>]+src="([^"]+)"',f)
            if m and not m.group(1).endswith('.svg'): src=m.group(1); break
        if not src: print('no fig',aid); continue
        if not src.startswith('http'):
            vb=re.search(r'<base href="([^"]+)"',h)
            import urllib.parse; src=urllib.parse.urljoin(eff,src)
        s,w,hh=save(get(src),f'arxiv-{aid}')
        ok+=1
        M['arxiv:'+aid]={'images':[{'src':s,'w':w,'h':hh}],'author':authors,'platform':'arXiv','href':f'https://arxiv.org/abs/{aid}','title':title,'license':lic,'caption':'论文首图'}
    except Exception as e: print('html fail',aid,str(e)[:80])
    time.sleep(1)
dump(M); json.dump(stat,open('/tmp/arxiv_lic.json','w'),indent=0)
print(f'arXiv: {ok}/{len(ids)}')
