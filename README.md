## Performance strategy for rendering many pads

When working on this PCB viewer, my main performance concern was how to efficiently render a large number of very small pads without overloading the CPU or increasing draw calls unnecessarily.

To solve this, I chose to use THREE.InstancedMesh for rendering pads. Instead of creating a separate mesh for every pad, all pads that share the same geometry and material are rendered as instances of a single mesh. This allows the GPU to draw many pads in one draw call, which is significantly more efficient than managing hundreds of individual objects.

Each pad’s position, rotation, and scale are stored in the instanceMatrix, so every pad can still appear in a unique location and size even though they share the same geometry and material. When per-pad data is needed (such as hole information or size), I pass it using per-instance attributes rather than creating new meshes.

For interaction, I use raycasting on the instanced mesh. Three.js provides the instanceId of the hit pad, which makes it possible to handle hover and selection correctly. The hover and selection states are then passed to the shader as uniforms, allowing only the affected pad to be highlighted while keeping the rendering fully instanced.

When a pad needs to be moved, I attach transform controls to a temporary proxy object. The proxy’s transform is written back into the corresponding instance matrix, so the pad can be edited without breaking the instancing approach.

Overall, this strategy keeps the scene lightweight, minimizes draw calls, and allows the application to scale smoothly even when rendering a large number of pads.

## Z-fighting mitigation strategy

Because a PCB is made up of many very thin layers placed close to each other, Z-fighting can easily happen if multiple surfaces are rendered at the same depth. To avoid this, I made sure that each PCB layer is rendered slightly above or below the others.

I assigned small but consistent height offsets to the board, copper layers, pads, and traces so they never sit exactly on the same plane. Even though these offsets are very small, they are enough to keep the depth buffer stable and prevent flickering.

In cases where geometry is still very close, such as pads and traces rendered directly on top of the copper layer, I also use polygon offset in the material. This helps ensure that the copper features always render cleanly above the board surface.

For edge outlines, I keep depth testing enabled and disable depth writing, instead of drawing everything on top. This way, outlines are visible where they should be, but they don’t appear through the board or other geometry behind them.

By combining small layer offsets with polygon offset and careful depth settings, the PCB renders consistently without Z-fighting, even with many thin and overlapping elements.