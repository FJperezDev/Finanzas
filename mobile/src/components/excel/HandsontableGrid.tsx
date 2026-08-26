import React, { useEffect, useRef } from "react";

interface Props {
  datos: any[];
  onCellChange: (id: string, columna: string, valor: any) => void;
  onRowsRemove?: (ids: string[]) => void;
  onColumnRemove?: (columnas: string[]) => void;
}

export function HandsontableGrid({
  datos,
  onCellChange,
  onRowsRemove,
  onColumnRemove,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link href="https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.css" rel="stylesheet">
      <script src="https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.js"></script>
      <style>
        :root {
          color-scheme: dark;
          /* Variables del Tema Zinc & Ámbar */
          --bg-root: #09090b;
          --bg-surface-0: #18181b;
          --bg-surface-1: #27272a;
          --bg-surface-2: #3f3f46;
          --bg-surface-hover: #52525b;
          
          --text-primary: #fafafa;
          --text-secondary: #a1a1aa;
          --text-muted: #71717a;
          --text-inverse: #09090b;
          
          --accent-main: #fbbf24;
          --accent-strong: #f59e0b;
          
          --border-main: #27272a;
          --border-light: #3f3f46;
          
          --row-alt: #0f0f12;
        }

        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: var(--bg-root) !important; }
        #hot-container { width: 100%; height: 100%; }
        
        .htCore {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 13.5px;
          color: var(--text-primary) !important;
          border: none !important;
        }
        
        /* Cabeceras de columnas */
        .handsontable th { 
          background-color: var(--bg-surface-0) !important; 
          color: var(--text-secondary) !important; 
          font-weight: 700 !important; 
          text-transform: uppercase; 
          font-size: 11px; 
          letter-spacing: 0.5px; 
          border-color: var(--border-main) !important; 
          border-top: none !important; 
          border-left: none !important; 
          padding: 6px 0 !important; 
        }
        
        /* Celdas normales */
        .handsontable td { 
          background-color: var(--bg-root) !important; 
          border-color: var(--border-main) !important; 
          border-left: none !important; 
          vertical-align: middle !important; 
          padding: 4px 10px !important; 
          color: var(--text-primary) !important; 
        }
        
        /* Filas alternas y hover */
        .handsontable tbody tr:nth-child(even) td { background-color: var(--row-alt) !important; }
        .handsontable tbody tr:hover td { background-color: var(--bg-surface-0) !important; }
        
        /* Cabecera activa (al seleccionar una celda) */
        .handsontable thead th.ht__highlight { 
          background-color: var(--bg-surface-1) !important; 
          color: var(--text-primary) !important; 
        }
        
        /* Borde de selección de celda (Ámbar) */
        
        /* =========================================================
        ESTILOS DE SELECCIÓN DE CELDAS Y BORDES (TEMA ÁMBAR)
        ========================================================= */
        
        /* 1. Bordes de selección general (Tabla principal y Dropdowns) 
           Al añadir ".handsontable" ganamos la batalla de especificidad CSS */
        .handsontable .wtBorder { 
          background-color: var(--accent-main) !important; 
        }

        /* 2. Capa de fondo al seleccionar múltiples celdas (Ámbar translúcido) */
        .handsontable .ht_master .wtBorder.area {
          background-color: rgba(251, 191, 36, 0.16) !important; 
        }
        
        /* 3. Cuadradito de autocompletar en la esquina inferior derecha */
        .handsontable .wtBorder.corner {
          background-color: var(--accent-main) !important;
          border: 1px solid var(--bg-root) !important;
        }
        
        /* 4. Cabeceras de fila/columna activas */
        .handsontable th.ht__highlight,
        .handsontable thead th.ht__highlight {
          background-color: var(--bg-surface-1) !important;
          color: var(--accent-main) !important;
        }

        /* =========================================================
        INPUT DE EDICIÓN (Cuando haces doble clic o escribes)
        ========================================================= */
        textarea.handsontableInput {
          border: 2px solid var(--accent-main) !important;
          background-color: var(--bg-surface-0) !important;
          color: var(--text-primary) !important;
          box-shadow: none !important; /* Un pequeño resplandor ámbar opcional */
          outline: none !important;
          padding: 4px 8px !important;
          border-radius: 2px !important;
        }

        /* =========================================================
        DROPDOWN DE HANDSONTABLE — TEMA ZINC & ÁMBAR
        ========================================================= */
        /* --- FORZAR ALTURA AUTOMÁTICA DEL DROPDOWN --- */
        div.handsontable.listbox,
        div.handsontable.listbox .ht_master,
        div.handsontable.listbox .wtHolder,
        div.handsontable.listbox .wtHider {
          height: auto !important;
        }

        div.handsontable.listbox .wtHolder {
          /* Permite que crezca según el contenido, pero pone un límite por si hay 50 categorías */
          max-height: 280px !important; 
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        /* Caja completa */
        div.handsontable.listbox {
          background: var(--bg-surface-0) !important;
          border: 1px solid var(--border-light) !important;
          border-radius: 10px !important;
          box-shadow:
            0 18px 40px rgba(0, 0, 0, 0.55),
            0 4px 12px rgba(0, 0, 0, 0.35) !important;
          overflow: hidden !important;
          z-index: 100000 !important;
        }

        div.handsontable.listbox .ht_master,
        div.handsontable.listbox .wtHolder,
        div.handsontable.listbox .wtHider,
        div.handsontable.listbox .wtSpreader {
          background: var(--bg-surface-0) !important;
        }

        div.handsontable.listbox table.htCore {
          background: var(--bg-surface-0) !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }

        div.handsontable.listbox table.htCore tbody tr {
          background: var(--bg-surface-0) !important;
        }

        /* Opciones del dropdown */
        div.handsontable.listbox table.htCore tbody tr td {
          background-color: var(--bg-surface-0) !important;
          background-image: none !important;
          color: var(--text-primary) !important;
          border: 0 !important;
          border-bottom: 1px solid var(--border-main) !important;
          padding: 10px 14px !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13.5px !important;
          font-weight: 500 !important;
          line-height: 1.2 !important;
          white-space: nowrap !important;
        }

        div.handsontable.listbox table.htCore tbody tr:last-child td {
          border-bottom: 0 !important;
        }

        /* HOVER en dropdown */
        div.handsontable.listbox table.htCore tbody tr:hover td {
          background-color: var(--bg-surface-1) !important;
          color: var(--text-primary) !important;
        }

        /* SELECCIÓN ACTIVA en dropdown (Fondo ámbar, texto oscuro para contraste) */
        div.handsontable.listbox table.htCore tbody tr.current td {
          background-color: var(--accent-main) !important;
          color: var(--text-inverse) !important;
        }

        /* SELECCIÓN + HOVER en dropdown */
        div.handsontable.listbox table.htCore tbody tr.current:hover td {
          background-color: var(--accent-strong) !important;
          color: var(--text-inverse) !important;
        }

        div.handsontable.listbox table.htCore tbody td.htDimmed {
          background-color: var(--bg-surface-0) !important;
          color: var(--text-secondary) !important;
        }

        /* Scroll del dropdown */
        div.handsontable.listbox .wtHolder::-webkit-scrollbar {
          width: 7px !important;
        }
        div.handsontable.listbox .wtHolder::-webkit-scrollbar-track {
          background: var(--bg-surface-0) !important;
        }
        div.handsontable.listbox .wtHolder::-webkit-scrollbar-thumb {
          background: var(--border-light) !important;
          border-radius: 10px !important;
        }
        div.handsontable.listbox .wtHolder::-webkit-scrollbar-thumb:hover {
          background: var(--bg-surface-hover) !important;
        }
        
        .handsontable td.concepto-wrap {
          white-space: normal !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
          line-height: 1.35 !important;
          vertical-align: middle !important;
        }

        .handsontable th.concepto-header {
          white-space: normal !important;
        }
      </style>
    </head>
    <body>
      <div id="hot-container"></div>
      <script>
        const container = document.getElementById('hot-container');
        let hotInstance = null;

        // DICCIONARIOS DE RELACIONES
        const MAPA_CATEGORIAS = {
          "Ingreso": ["Nómina", "Regalo", "Deuda"],
          "Gasto": ["Ocio", "Inversión", "Fijo"],
        };

        const MAPA_SUBCATEGORIAS = {
          "Nómina": ["Nómina Principal", "Ingreso Secundario"],
          "Regalo": ["Regalo"],
          "Deuda": ["Ocio", "Alquiler", "Comida", "Gimnasio", "Ropa", "Wifi", "Gastos"],
          "Ocio": ["Ocio"],
          "Inversión": ["Cartera de Inversión", "Cuenta Remunerada"],
          "Fijo": ["Alquiler", "Comida", "Gimnasio", "Ropa", "Wifi", "Gastos"],
        };

        function calcularConfiguracionColumnas(data) {
          const rowHeadersKeys = data && data.length > 0 
            ? Object.keys(data[0]) 
            : ['Fecha', 'Tipo', 'Categoria_Macro', 'Subcategoria', 'Concepto', 'Importe'];
          
          const columnasVisibles = rowHeadersKeys.filter(k => !k.startsWith('__'));
          
          const columnasConfig = columnasVisibles.map(key => {
            if (key === 'Fecha') return { data: key, type: 'date', dateFormat: 'YYYY-MM-DD' };
            if (key === 'Tipo') return { data: key, type: 'dropdown', source: ['Ingreso', 'Gasto'] };
            
            // Categoria Depende de Tipo
            if (key === 'Categoria_Macro') {
              return { 
                data: key, 
                type: 'dropdown', 
                source: function(query, process) {
                  const tipoActual = hotInstance.getDataAtRowProp(this.row, 'Tipo');
                  process(MAPA_CATEGORIAS[tipoActual] || []);
                } 
              };
            }
            
            // Subcategoria Depende de Categoria
            if (key === 'Subcategoria') {
              return { 
                data: key, 
                type: 'dropdown', 
                source: function(query, process) {
                  const catActual = hotInstance.getDataAtRowProp(this.row, 'Categoria_Macro');
                  process(MAPA_SUBCATEGORIAS[catActual] || []);
                } 
              };
            }
            
            if (key === 'Importe') return { data: key, type: 'numeric', numericFormat: { pattern: '0,0.00' } };
            if (key === 'Concepto') {
              return {
                data: key,
                type: 'text',
                width: 320,
                wordWrap: true,
              };
            }
            return { data: key, type: 'text' };
          });

          return { colHeaders: columnasVisibles, columns: columnasConfig };
        }

        window.updateTableData = function(data) {
          const config = calcularConfiguracionColumnas(data);
          
          if (hotInstance) {
            hotInstance.updateSettings({
              data: data,
              colHeaders: config.colHeaders,
              columns: config.columns
            });
          } else {
            initTable(data, config);
          }
        };

        function initTable(data, config) {
          hotInstance = new Handsontable(container, {
            data: data,
            rowHeaders: true,
            colHeaders: config.colHeaders,
            columns: config.columns,
            width: '100%',
            height: '100%',
            autoColumnSize: true,
            columnSorting: true,
            manualColumnResize: true,
            stretchH: 'all', 
            cells: function (row, col) {
              const props = this.instance.colToProp(col);

              if (props === 'Concepto') {
                return {
                  className: 'concepto-wrap',
                };
              }

              return {};
            },
            
            contextMenu: false,
            licenseKey: 'non-commercial-and-evaluation',
            outsideClickDeselects: true,
            
            beforeChange: function(changes, source) {
              if (!changes) return;
              const obligatorias = ['Fecha', 'Tipo', 'Categoria_Macro', 'Importe'];
              
              for (let i = changes.length - 1; i >= 0; i--) {
                const row = changes[i][0];
                const prop = changes[i][1];
                const oldVal = changes[i][2];
                const newVal = changes[i][3];
                
                if (obligatorias.includes(prop)) {
                  if (newVal === '' || newVal === null || newVal === undefined) {
                    changes.splice(i, 1); 
                    continue; 
                  }
                }

                // CASCADA: Si cambia Tipo, borramos Categoria y Subcategoria
                if (prop === 'Tipo' && oldVal !== newVal) {
                  changes.push([row, 'Categoria_Macro', '']);
                  changes.push([row, 'Subcategoria', '']);
                }
                
                // CASCADA: Si cambia Categoria, borramos Subcategoria
                if (prop === 'Categoria_Macro' && oldVal !== newVal) {
                  changes.push([row, 'Subcategoria', '']);
                }
              }
            },
            
            afterChange: function(changes, source) {
              if (source === 'loadData') return; 
              changes.forEach(function(change) {
                if (change[2] !== change[3]) {
                  const idFila = hotInstance.getDataAtRowProp(change[0], '__id');
                  const mensaje = JSON.stringify({
                    tipo: 'CELL_CHANGED',
                    payload: { id: idFila, col: change[1], valor: change[3] }
                  });
                  if (window.parent) window.parent.postMessage(mensaje, "*");
                }
              });
            },
            
            beforeRemoveRow: function(index, amount) {
              const idsBorrados = [];
              for(let i = 0; i < amount; i++) {
                const id = hotInstance.getDataAtRowProp(index + i, '__id');
                if (id) idsBorrados.push(id);
              }
              if (window.parent && idsBorrados.length > 0) {
                window.parent.postMessage(JSON.stringify({ tipo: 'ROWS_REMOVED', payload: idsBorrados }), "*");
              }
            },
            
            beforeRemoveCol: function(index, amount) {
              const columnasProtegidas = ['Fecha', 'Tipo', 'Categoria_Macro', 'Subcategoria', 'Concepto', 'Importe'];
              const colsABorrar = [];
              for(let i = 0; i < amount; i++) {
                const prop = hotInstance.colToProp(index + i);
                if (columnasProtegidas.includes(prop)) return false; 
                if (!prop.startsWith('__')) colsABorrar.push(prop);
              }
              if (window.parent && colsABorrar.length > 0) {
                window.parent.postMessage(JSON.stringify({ tipo: 'COLS_REMOVED', payload: colsABorrar }), "*");
              }
            },
            
            beforeKeyDown: function(event) {
              if (event.key === 'Delete' || event.key === 'Backspace') {
                const selected = hotInstance.getSelected() || [];
                const totalRows = hotInstance.countRows();
                const totalCols = hotInstance.countCols();
                
                if (totalRows === 0 || totalCols === 0) return;
                const columnasProtegidas = ['Fecha', 'Tipo', 'Categoria_Macro', 'Subcategoria', 'Concepto', 'Importe'];

                let esSeleccionTotal = false;
                let esSeleccionFila = false;
                let esSeleccionColumna = false;
                
                const idsABorrar = [];
                const colsABorrar = [];

                selected.forEach(([row1, col1, row2, col2]) => {
                  const rMin = Math.min(row1, row2);
                  const rMax = Math.max(row1, row2);
                  const cMin = Math.min(col1, col2);
                  const cMax = Math.max(col1, col2);
                  
                  const esFilaCompleta = (cMin <= 0 && cMax >= totalCols - 1);
                  const esColCompleta = (rMin <= 0 && rMax >= totalRows - 1);

                  if (esFilaCompleta && esColCompleta) esSeleccionTotal = true;
                  else if (esFilaCompleta) {
                    esSeleccionFila = true;
                    for(let r = rMin; r <= rMax; r++) {
                      const sourceData = hotInstance.getSourceDataAtRow(r);
                      if (sourceData && sourceData.__id && !idsABorrar.includes(sourceData.__id)) {
                        idsABorrar.push(sourceData.__id);
                      }
                    }
                  }
                  else if (esColCompleta) {
                    esSeleccionColumna = true;
                    for(let c = cMin; c <= cMax; c++) {
                      if (c < 0) continue;
                      const prop = hotInstance.colToProp(c);
                      if (prop && !columnasProtegidas.includes(prop) && !prop.startsWith('__') && !colsABorrar.includes(prop)) {
                        colsABorrar.push(prop);
                      }
                    }
                  }
                });

                if (esSeleccionTotal) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  const todosIds = [];
                  for(let i = 0; i < totalRows; i++) {
                    const sourceData = hotInstance.getSourceDataAtRow(i);
                    if (sourceData && sourceData.__id) todosIds.push(sourceData.__id);
                  }
                  if (window.parent && todosIds.length > 0) {
                    window.parent.postMessage(JSON.stringify({ tipo: 'ROWS_REMOVED', payload: todosIds }), "*");
                  }
                } else if (esSeleccionFila) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  if (window.parent && idsABorrar.length > 0) {
                    window.parent.postMessage(JSON.stringify({ tipo: 'ROWS_REMOVED', payload: idsABorrar }), "*");
                  }
                } else if (esSeleccionColumna) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  if (window.parent && colsABorrar.length > 0) {
                    window.parent.postMessage(JSON.stringify({ tipo: 'COLS_REMOVED', payload: colsABorrar }), "*");
                  }
                }
              }
            }

          });
        }

        window.updateTableData(${JSON.stringify(datos)});

        window.addEventListener("message", function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.tipo === "DESELECT" && hotInstance) {
              hotInstance.deselectCell();
            }
          } catch(e) {}
        });

      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    const handleWebMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === "string") {
          const data = JSON.parse(event.data);
          if (data.tipo === "CELL_CHANGED") {
            onCellChange(data.payload.id, data.payload.col, data.payload.valor);
          }
          if (data.tipo === "ROWS_REMOVED" && onRowsRemove) {
            onRowsRemove(data.payload);
          }
          if (data.tipo === "COLS_REMOVED" && onColumnRemove) {
            onColumnRemove(data.payload);
          }
        }
      } catch (e) {}
    };
    window.addEventListener("message", handleWebMessage);
    return () => window.removeEventListener("message", handleWebMessage);
  }, [onCellChange, onRowsRemove, onColumnRemove]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ tipo: "DESELECT" }),
          "*",
        );
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={htmlContent}
      style={{ width: "100%", height: "100%", border: "none" }}
      title="Handsontable"
    />
  );
}
