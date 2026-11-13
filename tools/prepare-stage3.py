from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
source=Path(r'C:\Users\User\Documents\New project\scientist-survival\main.js').read_text(encoding='utf-8')
names='getRulerDamage attackRuler attackSteelRuler attackBall attackIronBall attackChalk attackChalkMachine attackAmmonia attackChemWarfare attackFlask attackFlammableMaterial attackApple attackGravity getSafeGravityPoint attackLaser attackPrism attackPea attackSegregationLaw attackPlanting attackPureCross createPlantPot updatePlantTurrets firePlantPea firePeaBurst splitPeaProjectile attackCurrent attackLightning attackMagnet attackMagneticStorm getSpreadAngle getDirectionalLanding getSeparatedLanding updateNotebook sweepNotebookPath calculateDirectionalBonus applyNewtonPassive getWeaponCooldown'.split()
parts=[]
for name in names:
    m=re.search(r'^function '+name+r'\([^\n]*\n.*?^}\s*',source,re.M|re.S)
    if not m: raise RuntimeError(name)
    parts.append(m.group(0))
parts.append(re.search(r'^const weaponUpgradeDescriptions = \{.*?^};',source,re.M|re.S).group(0))
text='// Extracted from scientist-survival/main.js; see DEVELOPMENT.md.\n'+'\n'.join(parts)
(root/'source-reference/stage3-combat-original.js').write_text(text,encoding='utf-8')
# Original attacks assumed a screen-sized arena. Only landing clamps change here.
adapted=re.sub(r'\bW - (\d+)',r'MW * T - \1',text)
adapted=re.sub(r'\bH - (\d+)',r'MH * T - \1',adapted)
adapted=adapted.replace('e.x += ((e.x - p.x) / (dist(p, e) || 1)) * 1.4;\n      e.y += ((e.y - p.y) / (dist(p, e) || 1)) * 1.4;', 'if (e.type !== "chest") move(e, ((e.x - p.x) / (dist(p, e) || 1)) * 1.4, ((e.y - p.y) / (dist(p, e) || 1)) * 1.4);')
(root/'original-combat.js').write_text(adapted,encoding='utf-8')
print(f'Imported {len(names)} original functions + level descriptions.')
