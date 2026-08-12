import React, { useEffect, useState } from "react";

/*
 * ============================================================================
 * IMPORTACIONES DE COMPLEMENTOS DEL COMPLEJO DE EDICIÓN (AÚN NO DISEÑADOS)
 * Descomenta estas líneas de forma progresiva a medida que construyamos los archivos.
 * ============================================================================
 * import { HeaderNote } from "../../../components/Admin/CreateNote/HeaderNote";
 * import { BlockController } from "../../../components/Admin/CreateNote/BlockController";
 */

/*
 * import { useNotes } from "../../../hooks";
 */

export function CreateNote(props) {
  const { note } = props;

  // --------------------------------------------------------------------------
  // ESTADO 1: PERSISTENCIA Y SEGUIMIENTO DEL AUTOGUARDADO
  // --------------------------------------------------------------------------
  const [savedState, setSavedState] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // --------------------------------------------------------------------------
  // ESTADO 2: HIDRATACIÓN CONTROLADA DE METADATOS Y BLOQUES
  // --------------------------------------------------------------------------
  // Saneamiento del ciclo de vida: Inicialización perezosa para evitar bucles
  const [metadata, setMetadata] = useState(() => {
    if (note) {
      return {
        id_documento: note.id_documento || null,
        titulo: note.titulo || "",
        autor: note.autor || "",
        ficha: note.ficha || "",
        licencia: note.licencia || "CC BY-SA 4.0",
        es_borrador: note.es_borrador !== undefined ? note.es_borrador : true,
        fecha_publicacion: note.fecha_publicacion || null,
      };
    }
    return {
      id_documento: null,
      titulo: "",
      autor: "",
      ficha: "",
      licencia: "CC BY-SA 4.0",
      es_borrador: true,
      fecha_publicacion: null,
    };
  });

  const [blocks, setBlocks] = useState(() => {
    if (note?.bloques) return note.bloques;
    // Bloque inicial de texto ('t') por defecto si es una nota nueva
    return [{ id: "init-block-1", tipo: "t", estado: false, contenido: "" }];
  });

  // --------------------------------------------------------------------------
  // EFECTO DE SINCRONIZACIÓN ASÍNCRONA (CUANDO LLEGAN NUEVAS PROPS DESDE LA BD)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (note) {
      setMetadata({
        id_documento: note.id_documento || null,
        titulo: note.titulo || "",
        autor: note.autor || "",
        ficha: note.ficha || "",
        licencia: note.licencia || "CC BY-SA 4.0",
        es_borrador: note.es_borrador !== undefined ? note.es_borrador : true,
        fecha_publicacion: note.fecha_publicacion || null,
      });
      setBlocks(note.bloques || []);
      setSavedState(true);
    }
  }, [note]);

  // --------------------------------------------------------------------------
  // EFECTO DE AUTOGUARDADO (SUAVIZADO DE RÁFAGAS POR INACTIVIDAD - DEBOUNCE)
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Evitamos disparar el autoguardado en un lienzo completamente estéril
    const isLienzoVacio =
      blocks.length === 1 && blocks[0].contenido === "" && !metadata.titulo;

    if (isLienzoVacio) return;

    const delayDebounceFn = setTimeout(() => {
      autoSave();
    }, 5000); // 5 segundos de tregua física en la escritura antes de disparar el guardado

    return () => clearTimeout(delayDebounceFn);
  }, [blocks, metadata.titulo, metadata.licencia, metadata.es_borrador]);

  // --------------------------------------------------------------------------
  // OPERACIONES DE PERSISTENCIA EN SERVIDOR (DJANGO REST + MONGODB ATLAS)
  // --------------------------------------------------------------------------
  const saveNote = async (method) => {
    setIsSaving(true);
    try {
      const payload = {
        ...metadata,
        bloques: blocks,
      };

      console.log(`[Persistencia] Despachando nota vía ${method}:`, payload);

      // Aquí se integrará la llamada real al hook de la API:
      // if (method === "POST") {
      //   const res = await createNote(payload);
      //   setMetadata(prev => ({ ...prev, id_documento: res.id_documento }));
      //   setSavedState(true);
      // } else {
      //   await updateNote(metadata.id_documento, payload);
      // }

      // Actualización de la marca de tiempo para la columna derecha de HeaderNote
      const now = new Date();
      const timeString = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastSavedTime(timeString);
    } catch (error) {
      console.error("Fallo crítico en la persistencia asíncrona:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const autoSave = async () => {
    if (!savedState) {
      await saveNote("POST");
    } else {
      await saveNote("PATCH");
    }
  };

  // --------------------------------------------------------------------------
  // GESTIÓN MECÁNICA E INMUTABLE DE LOS BLOQUES (BLOCK CONTROLLER)
  // --------------------------------------------------------------------------
  const addBlock = (type, index) => {
    const newBlock = {
      // Generamos un ID estable para el reconciliador del DOM virtual de React
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo: type, // 't' (texto), 'c' (código), 'a' (animación)
      estado: false, // false = no revisado
      contenido: "",
    };

    setBlocks((prevBlocks) => {
      const updated = [...prevBlocks];
      if (index === undefined || index < 0) {
        updated.push(newBlock);
      } else {
        updated.splice(index + 1, 0, newBlock); // Inserción intercalada justo debajo
      }
      return updated;
    });
  };

  const moveBlock = (direction, index) => {
    setBlocks((prevBlocks) => {
      const targetIndex = index + direction;
      // Validación estricta de fronteras dimensionales
      if (targetIndex < 0 || targetIndex >= prevBlocks.length)
        return prevBlocks;

      const updated = [...prevBlocks];
      // Permutación matemática pura sin mutar el arreglo original
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      return updated;
    });
  };

  const updateBlockContent = (content, index) => {
    setBlocks((prevBlocks) => {
      const updated = [...prevBlocks];
      if (updated[index]) {
        updated[index] = { ...updated[index], contenido: content };
      }
      return updated;
    });
  };

  const toggleBlockStatus = (index) => {
    setBlocks((prevBlocks) => {
      const updated = [...prevBlocks];
      if (updated[index]) {
        updated[index] = { ...updated[index], estado: !updated[index].estado };
      }
      return updated;
    });
  };

  const deleteBlock = (index) => {
    setBlocks((prevBlocks) => {
      const updated = prevBlocks.filter((_, i) => i !== index);
      // Salvaguarda: Si el autor elimina todos los bloques, instanciamos uno vacío
      // para evitar que el lienzo de la SPA colapse o se vuelva inaccesible.
      if (updated.length === 0) {
        return [
          {
            id: `block-${Date.now()}`,
            tipo: "t",
            estado: false,
            contenido: "",
          },
        ];
      }
      return updated;
    });
  };

  // --------------------------------------------------------------------------
  // RENDERIZADO DEL ESPACIO DE TRABAJO SOBERANO
  // --------------------------------------------------------------------------
  return (
    <div className="create-note-container">
      {/*
       * =====================================================================
       * CABECERA DE METADATOS Y CONTROL (Unificada en tres columnas)
       * =====================================================================
       * Se renderiza temporalmente de forma estática para permitir la compilación
       * limpia y probar la reactividad local antes de estructurar HeaderNote.js.
       */}
      <header
        style={{
          borderBottom: "1px dashed #444",
          paddingBottom: "15px",
          marginBottom: "20px",
        }}
      >
        <h3>[Marcador de Trabajo] HeaderNote</h3>
        <div>
          Título de la Nota:{" "}
          <strong>{metadata.titulo || "Nota sin título"}</strong>
        </div>
        <div>
          Licencia: <code>{metadata.licencia}</code>
        </div>
        <div>
          Estado:{" "}
          <strong>{metadata.es_borrador ? "Borrador" : "Publicado"}</strong>
        </div>
        {lastSavedTime && (
          <div style={{ color: "#888", fontSize: "0.85rem", marginTop: "5px" }}>
            ⏱️ Autoguardado: {lastSavedTime}{" "}
            {isSaving && "(Actualizando MongoDB Atlas...)"}
          </div>
        )}
      </header>

      {/*
       * <HeaderNote
       *   metadata={metadata}
       *   setMetadata={setMetadata}
       *   isSaving={isSaving}
       *   lastSavedTime={lastSavedTime}
       *   saveNote={saveNote}
       * />
       */}

      {/*
       * =====================================================================
       * CONTROLADOR DE LISTA DE BLOQUES (Lienzo Elástico de Creación)
       * =====================================================================
       * En este bloque simulamos la lista de bloques interactiva para que puedas
       * verificar hoy mismo la inmutabilidad y la inercia del estado.
       */}
      <main
        style={{
          padding: "20px",
          border: "1px solid #333",
          background: "#111",
        }}
      >
        <h3>[Marcador de Trabajo] BlockController</h3>
        <p>
          Bloques activos en memoria: <strong>{blocks.length}</strong>
        </p>

        <ul style={{ listStyle: "none", padding: 0 }}>
          {blocks.map((block, index) => (
            <li
              key={block.id}
              style={{
                background: "#222",
                padding: "15px",
                margin: "10px 0",
                borderLeft: "4px solid #4caf50",
                borderRadius: "4px",
              }}
            >
              <div>
                <strong>Bloque #{index + 1}</strong> | Tipo:{" "}
                <code>{block.tipo}</code> | Estado:{" "}
                {block.estado ? "✓ Revisado" : "⚠ Pendiente"}
              </div>

              <textarea
                value={block.contenido}
                onChange={(e) => updateBlockContent(e.target.value, index)}
                placeholder="Escribe contenido de prueba..."
                style={{
                  width: "100%",
                  background: "#333",
                  color: "#fff",
                  border: "1px solid #444",
                  marginTop: "8px",
                  padding: "8px",
                  borderRadius: "4px",
                }}
              />

              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                <button onClick={() => moveBlock(-1, index)}>Subir ↑</button>
                <button onClick={() => moveBlock(1, index)}>Bajar ↓</button>
                <button onClick={() => toggleBlockStatus(index)}>
                  Cambiar Revisión
                </button>
                <button
                  onClick={() => deleteBlock(index)}
                  style={{ color: "#ff4444" }}
                >
                  Eliminar ✖
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <button onClick={() => addBlock("t")}>+ Insertar Texto</button>
          <button onClick={() => addBlock("c")}>+ Insertar Código</button>
          <button onClick={() => addBlock("a")}>+ Insertar Animación</button>
        </div>
      </main>

      {/*
       * <BlockController
       *   blocks={blocks}
       *   addBlock={addBlock}
       *   moveBlock={moveBlock}
       *   updateBlockContent={updateBlockContent}
       *   toggleBlockStatus={toggleBlockStatus}
       *   deleteBlock={deleteBlock}
       * />
       */}
    </div>
  );
}
