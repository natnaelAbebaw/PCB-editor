import * as THREE from "three";
import SmdPads, { SMD_PAD_SHAPES } from "./smdPads";
import LayerManager, { PCB_LAYERS } from "../LayerManager";
import Board from "./board";
import ThroughHoles from "./throughHoles";
import Traces from "./Traces";
import CopperLayer from "./copperLayer";

export default class PrimitiveManager {
  constructor({ scene, initialConfig } = {}) {
    this.scene = scene;
    this._disposables = [];

    this.config = initialConfig ?? this._defaultConfig();
    this.initialize(this.config);
  }

  _defaultConfig() {
    return {
      version: 1,
      board: { width: 6, height: 0.10, depth: 4 },
      holes: [
        { x: 0.5, z: 0.5, r: 0.03 },
        { x: 0.2, z: 0.7, r: 0.03 },
        { x: -0.2, z: 0.7, r: 0.03 },
        { x: 0.2, z: -0.7, r: 0.03 },
        { x: -0.5, z: 0.5, r: 0.03 },
        { x: -1, z: 0.9, r: 0.03 },
        { x: -0.2, z: -0.7, r: 0.03 },
        { x: 0.57, z: -0.9, r: 0.03 },
        { x: -0.5, z: -0.5, r: 0.03 },
        { x: 0.5, z: 0.9, r: 0.03 },
        { x: -0.5, z: 0.5, r: 0.03 }
      ],
      pads: [{
        shape: "RECTANGLE",
        layer: "TOP_COPPER",
        name: "SMD_PADS_RECTANGLE",
        padAttributes: [
          { size: [2, 2], position: [-1, 0.9], name: "SMD_PAD_1" },
          { size: [3, 3], position: [-0.5, 0.5], name: "SMD_PAD_2" },
          { size: [2, 2], position: [0, 0], name: "SMD_PAD_3" },
          { size: [2, 2], position: [1, -0.7], name: "SMD_PAD_4" },
          { size: [3, 3], position: [0.5, -0.7], name: "SMD_PAD_5" },
          { size: [2.5 , 2.5], position: [0.5, 0.9], name: "SMD_PAD_6" },
          { size: [4, 4], position: [0.8, 0.8], name: "SMD_PAD_7" },
          { size: [3, 3], position: [0.3, 0.3], name: "SMD_PAD_8" }
        ]
      },
      {
        shape: "CIRCLE",
        layer: "TOP_COPPER",
        name: "SMD_PADS_CIRCLE",
        padAttributes: [
          { radius: 2, position: [0.7, 0.34], name: "SMD_PAD_1" },
          { radius: 2, position: [0, 0.5], name: "SMD_PAD_2" },
          { radius: 2, position: [0, -0.5], name: "SMD_PAD_3" },
          { radius: 2, position: [0.5, 0], name: "SMD_PAD_4" },
          { radius: 2, position: [-0.5, 0], name: "SMD_PAD_5" },
        ]
      },
      {
        shape: "CIRCLE",
        layer: "BOTTOM_COPPER",
        name: "SMD_PADS_CIRCLE",
        padAttributes: [
          { radius: 2, position: [0.7, 0.34], name: "SMD_PAD_1" },
          { radius: 2, position: [0, 0.5], name: "SMD_PAD_2" },
          { radius: 2, position: [0, -0.5], name: "SMD_PAD_3" },
          { radius: 2, position: [0.5, 0], name: "SMD_PAD_4" },
          { radius: 2, position: [-0.5, 0], name: "SMD_PAD_5" },
        ]
      },

      {
        shape: "RECTANGLE",
        layer: "BOTTOM_COPPER",
        name: "SMD_PADS_RECTANGLE",
        padAttributes: [
          { size: [2, 2], position: [-1, 0.9], name: "SMD_PAD_1" },
          { size: [3, 3], position: [-0.5, 0.5], name: "SMD_PAD_2" },
          { size: [2, 2], position: [0, 0], name: "SMD_PAD_3" },
          { size: [2, 2], position: [1, -0.7], name: "SMD_PAD_4" },
          { size: [3, 3], position: [0.5, -0.7], name: "SMD_PAD_5" },
          { size: [2.5 , 2.5], position: [0.5, 0.9], name: "SMD_PAD_6" },
          { size: [4, 4], position: [0.8, 0.8], name: "SMD_PAD_7" },
          { size: [3, 3], position: [0.3, 0.3], name: "SMD_PAD_8" }
        ]
      }
      
    ],
      traces: [
        {
          layer: "TOP_COPPER",
          width: 0.03,
          points: [
            { x: 0, z: 0 },
            { x: 0.5, z: 0 },
            { x: 0.5, z: 0.5 },
            { x: 0, z: 0.5 }
          ]
        },
        {
          layer: "BOTTOM_COPPER",
          width: 0.03,
          points: [
            { x: 0, z: 0 },
            { x: 0.5, z: 0 },
            { x: 0.5, z: 0.5 },
            { x: 0, z: 0.5 }
          ]
        },
        {
          layer: "BOTTOM_COPPER",
          width: 0.03,
          points: [
            { x: -0.7, z: -0.7 },
            { x: -0.7, z: -0.5 },
            { x: 0.8, z: -0.5 },
            { x: 0.8, z: 0.5 },
          ]
        }
      ]
    };
  }

