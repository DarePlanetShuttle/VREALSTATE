let camera, scene, renderer, controls;
const scenes = [];
let currentScene = 0;
const hotspots = [];
let sceneNames = [];
let scenesData = [];
let INTERSECTED;
const originalTextures = {};

async function init() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1);

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    try {
        scenesData = await fetchScenesData('./public/data.json');
        sceneNames = scenesData.map(scene => scene.name);
        populateImageList(scenesData);
        const textures = await loadTextures(scenesData);
        createMeshes(textures);
        updateSelectedSceneName();
        checkAndPrintButtons(scenesData[currentScene]);
    } catch (error) {
        console.error('Error loading JSON or textures:', error);
    }

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('click', onDocumentClick, false);

    document.getElementById('removeFurnitureButton').addEventListener('click', handleRemoveFurnitureButtonClick);
    document.getElementById('redesignButton').addEventListener('click', handleRedesignButtonClick);
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

    scene.add(scenes[currentScene]);
}

function changeScene(index) {
    if (index >= 0 && index < scenes.length) {
        scene.remove(scenes[currentScene]);
        clearButtons();
        hotspots.length = 0;

        currentScene = index;
        scene.add(scenes[currentScene]);
        updateSelectedSceneName();
        checkAndPrintButtons(scenesData[currentScene]);
    } else {
        console.error(`Invalid scene index: ${index}`);
    }
}

function handleRemoveFurnitureButtonClick() {
    const currentSceneData = scenesData[currentScene];
    if (currentSceneData.remove_furniture) {
        toggleTexture(currentSceneData.remove_furniture);
    } else {
        console.error('No remove_furniture link found for the current scene');
    }
}

function handleRedesignButtonClick() {
    const currentSceneData = scenesData[currentScene];
    if (currentSceneData.redesign) {
        toggleTexture(currentSceneData.redesign);
    } else {
        console.error('No redesign link found for the current scene');
    }
}

function toggleTexture(texturePath) {
    const currentMaterial = scenes[currentScene].material;
    const currentTexture = currentMaterial.map;

    if (!originalTextures[currentScene]) {
        originalTextures[currentScene] = currentTexture;
        changeTexture(texturePath);
    } else {
        scenes[currentScene].material = new THREE.MeshBasicMaterial({ map: originalTextures[currentScene] });
        delete originalTextures[currentScene];
    }
}

function changeTexture(texturePath) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        texturePath,
        (texture) => {
            const material = new THREE.MeshBasicMaterial({ map: texture });
            scenes[currentScene].material = material;
        },
        undefined,
        (err) => {
            console.error(`Error loading texture: ${texturePath}`, err);
        }
    );
}

