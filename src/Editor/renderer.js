import * as THREE from 'three'

export default class Renderer
{
    constructor( _canvas, _sizes, _scene, _camera )
    {
        this.canvas = _canvas
        this.sizes = _sizes
        this.scene = _scene
        this.camera = _camera

        this.setInstance()
    }

    setInstance()
    {

        if (!this.canvas) {
          throw new Error("Renderer: canvas is null. Pass a valid <canvas> element.");
        }
    
        this.instance = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        })

        
      const gl = this.instance.getContext();
      if (!gl) {
        throw new Error(
          "WebGL context is null. Possible causes: canvas not mounted, context lost, GPU/WebGL disabled, or StrictMode double-init without proper destroy()."
        );
      }
 
        this.instance.setClearColor('#211d20')
        this.instance.setSize(this.sizes.width, this.sizes.height)
        this.instance.setPixelRatio(Math.min(this.sizes.pixelRatio, 2))
    }

    resize()
    {
        this.instance.setSize(this.sizes.width, this.sizes.height)
        this.instance.setPixelRatio(Math.min(this.sizes.pixelRatio, 2))
    }

    update()
    {
        this.instance.render(this.scene, this.camera.instance)
    }
}