  initialize(config) {
    this.destroy();

    this.config = config;

    this.layerManager = new LayerManager(this.scene);

    this.holes = config.holes ?? [];

    const { width, height, depth } = config.board;

    this.board = new Board(this.scene, this.layerManager, {
      width,
      height,
      depth,
      holes: this.holes,
    });

    this.topCopper = new CopperLayer(this.scene, this.layerManager, PCB_LAYERS.TOP_COPPER, {
      height: this.board.height,
      holes: this.holes,
    });

    this.bottomCopper = new CopperLayer(this.scene, this.layerManager, PCB_LAYERS.BOTTOM_COPPER, {
      height: this.board.height,
      holes: this.holes,
    });

    const padsCfg = config.pads;
    this.smdPads = [];
    padsCfg.forEach((padsCfg) => {
      const shapeEnum =
        padsCfg.shape === "CIRCLE"
          ? SMD_PAD_SHAPES.CIRCLE
          : SMD_PAD_SHAPES.RECTANGLE;
      const layerEnum =
        padsCfg.layer === "BOTTOM_COPPER"
          ? PCB_LAYERS.BOTTOM_COPPER
          : PCB_LAYERS.TOP_COPPER;
      this.smdPads.push(new SmdPads(shapeEnum, layerEnum, this.scene, this.layerManager, {
        defaultPadSize: padsCfg.defaultPadSize,
        defaultRadius: padsCfg.defaultRadius,
        defaultThickness: padsCfg.defaultThickness,
        name: padsCfg.name ?? "SMD_PADS",
        boundZ: depth / 2,
        boundX: width / 2,
        holes: this.holes,
        padAttributes: padsCfg.padAttributes ?? [],
      }));
    });

    this.throughHoles = new ThroughHoles(this.scene, {
      positions: this.holes,
      boardThickness: height,
      yCenter: 0,
      boundX: width / 2,
      boundZ: depth / 2,
    });

    this.traces = (config.traces ?? []).map((tCfg) => {
      const layer =
        tCfg.layer === "BOTTOM_COPPER" ? PCB_LAYERS.BOTTOM_COPPER : PCB_LAYERS.TOP_COPPER;

      return new Traces(this.scene, {
        points: tCfg.points,
        width: tCfg.width,
        y: this.layerManager.getLayerPosY(layer),
      });
    });

    this._setupLights();
  }

  _setupLights() {
    // You can keep these non-persistent; re-create every time
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.8);
    hemi.name = "HEMI_LIGHT";
    this.scene.add(hemi);
    this.addDisposable(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.name = "DIR_LIGHT";
    dir.position.set(8, 10, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    this.scene.add(dir);
    this.addDisposable(dir);
    
    const dirBottom = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.name = "DIR_LIGHT";
    dirBottom.position.set(8, -10, 6);
    dirBottom.castShadow = true;
    dirBottom.shadow.mapSize.set(1024, 1024);
    this.scene.add(dirBottom);
    this.addDisposable(dirBottom);


    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    ambient.name = "AMBIENT_LIGHT";
    this.scene.add(ambient);
    this.addDisposable(ambient);
  }

  exportJSON() {
    // Export LIVE pads from current instanced transforms (after dragging),
    // not the stale config used at initialization.
    const padsLive = Array.isArray(this.smdPads)
      ? this.smdPads.map((p) => p?.getConfigSnapshot?.()).filter(Boolean)
      : [];
    return {
      version: 1,
      board: { ...this.config.board },
      holes: this.holes.map((h) => ({ x: h.x, z: h.z, r: h.r })),
      pads: padsLive,
      traces: (this.config.traces ?? []).map((t) => ({
        layer: t.layer ?? "TOP_COPPER",
        width: t.width,
        points: t.points.map((p) => ({ x: p.x, z: p.z })),
      })),
    };
  }

  loadFromJSON(json) {
    const cfg = {
      version: json.version ?? 1,
      board: json.board,
      holes: json.holes ?? [],
      pads: json.pads,
      traces: json.traces ?? [],
    };

    this.initialize(cfg);
  }

  addDisposable(obj) {
    this._disposables.push(obj);
    return obj;
  }

  destroy() {
    for (const obj of this._disposables) {
      if (obj?.geometry) obj.geometry.dispose?.();
      if (obj?.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.filter(Boolean).forEach((m) => {
          for (const k in m) {
            const v = m[k];
            if (v && typeof v.dispose === "function") v.dispose();
          }
          m.dispose?.();
        });
      }
      obj?.parent?.remove(obj);
    }
    this._disposables.length = 0;

    this.board?.dispose?.();
    this.topCopper?.dispose?.();
    this.bottomCopper?.dispose?.();
    if (Array.isArray(this.smdPads)) this.smdPads.forEach((p) => p?.dispose?.());
    this.throughHoles?.dispose?.();
    if (Array.isArray(this.traces)) this.traces.forEach((t) => t.dispose?.());

    this.board = null;
    this.topCopper = null;
    this.bottomCopper = null;
    this.smdPads = null;
    this.throughHoles = null;
    this.traces = null;
    this.layerManager = null;
  }
}
