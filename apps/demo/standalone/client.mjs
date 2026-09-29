import * as THREE from 'three';
import { Client } from 'colyseus.js';
import { parseSceneDocumentV0_1, getSceneBoxProps } from '@nexusworld3d/content-schema';
import { createSceneRuntime, withWorldProtocolJoinOptions } from '@nexusworld3d/engine-client';

const button = document.querySelector('#enter');
const status = document.querySelector('#status');
const count = document.querySelector('#count');
const mount = document.querySelector('#viewport');
let stopSession = null;
let connecting = false;

button.addEventListener('click', async () => {
  if (connecting) return;
  if (stopSession) { stopSession(); return; }
  connecting = true; button.disabled = true; status.textContent = 'Conectando al laboratorio…';
  let renderer, room, animation, scene;
  const listeners = new AbortController();
  const keys = new Set(), players = new Map();
  let stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    listeners.abort(); cancelAnimationFrame(animation);
    if (room?.connection.isOpen) void room.leave();
    scene?.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    renderer?.dispose(); renderer?.domElement.remove();
    stopSession = null; connecting = false; button.disabled = false;
    button.textContent = 'Entrar al laboratorio'; count.textContent = '—';
  };
  stopSession = cleanup;
  try {
    const response = await fetch('/scene');
    if (stopped) return;
    if (!response.ok) throw new Error('No se pudo cargar la escena');
    const sceneDocument = parseSceneDocumentV0_1(await response.json());
    if (stopped) return;
    const runtime = createSceneRuntime(sceneDocument, 'exterior');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    mount.append(renderer.domElement);
    scene = new THREE.Scene(); scene.background = new THREE.Color('#e6e8da');
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight('#ffffff', '#69775b', 2));
    const sun = new THREE.DirectionalLight('#fff0d0', 3); sun.position.set(5, 12, 8); scene.add(sun);
    for (const entity of runtime.entities) {
      const box = getSceneBoxProps(entity);
      if (!box || box.mapId !== runtime.mapId) continue;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...box.size), new THREE.MeshStandardMaterial({ color: box.color, roughness: 0.85 }));
      mesh.position.fromArray(entity.transform.position); mesh.quaternion.fromArray(entity.transform.rotation); mesh.scale.fromArray(entity.transform.scale);
      scene.add(mesh);
    }
    const grid = new THREE.GridHelper(30, 30, '#798a73', '#a2b59b'); grid.position.y = 0.01; scene.add(grid);
    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    resize(); window.addEventListener('resize', resize, { signal: listeners.signal });
    const client = new Client(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
    room = await client.joinOrCreate('demo', withWorldProtocolJoinOptions({ worldId: runtime.worldId }));
    if (stopped) { if (room.connection.isOpen) await room.leave(); return; }
    room.onMessage('demo:snapshot', snapshot => {
      const present = new Set();
      for (const player of snapshot) {
        present.add(player.id);
        let remote = players.get(player.id);
        if (!remote) {
          const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshStandardMaterial({ color: player.id === room.sessionId ? '#ef692f' : '#397e9b', roughness: 0.5 }));
          mesh.position.fromArray(player.position); scene.add(mesh);
          remote = { mesh, target: new THREE.Vector3() }; players.set(player.id, remote);
        }
        remote.target.fromArray(player.position);
      }
      for (const [id, remote] of players) if (!present.has(id)) {
        scene.remove(remote.mesh); remote.mesh.geometry.dispose(); remote.mesh.material.dispose(); players.delete(id);
      }
      count.textContent = `${snapshot.length} / 8`;
    });
    room.onLeave(() => { if (!stopped) { cleanup(); status.textContent = 'Desconectado. Puedes volver a entrar.'; } });
    room.onError((_code, message) => { if (!stopped) { cleanup(); status.textContent = `Error de conexión: ${message}`; } });
    room.send('demo:ready');
    const controls = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    let jump = false;
    window.addEventListener('keydown', event => {
      if (!controls.has(event.code) || /INPUT|TEXTAREA|BUTTON/.test(event.target.tagName)) return;
      event.preventDefault(); keys.add(event.code);
      if (event.code === 'Space' && !event.repeat) jump = true;
    }, { signal: listeners.signal });
    window.addEventListener('keyup', event => keys.delete(event.code), { signal: listeners.signal });
    const releaseControls = () => { keys.clear(); jump = false; if (room.connection.isOpen) room.send('demo:input', { x: 0, z: 0, jump: false }); };
    window.addEventListener('blur', releaseControls, { signal: listeners.signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseControls(); }, { signal: listeners.signal });
    let lastFrame = performance.now(), lastSend = 0;
    const cameraTarget = new THREE.Vector3(...runtime.spawn.position);
    const cameraOffset = new THREE.Vector3(9, 12, 14);
    camera.position.copy(cameraTarget).add(cameraOffset);
    const frame = now => {
      if (stopped) return;
      const dt = Math.min((now - lastFrame) / 1000, 0.1); lastFrame = now;
      if (now - lastSend >= 50 && room.connection.isOpen) {
        const held = (...codes) => codes.some(code => keys.has(code)) ? 1 : 0;
        room.send('demo:input', { x: held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft'), z: held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp'), jump });
        jump = false; lastSend = now;
      }
      for (const remote of players.values()) remote.mesh.position.lerp(remote.target, 1 - Math.exp(-18 * dt));
      const self = players.get(room.sessionId);
      if (self) cameraTarget.lerp(self.mesh.position, 1 - Math.exp(-6 * dt));
      camera.position.copy(cameraTarget).add(cameraOffset); camera.lookAt(cameraTarget);
      renderer.render(scene, camera); animation = requestAnimationFrame(frame);
    };
    stopSession = () => { cleanup(); status.textContent = 'Sesión finalizada. Escena lista para volver a entrar.'; };
    connecting = false; button.disabled = false; button.textContent = 'Salir del laboratorio'; button.blur();
    status.textContent = 'Conectado · naranja eres tú · azul son otros jugadores';
    animation = requestAnimationFrame(frame);
  } catch (error) { if (!stopped) { cleanup(); status.textContent = `${error.message}. Comprueba WebGL y el servidor, y vuelve a intentar.`; } }
});
window.addEventListener('pagehide', () => stopSession?.());
