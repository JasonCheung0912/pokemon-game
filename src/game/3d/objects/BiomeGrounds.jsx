import { useMemo } from 'react';
import * as THREE from 'three';
import { BIOME_ZONES, TEXTURES } from '@/game/config';
import { getTerrainHeight } from '@/game/3d/terrain';
import { useSafeTexture } from '@/game/3d/textures';

// ─── Per-biome ground skins ───
// Every non-forest biome gets its own textured ground plane that conforms to
// the exact terrain height (+0.07 above the base plane so it renders on top).
// Minor biomes (lightning, wind) reuse a texture with a color tint.
const ZONE_SKINS = {
  volcano: { tex: TEXTURES.volcanic, color: '#ffffff' },
  ice: { tex: TEXTURES.ice, color: '#ffffff' },
  desert: { tex: TEXTURES.sand, color: '#ffffff' },
  hurricane: { tex: TEXTURES.marsh, color: '#ffffff' },
  rock: { tex: TEXTURES.rockland, color: '#ffffff' },
  legendary: { tex: TEXTURES.legendaryGround, color: '#ffffff' },
  lightning: { tex: TEXTURES.rockland, color: '#d8d098' },
  wind: { tex: TEXTURES.grass, color: '#cfe8f5' },
  cave: { tex: TEXTURES.caveFloor, color: '#ffffff' },
};

function ZoneGround({ zone }) {
  const skin = ZONE_SKINS[zone.biome];
  const geo = useMemo(() => {
    const w = zone.xMax - zone.xMin, h = zone.zMax - zone.zMin;
    const segs = Math.max(24, Math.round(Math.max(w, h) / 3.5));
    const g = new THREE.PlaneGeometry(w, h, segs, segs);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const cx = (zone.xMin + zone.xMax) / 2, cz = (zone.zMin + zone.zMax) / 2;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, getTerrainHeight(cx + pos.getX(i), cz + pos.getZ(i)) + 0.07);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const map = useSafeTexture(skin.tex, (zone.xMax - zone.xMin) / 7, (zone.zMax - zone.zMin) / 7);
  return (
    <mesh geometry={geo} position={[(zone.xMin + zone.xMax) / 2, 0, (zone.zMin + zone.zMax) / 2]} receiveShadow>
      <meshStandardMaterial map={map} color={skin.color} roughness={1} metalness={0} />
    </mesh>
  );
}

export function BiomeGrounds() {
  const zones = BIOME_ZONES.filter(z => ZONE_SKINS[z.biome]);
  return <>{zones.map((z, i) => <ZoneGround key={i} zone={z} />)}</>;
}