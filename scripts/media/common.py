import io,os,json,urllib.request
from PIL import Image
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEDIA=os.path.join(ROOT,'public/media'); MAP=os.path.join(ROOT,'src/data/media.json')
import subprocess
def get(u,timeout=30,ref=None):
    a=['curl','-sSfL','--max-time',str(timeout),'-A',UA]+(['-e',ref] if ref else [])+[u]
    return subprocess.run(a,capture_output=True,check=True).stdout
def get_old(u,timeout=30,ref=None):
    h={'User-Agent':UA}
    if ref: h['Referer']=ref
    return urllib.request.urlopen(urllib.request.Request(u,headers=h),timeout=timeout).read()
def save(data,name):
    im=Image.open(io.BytesIO(data)); im.load()
    if im.mode not in('RGB','RGBA'): im=im.convert('RGBA' if 'transparency' in im.info or im.mode in('P','LA') else 'RGB')
    if im.width>1000: im=im.resize((1000,round(im.height*1000/im.width)),Image.LANCZOS)
    p=os.path.join(MEDIA,name+'.webp'); im.save(p,'WEBP',quality=78,method=6)
    return '/media/'+name+'.webp',im.width,im.height
def load():
    return json.load(open(MAP)) if os.path.exists(MAP) else {}
def dump(m):
    os.makedirs(os.path.dirname(MAP),exist_ok=True); json.dump(m,open(MAP,'w'),ensure_ascii=False,indent=1)
