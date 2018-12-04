if (WEBGL.isWebGLAvailable() === false) {
  document.body.appendChild(WEBGL.getWebGLErrorMessage());
}

var pause_animation = false;

let camera, controls, scene, renderer;
let planeGeometry;
let planeMesh;
let planeMaterial;

let timeBack = new Time([], endTs - startTs);
let timeLevels = new Time([], endTs - startTs).setArrayInterpolation();

const tot_images = 145;
const filterSize = 200;
const steps = 16;

let plane_images;
let back_images;
let interpolator_images;

let drawSpikes = false;

function mapSetDrawingMethod(spikes) {

  if(planeGeometry) {
    planeGeometry.dispose();
  }

  drawSpikes = spikes;
  if(drawSpikes) {
    planeGeometry = new THREE.PlaneBufferGeometry(1000, 1000, 400, 400);
  } else {
    planeGeometry = new THREE.PlaneBufferGeometry(1000, 1000, 201, 201);
  }
  planeMesh.geometry = planeGeometry;
  drawLevelMaps();
}

function mapSetBackgrounds(arr) {
  back_images = arr;
  timeBack.setArray(back_images);
}

function mapSetLevelmaps(arr) {
  plane_images = arr;
  timeLevels.setArray(plane_images);
}

function mapResetPosition() {
  controls.reset();
}
 
function seekTime(t) {
  timeBack.seekTime(t);
  timeLevels.seekTime(t);
  
  drawBackground();
  drawLevelMaps();
}

function drawBackground() {
  let textr = new THREE.CanvasTexture(timeBack.get());
  textr.minFilter = THREE.NearestFilter;
  textr.magFilter = THREE.NearestFilter;
  planeMaterial.map = textr;
  planeMaterial.needsUpdate = true;
}

function drawLevelMaps() {
  if (drawSpikes) {
    generatePlaneHeightsSpikesBuffered();
  } else {
    generatePlaneHeightsBuffered();
  }
}


function mapPreload(observer) {
  const urls = Array.from(Array(tot_images * 2 - 1).keys()).map(
    i => `assets/img/frames/${i}.png`
  );

  return fetchImages(urls, observer).then(images => {
    mapSetBackgrounds(images)

    init();
    animate();
  });
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);

  scene.fog = new THREE.FogExp2(0xcccccc, 0.001);
  renderer = new THREE.WebGLRenderer({ antialias: true } );
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    -1000,
    1500
  );
  camera.position.set(250, 120, 100);

  // controls

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled

  controls.screenSpacePanning = false;
  controls.minDistance = 1;

  controls.minZoom = 1;
  controls.maxZoom = 10;

  controls.maxPolarAngle = (Math.PI * 4.5) / 10.0;

  // world ***********************************************************************************************************

  planeMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    specular: 0x0,
    shininess: 0,
  });

  planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
  mapSetDrawingMethod(this.drawSpikes);

  planeMesh.rotateX(-Math.PI / 2);
  planeMesh.matrixAutoUpdate = true;
  planeMesh.updateMatrix();
  scene.add(planeMesh);

  let bottomCubeGeometry = new THREE.BoxGeometry(1000, 1000, 20);
  bottomCubeGeometry.translate(0, 0, -10.01);
  let bottomCubeMaterial = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
  let bottomCube = new THREE.Mesh(bottomCubeGeometry, bottomCubeMaterial);
  bottomCube.rotateX(-Math.PI / 2);
  scene.add(bottomCube);

  // lights
  var light = new THREE.DirectionalLight(0xffffff);
  light.position.set(1, 1, 1);
  scene.add(light);
  var light = new THREE.DirectionalLight(0x002288);
  light.position.set(-1, -1, -1);
  scene.add(light);
  var light = new THREE.AmbientLight(0x222222);
  scene.add(light);

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.left = window.innerWidth / -2;
  camera.right = window.innerWidth / 2;
  camera.top = window.innerHeight / 2;
  camera.bottom = window.innerHeight / -2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

  render();

  if (!plane_images) return;
}

function generatePlaneHeightsBuffered() {
  if (planeGeometry) {
    let positions = planeGeometry.attributes.position.array;
    let arr = timeLevels.get();

    for (let i = 0; i < filterSize; i++) {
      for (let j = 0; j < filterSize; j++) {
        const iIm = i + 1;
        const jIm = j + 1;
        positions[(iIm + jIm * (filterSize + 2)) * 3 + 2] = arr[i + j * filterSize];
      }
    }
    planeGeometry.attributes.position.needsUpdate = true;
  }
}

function pow(x) {
  return Math.pow(x, 1.5);
}
function generatePlaneHeightsSpikesBuffered() {
  if(planeGeometry) {
    let positions = planeGeometry.attributes.position.array;
    let arr = timeLevels.get();

    const twoFSP1 = 2 * filterSize + 1;
    for(let i = 0; i < filterSize; i++) {
      for(let j = 0; j < filterSize; j++) {
        const iIm = i * 2 + 1;
        const jIm = j * 2 + 1;
        positions[(iIm + jIm * twoFSP1)*3 + 2] = pow(arr[i + j * filterSize]/3);
      }
    }
    planeGeometry.attributes.position.needsUpdate = true;
  }
}

function render() {
  renderer.render(scene, camera);
}
