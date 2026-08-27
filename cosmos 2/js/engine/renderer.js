/**
 * COSMOS X — Renderer
 * Three.js scene setup, post-processing, camera management
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class CosmosRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._initPostProcessing();
    this._initControls();

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000308);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.001, 100000);
    this.camera.position.set(0, 40, 80);
    this.camera.lookAt(0, 0, 0);

    // Camera state
    this.cameraState = {
      mode: 'orbit',  // orbit | follow | free
      target: null,
      followDistance: 5,
      isAnimating: false,
    };

    // Smooth camera lerp targets
    this._camTargetPos = new THREE.Vector3(0, 40, 80);
    this._camTargetLook = new THREE.Vector3(0, 0, 0);
    this._camLerpSpeed = 0.05;
  }

  _initLights() {
    // Ambient - very dim
    this.ambientLight = new THREE.AmbientLight(0x111122, 0.15);
    this.scene.add(this.ambientLight);

    // Sun point light
    this.sunLight = new THREE.PointLight(0xFFF4E0, 3.0, 0);
    this.sunLight.position.set(0, 0, 0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.1;
    this.sunLight.shadow.camera.far = 5000;
    this.scene.add(this.sunLight);

    // Hemisphere light - space ambient
    this.hemiLight = new THREE.HemisphereLight(0x111133, 0x000000, 0.1);
    this.scene.add(this.hemiLight);
  }

  _initPostProcessing() {
    this.usePostProcessing = true;
    try {
      this.composer = new EffectComposer(this.renderer);

      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      // Bloom for stars, sun, etc.
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.width, this.height),
        1.2,   // strength
        0.5,   // radius
        0.7    // threshold
      );
      this.composer.addPass(this.bloomPass);

      // Output
      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);
    } catch (err) {
      console.warn('Post-processing fallback to standard render:', err);
      this.usePostProcessing = false;
    }
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 1.2;
    this.controls.minDistance = 0.01;
    this.controls.maxDistance = 50000;
    this.controls.screenSpacePanning = true;
  }

  // =============================================
  // CAMERA ANIMATION
  // =============================================
  flyToTarget(object3D, distance = null) {
    if (!object3D) return;

    const box = new THREE.Box3().setFromObject(object3D);
    const size = box.getSize(new THREE.Vector3()).length();
    const targetDist = distance || Math.max(size * 2.5, 1);

    const targetPos = object3D.position.clone();
    const cameraOffset = new THREE.Vector3(
      targetDist * 0.7,
      targetDist * 0.4,
      targetDist * 0.7
    );

    this.cameraState.isAnimating = true;
    this._flyAnimStart = Date.now();
    this._flyAnimDuration = 2000;
    this._flyStartPos = this.camera.position.clone();
    this._flyEndPos = targetPos.clone().add(cameraOffset);
    this._flyStartLook = this.controls.target.clone();
    this._flyEndLook = targetPos.clone();
  }

  updateCameraAnimation() {
    if (!this.cameraState.isAnimating) return;

    const elapsed = Date.now() - this._flyAnimStart;
    const t = Math.min(elapsed / this._flyAnimDuration, 1);
    // Smooth easing
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    this.camera.position.lerpVectors(this._flyStartPos, this._flyEndPos, ease);
    this.controls.target.lerpVectors(this._flyStartLook, this._flyEndLook, ease);
    this.controls.update();

    if (t >= 1) {
      this.cameraState.isAnimating = false;
    }
  }

  followBody(object3D) {
    if (!object3D) return;
    this.cameraState.mode = 'follow';
    this.cameraState.target = object3D;
  }

  stopFollowing() {
    this.cameraState.mode = 'orbit';
    this.cameraState.target = null;
  }

  updateFollowCamera() {
    if (this.cameraState.mode !== 'follow' || !this.cameraState.target) return;

    const target = this.cameraState.target;
    const targetPos = target.position.clone();
    this.controls.target.lerp(targetPos, 0.08);
    this.controls.update();
  }

  // =============================================
  // RENDER
  // =============================================
  render() {
    this.controls.update();
    this.updateCameraAnimation();
    this.updateFollowCamera();

    if (this.usePostProcessing && this.composer) {
      try {
        this.composer.render();
      } catch (err) {
        console.warn('Composer render error, switching to direct render:', err);
        this.usePostProcessing = false;
        this.renderer.render(this.scene, this.camera);
      }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // =============================================
  // BLOOM CONTROL
  // =============================================
  setBloom(enabled, strength = 1.2) {
    this.bloomPass.enabled = enabled;
    this.bloomPass.strength = strength;
  }

  setSunPosition(pos) {
    this.sunLight.position.copy(pos);
  }

  // =============================================
  // RESIZE
  // =============================================
  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);
  }

  // =============================================
  // RAYCASTING
  // =============================================
  raycast(mouseX, mouseY, objects) {
    const mouse = new THREE.Vector2(
      (mouseX / this.width) * 2 - 1,
      -(mouseY / this.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    raycaster.params.Points.threshold = 0.1;
    return raycaster.intersectObjects(objects, true);
  }

  // World position under mouse
  screenToWorld(mouseX, mouseY, z = 0) {
    const vec = new THREE.Vector3(
      (mouseX / this.width) * 2 - 1,
      -(mouseY / this.height) * 2 + 1,
      0.5
    );
    vec.unproject(this.camera);
    const dir = vec.sub(this.camera.position).normalize();
    const dist = -this.camera.position.z / dir.z;
    return this.camera.position.clone().add(dir.multiplyScalar(dist));
  }

  // =============================================
  // SCREENSHOT
  // =============================================
  takeScreenshot() {
    this.composer.render();
    return this.renderer.domElement.toDataURL('image/png');
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.composer.dispose();
    this.controls.dispose();
  }
}
