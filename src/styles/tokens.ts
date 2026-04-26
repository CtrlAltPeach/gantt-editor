export const tokens = {
  bar: {
    /** Высота одиночной полосы (без наложений). */
    height: 20,
    /** Вертикальный отступ полосы от верхнего края строки. */
    paddingTop: 8,
    borderRadius: 3,
    strokeColor: "#222",
    strokeWidth: 1.5,
    /** Паттерн штриховки пунктирной полосы. */
    dashedPattern: "5 3",
    fontSize: 10,
    fontWeight: 500,
    /** Минимальная высота полосы при сильном наложении. */
    minHeight: 6,
    /** Верхний отступ внутри слота при наложении. */
    slotPaddingY: 2,
    /** Вычитается из высоты слота, чтобы оставить зазор между полосами. */
    slotPaddingH: 4,
    /** Радиус захвата края полосы для создания связи (px). */
    edgeRadius: 14,
    /** Палитра цветов для новых полос. */
    colors: [
      "#e05c5c", "#5c8ee0", "#5cc47a", "#e0a85c",
      "#a05ce0", "#5cc4c4", "#e05ca8", "#8ee05c",
      "#e08e5c", "#5ce08e", "#8e5ce0", "#e05c8e",
      "#5c8ee0", "#c45ce0", "#e0c45c", "#5ce0c4",
    ],
  },

  grid: {
    /** Фон строки заголовка с годами. */
    headerFill: "#f0f0f0",
    /** Фон строки заголовка с месяцами. */
    subHeaderFill: "#f8f8f8",
    /** Фон колонки с подписями строк. */
    labelFill: "#fafafa",
    /** Фон рабочих ячеек. */
    cellFill: "white",
    /** Цвет границ заголовка. */
    headerBorder: "#ccc",
    /** Цвет границ ячеек. */
    cellBorder: "#e0e0e0",
    borderWidth: 0.5,
    defaultCellWidth: 40,
    defaultRowHeight: 36,
    defaultHeaderHeight: 24,
    defaultLabelWidth: 160,
  },

  font: {
    small: 10,
    medium: 11,
    label: 12,
    sectionTitle: 13,
    hint: 14,
  },

  connection: {
    stroke: "#555",
    previewStroke: "#888",
    strokeWidth: 1.5,
    dashPattern: "4 3",
  },

  snapHint: {
    fill: "#333",
    fillOpacity: 0.75,
    textFill: "white",
  },

  preview: {
    fillOpacity: 0.4,
  },

  contextMenu: {
    background: "white",
    borderColor: "#ddd",
    borderRadius: 4,
    zIndex: 1000,
    minWidth: 180,
    itemHoverBg: "#f5f5f5",
    deleteHoverBg: "#fff0f0",
    deleteColor: "#c33",
    metaColor: "#aaa",
    metaFontSize: 10,
    swatchSize: 18,
    swatchRadius: 3,
  },

  panel: {
    width: 220,
    borderColor: "#ddd",
    padding: 12,
    mutedColor: "#888",
    hintColor: "#999",
  },

  toolbar: {
    swatchSize: 20,
    swatchRadius: 4,
  },
} as const;
