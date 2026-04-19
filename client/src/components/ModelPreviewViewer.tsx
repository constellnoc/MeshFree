import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import type { Color, Material, Mesh, Object3D, PerspectiveCamera, Texture } from "three";
import { ACESFilmicToneMapping, Box3, DoubleSide, SRGBColorSpace, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

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

function ViewerLoadingState() {
  return (
    <div className="detail-viewer-loading" role="status" aria-live="polite">
      <p>Loading model preview...</p>
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

      previewMaterial.side = DoubleSide;
      previewMaterial.needsUpdate = true;
    }
  });
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
}: {
  modelUrl: string;
  resetVersion: number;
  backgroundColor: string;
}) {
  const gltf = useGLTF(modelUrl) as { scene: Object3D; parser?: GLTFParserLike };
  const { camera, invalidate } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const initialViewRef = useRef<{
    position: Vector3;
    target: Vector3;
    minDistance: number;
    maxDistance: number;
  } | null>(null);
  const parserRef = useRef<GLTFParserLike | undefined>(gltf.parser);
  const clonedScene = useMemo(() => {
    const nextScene = gltf.scene.clone(true);
    prepareSceneColors(nextScene);
    return nextScene;
  }, [gltf.scene]);

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
    perspectiveCamera.near = Math.max(distance / 100, 0.01);
    perspectiveCamera.far = Math.max(distance * 25, 100);
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

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={1.35} />
      <hemisphereLight groundColor="#111827" intensity={0.92} color="#ffffff" />
      <directionalLight color="#f8fafc" intensity={1.25} position={[4, 6, 5]} />
      <directionalLight color="#e2e8f0" intensity={0.42} position={[-5, 3, 4]} />
      <directionalLight color="#dbeafe" intensity={0.24} position={[0, -2, -4]} />
      <primitive object={clonedScene} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        makeDefault
        rotateSpeed={0.82}
        zoomSpeed={0.86}
      />
    </>
  );
}

export default function ModelPreviewViewer({ modelUrl, title, onClose }: ModelPreviewViewerProps) {
  const [resetVersion, setResetVersion] = useState(0);
  const [backgroundPreset, setBackgroundPreset] = useState<ViewerBackgroundPreset>("white");
  const activeBackground = viewerBackgroundPresets.find((preset) => preset.id === backgroundPreset) ?? viewerBackgroundPresets[0];

  return (
    <div className={`detail-viewer-shell detail-viewer-shell-${backgroundPreset}`}>
      <div className="detail-viewer-toolbar">
        <div className="detail-viewer-label">{title}</div>
        <div className="detail-viewer-toolbar-actions">
          <div className="detail-viewer-background-group" role="group" aria-label="Viewer background color">
            {viewerBackgroundPresets.map((preset) => (
              <button
                key={preset.id}
                className={`detail-viewer-swatch detail-viewer-swatch-${preset.id}${preset.id === backgroundPreset ? " is-active" : ""}`}
                type="button"
                onClick={() => setBackgroundPreset(preset.id)}
                aria-label={`Switch background to ${preset.label}`}
                title={preset.label}
              />
            ))}
          </div>
          <button className="button-link secondary detail-viewer-button" type="button" onClick={() => setResetVersion((value) => value + 1)}>
            Reset view
          </button>
          <button className="button-link secondary detail-viewer-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <ViewerErrorBoundary
        fallback={
          <div className="detail-viewer-error" role="alert">
            <p>3D preview is unavailable for this file.</p>
            <button className="button-link secondary detail-viewer-button" type="button" onClick={onClose}>
              Close
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
            gl.toneMappingExposure = 1.08;
          }}
        >
          <Suspense
            fallback={
              <Html center>
                <ViewerLoadingState />
              </Html>
            }
          >
            <PreviewScene modelUrl={modelUrl} resetVersion={resetVersion} backgroundColor={activeBackground.canvasColor} />
          </Suspense>
        </Canvas>
      </ViewerErrorBoundary>

      <p className="detail-viewer-hint">Drag to rotate and scroll to zoom.</p>
      <span className="sr-only">{title} 3D preview viewer.</span>
    </div>
  );
}
