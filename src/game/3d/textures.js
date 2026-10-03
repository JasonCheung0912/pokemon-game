import { useState, useEffect } from 'react';
import * as THREE from 'three';

// Photoreal tiling setup — repeat wrapping, sRGB, anisotropic filtering
export function setupTiling(tex, rx, ry) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Crash-proof texture load: if the image isn't ready yet, the world keeps
// rendering with its solid-color material and the texture applies the moment
// it arrives. A failed load can NEVER break the game.
export function useSafeTexture(url, rx, ry) {
  const [tex, setTex] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    new THREE.TextureLoader().load(url, (t) => {
      if (cancelled) { t.dispose(); return; }
      setTex(setupTiling(t, rx, ry));
    }, undefined, () => {
      // Not ready yet — retry every 3s (max ~1 min); flat colors until it lands
      if (!cancelled && retry < 20) setTimeout(() => { if (!cancelled) setRetry(r => r + 1); }, 3000);
    });
    return () => { cancelled = true; };
  }, [url, rx, ry, retry]);
  return tex;
}