import { useEffect, useRef, useState } from 'react'
import './App.css'
import Editor from './Editor/editor.js'
import Sidebar from './sideBar.jsx'
import pcbJson from './Editor/pcb.json'

function App() {
  const canvasRef = useRef(null);
  const expRef = useRef(null);
  const [selectionStore, setSelectionStore] = useState(null);
  const [exportFn, setExportFn] = useState(null);
  const [loadPcbFn, setLoadPcbFn] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return;
    expRef.current = new Editor(canvas);
    setSelectionStore(expRef.current.selectionStore);

    setExportFn(() => () => {
      // Flush latest drag transforms into instanced matrices before export.
      expRef.current?.interaction?.update?.();

      const data = expRef.current?.primitiveManager?.exportJSON?.();
      if (!data) return;

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "pcb-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    });

    setLoadPcbFn(() => () => {
      // Reload from the bundled pcb.json and refresh interaction targets
      expRef.current?.loadFromJSON?.(pcbJson);
    });

    return () => {
      expRef.current?.destroy();
      expRef.current = null;
      setSelectionStore(null);
      setExportFn(null);
      setLoadPcbFn(null);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Sidebar selectionStore={selectionStore} onExport={exportFn} onLoadPcb={loadPcbFn} />
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

export default App
