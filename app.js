let camera, scene, renderer, controls;
const scenes = [];
let currentScene = 0;
const hotspots = [];
let sceneNames = []; // Para guardar los nombres de las escenas

init();
animate();

async function init() {
    // Configuración de la cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1); // Ligeramente desplazada para evitar problemas con la cámara dentro de la esfera

    // Creación de la escena
    scene = new THREE.Scene();

    // Configuración del renderizador
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Configuración de los controles
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;

    try {
        const imagesData = await fetchScenesData('/public/data.json');
        sceneNames = imagesData.map(scene => scene.name); // Guardar los nombres de las escenas
        populateImageList(imagesData);
        const textures = await loadTextures(imagesData);
        createMeshes(textures);
        updateSelectedSceneName(); // Actualizar el nombre de la escena inicial
    } catch (error) {
        console.error('Error loading JSON or textures:', error);
    }

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
}

async function fetchScenesData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data.scenes;
}

function loadTextures(imagesData) {
    const textureLoader = new THREE.TextureLoader();
    const texturePromises = imagesData.map(scene => {
        return new Promise((resolve, reject) => {
            textureLoader.load(
                scene.image,
                texture => resolve(texture),
                undefined,
                err => reject(err)
            );
        });
    });

    return Promise.all(texturePromises);
}

function createMeshes(textures) {
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    textures.forEach((texture, index) => {
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        scenes.push(mesh);
    });

    // Añadir la escena inicial
    scene.add(scenes[currentScene]);

    // Crear hotspots
    //createHotspot(scenes[0], new THREE.Vector3(50, 0, -200), 1); // Hotspot a la escena 2
    //createHotspot(scenes[1], new THREE.Vector3(50, 0, -200), 2); // Hotspot a la escena 3
    //createHotspot(scenes[2], new THREE.Vector3(50, 0, -200), 0); // Hotspot a la escena 1
}

function createHotspot(mesh, position, targetScene) {
    const hotspot = new THREE.Mesh(
        new THREE.SphereGeometry(5, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    hotspot.position.copy(position);
    hotspot.userData.targetScene = targetScene;
    mesh.add(hotspot);
    hotspots.push(hotspot);
}

function changeScene(index) {
    if (index >= 0 && index < scenes.length) {
        scene.remove(scenes[currentScene]);
        currentScene = index;
        scene.add(scenes[currentScene]);
        updateSelectedSceneName();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseDown(event) {
    event.preventDefault();

    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(hotspots);

    if (intersects.length > 0) {
        const hotspot = intersects[0].object;
        const targetScene = hotspot.userData.targetScene;
        changeScene(targetScene);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function populateImageList(scenesData) {
    const imageMenu = document.getElementById('imageMenu');
    scenesData.forEach((scene, index) => {
        const li = document.createElement('li');
        li.textContent = scene.name;
        li.onclick = () => changeScene(index);
        imageMenu.appendChild(li);
    });
}

function updateSelectedSceneName() {
    const selectedSpan = document.querySelector('.selected');
    if (selectedSpan) {
        selectedSpan.textContent = sceneNames[currentScene];
    }
}