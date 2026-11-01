# 用法: python3 scripts/media/xhs.py [xhs-covers.tsv]
# TSV 每行: 笔记id<TAB>作者<TAB>图片地址<TAB>备注 ；只带 Referer，不使用 cookie
import sys,os,re,glob
from common import *
tsv=sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'xhs-covers.tsv')
if not os.path.exists(tsv): sys.exit(f'找不到 {tsv}')
# 正文里出现的小红书链接：笔记 id -> 原帖链接
href={}
for f in glob.glob(os.path.join(ROOT,'src/content/*/*.md')):
    for u in re.findall(r'https?://www\.xiaohongshu\.com/explore/[^\s)\]|>，。]+',open(f,encoding='utf8').read()):
        href.setdefault(re.search(r'explore/([0-9a-f]+)',u).group(1),u)
M=load(); ok=0; tot=0
for line in open(tsv,encoding='utf8'):
    if not line.strip() or line.startswith('#'): continue
    parts=line.rstrip('\n').split('\t')+['','','','']
    nid,author,img,note=[p.strip() for p in parts[:4]]
    if not nid or not img: continue
    tot+=1
    if img.startswith('//'): img='https:'+img
    if nid not in href: print('正文中没有该笔记链接，跳过',nid); continue
    try:
        src,w,h=save(get(img,ref='https://www.xiaohongshu.com/'),f'xhs-{nid}')
        M['xhs:'+nid]={'images':[{'src':src,'w':w,'h':h}],'author':author or '原作者','platform':'小红书','href':href[nid],**({'note':note} if note else {})}
        ok+=1
    except Exception as e: print('下载失败',nid,str(e)[:100])
dump(M); print(f'小红书: {ok}/{tot}')
