import * as THREE from "three";
import LayerManager, { PCB_LAYERS } from "../LayerManager.js";
import PCBShape from "./PCBShape";

export default class Board extends PCBShape {

  constructor( _scene, layerManager, options = {
    width: 6,
    height: 0.18,
    depth: 4,
    holes: [], // Array<{ x: number, z: number, r: number }>
  } ) {
    super(options.width, options.depth, options.holes);
    this.scene = _scene;
    this.width = options.width;
    this.height = options.height;
    this.depth = options.depth;
    this.holes = options.holes ?? [];

    // Layer system (groups + helpers)
    this.layerManager = layerManager;

    // Create demo board + copper
    this.createBoard();
  }

  _makeBoardGeometry() {
    const shape = this._makePCBShape();

    // Extrude along +Z, then rotate so thickness is along Y, and center at y=0.
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: this.height,
      bevelEnabled: false,
      curveSegments: 48,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -this.height * 0.5, 0);
    geo.computeVertexNormals();
    return geo;
  }


  createBoard() {
    // Real drilled holes: board is an extruded shape with circular cutouts.
    const boardGeo = this._makeBoardGeometry();
    const boardMat = new THREE.MeshStandardMaterial({
      color:0x212529,
      roughness: 0.85,
      metalness: 0.0,
    });

    this.boardMesh = new THREE.Mesh(boardGeo, boardMat);
    this.boardMesh.name = "PCB_FR4_BOARD";
    this.boardMesh.castShadow = false;
    this.boardMesh.receiveShadow = true;

    // Put board in its own group/layer
    this.layerManager.add(PCB_LAYERS.BOARD, this.boardMesh);

  }

  update() {
    // reserved for animations later
  }
}
