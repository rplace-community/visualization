if (WEBGL.isWebGLAvailable() === false) {
  document.body.appendChild(WEBGL.getWebGLErrorMessage());
}

const TOTAL_TIME = endTs - startTs;
const FILTER_SIZE = 200;
const PLANE_SIZE = 1000;
const TOT_IMAGES = 145;

const interval = 30;
const clock = new THREE.Clock();
let cumulDt = 0;
let playing = false;
let currentTime = 0;
let speed = defaultSpeed;

let drawSpikes = false;

let temporaryPause = false;

let camera, controls, scene, renderer;
let planeGeometry;
let planeMesh;
let planeMaterial;

let timeBack = new Time([], TOTAL_TIME);
let timeLevels = new Time([], TOTAL_TIME).setArrayInterpolation();

let plane_images;
let interpolator_images;

function mapSetDrawingMethod(spikes) {
  if (planeGeometry) {
    planeGeometry.dispose();
  }

  drawSpikes = spikes;
  if (drawSpikes) {
    planeGeometry = new THREE.PlaneBufferGeometry(
      PLANE_SIZE,
      PLANE_SIZE,
      2 * FILTER_SIZE,
      2 * FILTER_SIZE
    );
  } else {
    //To have 202*202 points, to work with 200*200 and leave borders
    planeGeometry = new THREE.PlaneBufferGeometry(
      PLANE_SIZE,
      PLANE_SIZE,
      FILTER_SIZE + 1,
      FILTER_SIZE + 1
    );
  }
  planeMesh.geometry = planeGeometry;
  drawLevelMaps();
}

function mapSetLevelmaps(arr) {
  plane_images = arr;
  timeLevels.setArray(plane_images);
  drawLevelMaps();
}

function mapSetInteraction(interactable) {
  controls.enabled = interactable;
}

function mapSetAutorotate(autorotate) {
  //mapResetPosition();
  if (autorotate) {
    controls.autoRotate = true;
    camera.zoom = 1.5;
    camera.updateProjectionMatrix();
  } else {
    controls.autoRotate = false;
    camera.zoom = 1;
    camera.updateProjectionMatrix();
  }
}

function mapResetPosition() {
  controls.reset();
}

function mapTemporaryPause(pause) {
  temporaryPause = pause;
}

function drawBackground() {
  if (timeBack.hasData()) {
    let textr = new THREE.DataTexture(
      timeBack.get(),
      1000,
      1000,
      THREE.RGBAFormat
    );
    textr.needsUpdate = true;
    textr.flipX = true;
    textr.flipY = true;
    planeMaterial.map = textr;
    planeMaterial.needsUpdate = true;
  }
}

function drawLevelMaps() {
  if (timeLevels.hasData()) {
    if (drawSpikes) {
      generatePlaneHeightsSpikesBuffered();
    } else {
      generatePlaneHeightsBuffered();
    }
  }
}

function mapPreload() {
  return new Promise(function(resolve_g) {
    require(["assets/js/lib/apng.js"], function(parseAPNGLib) {
    let parseAPNG = parseAPNGLib.default;

    return fetch("assets/img/frames.png")
      .then(response => response.arrayBuffer())
      .then(buffer => {
        const apng = parseAPNG(buffer);
        return apng.createImages().then(() => {
          const canvas = window.document.createElement("canvas");
          canvas.width = 1000;
          canvas.height = 1000;
          const ctx = canvas.getContext("2d");

          //const newImgs = [imgs.shift()];
          let promise = new Promise(function(resolve) {
            resolve();
          });
          apng.frames
            .map(frame => frame.imageElement)
            .forEach((img, i) => {
              promise = promise.then(() => {
                ctx.drawImage(img, 0, 0);
                timeBack.pushArrayElement(
                  new Uint8Array(ctx.getImageData(0, 0, 1000, 1000).data.buffer)
                );
              });
            });

          return promise.then(() => {
            init();
            animate();
            resolve_g();
          });
        });
      });
    });
  });
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);

  scene.fog = new THREE.FogExp2(0xcccccc, 0.001);
  renderer = new THREE.WebGLRenderer({ antialias: true });
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
  //camera.position.set(250, 120, 100);
  camera.position.set(12.5, 6, 5);

  // controls

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = false;
  // an animation loop is required when either damping or auto-rotation are enabled
  controls.enableDamping = true;

  controls.minDistance = 1;

  controls.minZoom = 0.8;
  controls.maxZoom = 10;

  controls.maxPolarAngle = (Math.PI * 4.5) / 10.0;
  controls.autoRotateSpeed = 0.2;

  controls.panSpeed = 0.5;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.8;

  // world ***********************************************************************************************************

  planeMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    specular: 0x0,
    shininess: 0,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0
  });

  planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
  mapSetDrawingMethod(drawSpikes);

  planeMesh.rotateX(-Math.PI / 2);
  planeMesh.matrixAutoUpdate = true;
  planeMesh.updateMatrix();
  scene.add(planeMesh);

  let bottomCubeGeometry = new THREE.BoxGeometry(PLANE_SIZE, PLANE_SIZE, 20);
  bottomCubeGeometry.translate(0, 0, -10.01); //Not -10, to avoid z-buffer issues
  let bottomCubeMaterial = new THREE.MeshBasicMaterial({ color: 0xb4b4b4 });
  let bottomCube = new THREE.Mesh(bottomCubeGeometry, bottomCubeMaterial);
  bottomCube.rotateX(-Math.PI / 2);
  scene.add(bottomCube);

  // lights
  var light = new THREE.DirectionalLight(0xffffff, 0.85);
  light.position.set(1, 1, 1);
  scene.add(light);
  var light = new THREE.AmbientLight(0x222222);
  scene.add(light);
  var light = new THREE.DirectionalLight(0xffffff, 0.15);
  light.position.set(-1, 1, -1);
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

