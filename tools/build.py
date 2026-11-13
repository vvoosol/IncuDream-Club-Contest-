"""Build a single offline HTML. No dependencies, server or internet required."""
from pathlib import Path
import base64
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="style.css">', '<style>\n'+(root/'style.css').read_text(encoding='utf-8')+'\n</style>')
for path in ['source-reference/original-data.js','original-combat.js','game.js','skills.js','inventory.js']:
    content=(root/path).read_text(encoding='utf-8').replace('</script','<\\/script')
    html=html.replace(f'<script src="{path}"></script>','<script>\n'+content+'\n</script>')
for name in ['default','newton','faraday','mendel']:
    path=f'assets/characters/{name}.png'
    html=html.replace(path, 'data:image/png;base64,'+base64.b64encode((root/path).read_bytes()).decode())
out=root/'과학자RPG-3단계.html'
out.write_text(html,encoding='utf-8')
print(f'Built {out.name} ({out.stat().st_size:,} bytes)')
