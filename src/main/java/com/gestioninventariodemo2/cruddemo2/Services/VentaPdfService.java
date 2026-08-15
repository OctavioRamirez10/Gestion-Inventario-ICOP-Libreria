package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.DTO.ProductoVentaDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleVenta;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;

@Service
public class VentaPdfService {

        private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        private static final DecimalFormat NUMBER_FORMATTER;

    // Definición de colores de la marca
    private static final DeviceRgb BRAND_COLOR = new DeviceRgb(41, 98, 255); // Azul Índigo
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(55, 65, 81); // Gris Oscuro
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(107, 114, 128); // Gris Claro
    private static final DeviceRgb ROW_EVEN = new DeviceRgb(249, 250, 251); // Zebra striping sutil
    private static final DeviceRgb BORDER_COLOR = new DeviceRgb(229, 231, 235); // Gris para bordes

    // Datos del negocio (hardcodeados por ahora, usados para ticket)
    private static final String NOMBRE_NEGOCIO = "Libreria";
    private static final String DIRECCION_NEGOCIO = "Calle Falsa 123";
    private static final String TELEFONO_NEGOCIO = "11 1234-5678";

    @Autowired
    private CobroService cobroService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    static {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.of("es", "AR"));
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        NUMBER_FORMATTER = new DecimalFormat("#,##0", symbols);
    }

    public byte[] generarPdfVentas(List<VentaResponseDTO> ventas, LocalDate inicio, LocalDate fin, String search, String metodoPago, String nombreVendedor) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4);
            document.setMargins(40, 40, 60, 40);
            pdf.addEventHandler(com.itextpdf.kernel.events.PdfDocumentEvent.END_PAGE, new PageEvent());

            // ========== CABECERA ==========
            agregarCabecera(document, inicio, fin, search, metodoPago, nombreVendedor);

            // ========== RESUMEN ==========
            if (!ventas.isEmpty()) {
                agregarResumen(document, ventas);
                agregarTopProductos(document, ventas);
                agregarDesglosePorVendedor(document, ventas);
            }

            // ========== TABLA DE VENTAS ==========
            agregarTablaVentas(document, ventas);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Error al generar PDF de ventas", e);
        }
    }

    private void agregarCabecera(Document document, LocalDate inicio, LocalDate fin, String search, String metodoPago, String nombreVendedor) {
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
        headerTable.setMarginBottom(15);

        Cell leftCell = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE);
        leftCell.add(new Paragraph("SGI").setBold().setFontSize(24).setFontColor(BRAND_COLOR).setMarginBottom(0));
        leftCell.add(new Paragraph("Reporte de Ventas").setBold().setFontSize(14).setFontColor(TEXT_DARK).setMarginBottom(0));
        leftCell.add(new Paragraph("Sistema de Gestión Integrado").setFontSize(9).setFontColor(TEXT_MUTED));

        Cell rightCell = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.BOTTOM).setTextAlignment(TextAlignment.RIGHT);
        
        String fechaHora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        rightCell.add(new Paragraph("Generado el: " + fechaHora).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
        
        String periodoTexto = (inicio != null && fin != null)
                ? inicio.format(DATE_FORMATTER) + " - " + fin.format(DATE_FORMATTER)
                : "Todas las fechas";
        rightCell.add(new Paragraph("Período: " + periodoTexto).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));

        if (search != null && !search.trim().isEmpty()) {
            rightCell.add(new Paragraph("Búsqueda: " + search).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
        }
        if (metodoPago != null && !metodoPago.trim().isEmpty()) {
            rightCell.add(new Paragraph("Método de Cobro: " + metodoPago).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
        }
        if (nombreVendedor != null && !nombreVendedor.trim().isEmpty()) {
            rightCell.add(new Paragraph("Vendedor: " + nombreVendedor).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
        }

        headerTable.addCell(leftCell);
        headerTable.addCell(rightCell);
        document.add(headerTable);

        Table lineTable = new Table(1).useAllAvailableWidth();
        lineTable.addCell(new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setBorderBottom(new com.itextpdf.layout.borders.SolidBorder(BRAND_COLOR, 2f)));
        lineTable.setMarginBottom(15);
        document.add(lineTable);
    }

    private void agregarResumen(Document document, List<VentaResponseDTO> ventas) {
        int totalVentas = ventas.size();
        double ingresosTotal = ventas.stream().mapToDouble(VentaResponseDTO::getTotal).sum();

        Set<String> clientesUnicos = new HashSet<>();
        for (VentaResponseDTO venta : ventas) {
            clientesUnicos.add(venta.getNombreCliente());
        }

        Table resumenTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1})).useAllAvailableWidth();
        resumenTable.setMarginBottom(20);

        resumenTable.addCell(crearTarjetaResumen("Total Ventas", formatNumber(totalVentas)));
        resumenTable.addCell(crearTarjetaResumen("Ingresos Totales", "$" + formatCurrency(ingresosTotal)));
        resumenTable.addCell(crearTarjetaResumen("Clientes Únicos", formatNumber(clientesUnicos.size())));

        document.add(resumenTable);
    }

    private Cell crearTarjetaResumen(String titulo, String valor) {
        return new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setPadding(5)
                .add(new Paragraph(titulo).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2))
                .add(new Paragraph(valor).setFontSize(12).setBold().setFontColor(BRAND_COLOR));
    }

    private void agregarTopProductos(Document document, List<VentaResponseDTO> ventas) {
        Paragraph titulo = new Paragraph("Top 5 Productos Más Vendidos")
                .setFontSize(12).setBold().setFontColor(TEXT_DARK).setMarginTop(10).setMarginBottom(10).setKeepWithNext(true);
        document.add(titulo);

        Map<String, Integer> productoCantidades = new HashMap<>();
        for (VentaResponseDTO venta : ventas) {
            for (ProductoVentaDTO producto : venta.getProductos()) {
                String nombreProducto = producto.getNombreProducto();
                int cantidad = producto.getCantidad();
                productoCantidades.put(nombreProducto, productoCantidades.getOrDefault(nombreProducto, 0) + cantidad);
            }
        }

        List<Map.Entry<String, Integer>> topProductos = productoCantidades.entrySet().stream()
                .sorted((e1, e2) -> e2.getValue().compareTo(e1.getValue()))
                .limit(5)
                .toList();

        Table table = new Table(UnitValue.createPercentArray(new float[]{3, 1})).setWidth(UnitValue.createPercentValue(60));
        table.setMarginBottom(20);

        table.addHeaderCell(crearCabeceraCelda("Producto", TextAlignment.CENTER));
        table.addHeaderCell(crearCabeceraCelda("Cantidades", TextAlignment.CENTER));

        boolean isEven = false;
        for (Map.Entry<String, Integer> entry : topProductos) {
            DeviceRgb rowBg = isEven ? ROW_EVEN : new DeviceRgb(255, 255, 255);
            isEven = !isEven;

            table.addCell(crearCeldaDato(entry.getKey(), rowBg, TextAlignment.LEFT));
            table.addCell(crearCeldaDato(formatNumber(entry.getValue()), rowBg, TextAlignment.RIGHT));
        }

        if (topProductos.isEmpty()) {
            table.addCell(new Cell(1, 2).add(new Paragraph("No hay datos de productos").setTextAlignment(TextAlignment.CENTER)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setPadding(10));
        }

        document.add(table);
    }

    private void agregarDesglosePorVendedor(Document document, List<VentaResponseDTO> ventas) {
        Paragraph titulo = new Paragraph("Desglose por Vendedor")
                .setFontSize(12).setBold().setFontColor(TEXT_DARK).setMarginTop(10).setMarginBottom(10).setKeepWithNext(true);
        document.add(titulo);

        Map<String, VendedorStats> vendedorStats = new HashMap<>();
        
        // Agregar primero a todos los usuarios/vendedores en el sistema con 0 ventas
        List<Usuario> todosLosVendedores = usuarioRepository.findAll();
        for (Usuario u : todosLosVendedores) {
            String nombreVendedor = u.getNombre() != null ? u.getNombre() : "N/A";
            vendedorStats.put(nombreVendedor, new VendedorStats());
        }

        // Sumarizar las ventas del periodo filtrado
        for (VentaResponseDTO venta : ventas) {
            String vendedor = venta.getNombreVendedor() != null ? venta.getNombreVendedor() : "N/A";
            VendedorStats stats = vendedorStats.getOrDefault(vendedor, new VendedorStats());
            stats.cantidadVentas++;
            stats.totalIngresos += venta.getTotal();
            vendedorStats.put(vendedor, stats);
        }

        List<Map.Entry<String, VendedorStats>> vendedoresOrdenados = vendedorStats.entrySet().stream()
                .sorted((e1, e2) -> Double.compare(e2.getValue().totalIngresos, e1.getValue().totalIngresos))
                .toList();

        Table table = new Table(UnitValue.createPercentArray(new float[]{3, 1, 2})).setWidth(UnitValue.createPercentValue(70));
        table.setMarginBottom(20);

        table.addHeaderCell(crearCabeceraCelda("Vendedor", TextAlignment.CENTER));
        table.addHeaderCell(crearCabeceraCelda("Ventas", TextAlignment.CENTER));
        table.addHeaderCell(crearCabeceraCelda("Ingresos", TextAlignment.CENTER));

        boolean isEven = false;
        for (Map.Entry<String, VendedorStats> entry : vendedoresOrdenados) {
            DeviceRgb rowBg = isEven ? ROW_EVEN : new DeviceRgb(255, 255, 255);
            isEven = !isEven;

            table.addCell(crearCeldaDato(entry.getKey(), rowBg, TextAlignment.LEFT));
            table.addCell(crearCeldaDato(String.valueOf(entry.getValue().cantidadVentas), rowBg, TextAlignment.CENTER));
            table.addCell(crearCeldaDato("$" + formatCurrency(entry.getValue().totalIngresos), rowBg, TextAlignment.RIGHT));
        }

        if (vendedoresOrdenados.isEmpty()) {
            table.addCell(new Cell(1, 3).add(new Paragraph("No hay datos de vendedores").setTextAlignment(TextAlignment.CENTER)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setPadding(10));
        }

        document.add(table);
    }

    private static class VendedorStats {
        int cantidadVentas = 0;
        double totalIngresos = 0.0;
    }

    private void agregarTablaVentas(Document document, List<VentaResponseDTO> ventas) {
        Paragraph tituloTabla = new Paragraph("Detalle de Ventas")
                .setFontSize(12).setBold().setFontColor(TEXT_DARK).setMarginTop(10).setMarginBottom(10).setKeepWithNext(true);
        document.add(tituloTabla);

        List<VentaResponseDTO> ventasOrdenadas = ventas.stream()
                .sorted((v1, v2) -> v2.getFecha().compareTo(v1.getFecha()))
                .toList();

        Table table = new Table(UnitValue.createPercentArray(new float[]{2, 3, 2, 2})).useAllAvailableWidth();

        String[] headers = {"Fecha", "Cliente", "Total", "Vendedor"};
        TextAlignment[] alignments = {TextAlignment.LEFT, TextAlignment.LEFT, TextAlignment.RIGHT, TextAlignment.LEFT};
        for (int i = 0; i < headers.length; i++) {
            table.addHeaderCell(crearCabeceraCelda(headers[i], alignments[i]));
        }

        if (ventas.isEmpty()) {
            table.addCell(new Cell(1, 4)
                    .add(new Paragraph("No hay ventas registradas en este período"))
                    .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                    .setBorderBottom(new com.itextpdf.layout.borders.SolidBorder(BORDER_COLOR, 1f))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(TEXT_MUTED)
                    .setPadding(15));
        } else {
            boolean isEven = false;
            for (VentaResponseDTO venta : ventasOrdenadas) {
                DeviceRgb rowBg = isEven ? ROW_EVEN : new DeviceRgb(255, 255, 255);
                isEven = !isEven;

                String fechaStr = formatFecha(venta.getFecha());
                String nombreCliente = venta.getNombreCliente() != null ? venta.getNombreCliente() : "N/A";
                String nombreVendedor = venta.getNombreVendedor() != null ? venta.getNombreVendedor() : "N/A";

                // --- Master Row ---
                table.addCell(crearCeldaDatoSinBordeInferior(fechaStr, rowBg, TextAlignment.LEFT));
                table.addCell(crearCeldaDatoSinBordeInferior(nombreCliente, rowBg, TextAlignment.LEFT));
                table.addCell(crearCeldaDatoSinBordeInferior("$" + formatCurrency(venta.getTotal()), rowBg, TextAlignment.RIGHT));
                table.addCell(crearCeldaDatoSinBordeInferior(nombreVendedor, rowBg, TextAlignment.LEFT));

                // --- Detail Rows (Aligned with Master Columns) ---
                List<ProductoVentaDTO> detalles = venta.getProductos();
                for (int i = 0; i < detalles.size(); i++) {
                    ProductoVentaDTO detalle = detalles.get(i);
                    boolean isLast = (i == detalles.size() - 1);
                    
                    // Celda vacía debajo de Fecha
                    Cell emptyCellFecha = new Cell().setBackgroundColor(rowBg).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
                    if (isLast) emptyCellFecha.setBorderBottom(new com.itextpdf.layout.borders.SolidBorder(BORDER_COLOR, 0.5f));
                    table.addCell(emptyCellFecha);
                    
                    // Producto + Cantidad debajo de Cliente
                    String prodStr = "↳ " + detalle.getNombreProducto() + " (Cant: " + detalle.getCantidad() + ")";
                    Cell prodCell = new Cell().add(new Paragraph(prodStr).setFontSize(7).setFontColor(TEXT_MUTED))
                            .setBackgroundColor(rowBg).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setPadding(2).setPaddingLeft(10);
                    if (isLast) prodCell.setBorderBottom(new com.itextpdf.layout.borders.SolidBorder(BORDER_COLOR, 0.5f));
                    table.addCell(prodCell);
                    
                    // Subtotal debajo de Total
                    Cell subtotalCell = new Cell().add(new Paragraph("$" + formatCurrency(detalle.getPrecioUnitario() * detalle.getCantidad())).setFontSize(7).setFontColor(TEXT_MUTED))
                            .setBackgroundColor(rowBg).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setPadding(2).setTextAlignment(TextAlignment.RIGHT);
                    if (isLast) subtotalCell.setBorderBottom(new com.itextpdf.layout.borders.SolidBorder(BORDER_COLOR, 0.5f));
                    table.addCell(subtotalCell);
                    
                    // Celda vacía debajo de Vendedor
                    Cell emptyCellVendedor = new Cell().setBackgroundColor(rowBg).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
                    if (isLast) emptyCellVendedor.setBorderBottom(new com.itextpdf.layout.borders.SolidBorder(BORDER_COLOR, 0.5f));
                    table.addCell(emptyCellVendedor);
                }
            }
        }

        document.add(table);
    }

    private Cell crearCabeceraCelda(String text, TextAlignment alignment) {
        return new Cell()
                .add(new Paragraph(text).setBold().setFontSize(9))
                .setBackgroundColor(BRAND_COLOR)
                .setFontColor(ColorConstants.WHITE)
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setTextAlignment(alignment)
                .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE)
                .setPadding(6);
    }

    private Cell crearCeldaDato(String text, DeviceRgb bgColor, TextAlignment alignment) {
        return new Cell().setKeepTogether(true)
                .add(new Paragraph(text).setFontSize(8).setFontColor(TEXT_DARK))
                .setBackgroundColor(bgColor)
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setBorderBottom(new com.itextpdf.layout.borders.SolidBorder(BORDER_COLOR, 0.5f))
                .setTextAlignment(alignment)
                .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE)
                .setPadding(5);
    }

    private Cell crearCeldaDatoSinBordeInferior(String text, DeviceRgb bgColor, TextAlignment alignment) {
        return new Cell().setKeepTogether(true)
                .add(new Paragraph(text).setFontSize(8).setFontColor(TEXT_DARK).setBold())
                .setBackgroundColor(bgColor)
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setTextAlignment(alignment)
                .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE)
                .setPaddingTop(5)
                .setPaddingLeft(5)
                .setPaddingRight(5)
                .setPaddingBottom(0); // Menos padding abajo para que conecte con la tabla anidada
    }

    private static class PageEvent implements com.itextpdf.kernel.events.IEventHandler {
        @Override
        public void handleEvent(com.itextpdf.kernel.events.Event event) {
            com.itextpdf.kernel.events.PdfDocumentEvent docEvent = (com.itextpdf.kernel.events.PdfDocumentEvent) event;
            PdfDocument pdfDoc = docEvent.getDocument();
            com.itextpdf.kernel.pdf.PdfPage page = docEvent.getPage();
            int pageNumber = pdfDoc.getPageNumber(page);
            com.itextpdf.kernel.geom.Rectangle pageSize = page.getPageSize();
            
            com.itextpdf.kernel.pdf.canvas.PdfCanvas canvas = new com.itextpdf.kernel.pdf.canvas.PdfCanvas(page.newContentStreamBefore(), page.getResources(), pdfDoc);
            
            canvas.setStrokeColor(BORDER_COLOR)
                  .setLineWidth(0.5f)
                  .moveTo(40, 35)
                  .lineTo(pageSize.getWidth() - 40, 35)
                  .stroke();

            Paragraph footerText = new Paragraph("Reporte de Ventas - Sistema de Gestión")
                    .setFontSize(7)
                    .setFontColor(TEXT_MUTED);
            
            Paragraph pageNumberParagraph = new Paragraph("Página " + pageNumber)
                    .setFontSize(7)
                    .setFontColor(TEXT_MUTED);
            
            com.itextpdf.layout.Canvas htmlCanvas = new com.itextpdf.layout.Canvas(canvas, new com.itextpdf.kernel.geom.Rectangle(40, 15, pageSize.getWidth() - 80, 20));
            htmlCanvas.showTextAligned(footerText, 40, 15, TextAlignment.LEFT);
            htmlCanvas.showTextAligned(pageNumberParagraph, pageSize.getWidth() - 40, 15, TextAlignment.RIGHT);
            htmlCanvas.close();
        }
    }

    private String formatFecha(LocalDateTime fecha) {
        if (fecha == null) return "N/A";
        return fecha.format(DATE_TIME_FORMATTER);
    }

    private String formatNumber(int number) {
        return String.format("%,d", number).replace(',', '.');
    }

    private String formatCurrency(double amount) {
        return NUMBER_FORMATTER.format(amount);
    }

        public byte[] generarTicketVenta(Venta venta) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();

                try {
                        // ========== CONFIGURACIÓN ==========
                        // Ancho de 80mm = 226 puntos
                        float widthPt = 226f;

                        // Calcular alto dinámico según cantidad de productos
                        int cantProductos = (venta.getDetalleVentas() != null) ? venta.getDetalleVentas().size() : 0;
                        float baseHeight = 280f; // altura base mínima aumentada por diseño
                        float heightPerItem = 22f; // altura por cada producto
                        float heightPt = baseHeight + (cantProductos * heightPerItem);

                        // Fuentes limpias y modernas
                        PdfFont fontRegular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
                        PdfFont fontBold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);

                        PdfWriter writer = new PdfWriter(baos);
                        PdfDocument pdf = new PdfDocument(writer);
                        PageSize pageSize = new PageSize(widthPt, heightPt);
                        Document document = new Document(pdf, pageSize);
                        document.setMargins(10, 10, 10, 10);

                        // Divider reutilizable
                        Table divider = new Table(1).useAllAvailableWidth();
                        divider.addCell(new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setBorderBottom(new com.itextpdf.layout.borders.DashedBorder(BORDER_COLOR, 1f)));
                        divider.setMarginBottom(10);
                        divider.setMarginTop(10);

                        // ========== ENCABEZADO ==========
                        Paragraph title = new Paragraph(NOMBRE_NEGOCIO)
                                .setFont(fontBold).setFontSize(16).setTextAlignment(TextAlignment.CENTER).setFontColor(TEXT_DARK);
                        document.add(title);

                        Paragraph header = new Paragraph(DIRECCION_NEGOCIO + "\n" + TELEFONO_NEGOCIO)
                                .setFont(fontRegular).setFontSize(8).setTextAlignment(TextAlignment.CENTER).setFontColor(TEXT_MUTED);
                        document.add(header);

                        document.add(divider);

                        // NÚMERO DE TICKET Y FECHA
                        Table infoTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
                        
                        Cell ticketCell = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                                .add(new Paragraph("TICKET").setFont(fontRegular).setFontSize(7).setFontColor(TEXT_MUTED).setMarginBottom(0))
                                .add(new Paragraph("#" + venta.getIdVenta()).setFont(fontBold).setFontSize(10).setFontColor(TEXT_DARK).setMarginTop(0));
                        
                        String fechaStr = (venta.getFecha() != null) ? venta.getFecha().format(DATE_TIME_FORMATTER) : "N/A";
                        Cell dateCell = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT)
                                .add(new Paragraph("FECHA").setFont(fontRegular).setFontSize(7).setFontColor(TEXT_MUTED).setMarginBottom(0))
                                .add(new Paragraph(fechaStr).setFont(fontBold).setFontSize(8).setFontColor(TEXT_DARK).setMarginTop(0));
                        
                        infoTable.addCell(ticketCell);
                        infoTable.addCell(dateCell);
                        document.add(infoTable);

                        document.add(divider);

                        // ========== TABLA DE PRODUCTOS ==========
                        // 2 columnas: 70% nombre/cantidad, 30% precio
                        float[] colWidths = { 70f, 30f };
                        Table table = new Table(UnitValue.createPercentArray(colWidths))
                                .setWidth(UnitValue.createPercentValue(100));
                        table.setBorder(null);

                        if (venta.getDetalleVentas() != null && !venta.getDetalleVentas().isEmpty()) {
                                for (DetalleVenta detalle : venta.getDetalleVentas()) {
                                        String nombre = (detalle.getProducto() != null) ? detalle.getProducto().getNombre() : "Producto";
                                        // Envolver si es largo no pasa nada, pero cortamos por prolijidad
                                        if (nombre.length() > 22) nombre = nombre.substring(0, 19) + "...";

                                        String nombreCol = nombre + "\nx" + detalle.getCantidad();
                                        String precioCol = "$" + formatCurrency(detalle.getPrecioUnitario() * detalle.getCantidad());

                                        Cell cellNombre = new Cell().add(new Paragraph(nombreCol).setFont(fontRegular).setFontSize(8).setFontColor(TEXT_DARK))
                                                .setBorder(null).setPaddingBottom(5);
                                        Cell cellPrecio = new Cell().add(new Paragraph(precioCol).setFont(fontBold).setFontSize(9).setFontColor(TEXT_DARK))
                                                .setBorder(null).setPaddingBottom(5).setTextAlignment(TextAlignment.RIGHT).setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE);

                                        table.addCell(cellNombre);
                                        table.addCell(cellPrecio);
                                }
                        }
                        document.add(table);

                        document.add(divider);

                        // ========== TOTALES ==========
                        Table totalsTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
                        
                        if (venta.getSubtotal() != null && venta.getSubtotal() > 0) {
                                totalsTable.addCell(new Cell().setBorder(null).add(new Paragraph("Subtotal:").setFont(fontRegular).setFontSize(8).setFontColor(TEXT_MUTED)));
                                totalsTable.addCell(new Cell().setBorder(null).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph("$" + formatCurrency(venta.getSubtotal())).setFont(fontRegular).setFontSize(8).setFontColor(TEXT_DARK)));
                        }

                        if (venta.getDescuentoMonto() != null && venta.getDescuentoMonto() > 0) {
                                totalsTable.addCell(new Cell().setBorder(null).add(new Paragraph("Descuento:").setFont(fontRegular).setFontSize(8).setFontColor(TEXT_MUTED)));
                                totalsTable.addCell(new Cell().setBorder(null).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph("-$" + formatCurrency(venta.getDescuentoMonto())).setFont(fontRegular).setFontSize(8).setFontColor(TEXT_DARK)));
                        }

                        // Total Grande
                        totalsTable.addCell(new Cell().setBorder(null).setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE).add(new Paragraph("TOTAL").setFont(fontBold).setFontSize(12).setFontColor(TEXT_DARK).setMarginTop(5)));
                        totalsTable.addCell(new Cell().setBorder(null).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph("$" + formatCurrency(venta.getTotal())).setFont(fontBold).setFontSize(14).setFontColor(TEXT_DARK).setMarginTop(5)));
                        
                        document.add(totalsTable);

                        document.add(divider);

                        // ========== METODO PAGO ==========
                        String metodoPago = "";
                        try {
                                var cobro = cobroService.obtenerCobroPorVenta(venta.getIdVenta());
                                metodoPago = (cobro != null && cobro.getMetodoPago() != null) ? cobro.getMetodoPago() : "No especificado";
                        } catch (Exception e) {
                                metodoPago = "No especificado";
                        }
                        document.add(new Paragraph("Pagado con " + metodoPago).setFont(fontRegular).setFontSize(8).setFontColor(TEXT_MUTED).setTextAlignment(TextAlignment.CENTER));

                        // ========== PIE ==========
                        document.add(new Paragraph("¡Gracias por su compra!")
                                .setFont(fontBold).setFontSize(9).setFontColor(TEXT_DARK).setTextAlignment(TextAlignment.CENTER).setMarginTop(10));

                        document.close();
                        return baos.toByteArray();

                } catch (Exception e) {
                        throw new RuntimeException("Error al generar ticket de venta", e);
                }
        }
}