const updateAppTime = throttle(
  () => appSetTime(new Date(currentTime + startTs)),
  60
);

function _seekTime(t) {
  if (t + startTs > endTs || t < 0) {
    currentTime = 0;
  } else if (t + startTs == endTs) {
    currentTime = t - 1;
  } else {
    currentTime = t;
  }

  timeBack.seekTime(currentTime);
  timeLevels.seekTime(currentTime);

  drawBackground();
  drawLevelMaps();

  updateAppTime();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

  cumulDt += clock.getDelta() * 1000;
  if (playing && !temporaryPause && cumulDt > interval) {
    _seekTime(currentTime + speed * (1000 / cumulDt));
    cumulDt = 0;
  }

  render();
}


function setFrenchGerman() {
  camera.position.set(-43.4, 3.5, 335.8);
  controls.target.set(-41.1, 0, 333.1);
  controls.update();
}


function generatePlaneHeightsBuffered() {
  if (planeGeometry) {
    let positions = planeGeometry.attributes.position.array;
    let arr = timeLevels.get();

    for (let i = 0; i < FILTER_SIZE; i++) {
      for (let j = 0; j < FILTER_SIZE; j++) {
        const iIm = i + 1;
        const jIm = j + 1;
        positions[(iIm + jIm * (FILTER_SIZE + 2)) * 3 + 2] =
          arr[i + j * FILTER_SIZE];
      }
    }
    planeGeometry.attributes.position.needsUpdate = true;
  }
}

function generatePlaneHeightsSpikesBuffered() {
  if (planeGeometry) {
    let positions = planeGeometry.attributes.position.array;
    let arr = timeLevels.get();

    const twoFSP1 = 2 * FILTER_SIZE + 1;
    for (let i = 0; i < FILTER_SIZE; i++) {
      for (let j = 0; j < FILTER_SIZE; j++) {
        const iIm = i * 2 + 1;
        const jIm = j * 2 + 1;
        positions[(iIm + jIm * twoFSP1) * 3 + 2] = arr[i + j * FILTER_SIZE];
      }
    }
    planeGeometry.attributes.position.needsUpdate = true;
  }
}

function render() {
  renderer.render(scene, camera);
}

function mapCommunityHighlight(communityMask) {
  if (communityMask) {
    let textr = new THREE.CanvasTexture(communityMask);
    textr.minFilter = THREE.NearestFilter;
    textr.magFilter = THREE.NearestFilter;
    planeMaterial.emissiveMap = textr;
    planeMaterial.emissiveIntensity = 0.95;
  } else {
    if (planeMaterial.emissiveMap) {
      planeMaterial.emissiveMap.dispose();
    }
    planeMaterial.emissiveMap = null;
    planeMaterial.emissiveIntensity = 0;
  }
  planeMaterial.needsUpdate = true;
}

function mapSeekTime(t) {
  _seekTime(t.getTime() - startTs);
}

function mapSetSpeed(s) {
  speed = s;
}

function mapPlay(play) {
  playing = play;
  cumulDt = 0;
}