function changeSceneByLink(link) {
    const targetSceneIndex = scenesData.findIndex(scene => scene.image === link);

    if (targetSceneIndex >= 0) {
        changeScene(targetSceneIndex);
    } else {
        console.error(`Scene with link ${link} not found`);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(hotspots);

    if (intersects.length > 0) {
        if (INTERSECTED != intersects[0].object) {
            if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
            INTERSECTED = intersects[0].object;
            INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
            INTERSECTED.material.color.setHex(0x323741);
        }
    } else {
        if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
        INTERSECTED = null;
    }
}

function onDocumentClick(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(hotspots);

    if (intersects.length > 0) {
        const intersectedButton = intersects[0].object;
        const link = intersectedButton.userData.link;
        if (link) {
            intersectedButton.material.color.setHex(0x26489a);
            setTimeout(() => changeSceneByLink(link), 200);
        }
    }
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
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

function createStyledVRButton(buttonData) {
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const vrButton = new THREE.Mesh(geometry, material);
    vrButton.position.set(buttonData.position.x, buttonData.position.y, buttonData.position.z);
    vrButton.userData.link = buttonData.link;
    vrButton.userData.id = buttonData.id;

    return vrButton;
}

function checkAndPrintButtons(sceneData) {
    clearButtons();

    if (sceneData.buttons && sceneData.buttons.length > 0) {
        sceneData.buttons.forEach(buttonData => {
            const vrButton = createStyledVRButton(buttonData);
            scenes[currentScene].add(vrButton);
            hotspots.push(vrButton);
        });
    }
}

function clearButtons() {
    hotspots.forEach(hotspot => {
        scenes[currentScene].remove(hotspot);
    });
    hotspots.length = 0;
}

class VRButton {
    static createButton(renderer, sessionInit = {}) {
        const button = document.createElement('button');

        function showEnterVR() {
            let currentSession = null;

            async function onSessionStarted(session) {
                session.addEventListener('end', onSessionEnded);
                await renderer.xr.setSession(session);
                button.textContent = 'EXIT VR';
                currentSession = session;
            }

            function onSessionEnded() {
                currentSession.removeEventListener('end', onSessionEnded);
                button.textContent = 'ENTER VR';
                currentSession = null;
            }

            button.style.display = '';
            button.style.cursor = 'pointer';
            button.style.left = 'calc(50% - 50px)';
            button.style.width = '100px';
            button.textContent = 'ENTER VR';

            const sessionOptions = {
                ...sessionInit,
                optionalFeatures: ['local-floor', 'bounded-floor', 'layers', ...(sessionInit.optionalFeatures || [])],
            };

            button.onmouseenter = function () {
                button.style.opacity = '1.0';
            };

            button.onmouseleave = function () {
                button.style.opacity = '0.5';
            };

            button.onclick = function () {
                if (currentSession === null) {
                    navigator.xr.requestSession('immersive-vr', sessionOptions).then(onSessionStarted);
                } else {
                    currentSession.end();
                }
            };

            if (navigator.xr.requestSession !== undefined) {
                navigator.xr.requestSession('immersive-vr', sessionOptions).then(onSessionStarted).catch((err) => {
                    console.warn(err);
                });
            }
        }

        function disableButton() {
            button.style.display = '';
            button.style.cursor = 'auto';
            button.style.left = 'calc(50% - 75px)';
            button.style.width = '150px';
            button.onmouseenter = null;
            button.onmouseleave = null;
            button.onclick = null;
        }

        function showWebXRNotFound() {
            disableButton();
            button.textContent = 'VR NOT SUPPORTED';
        }

        function showVRNotAllowed(exception) {
            disableButton();
            console.warn('Exception when trying to call xr.isSessionSupported', exception);
            button.textContent = 'VR NOT ALLOWED';
        }

        function stylizeElement(element) {
            element.style.position = 'absolute';
            element.style.bottom = '20px';
            element.style.padding = '12px 6px';
            element.style.border = '1px solid #fff';
            element.style.borderRadius = '4px';
            element.style.background = 'rgba(0,0,0,0.1)';
            element.style.color = '#fff';
            element.style.font = 'normal 13px sans-serif';
            element.style.textAlign = 'center';
            element.style.opacity = '0.5';
            element.style.outline = 'none';
            element.style.zIndex = '999';
        }

        if ('xr' in navigator) {
            button.id = 'VRButton';
            button.style.display = 'none';
            stylizeElement(button);

            navigator.xr.isSessionSupported('immersive-vr').then(function (supported) {
                supported ? showEnterVR() : showWebXRNotFound();
                if (supported && VRButton.xrSessionIsGranted) {
                    button.click();
                }
            }).catch(showVRNotAllowed);

            return button;
        } else {
            const message = document.createElement('a');
            if (window.isSecureContext === false) {
                message.href = document.location.href.replace(/^http:/, 'https:');
                message.innerHTML = 'WEBXR NEEDS HTTPS';
            } else {
                message.href = 'https://immersiveweb.dev/';
                message.innerHTML = 'WEBXR NOT AVAILABLE';
            }
            message.style.left = 'calc(50% - 90px)';
            message.style.width = '180px';
            message.style.textDecoration = 'none';
            stylizeElement(message);
            return message;
        }
    }

    static registerSessionGrantedListener() {
        if (typeof navigator !== 'undefined' && 'xr' in navigator) {
            if (/WebXRViewer\//i.test(navigator.userAgent)) return;
            navigator.xr.addEventListener('sessiongranted', () => {
                VRButton.xrSessionIsGranted = true;
            });
        }
    }
}

VRButton.xrSessionIsGranted = false;
VRButton.registerSessionGrantedListener();

init();
animate();
