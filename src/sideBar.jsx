import { useEffect, useState } from "react";

export default function Sidebar({ selectionStore, onExport, onLoadPcb }) {
  const [sel, setSel] = useState(null);

  useEffect(() => {
    if (!selectionStore) return;
    return selectionStore.subscribe((state) => {
      setSel(state);
    });
  }, [selectionStore]);

  return (
    <div style={{
      position: "absolute",
      right: 0,
      top: 0,
      width: 320,
      height: "100%",
      padding: 12,
      background: "rgba(0,0,0,0.55)",
      color: "white",
      fontFamily: "system-ui",
      pointerEvents: "auto",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
    }}>
      <h3 style={{ margin: "0 0 8px 0" }}>Selection</h3>

      {!sel?.kind ? (
        <div style={{ opacity: 0.8 }}>Nothing selected</div>
      ) : (
        <>
          <div><b>Type:</b> {sel.kind}</div>
          {sel.kind === "pad" && <div><b>Instance:</b> {sel.padInstanceId}</div>}

          <div style={{ marginTop: 8 }}>
            <b>World Position</b><br />
            x: {sel.worldPos?.x?.toFixed(4)}<br />
            y: {sel.worldPos?.y?.toFixed(4)}<br />
            z: {sel.worldPos?.z?.toFixed(4)}
          </div>

          <div style={{ marginTop: 8 }}>
            <b>Surface Area</b><br />
            {sel.area.toFixed(6)}
          </div>
        </>
      )}

      <button
        onClick={onExport}
        disabled={!onExport}
        style={{
          width: "100%",
          padding: "8px 10px",
          marginTop: "auto",
          cursor: onExport ? "pointer" : "not-allowed",
        }}
      >
        Export JSON
      </button>

      <button
        onClick={onLoadPcb}
        disabled={!onLoadPcb}
        style={{
          width: "100%",
          padding: "8px 10px",
          marginTop: 8,
          cursor: onLoadPcb ? "pointer" : "not-allowed",
        }}
      >
        Load pcb.json
      </button>
    </div>
  );
}
