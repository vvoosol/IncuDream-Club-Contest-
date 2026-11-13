from pathlib import Path
import shutil, re
root = Path(__file__).resolve().parents[1]
source = Path(r'C:\Users\User\Documents\New project\scientist-survival')
for folder in ['assets/characters', 'source-reference']:
    (root / folder).mkdir(parents=True, exist_ok=True)
for file in (source / 'assets/characters').glob('*.png'):
    shutil.copy2(file, root / 'assets/characters' / file.name)
for src, dst in [('js/data.js','original-data.js'), ('docs/ip-handoff/GAMEPLAY_LEVELUP_COMPLETE.md','GAMEPLAY_LEVELUP_COMPLETE.md'), ('docs/ip-handoff/catalog.json','catalog.json')]:
    shutil.copy2(source / src, root / 'source-reference' / dst)
shutil.copy2(Path(r'C:\Users\User\.codex\attachments\b5418ac6-e898-4ad2-8ce1-1cf8f58383a3\붙여넣은 텍스트.txt'), root / 'source-reference/PROJECT_BRIEF.md')
s = (source / 'main.js').read_text(encoding='utf-8')
out = [re.search(r'^function '+name+r'\([^\n]*\n.*?^}\s*', s, re.M | re.S).group(0) for name in ['getRulerDamage','attackRuler']]
(root / 'original-combat.js').write_text('// Original functions from scientist-survival/main.js, unchanged.\n'+'\n'.join(out), encoding='utf-8')
print('Preserved 16 portraits, original data, handoff and ruler combat functions.')
