import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Html, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import type { AnimationAction, AnimationClip, Color, Material, Mesh, Object3D, PerspectiveCamera, Texture } from "three";
import { ACESFilmicToneMapping, Box3, MOUSE, SRGBColorSpace, Vector3 } from "three";
import { clone as cloneSkinnedScene } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { useLanguage } from "../contexts/LanguageContext";

interface ModelPreviewViewerProps {
  modelUrl: string;
  title: string;
  onClose: () => void;
}

type ViewerBackgroundPreset = "white" | "black" | "softWhite" | "softBlack";

const viewerBackgroundPresets: Array<{
  id: ViewerBackgroundPreset;
  label: string;
  canvasColor: string;
}> = [
  { id: "white", label: "White", canvasColor: "#ffffff" },
  { id: "black", label: "Black", canvasColor: "#05070c" },
  { id: "softWhite", label: "Soft White", canvasColor: "#f3efe7" },
  { id: "softBlack", label: "Soft Black", canvasColor: "#2f3440" },
];

interface ViewerErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ViewerErrorBoundaryState {
  hasError: boolean;
}

class ViewerErrorBoundary extends Component<ViewerErrorBoundaryProps, ViewerErrorBoundaryState> {
  public constructor(props: ViewerErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  public componentDidCatch(error: unknown) {
    console.error("Failed to render GLB preview.");
    console.error(error);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function ViewerLoadingState({ message }: { message: string }) {
  return (
    <div className="detail-viewer-loading" role="status" aria-live="polite">
      <p>{message}</p>
    </div>
  );
}

type PreviewMaterial = Material & {
  color?: Color;
  map?: Texture | null;
  emissiveMap?: Texture | null;
  normalMap?: Texture | null;
  metalness?: number;
  roughness?: number;
  envMapIntensity?: number;
  opacity?: number;
  transparent?: boolean;
  side?: number;
  needsUpdate?: boolean;
};

interface ViewerCopy {
  backgroundGroupAriaLabel: string;
  backgroundPresetLabels: Record<ViewerBackgroundPreset, string>;
  switchBackgroundTo: (label: string) => string;
  resetView: string;
  close: string;
  unavailable: string;
  loading: string;
  hint: string;
  srOnlyTitle: (title: string) => string;
  animationDetected: string;
  noAnimation: string;
  playAnimation: string;
  pauseAnimation: string;
  resetAnimation: string;
  animationSelectLabel: string;
  currentAnimationLabel: string;
  animationClipFallback: (index: number) => string;
}

type SpecGlossExtension = {
  diffuseFactor?: [number, number, number, number];
  diffuseTexture?: {
    index: number;
  };
  glossinessFactor?: number;
};

type ParserMaterialDef = {
  normalTexture?: {
    index: number;
  };
  extensions?: {
    KHR_materials_pbrSpecularGlossiness?: SpecGlossExtension;
  };
};

type GLTFParserLike = {
  associations: Map<unknown, { materials?: number }>;
  json: {
    materials?: ParserMaterialDef[];
  };
  getDependency: (type: string, index: number) => Promise<Texture>;
};

function prepareSceneColors(root: Object3D) {
  root.traverse((child) => {
    const mesh = child as Mesh;

    if (!mesh.isMesh) {
      return;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      if (!material) {
        continue;
      }

      const previewMaterial = material as PreviewMaterial;

      if (previewMaterial.map) {
        previewMaterial.map.colorSpace = SRGBColorSpace;
      }

      if (previewMaterial.emissiveMap) {
        previewMaterial.emissiveMap.colorSpace = SRGBColorSpace;
      }

      previewMaterial.needsUpdate = true;
    }
  });
}

function stopAllActions(actions: Record<string, AnimationAction | null | undefined>) {
  for (const action of Object.values(actions)) {
    action?.stop();
  }
}

function configurePerspectiveCamera(camera: PerspectiveCamera, near: number, far: number) {
  camera.near = near;
  camera.far = far;
}

function setAnimationPaused(action: AnimationAction, paused: boolean) {
  action.paused = paused;
}

async function applyLegacySpecGlossMaterials(
  sourceScene: Object3D,
  clonedScene: Object3D,
  parser: GLTFParserLike,
): Promise<boolean> {
  const sourceObjects: Object3D[] = [];
  const clonedObjects: Object3D[] = [];
  let applied = false;

  sourceScene.traverse((object) => {
    sourceObjects.push(object);
  });

  clonedScene.traverse((object) => {
    clonedObjects.push(object);
  });

  await Promise.all(
    sourceObjects.map(async (sourceObject, index) => {
      const clonedObject = clonedObjects[index];
      const sourceMesh = sourceObject as Mesh;
      const clonedMesh = clonedObject as Mesh;

      if (!sourceMesh?.isMesh || !clonedMesh?.isMesh) {
        return;
      }

      const sourceMaterials = Array.isArray(sourceMesh.material) ? sourceMesh.material : [sourceMesh.material];
      const clonedMaterials = Array.isArray(clonedMesh.material) ? clonedMesh.material : [clonedMesh.material];

      await Promise.all(
        sourceMaterials.map(async (sourceMaterial, materialIndex) => {
          const association = parser.associations.get(sourceMaterial) ?? parser.associations.get(sourceMesh);
          const definitionIndex = association?.materials;

          if (definitionIndex === undefined) {
            return;
          }

          const materialDef = parser.json.materials?.[definitionIndex];
          const specGloss = materialDef?.extensions?.KHR_materials_pbrSpecularGlossiness;

          if (!specGloss) {
            return;
          }

          const clonedMaterial = clonedMaterials[materialIndex] as PreviewMaterial | undefined;

          if (!clonedMaterial) {
            return;
          }

          if (specGloss.diffuseFactor && clonedMaterial.color) {
            const [red, green, blue, alpha] = specGloss.diffuseFactor;
            clonedMaterial.color.setRGB(red, green, blue);
            clonedMaterial.opacity = alpha;
            clonedMaterial.transparent = alpha < 1;
          }

          if (specGloss.diffuseTexture) {
            const diffuseTexture = await parser.getDependency("texture", specGloss.diffuseTexture.index);
            diffuseTexture.colorSpace = SRGBColorSpace;
            clonedMaterial.map = diffuseTexture;
          }

          if (materialDef?.normalTexture) {
            const normalTexture = await parser.getDependency("texture", materialDef.normalTexture.index);
            clonedMaterial.normalMap = normalTexture;
          }

          if (typeof specGloss.glossinessFactor === "number") {
            clonedMaterial.metalness = 0;
            // Old spec/gloss assets can become unnaturally shiny when mapped
            // directly to modern roughness. Bias toward a soft organic surface.
            clonedMaterial.roughness = 0.9 - Math.min(specGloss.glossinessFactor, 1) * 0.08;
          }

          clonedMaterial.metalness = 0;
          clonedMaterial.roughness = Math.max(clonedMaterial.roughness ?? 0.88, 0.82);
          clonedMaterial.envMapIntensity = 0.18;

          clonedMaterial.needsUpdate = true;
          applied = true;
        }),
      );
    }),
  );

  return applied;
}

function PreviewScene({
  modelUrl,
  resetVersion,
  backgroundColor,
  copy,
}: {
  modelUrl: string;
  resetVersion: number;
  backgroundColor: string;
  copy: ViewerCopy;
}) {
  const gltf = useGLTF(modelUrl) as { animations?: AnimationClip[]; scene: Object3D; parser?: GLTFParserLike };
  const { camera, invalidate } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const initialViewRef = useRef<{
    position: Vector3;
    target: Vector3;
    minDistance: number;
    maxDistance: number;
  } | null>(null);
  const parserRef = useRef<GLTFParserLike | undefined>(gltf.parser);
  const animationClips = useMemo(
    () =>
      (gltf.animations ?? []).map((clip, index) => {
        const nextClip = clip.clone();

        if (!nextClip.name.trim()) {
          nextClip.name = `__meshfree_clip_${index + 1}`;
        }

        return nextClip;
      }),
    [gltf.animations],
  );
  const clonedScene = useMemo(() => {
    const nextScene = cloneSkinnedScene(gltf.scene);
    prepareSceneColors(nextScene);
    return nextScene;
  }, [gltf.scene]);
  const { actions } = useAnimations(animationClips, clonedScene);
  const animationOptions = useMemo(
    () =>
      animationClips.map((clip, index) => ({
        label: clip.name.startsWith("__meshfree_clip_") ? copy.animationClipFallback(index + 1) : clip.name,
        name: clip.name,
      })),
    [animationClips, copy],
  );
  const [activeAnimationName, setActiveAnimationName] = useState<string | null>(animationOptions[0]?.name ?? null);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(animationOptions.length > 0);
  const hasAnimations = animationOptions.length > 0;

  useEffect(() => {
    parserRef.current = gltf.parser;
  }, [gltf.parser]);

  useEffect(() => {
    let isCancelled = false;

    const parser = parserRef.current;

    if (!parser) {
      return;
    }

    void applyLegacySpecGlossMaterials(gltf.scene, clonedScene, parser).then((applied) => {
      if (!isCancelled && applied) {
        invalidate();
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [clonedScene, gltf.scene, invalidate]);

  useLayoutEffect(() => {
    const perspectiveCamera = camera as PerspectiveCamera;
    const bounds = new Box3().setFromObject(clonedScene);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
    const radius = Math.max(maxDimension * 0.5, 0.25);
    const fovInRadians = (perspectiveCamera.fov * Math.PI) / 180;
    const distance = Math.max(radius / Math.tan(fovInRadians / 2), radius * 2.3);
    const nextPosition = new Vector3(center.x, center.y + radius * 0.12, center.z + distance * 1.05);
    const minDistance = Math.max(radius * 0.55, 0.08);
    const maxDistance = Math.max(distance * 4.5, minDistance + 2);

    perspectiveCamera.position.copy(nextPosition);
    configurePerspectiveCamera(perspectiveCamera, Math.max(distance / 100, 0.01), Math.max(distance * 25, 100));
    perspectiveCamera.lookAt(center);
    perspectiveCamera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.minDistance = minDistance;
      controlsRef.current.maxDistance = maxDistance;
      controlsRef.current.update();
    }

    initialViewRef.current = {
      position: nextPosition.clone(),
      target: center.clone(),
      minDistance,
      maxDistance,
    };
  }, [camera, clonedScene]);

  useEffect(() => {
    if (!initialViewRef.current) {
      return;
    }

    const perspectiveCamera = camera as PerspectiveCamera;
    const initialView = initialViewRef.current;

    perspectiveCamera.position.copy(initialView.position);
    perspectiveCamera.lookAt(initialView.target);
    perspectiveCamera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(initialView.target);
      controlsRef.current.minDistance = initialView.minDistance;
      controlsRef.current.maxDistance = initialView.maxDistance;
      controlsRef.current.update();
    }
  }, [camera, resetVersion]);

  useEffect(() => {
    stopAllActions(actions);

    if (!activeAnimationName) {
      return;
    }

    const nextAction = actions[activeAnimationName];

    if (!nextAction) {
      return;
    }

    nextAction.reset();
    setAnimationPaused(nextAction, false);

    if (isAnimationPlaying) {
      nextAction.play();
    }

    return () => {
      nextAction.stop();
    };
  }, [actions, activeAnimationName, isAnimationPlaying]);

  useEffect(() => () => stopAllActions(actions), [actions]);

  const currentAnimationLabel =
    animationOptions.find((option) => option.name === activeAnimationName)?.label ?? copy.noAnimation;

  function handleToggleAnimation() {
    if (!activeAnimationName) {
      return;
    }

    const nextAction = actions[activeAnimationName];

    if (!nextAction) {
      return;
    }

    if (isAnimationPlaying) {
      setAnimationPaused(nextAction, true);
      setIsAnimationPlaying(false);
      return;
    }

    setAnimationPaused(nextAction, false);
    nextAction.play();
    setIsAnimationPlaying(true);
  }

  function handleResetAnimation() {
    if (!activeAnimationName) {
      return;
    }

    const nextAction = actions[activeAnimationName];

    if (!nextAction) {
      return;
    }

    nextAction.reset();
    setAnimationPaused(nextAction, false);
    nextAction.play();
    setIsAnimationPlaying(true);
  }

  function handleAnimationChange(event: ChangeEvent<HTMLSelectElement>) {
    setActiveAnimationName(event.target.value);
    setIsAnimationPlaying(true);
  }

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight color="#ffffff" groundColor="#1f2937" intensity={0.35} />
      <directionalLight color="#ffffff" intensity={1.15} position={[5, 6, 7]} />
      <directionalLight color="#e5e7eb" intensity={0.28} position={[-4, 2, 4]} />
      <primitive object={clonedScene} />
      {hasAnimations ? (
        <Html fullscreen zIndexRange={[1, 0]}>
          <div className="detail-viewer-animation-overlay">
            <div className="detail-viewer-animation-panel" role="group" aria-label={copy.animationDetected}>
              <div className="detail-viewer-animation-status">
                <span className="detail-viewer-animation-badge">{copy.animationDetected}</span>
                <span className="detail-viewer-animation-name">
                  {copy.currentAnimationLabel}: {currentAnimationLabel}
                </span>
              </div>
              <div className="detail-viewer-animation-actions">
                <button className="button-link secondary detail-viewer-button" type="button" onClick={handleToggleAnimation}>
                  {isAnimationPlaying ? copy.pauseAnimation : copy.playAnimation}
                </button>
                <button className="button-link secondary detail-viewer-button" type="button" onClick={handleResetAnimation}>
                  {copy.resetAnimation}
                </button>
                {animationOptions.length > 1 ? (
                  <label className="detail-viewer-animation-select-wrap">
                    <span className="sr-only">{copy.animationSelectLabel}</span>
                    <select
                      className="detail-viewer-animation-select"
                      value={activeAnimationName ?? ""}
                      onChange={handleAnimationChange}
                      aria-label={copy.animationSelectLabel}
                    >
                      {animationOptions.map((option) => (
                        <option key={option.name} value={option.name}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>
          </div>
        </Html>
      ) : null}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        enablePan
        makeDefault
        mouseButtons={{
          LEFT: MOUSE.ROTATE,
          MIDDLE: MOUSE.PAN,
          RIGHT: MOUSE.PAN,
        }}
        panSpeed={0.9}
        rotateSpeed={0.82}
        zoomSpeed={0.86}
      />
    </>
  );
}

export default function ModelPreviewViewer({ modelUrl, title, onClose }: ModelPreviewViewerProps) {
  const { copy } = useLanguage();
  const [resetVersion, setResetVersion] = useState(0);
  const [backgroundPreset, setBackgroundPreset] = useState<ViewerBackgroundPreset>("white");
  const localizedBackgroundLabels = copy.viewer.backgroundPresetLabels;
  const activeBackground =
    viewerBackgroundPresets.find((preset) => preset.id === backgroundPreset) ?? viewerBackgroundPresets[0];

  return (
    <div className={`detail-viewer-shell detail-viewer-shell-${backgroundPreset}`}>
      <div className="detail-viewer-toolbar">
        <div className="detail-viewer-label">{title}</div>
        <div className="detail-viewer-toolbar-actions">
          <div
            className="detail-viewer-background-group"
            role="group"
            aria-label={copy.viewer.backgroundGroupAriaLabel}
          >
            {viewerBackgroundPresets.map((preset) => (
              <button
                key={preset.id}
                className={`detail-viewer-swatch detail-viewer-swatch-${preset.id}${preset.id === backgroundPreset ? " is-active" : ""}`}
                type="button"
                onClick={() => setBackgroundPreset(preset.id)}
                aria-label={copy.viewer.switchBackgroundTo(localizedBackgroundLabels[preset.id])}
                title={localizedBackgroundLabels[preset.id]}
              />
            ))}
          </div>
          <button className="button-link secondary detail-viewer-button" type="button" onClick={() => setResetVersion((value) => value + 1)}>
            {copy.viewer.resetView}
          </button>
          <button className="button-link secondary detail-viewer-button" type="button" onClick={onClose}>
            {copy.viewer.close}
          </button>
        </div>
      </div>

      <ViewerErrorBoundary
        fallback={
          <div className="detail-viewer-error" role="alert">
            <p>{copy.viewer.unavailable}</p>
            <button className="button-link secondary detail-viewer-button" type="button" onClick={onClose}>
              {copy.viewer.close}
            </button>
          </div>
        }
      >
        <Canvas
          camera={{ fov: 38, position: [0, 0.35, 6] }}
          dpr={[1, 1.75]}
          gl={{ antialias: true }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = SRGBColorSpace;
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 0.98;
          }}
        >
          <Suspense
            fallback={
              <Html center>
                <ViewerLoadingState message={copy.viewer.loading} />
              </Html>
            }
          >
            <PreviewScene
              key={modelUrl}
              modelUrl={modelUrl}
              resetVersion={resetVersion}
              backgroundColor={activeBackground.canvasColor}
              copy={copy.viewer}
            />
          </Suspense>
        </Canvas>
      </ViewerErrorBoundary>

      <p className="detail-viewer-hint">{copy.viewer.hint}</p>
      <span className="sr-only">{copy.viewer.srOnlyTitle(title)}</span>
    </div>
  );
}
