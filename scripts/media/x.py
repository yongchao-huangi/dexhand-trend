# 用法: python3 scripts/media/x.py <x-api-json>  （get_posts_by_ids 返回，含 expansions=attachments.media_keys,author_id）
import sys,json
from common import *
t=open(sys.argv[1]).read(); o=json.loads(t[t.find('{'):t.rfind('}')+1])
media={m['media_key']:m for m in o.get('includes',{}).get('media',[])}
users={u['id']:u for u in o.get('includes',{}).get('users',[])}
M=load(); ok=0; tot=0
for p in o.get('data',[]):
    tot+=1; keys=p.get('attachments',{}).get('media_keys',[])[:2]; imgs=[]
    for i,k in enumerate(keys):
        m=media.get(k); 
        if not m: continue
        u=m.get('url') or m.get('preview_image_url')
        if not u: continue
        try:
            src,w,h=save(get(u+('?name=medium' if 'pbs.twimg.com/media' in u else '')),f"x-{p['id']}-{i}")
            imgs.append({'src':src,'w':w,'h':h,'video':m['type']!='photo'})
        except Exception as e: print('fail',u,e)
    if imgs:
        ok+=1; us=users.get(p['author_id'],{})
        M['x:'+p['id']]={'images':imgs,'author':f"@{us.get('username','')}",'platform':'X','href':p['url']}
dump(M); print(f'X: {ok}/{tot} posts with images')
