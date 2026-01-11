import * as THREE from "three";

export const PCB_LAYERS = {
  BOARD: "board",
  TOP_COPPER: "top_copper",
  BOTTOM_COPPER: "bottom_copper",
};

// You can extend this later with visibility toggles, ordering rules, etc.
export default class LayerManager {
  
  constructor(scene) {
    this.scene = scene;
    this.groups = new Map();

    // Create groups in a deterministic order
    this.ensure(PCB_LAYERS.BOARD);
    this.ensure(PCB_LAYERS.TOP_COPPER);
    this.ensure(PCB_LAYERS.BOTTOM_COPPER);
  }

  ensure(layerName) {
    if (this.groups.has(layerName)) return this.groups.get(layerName);
    const g = new THREE.Group();
    g.name = `LAYER_${layerName}`;
    this.scene.add(g);
    this.groups.set(layerName, g);
    return g;
  }

  add(layerName, object3d) {
    const g = this.ensure(layerName);
    g.add(object3d);
  }

  setVisible(layerName, visible) {
    const g = this.groups.get(layerName);
    if (g) g.visible = visible;
  }

  getLayerPosY(layerName) {
    if (layerName === PCB_LAYERS.TOP_COPPER) return this.topCopperY;
    if (layerName === PCB_LAYERS.BOTTOM_COPPER) return this.bottomCopperY;
    return 0;
  }

  setLayerPosY(layerName, y) {
    if (layerName === PCB_LAYERS.TOP_COPPER) this.topCopperY = y;
    if (layerName === PCB_LAYERS.BOTTOM_COPPER) this.bottomCopperY = y;
  }

  getGroup(layerName) {
    return this.groups.get(layerName);
  }
}
