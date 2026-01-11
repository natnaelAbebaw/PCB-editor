## Performance strategy for rendering many pads

When working on this PCB viewer, my main performance concern was how to efficiently render a large number of very small pads without overloading the CPU or increasing draw calls unnecessarily.

To solve this, I chose to use THREE.InstancedMesh for rendering pads. Instead of creating a separate mesh for every pad, all pads that share the same geometry and material are rendered as instances of a single mesh. This allows the GPU to draw many pads in one draw call, which is significantly more efficient than managing hundreds of individual objects.

Each pad’s position, rotation, and scale are stored in the instanceMatrix, so every pad can still appear in a unique location and size even though they share the same geometry and material. When per-pad data is needed (such as hole information or size), I pass it using per-instance attributes rather than creating new meshes.

For interaction, I use raycasting on the instanced mesh. Three.js provides the instanceId of the hit pad, which makes it possible to handle hover and selection correctly. The hover and selection states are then passed to the shader as uniforms, allowing only the affected pad to be highlighted while keeping the rendering fully instanced.

When a pad needs to be moved, I attach transform controls to a temporary proxy object. The proxy’s transform is written back into the corresponding instance matrix, so the pad can be edited without breaking the instancing approach.

Overall, this strategy keeps the scene lightweight, minimizes draw calls, and allows the application to scale smoothly even when rendering a large number of pads.

## Z-fighting mitigation strategy

Because a PCB is composed of many extremely thin and closely layered surfaces (board substrate, copper layers, pads, traces, and outlines), Z-fighting can easily occur if all geometry is rendered at the same depth. Preventing this was an important part of the rendering strategy.

To mitigate Z-fighting, I used a combination of explicit layer spacing and polygon offset, depending on the type of geometry.

First, each logical PCB layer (board surface, top copper, bottom copper, pads, and traces) is rendered at a slightly different Y offset. These offsets are very small but consistent, which ensures that surfaces never occupy the exact same depth in the depth buffer. This approach is predictable and works well for flat, layered geometry like PCBs.

For additional safety—especially for coplanar geometry such as pads and traces rendered on top of the copper layer—I enabled polygon offset on materials. Polygon offset shifts the depth values at rasterization time, ensuring that copper features are consistently rendered above the board surface without flickering.

For edge outlines, I avoided disabling depth testing globally. Instead, outlines are rendered with depth testing enabled but with depth writing disabled and a slightly higher render order. This ensures that edges are visible on the front-facing geometry while still being correctly occluded by objects in front, preventing outlines from appearing through the board.

By combining small, intentional layer offsets with polygon offset and careful depth settings, the scene remains visually stable and free of Z-fighting even when rendering many thin, overlapping PCB features.