/**
 * Three.js 3D Layer
 * Renders 3D models on MapLibre canvas
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { get3DModelsInView } from '../lib/3dModels';

interface ThreeDLayerProps {
  map: any;
  zoom: number;
}

const ThreeDLayer: React.FC<ThreeDLayerProps> = ({ map, zoom }) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    if (!map || zoom < 14) {
      // Only show 3D models when zoomed in close
      return;
    }

    // Initialize Three.js scene
    if (!sceneRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0); // Transparent background
      document.body.appendChild(renderer.domElement);

      // Add lighting
      const light = new THREE.DirectionalLight(0xffffff, 0.8);
      light.position.set(5, 10, 7);
      scene.add(light);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;

      // Load 3D models
      const loader = new GLTFLoader();
      const bounds = map.getBounds();
      const models = get3DModelsInView(bounds._sw.lat, bounds._sw.lng, bounds._ne.lat, bounds._ne.lng);

      models.forEach((model) => {
        // Placeholder: In real implementation, load from model.url
        // For now, create simple geometry
        const geometry = new THREE.BoxGeometry(model.scale, model.scale * 2, model.scale);
        const material = new THREE.MeshPhongMaterial({ color: 0x10b981 });
        const mesh = new THREE.Mesh(geometry, material);

        // Position based on lat/lon (simplified)
        mesh.position.set(
          (model.lon - bounds._sw.lng) * 100,
          model.scale,
          (model.lat - bounds._sw.lat) * 100
        );

        scene.add(mesh);
      });

      // Animate
      const animate = () => {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();
    }

    return () => {
      // Cleanup
    };
  }, [map, zoom]);

  return null; // Renders directly to canvas
};

export default ThreeDLayer;
